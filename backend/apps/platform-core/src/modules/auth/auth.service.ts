import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, GlobalRole, UserStatus } from '@prisma/client';
import { AccessContextService, AccessContext } from './access-context.service';
import { AuditService } from '../audit/audit.service';

interface OAuthProfile {
    email: string;
    name?: string;
    picture?: string;
    sub?: string;
    groups?: string[];
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private prisma = new PrismaClient();

    constructor(
        private jwtService: JwtService,
        private accessContextService: AccessContextService,
        private auditService: AuditService,
    ) {}

    /**
     * Validate OAuth login (Google, GitHub, Azure AD, Okta)
     */
    async validateOAuthLogin(
        profile: OAuthProfile,
        provider: string,
        idpGroups?: string[]
    ): Promise<{ access_token: string; user: AccessContext }> {
        const email = profile.email;
        if (!email) {
            throw new UnauthorizedException('Email is required');
        }

        // Get or create organization (for multi-tenant cloud, or single org for on-prem)
        let org = await this.prisma.organization.findFirst({
            where: { type: 'cloud' } // Default org for cloud deployments
        });

        if (!org) {
            // Create default organization
            org = await this.prisma.organization.create({
                data: {
                    name: 'Default Organization',
                    slug: 'default',
                    type: 'cloud',
                    authMode: 'SSO_MANAGED'
                }
            });
        }

        // Find or create user
        let user = await this.prisma.user.findFirst({
            where: {
                orgId: org.id,
                email: email
            }
        });

        const isNewUser = !user;

        if (!user) {
            // Check if this is the bootstrap superuser
            const shouldBeSuperuser = await this.checkBootstrapSuperuser(
                org.id,
                email,
                idpGroups
            );

            user = await this.prisma.user.create({
                data: {
                    orgId: org.id,
                    email,
                    name: profile.name || null,
                    picture: profile.picture || null,
                    idp: provider,
                    idpSub: profile.sub || email,
                    globalRole: shouldBeSuperuser ? GlobalRole.SUPERUSER : GlobalRole.USER,
                    status: UserStatus.ACTIVE,
                    lastLoginAt: new Date()
                }
            });

            if (shouldBeSuperuser) {
                await this.auditService.log({
                    orgId: org.id,
                    actorId: user.id,
                    action: 'BOOTSTRAP_SUPERUSER_CREATED',
                    targetType: 'user',
                    targetId: user.id,
                    metadata: { email, provider }
                });

                // Mark bootstrap as completed
                await this.prisma.organization.update({
                    where: { id: org.id },
                    data: { bootstrapCompleted: true }
                });
            }
        } else {
            // Update last login
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLoginAt: new Date(),
                    picture: profile.picture || user.picture,
                    name: profile.name || user.name
                }
            });
        }

        // Check if user is active
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('User account is not active');
        }

        // Resolve access context
        const accessContext = await this.accessContextService.resolveAccessContext(
            user.id,
            idpGroups
        );

        // Generate JWT
        const token = this.generateToken(accessContext);

        // Audit log
        await this.auditService.log({
            orgId: org.id,
            actorId: user.id,
            action: isNewUser ? 'USER_CREATED' : 'LOGIN',
            targetType: 'user',
            targetId: user.id,
            metadata: { provider, isNewUser }
        });

        return {
            access_token: token,
            user: accessContext
        };
    }

    /**
     * Check if this user should be the bootstrap superuser
     */
    private async checkBootstrapSuperuser(
        orgId: string,
        email: string,
        idpGroups?: string[]
    ): Promise<boolean> {
        const org = await this.prisma.organization.findUnique({
            where: { id: orgId }
        });

        if (!org || org.bootstrapCompleted) {
            return false;
        }

        // Check email-based bootstrap (SSO-only mode)
        if (org.bootstrapSuperuserEmail && 
            org.bootstrapSuperuserEmail.toLowerCase() === email.toLowerCase()) {
            this.logger.log(`Bootstrap superuser matched by email: ${email}`);
            return true;
        }

        // Check group-based bootstrap (IAM mode)
        if (org.bootstrapSuperuserGroupId && 
            idpGroups && 
            idpGroups.includes(org.bootstrapSuperuserGroupId)) {
            this.logger.log(`Bootstrap superuser matched by group: ${org.bootstrapSuperuserGroupId}`);
            return true;
        }

        return false;
    }

    /**
     * Generate JWT with access context claims
     */
    private generateToken(accessContext: AccessContext): string {
        const payload = {
            sub: accessContext.userId,
            orgId: accessContext.orgId,
            email: accessContext.email,
            name: accessContext.name,
            globalRole: accessContext.globalRole,
            namespaces: accessContext.namespaces
        };

        return this.jwtService.sign(payload);
    }

    /**
     * DEV ONLY: Login as any user by email
     */
    async devLogin(email: string): Promise<{ access_token: string; user: AccessContext }> {
        if (process.env.NODE_ENV === 'production') {
            throw new UnauthorizedException('Dev login disabled in production');
        }

        // Get default org
        let org = await this.prisma.organization.findFirst({
            where: { type: 'cloud' }
        });

        if (!org) {
            org = await this.prisma.organization.create({
                data: {
                    name: 'Default Organization',
                    slug: 'default',
                    type: 'cloud',
                    authMode: 'SSO_MANAGED'
                }
            });
        }

        let user = await this.prisma.user.findFirst({
            where: { orgId: org.id, email }
        });

        const isNewUser = !user;

        if (!user) {
            // For dev, create user on the fly
            const isSuperEmail = email === 'super@senfo.ai';
            const isAdminEmail = email === 'admin@meta.com';

            user = await this.prisma.user.create({
                data: {
                    orgId: org.id,
                    email,
                    name: email.split('@')[0],
                    idp: 'local',
                    idpSub: email,
                    globalRole: isSuperEmail ? GlobalRole.SUPERUSER : 
                               isAdminEmail ? GlobalRole.ADMIN : GlobalRole.USER,
                    status: UserStatus.ACTIVE,
                    lastLoginAt: new Date()
                }
            });
        } else {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });
        }
        const accessContext = await this.accessContextService.resolveAccessContext(user.id);
        const token = this.generateToken(accessContext);

        // Audit log for dev login
        await this.auditService.log({
            orgId: org.id,
            actorId: user.id,
            action: isNewUser ? 'USER_CREATED' : 'LOGIN',
            targetType: 'user',
            targetId: user.id,
            metadata: { provider: 'dev', email }
        });

        return {
            access_token: token,
            user: accessContext
        };
    }

    /**
     * Refresh access context (re-evaluate permissions)
     */
    async refreshAccessContext(userId: string): Promise<{ access_token: string; user: AccessContext }> {
        const accessContext = await this.accessContextService.resolveAccessContext(userId);
        const token = this.generateToken(accessContext);
        return { access_token: token, user: accessContext };
    }
}
