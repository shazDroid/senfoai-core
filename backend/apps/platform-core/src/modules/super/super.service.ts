import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient, GlobalRole, NamespaceRole, UserStatus, MembershipStatus, RepoScanStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { RepoCheckoutService } from '../indexer/repo-checkout.service';
import { Neo4jWriterService } from '../indexer/neo4j-writer.service';

@Injectable()
export class SuperService {
    private prisma = new PrismaClient();

    constructor(
        private auditService: AuditService,
        private checkoutService: RepoCheckoutService,
        private neo4jWriter: Neo4jWriterService
    ) { }

    // ============================================
    // NAMESPACE MANAGEMENT
    // ============================================

    async createNamespace(
        orgId: string,
        createdById: string,
        name: string,
        description?: string
    ) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        // Check if slug already exists
        const existing = await this.prisma.namespace.findFirst({
            where: { orgId, slug }
        });

        if (existing) {
            throw new HttpException('Namespace with this name already exists', HttpStatus.CONFLICT);
        }

        const namespace = await this.prisma.namespace.create({
            data: {
                orgId,
                name,
                slug,
                description,
                createdById
            }
        });

        await this.auditService.logNamespaceCreated(orgId, createdById, namespace.id, { name, slug });

        return namespace;
    }

    async getAllNamespaces(orgId: string) {
        const namespaces = await this.prisma.namespace.findMany({
            where: { orgId },
            include: {
                _count: {
                    select: {
                        memberships: { where: { status: MembershipStatus.ACTIVE } },
                        repositories: true
                    }
                },
                createdBy: {
                    select: { id: true, email: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return namespaces.map(ns => ({
            id: ns.id,
            name: ns.name,
            slug: ns.slug,
            description: ns.description,
            membersCount: ns._count.memberships,
            reposCount: ns._count.repositories,
            createdBy: ns.createdBy,
            createdAt: ns.createdAt
        }));
    }

    async getNamespace(orgId: string, namespaceId: string) {
        const namespace = await this.prisma.namespace.findFirst({
            where: { id: namespaceId, orgId },
            include: {
                memberships: {
                    where: { status: MembershipStatus.ACTIVE },
                    include: {
                        user: { select: { id: true, email: true, name: true, picture: true } }
                    }
                },
                repositories: true,
                createdBy: { select: { id: true, email: true, name: true } }
            }
        });

        if (!namespace) {
            throw new HttpException('Namespace not found', HttpStatus.NOT_FOUND);
        }

        return namespace;
    }

    // ============================================
    // IAM GROUP MAPPINGS
    // ============================================

    async createIamGroupMapping(
        orgId: string,
        actorId: string,
        mapping: {
            idp: string;
            groupId: string;
            groupName?: string;
            namespaceId?: string;
            namespaceRole?: 'ADMIN' | 'USER';
            grantsGlobalRole?: 'SUPERUSER';
        }
    ) {
        // Validate: either namespace mapping or global role grant
        if (!mapping.namespaceId && !mapping.grantsGlobalRole) {
            throw new HttpException(
                'Must specify either namespaceId or grantsGlobalRole',
                HttpStatus.BAD_REQUEST
            );
        }

        if (mapping.namespaceId && mapping.grantsGlobalRole) {
            throw new HttpException(
                'Cannot specify both namespaceId and grantsGlobalRole',
                HttpStatus.BAD_REQUEST
            );
        }

        // Check for existing mapping
        const existing = await this.prisma.iamGroupMapping.findFirst({
            where: { orgId, idp: mapping.idp, groupId: mapping.groupId }
        });

        if (existing) {
            throw new HttpException('IAM group mapping already exists', HttpStatus.CONFLICT);
        }

        const created = await this.prisma.iamGroupMapping.create({
            data: {
                orgId,
                idp: mapping.idp,
                groupId: mapping.groupId,
                groupName: mapping.groupName,
                namespaceId: mapping.namespaceId,
                namespaceRole: mapping.namespaceRole as NamespaceRole | undefined,
                grantsGlobalRole: mapping.grantsGlobalRole as GlobalRole | undefined
            }
        });

        await this.auditService.logIamMappingCreated(orgId, actorId, created.id, mapping);

        return created;
    }

    async getIamGroupMappings(orgId: string) {
        return this.prisma.iamGroupMapping.findMany({
            where: { orgId },
            include: {
                namespace: { select: { id: true, name: true, slug: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async deleteIamGroupMapping(orgId: string, actorId: string, mappingId: string) {
        const mapping = await this.prisma.iamGroupMapping.findFirst({
            where: { id: mappingId, orgId }
        });

        if (!mapping) {
            throw new HttpException('IAM group mapping not found', HttpStatus.NOT_FOUND);
        }

        await this.prisma.iamGroupMapping.delete({ where: { id: mappingId } });

        await this.auditService.log({
            orgId,
            actorId,
            action: 'IAM_MAPPING_DELETED',
            targetType: 'iam_mapping',
            targetId: mappingId
        });

        return { success: true };
    }

    // ============================================
    // NAMESPACE MEMBERSHIP
    // ============================================

    async assignNamespaceMember(
        orgId: string,
        assignedById: string,
        namespaceId: string,
        userId: string,
        role: 'ADMIN' | 'USER'
    ) {
        // Validate namespace exists
        const namespace = await this.prisma.namespace.findFirst({
            where: { id: namespaceId, orgId }
        });
        if (!namespace) {
            throw new HttpException('Namespace not found', HttpStatus.NOT_FOUND);
        }

        // Validate user exists
        const user = await this.prisma.user.findFirst({
            where: { id: userId, orgId }
        });
        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        // Upsert membership
        const membership = await this.prisma.namespaceMembership.upsert({
            where: {
                orgId_namespaceId_userId: { orgId, namespaceId, userId }
            },
            create: {
                orgId,
                namespaceId,
                userId,
                namespaceRole: role as NamespaceRole,
                assignedById,
                status: MembershipStatus.ACTIVE
            },
            update: {
                namespaceRole: role as NamespaceRole,
                assignedById,
                status: MembershipStatus.ACTIVE,
                assignedAt: new Date()
            }
        });

        await this.auditService.logMembershipAssigned(orgId, assignedById, userId, {
            namespaceId,
            namespaceName: namespace.name,
            role
        });

        return membership;
    }

    async removeNamespaceMember(
        orgId: string,
        actorId: string,
        namespaceId: string,
        userId: string
    ) {
        const membership = await this.prisma.namespaceMembership.findFirst({
            where: { orgId, namespaceId, userId }
        });

        if (!membership) {
            throw new HttpException('Membership not found', HttpStatus.NOT_FOUND);
        }

        await this.prisma.namespaceMembership.update({
            where: { id: membership.id },
            data: { status: MembershipStatus.REVOKED }
        });

        await this.auditService.logMembershipRevoked(orgId, actorId, userId, { namespaceId });

        return { success: true };
    }

    async getNamespaceMembers(orgId: string, namespaceId: string) {
        const members = await this.prisma.namespaceMembership.findMany({
            where: { orgId, namespaceId, status: MembershipStatus.ACTIVE },
            include: {
                user: {
                    select: { id: true, email: true, name: true, picture: true, globalRole: true, lastLoginAt: true }
                },
                assignedBy: { select: { id: true, email: true, name: true } }
            },
            orderBy: { assignedAt: 'desc' }
        });

        return members;
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================

    async createUser(
        orgId: string,
        actorId: string,
        data: {
            email: string;
            name?: string;
            globalRole?: 'SUPERUSER' | 'ADMIN' | 'USER';
            namespaceId?: string;
            namespaceRole?: 'ADMIN' | 'USER';
        }
    ) {
        // Check if user already exists
        const existing = await this.prisma.user.findFirst({
            where: { orgId, email: data.email }
        });

        if (existing) {
            throw new HttpException('User with this email already exists', HttpStatus.CONFLICT);
        }

        // Create user
        const user = await this.prisma.user.create({
            data: {
                orgId,
                email: data.email,
                name: data.name || data.email.split('@')[0],
                idp: 'invited',
                idpSub: `invited_${data.email}`,
                globalRole: (data.globalRole as GlobalRole) || GlobalRole.USER,
                status: UserStatus.ACTIVE
            }
        });

        // If namespace assignment is provided, create membership
        if (data.namespaceId && data.namespaceRole) {
            await this.assignNamespaceMember(
                orgId,
                actorId,
                data.namespaceId,
                user.id,
                data.namespaceRole
            );
        }

        await this.auditService.log({
            orgId,
            actorId,
            action: 'USER_CREATED',
            targetType: 'user',
            targetId: user.id,
            metadata: { email: data.email, globalRole: data.globalRole || 'USER' }
        });

        return user;
    }

    async getAllUsers(orgId: string, limit: number = 50, offset: number = 0) {
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where: { orgId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    picture: true,
                    globalRole: true,
                    status: true,
                    idp: true,
                    lastLoginAt: true,
                    createdAt: true,
                    namespaceMemberships: {
                        where: { status: MembershipStatus.ACTIVE },
                        include: {
                            namespace: {
                                select: { id: true, name: true, slug: true }
                            }
                        }
                    },
                    _count: {
                        select: { namespaceMemberships: { where: { status: MembershipStatus.ACTIVE } } }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            }),
            this.prisma.user.count({ where: { orgId } })
        ]);

        return {
            users: users.map(u => ({
                ...u,
                namespacesCount: u._count.namespaceMemberships,
                namespaces: u.namespaceMemberships.map(membership => ({
                    id: membership.namespace.id,
                    name: membership.namespace.name,
                    slug: membership.namespace.slug,
                    role: membership.namespaceRole
                }))
            })),
            total
        };
    }

    async getUser(orgId: string, userId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, orgId },
            include: {
                namespaceMemberships: {
                    where: { status: MembershipStatus.ACTIVE },
                    include: {
                        namespace: { select: { id: true, name: true, slug: true } }
                    }
                }
            }
        });

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        return user;
    }

    async updateUserGlobalRole(
        orgId: string,
        actorId: string,
        userId: string,
        globalRole: 'SUPERUSER' | 'ADMIN' | 'USER'
    ) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, orgId }
        });

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        const previousRole = user.globalRole;

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { globalRole: globalRole as GlobalRole }
        });

        await this.auditService.logGlobalRoleChanged(orgId, actorId, userId, {
            previousRole,
            newRole: globalRole
        });

        return updated;
    }

    async updateUserStatus(
        orgId: string,
        actorId: string,
        userId: string,
        status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
    ) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, orgId }
        });

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { status: status as UserStatus }
        });

        await this.auditService.log({
            orgId,
            actorId,
            action: 'USER_STATUS_CHANGED',
            targetType: 'user',
            targetId: userId,
            metadata: { previousStatus: user.status, newStatus: status }
        });

        return updated;
    }

    async canDemoteSuperuser(orgId: string, userId: string): Promise<boolean> {
        const superuserCount = await this.prisma.user.count({
            where: {
                orgId,
                globalRole: GlobalRole.SUPERUSER,
                status: UserStatus.ACTIVE
            }
        });

        // Can demote if there are more than 1 superuser
        return superuserCount > 1;
    }

    // ============================================
    // AUDIT LOGS
    // ============================================

    async getAuditLogs(
        orgId: string,
        options: { limit?: number; offset?: number; action?: string; actorId?: string }
    ) {
        return this.auditService.getLogs(orgId, options);
    }

    // ============================================
    // ORGANIZATION
    // ============================================

    async getOrganization(orgId: string) {
        const org = await this.prisma.organization.findUnique({
            where: { id: orgId },
            include: {
                _count: {
                    select: { users: true, namespaces: true }
                }
            }
        });

        if (!org) {
            throw new HttpException('Organization not found', HttpStatus.NOT_FOUND);
        }

        return org;
    }

    async updateOrganization(
        orgId: string,
        actorId: string,
        data: {
            name?: string;
            authMode?: 'IAM_GROUPS' | 'SSO_MANAGED' | 'HYBRID';
            bootstrapSuperuserEmail?: string;
            bootstrapSuperuserGroupId?: string;
        }
    ) {
        const updated = await this.prisma.organization.update({
            where: { id: orgId },
            data: {
                name: data.name,
                authMode: data.authMode,
                bootstrapSuperuserEmail: data.bootstrapSuperuserEmail,
                bootstrapSuperuserGroupId: data.bootstrapSuperuserGroupId
            }
        });

        await this.auditService.log({
            orgId,
            actorId,
            action: 'ORGANIZATION_UPDATED',
            targetType: 'organization',
            targetId: orgId,
            metadata: data
        });

        return updated;
    }

    // ============================================
    // SYSTEM HEALTH & STATS
    // ============================================

    async getSystemHealth() {
        return {
            status: 'UP',
            timestamp: new Date(),
            database: 'Connected',
            version: '1.0.0'
        };
    }

    async getStats(orgId: string) {
        const [usersCount, namespacesCount, reposCount, activeUsers] = await Promise.all([
            this.prisma.user.count({ where: { orgId } }),
            this.prisma.namespace.count({ where: { orgId } }),
            this.prisma.repository.count({ where: { orgId } }),
            this.prisma.user.count({
                where: {
                    orgId,
                    status: UserStatus.ACTIVE,
                    lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
                }
            })
        ]);

        return {
            totalUsers: usersCount,
            totalNamespaces: namespacesCount,
            totalRepositories: reposCount,
            activeUsersLast30Days: activeUsers
        };
    }

    // ============================================
    // REPOSITORY MANAGEMENT (Superuser - All Namespaces)
    // ============================================

    async addRepository(
        orgId: string,
        addedById: string,
        namespaceIds: string[],
        data: { name: string; gitUrl: string; defaultBranch?: string }
    ) {
        if (!namespaceIds || namespaceIds.length === 0) {
            throw new HttpException('At least one namespace is required', HttpStatus.BAD_REQUEST);
        }

        // Verify all namespaces exist
        const namespaces = await this.prisma.namespace.findMany({
            where: { id: { in: namespaceIds }, orgId }
        });

        if (namespaces.length !== namespaceIds.length) {
            throw new HttpException('One or more namespaces not found', HttpStatus.NOT_FOUND);
        }

        // Check for duplicate repo by gitUrl (globally unique per org)
        const existing = await this.prisma.repository.findFirst({
            where: { orgId, gitUrl: data.gitUrl }
        });

        if (existing) {
            // Repository exists, add it to additional namespaces
            const existingNamespaceIds = await this.prisma.repositoryNamespace.findMany({
                where: { orgId, repositoryId: existing.id },
                select: { namespaceId: true }
            }).then(rels => rels.map(r => r.namespaceId));

            const newNamespaceIds = namespaceIds.filter(id => !existingNamespaceIds.includes(id));

            if (newNamespaceIds.length === 0) {
                throw new HttpException('Repository already exists in all specified namespaces', HttpStatus.CONFLICT);
            }

            // Add to new namespaces
            await this.prisma.repositoryNamespace.createMany({
                data: newNamespaceIds.map(namespaceId => ({
                    orgId,
                    repositoryId: existing.id,
                    namespaceId
                }))
            });

            await this.auditService.logRepoAdded(orgId, addedById, existing.id, {
                name: data.name,
                gitUrl: data.gitUrl,
                namespaceIds: newNamespaceIds,
                namespaceNames: namespaces.filter(n => newNamespaceIds.includes(n.id)).map(n => n.name)
            });

            return this.prisma.repository.findUnique({
                where: { id: existing.id },
                include: {
                    namespaces: {
                        include: {
                            namespace: { select: { id: true, name: true, slug: true } }
                        }
                    }
                }
            });
        }

        // Create new repository
        const repo = await this.prisma.repository.create({
            data: {
                orgId,
                name: data.name,
                gitUrl: data.gitUrl,
                defaultBranch: data.defaultBranch || 'main',
                addedById,
                scanStatus: RepoScanStatus.PENDING,
                namespaces: {
                    create: namespaceIds.map(namespaceId => ({
                        orgId,
                        namespaceId
                    }))
                }
            },
            include: {
                namespaces: {
                    include: {
                        namespace: { select: { id: true, name: true, slug: true } }
                    }
                }
            }
        });

        await this.auditService.logRepoAdded(orgId, addedById, repo.id, {
            name: data.name,
            gitUrl: data.gitUrl,
            namespaceIds,
            namespaceNames: namespaces.map(n => n.name)
        });

        return repo;
    }

    async removeRepository(orgId: string, actorId: string, repoId: string) {
        const repo = await this.prisma.repository.findFirst({
            where: { id: repoId, orgId },
            include: {
                namespaces: {
                    include: {
                        namespace: { select: { id: true, name: true } }
                    }
                }
            }
        });

        if (!repo) {
            throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
        }

        // 1. Delete from Neo4j graph
        try {
            await this.neo4jWriter.deleteRepo(repoId);
        } catch (err: any) {
            // Log but don't fail if Neo4j deletion fails
            console.warn(`Failed to delete Neo4j graph for repo ${repoId}: ${err.message}`);
        }

        // 2. Delete cloned files (temp directory)
        try {
            await this.checkoutService.deleteCheckout(repoId);
        } catch (err: any) {
            // Log but don't fail if file deletion fails
            console.warn(`Failed to delete cloned files for repo ${repoId}: ${err.message}`);
        }

        // 3. Delete namespace associations (cascade delete)
        await this.prisma.repositoryNamespace.deleteMany({
            where: { repositoryId: repoId }
        });

        // 4. Delete the repository record from MongoDB
        await this.prisma.repository.delete({ where: { id: repoId } });

        await this.auditService.logRepoRemoved(orgId, actorId, repoId, {
            name: repo.name,
            gitUrl: repo.gitUrl,
            namespaceIds: repo.namespaces.map(rn => rn.namespaceId)
        });

        return { success: true };
    }

    async triggerScan(orgId: string, actorId: string, repoId: string) {
        const repo = await this.prisma.repository.findFirst({
            where: { id: repoId, orgId }
        });

        if (!repo) {
            throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
        }

        // Update status to CLONING (actual scanning would be done by a separate service)
        const updated = await this.prisma.repository.update({
            where: { id: repoId },
            data: { scanStatus: RepoScanStatus.CLONING }
        });

        await this.auditService.log({
            orgId,
            actorId,
            action: 'REPO_SCAN_TRIGGERED',
            targetType: 'repo',
            targetId: repoId,
            metadata: { name: repo.name }
        });

        return updated;
    }

    async getAllRepositories(orgId: string) {
        // Get all repositories across all namespaces (superuser has access to everything)
        const repositories = await this.prisma.repository.findMany({
            where: { orgId },
            include: {
                addedBy: { select: { id: true, email: true, name: true } },
                namespaces: {
                    include: {
                        namespace: { select: { id: true, name: true, slug: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Transform to include namespaces array
        return repositories.map(repo => ({
            ...repo,
            namespaces: repo.namespaces.map(rn => rn.namespace)
        }));
    }

    async updateRepositoryNamespaces(
        orgId: string,
        actorId: string,
        repoId: string,
        namespaceIds: string[]
    ) {
        if (!namespaceIds || namespaceIds.length === 0) {
            throw new HttpException('At least one namespace is required', HttpStatus.BAD_REQUEST);
        }

        // Verify repository exists
        const repo = await this.prisma.repository.findFirst({
            where: { id: repoId, orgId }
        });

        if (!repo) {
            throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
        }

        // Verify all namespaces exist
        const namespaces = await this.prisma.namespace.findMany({
            where: { id: { in: namespaceIds }, orgId }
        });

        if (namespaces.length !== namespaceIds.length) {
            throw new HttpException('One or more namespaces not found', HttpStatus.NOT_FOUND);
        }

        // Get current namespaces
        const currentRels = await this.prisma.repositoryNamespace.findMany({
            where: { orgId, repositoryId: repoId }
        });
        const currentNamespaceIds = currentRels.map(r => r.namespaceId);

        // Calculate changes
        const toAdd = namespaceIds.filter(id => !currentNamespaceIds.includes(id));
        const toRemove = currentNamespaceIds.filter(id => !namespaceIds.includes(id));

        // Perform updates in transaction
        await this.prisma.$transaction([
            // Remove old associations
            ...(toRemove.length > 0 ? [
                this.prisma.repositoryNamespace.deleteMany({
                    where: {
                        orgId,
                        repositoryId: repoId,
                        namespaceId: { in: toRemove }
                    }
                })
            ] : []),
            // Add new associations
            ...(toAdd.length > 0 ? [
                this.prisma.repositoryNamespace.createMany({
                    data: toAdd.map(namespaceId => ({
                        orgId,
                        repositoryId: repoId,
                        namespaceId
                    }))
                })
            ] : [])
        ]);

        await this.auditService.log({
            orgId,
            actorId,
            action: 'REPO_NAMESPACES_UPDATED',
            targetType: 'repo',
            targetId: repoId,
            metadata: {
                name: repo.name,
                gitUrl: repo.gitUrl,
                previousNamespaceIds: currentNamespaceIds,
                newNamespaceIds: namespaceIds,
                added: toAdd,
                removed: toRemove
            }
        });

        return this.prisma.repository.findUnique({
            where: { id: repoId },
            include: {
                namespaces: {
                    include: {
                        namespace: { select: { id: true, name: true, slug: true } }
                    }
                }
            }
        });
    }

    // ============================================
    // DELETION APPROVAL WORKFLOW
    // ============================================

    /**
     * Get all repositories with pending deletion requests
     */
    async getPendingDeletions(orgId: string) {
        const repos = await this.prisma.repository.findMany({
            where: {
                orgId,
                // @ts-ignore - pendingDeletion field
                pendingDeletion: true
            },
            include: {
                addedBy: { select: { id: true, email: true, name: true } },
                namespaces: {
                    include: {
                        namespace: { select: { id: true, name: true, slug: true } }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Get requester info for each repo
        const result = await Promise.all(repos.map(async (repo: any) => {
            let requestedBy: { id: string; email: string; name: string | null } | null = null;
            if (repo.deletionRequestedBy) {
                requestedBy = await this.prisma.user.findUnique({
                    where: { id: repo.deletionRequestedBy },
                    select: { id: true, email: true, name: true }
                });
            }
            return {
                ...repo,
                namespaces: repo.namespaces.map((rn: any) => rn.namespace),
                requestedBy,
                requestedAt: repo.deletionRequestedAt
            };
        }));

        return result;
    }

    /**
     * Approve a pending deletion and delete the repository
     */
    async approveDeletion(orgId: string, actorId: string, repoId: string) {
        const repo = await this.prisma.repository.findFirst({
            where: {
                id: repoId,
                orgId,
                // @ts-ignore
                pendingDeletion: true
            },
            include: {
                namespaces: {
                    include: {
                        namespace: { select: { id: true, name: true } }
                    }
                }
            }
        });

        if (!repo) {
            throw new HttpException('Repository not found or no pending deletion', HttpStatus.NOT_FOUND);
        }

        // 1. Delete from Neo4j graph
        try {
            await this.neo4jWriter.deleteRepo(repoId);
        } catch (err: any) {
            // Log but don't fail if Neo4j deletion fails
            console.warn(`Failed to delete Neo4j graph for repo ${repoId}: ${err.message}`);
        }

        // 2. Delete cloned files (temp directory)
        try {
            await this.checkoutService.deleteCheckout(repoId);
        } catch (err: any) {
            // Log but don't fail if file deletion fails
            console.warn(`Failed to delete cloned files for repo ${repoId}: ${err.message}`);
        }

        // 3. Delete namespace associations
        await this.prisma.repositoryNamespace.deleteMany({
            where: { repositoryId: repoId }
        });

        // 4. Delete the repository record from MongoDB
        await this.prisma.repository.delete({ where: { id: repoId } });

        await this.auditService.log({
            orgId,
            actorId,
            action: 'REPO_DELETION_APPROVED',
            targetType: 'repo',
            targetId: repoId,
            metadata: {
                name: repo.name,
                gitUrl: repo.gitUrl,
                // @ts-ignore
                requestedBy: repo.deletionRequestedBy,
                namespaceIds: (repo as any).namespaces.map((rn: any) => rn.namespaceId)
            }
        });

        return { success: true, message: 'Deletion approved. Repository has been deleted.' };
    }

    /**
     * Reject a pending deletion request
     */
    async rejectDeletion(orgId: string, actorId: string, repoId: string) {
        const repo = await this.prisma.repository.findFirst({
            where: {
                id: repoId,
                orgId,
                // @ts-ignore
                pendingDeletion: true
            }
        });

        if (!repo) {
            throw new HttpException('Repository not found or no pending deletion', HttpStatus.NOT_FOUND);
        }

        // Clear the pending deletion flag
        await this.prisma.repository.update({
            where: { id: repoId },
            data: {
                // @ts-ignore
                pendingDeletion: false,
                deletionRequestedBy: null,
                deletionRequestedAt: null
            }
        });

        await this.auditService.log({
            orgId,
            actorId,
            action: 'REPO_DELETION_REJECTED',
            targetType: 'repo',
            targetId: repoId,
            metadata: {
                name: repo.name,
                // @ts-ignore
                requestedBy: repo.deletionRequestedBy
            }
        });

        return { success: true, message: 'Deletion request rejected.' };
    }
}