import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient, NamespaceRole, MembershipStatus, RepoScanStatus, UserStatus, GlobalRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
    private prisma = new PrismaClient();

    constructor(private auditService: AuditService) {}

    // ============================================
    // REPOSITORY MANAGEMENT
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

    async getNamespaceRepos(orgId: string, namespaceId: string) {
        const repoNamespaceRels = await this.prisma.repositoryNamespace.findMany({
            where: { orgId, namespaceId },
            include: {
                repository: {
                    include: {
                        addedBy: { select: { id: true, email: true, name: true } },
                        namespaces: {
                            include: {
                                namespace: { select: { id: true, name: true, slug: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return repoNamespaceRels.map(rel => ({
            ...rel.repository,
            namespaces: rel.repository.namespaces.map(rn => rn.namespace)
        }));
    }

    // ============================================
    // NAMESPACE MEMBER MANAGEMENT
    // ============================================

    async assignMember(
        orgId: string,
        assignedById: string,
        namespaceId: string,
        userId: string,
        role: 'ADMIN' | 'USER'
    ) {
        // Verify namespace exists
        const namespace = await this.prisma.namespace.findFirst({
            where: { id: namespaceId, orgId }
        });

        if (!namespace) {
            throw new HttpException('Namespace not found', HttpStatus.NOT_FOUND);
        }

        // Verify user exists
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

    async removeMember(
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

    async getMembers(orgId: string, namespaceId: string) {
        return this.prisma.namespaceMembership.findMany({
            where: { orgId, namespaceId, status: MembershipStatus.ACTIVE },
            include: {
                user: {
                    select: { id: true, email: true, name: true, picture: true, globalRole: true }
                },
                assignedBy: { select: { id: true, email: true, name: true } }
            },
            orderBy: { assignedAt: 'desc' }
        });
    }

    // ============================================
    // USER INVITATION
    // ============================================

    async inviteUser(
        orgId: string,
        invitedById: string,
        namespaceId: string,
        email: string,
        role: 'ADMIN' | 'USER'
    ) {
        // Check if user already exists
        let user = await this.prisma.user.findFirst({
            where: { orgId, email }
        });

        if (user) {
            // User exists, just add to namespace
            return this.assignMember(orgId, invitedById, namespaceId, user.id, role);
        }

        // For now, return a placeholder - in production, you'd send an invite email
        // or create a pending user record
        await this.auditService.log({
            orgId,
            actorId: invitedById,
            action: 'USER_INVITED',
            metadata: { email, namespaceId, role }
        });

        return {
            message: 'Invitation sent',
            email,
            namespaceId,
            role,
            status: 'pending'
        };
    }

    // ============================================
    // STATISTICS
    // ============================================

    async getStats(orgId: string, adminUserId: string) {
        // Get all namespaces where the user is an admin
        const adminMemberships = await this.prisma.namespaceMembership.findMany({
            where: {
                orgId,
                userId: adminUserId,
                namespaceRole: NamespaceRole.ADMIN,
                status: MembershipStatus.ACTIVE
            },
            select: { namespaceId: true }
        });

        const namespaceIds = adminMemberships.map(m => m.namespaceId);

        if (namespaceIds.length === 0) {
            return {
                repositories: 0,
                teamMembers: 0
            };
        }

        // Count unique repositories in admin's namespaces
        const repoNamespaceRels = await this.prisma.repositoryNamespace.findMany({
            where: {
                orgId,
                namespaceId: { in: namespaceIds }
            },
            select: { repositoryId: true },
            distinct: ['repositoryId']
        });

        const repositoriesCount = repoNamespaceRels.length;

        // Count unique users in admin's namespaces
        const uniqueUserIds = await this.prisma.namespaceMembership.findMany({
            where: {
                orgId,
                namespaceId: { in: namespaceIds },
                status: MembershipStatus.ACTIVE
            },
            select: { userId: true },
            distinct: ['userId']
        });

        return {
            repositories: repositoriesCount,
            teamMembers: uniqueUserIds.length
        };
    }

    async getAllRepositories(orgId: string, adminUserId: string) {
        // Get all namespaces where the user is an admin
        const adminMemberships = await this.prisma.namespaceMembership.findMany({
            where: {
                orgId,
                userId: adminUserId,
                namespaceRole: NamespaceRole.ADMIN,
                status: MembershipStatus.ACTIVE
            },
            select: { namespaceId: true }
        });

        const namespaceIds = adminMemberships.map(m => m.namespaceId);

        if (namespaceIds.length === 0) {
            return [];
        }

        // Get all repositories that have at least one namespace in admin's namespaces
        const repoNamespaceRels = await this.prisma.repositoryNamespace.findMany({
            where: {
                orgId,
                namespaceId: { in: namespaceIds }
            },
            select: {
                repositoryId: true
            },
            distinct: ['repositoryId']
        });

        const repositoryIds = repoNamespaceRels.map(rel => rel.repositoryId);

        if (repositoryIds.length === 0) {
            return [];
        }

        // Get all repositories with ALL their namespaces
        const repositories = await this.prisma.repository.findMany({
            where: {
                orgId,
                id: { in: repositoryIds }
            },
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

    // ============================================
    // UPDATE REPOSITORY NAMESPACES
    // ============================================

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

    async getUsersInAdminNamespaces(orgId: string, adminUserId: string) {
        // Get all namespaces where the user is an admin
        const adminMemberships = await this.prisma.namespaceMembership.findMany({
            where: {
                orgId,
                userId: adminUserId,
                namespaceRole: NamespaceRole.ADMIN,
                status: MembershipStatus.ACTIVE
            },
            select: { namespaceId: true }
        });

        const namespaceIds = adminMemberships.map(m => m.namespaceId);

        if (namespaceIds.length === 0) {
            return { users: [], total: 0 };
        }

        // Get all memberships in these namespaces
        const memberships = await this.prisma.namespaceMembership.findMany({
            where: {
                orgId,
                namespaceId: { in: namespaceIds },
                status: MembershipStatus.ACTIVE
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        picture: true,
                        globalRole: true,
                        status: true,
                        lastLoginAt: true,
                        createdAt: true
                    }
                },
                namespace: {
                    select: { id: true, name: true, slug: true }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });

        // Group by user and collect their namespaces
        const userMap = new Map();
        memberships.forEach(membership => {
            const userId = membership.user.id;
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    ...membership.user,
                    namespaces: [],
                    namespacesCount: 0
                });
            }
            const user = userMap.get(userId);
            user.namespaces.push({
                id: membership.namespace.id,
                name: membership.namespace.name,
                slug: membership.namespace.slug,
                role: membership.namespaceRole
            });
            user.namespacesCount = user.namespaces.length;
        });

        const users = Array.from(userMap.values());

        return {
            users,
            total: users.length
        };
    }

    // ============================================
    // CREATE USER AND ASSIGN TO NAMESPACE (Admin)
    // ============================================

    async createUserAndAssign(
        orgId: string,
        actorId: string,
        namespaceId: string,
        email: string,
        name?: string,
        namespaceRole: 'ADMIN' | 'USER' = 'USER'
    ) {
        // Verify admin has access to this namespace
        const adminMembership = await this.prisma.namespaceMembership.findFirst({
            where: {
                orgId,
                namespaceId,
                userId: actorId,
                namespaceRole: NamespaceRole.ADMIN,
                status: MembershipStatus.ACTIVE
            }
        });

        if (!adminMembership) {
            throw new HttpException(
                'You do not have admin access to this namespace',
                HttpStatus.FORBIDDEN
            );
        }

        // Check if user already exists
        let user = await this.prisma.user.findFirst({
            where: { orgId, email }
        });

        if (!user) {
            // Create user
            user = await this.prisma.user.create({
                data: {
                    orgId,
                    email,
                    name: name || email.split('@')[0],
                    idp: 'invited',
                    idpSub: `invited_${email}`,
                    globalRole: GlobalRole.USER, // Admins can only create regular users
                    status: UserStatus.ACTIVE
                }
            });
        }

        // Assign to namespace
        await this.assignMember(orgId, actorId, namespaceId, user.id, namespaceRole);

        return user;
    }
}
