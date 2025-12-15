import { Injectable } from '@nestjs/common';
import { PrismaClient, AuthMode, GlobalRole, NamespaceRole } from '@prisma/client';

export interface NamespaceAccess {
    id: string;
    slug: string;
    role: NamespaceRole;
    source: 'iam' | 'senfo';
}

export interface AccessContext {
    userId: string;
    orgId: string;
    email: string;
    name: string | null;
    globalRole: GlobalRole;
    namespaces: NamespaceAccess[];
    isSuperuser: boolean;
}

@Injectable()
export class AccessContextService {
    private prisma = new PrismaClient();

    /**
     * Resolves the complete access context for a user.
     * This is called at login time to build the JWT claims.
     */
    async resolveAccessContext(
        userId: string,
        idpGroups?: string[] // Groups from IdP token (if available)
    ): Promise<AccessContext> {
        // 1. Get user with organization
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                org: true,
                namespaceMemberships: {
                    where: { status: 'ACTIVE' },
                    include: { namespace: true }
                }
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        const org = user.org;
        const authMode = org.authMode;

        // 2. Start with user's global role
        let globalRole = user.globalRole;
        const namespaceMap = new Map<string, NamespaceAccess>();

        // 3. Process IAM group mappings (if applicable)
        if (
            idpGroups &&
            idpGroups.length > 0 &&
            (authMode === AuthMode.IAM_GROUPS || authMode === AuthMode.HYBRID)
        ) {
            const iamMappings = await this.prisma.iamGroupMapping.findMany({
                where: {
                    orgId: user.orgId,
                    groupId: { in: idpGroups }
                },
                include: { namespace: true }
            });

            for (const mapping of iamMappings) {
                // Check if this grants superuser
                if (mapping.grantsGlobalRole === GlobalRole.SUPERUSER) {
                    globalRole = GlobalRole.SUPERUSER;
                }

                // Check namespace-level mapping
                if (mapping.namespaceId && mapping.namespaceRole && mapping.namespace) {
                    const existing = namespaceMap.get(mapping.namespaceId);
                    const newRole = mapping.namespaceRole;

                    // If no existing or new role is stronger (ADMIN > USER)
                    if (!existing || this.isStrongerRole(newRole, existing.role)) {
                        namespaceMap.set(mapping.namespaceId, {
                            id: mapping.namespaceId,
                            slug: mapping.namespace.slug,
                            role: newRole,
                            source: 'iam'
                        });
                    }
                }
            }
        }

        // 4. Process Senfo-managed memberships (if applicable)
        if (authMode === AuthMode.SSO_MANAGED || authMode === AuthMode.HYBRID) {
            for (const membership of user.namespaceMemberships) {
                const existing = namespaceMap.get(membership.namespaceId);
                const newRole = membership.namespaceRole;

                // In HYBRID mode, only add if not already from IAM or if stronger
                if (!existing) {
                    namespaceMap.set(membership.namespaceId, {
                        id: membership.namespaceId,
                        slug: membership.namespace.slug,
                        role: newRole,
                        source: 'senfo'
                    });
                } else if (authMode === AuthMode.HYBRID && this.isStrongerRole(newRole, existing.role)) {
                    // Strongest role wins in HYBRID mode
                    namespaceMap.set(membership.namespaceId, {
                        id: membership.namespaceId,
                        slug: membership.namespace.slug,
                        role: newRole,
                        source: 'senfo'
                    });
                }
            }
        }

        return {
            userId: user.id,
            orgId: user.orgId,
            email: user.email,
            name: user.name,
            globalRole,
            namespaces: Array.from(namespaceMap.values()),
            isSuperuser: globalRole === GlobalRole.SUPERUSER
        };
    }

    /**
     * Check if roleA is stronger than roleB
     * ADMIN > USER
     */
    private isStrongerRole(roleA: NamespaceRole, roleB: NamespaceRole): boolean {
        const roleStrength: Record<NamespaceRole, number> = {
            [NamespaceRole.ADMIN]: 2,
            [NamespaceRole.USER]: 1
        };
        return roleStrength[roleA] > roleStrength[roleB];
    }

    /**
     * Check if user has access to a specific namespace with minimum role
     */
    hasNamespaceAccess(
        context: AccessContext,
        namespaceId: string,
        minRole: NamespaceRole = NamespaceRole.USER
    ): boolean {
        // Superuser bypasses all checks
        if (context.isSuperuser) {
            return true;
        }

        const membership = context.namespaces.find(ns => ns.id === namespaceId);
        if (!membership) {
            return false;
        }

        // Check if role meets minimum requirement
        if (minRole === NamespaceRole.ADMIN) {
            return membership.role === NamespaceRole.ADMIN;
        }

        return true; // USER or ADMIN satisfies USER requirement
    }

    /**
     * Check if user can manage a namespace (admin or superuser)
     */
    canManageNamespace(context: AccessContext, namespaceId: string): boolean {
        return this.hasNamespaceAccess(context, namespaceId, NamespaceRole.ADMIN);
    }
}

