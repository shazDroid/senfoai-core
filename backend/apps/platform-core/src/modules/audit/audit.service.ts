import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface AuditLogEntry {
    orgId: string;
    actorId?: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);
    private prisma = new PrismaClient();

    /**
     * Log an audit event
     */
    async log(entry: AuditLogEntry): Promise<void> {
        try {
            await this.prisma.auditLog.create({
                data: {
                    orgId: entry.orgId,
                    actorId: entry.actorId,
                    action: entry.action,
                    targetType: entry.targetType,
                    targetId: entry.targetId,
                    metadata: entry.metadata,
                    ipAddress: entry.ipAddress,
                    userAgent: entry.userAgent
                }
            });
            this.logger.debug(`Audit: ${entry.action} by ${entry.actorId}`);
        } catch (error) {
            this.logger.error(`Failed to write audit log: ${error}`);
            // Don't throw - audit failures shouldn't break the main flow
        }
    }

    /**
     * Get audit logs with pagination and filtering
     */
    async getLogs(
        orgId: string,
        options: {
            actorId?: string;
            action?: string;
            targetType?: string;
            startDate?: Date;
            endDate?: Date;
            limit?: number;
            offset?: number;
        } = {}
    ) {
        const where: any = { orgId };

        if (options.actorId) where.actorId = options.actorId;
        if (options.action) where.action = options.action;
        if (options.targetType) where.targetType = options.targetType;
        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) where.createdAt.gte = options.startDate;
            if (options.endDate) where.createdAt.lte = options.endDate;
        }

        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: options.limit || 50,
                skip: options.offset || 0,
                include: {
                    actor: {
                        select: { id: true, email: true, name: true }
                    }
                }
            }),
            this.prisma.auditLog.count({ where })
        ]);

        return { logs, total };
    }

    /**
     * Log predefined actions with proper typing
     */
    async logLogin(orgId: string, userId: string, metadata?: Record<string, any>) {
        await this.log({ orgId, actorId: userId, action: 'LOGIN', targetType: 'user', targetId: userId, metadata });
    }

    async logNamespaceCreated(orgId: string, actorId: string, namespaceId: string, metadata?: Record<string, any>) {
        await this.log({ orgId, actorId, action: 'NAMESPACE_CREATED', targetType: 'namespace', targetId: namespaceId, metadata });
    }

    async logMembershipAssigned(orgId: string, actorId: string, userId: string, metadata?: Record<string, any>) {
        await this.log({ orgId, actorId, action: 'MEMBERSHIP_ASSIGNED', targetType: 'user', targetId: userId, metadata });
    }

    async logMembershipRevoked(orgId: string, actorId: string, userId: string, metadata?: Record<string, any>) {
        await this.log({ orgId, actorId, action: 'MEMBERSHIP_REVOKED', targetType: 'user', targetId: userId, metadata });
    }

    async logGlobalRoleChanged(orgId: string, actorId: string, userId: string, metadata?: Record<string, any>) {
        await this.log({ orgId, actorId, action: 'GLOBAL_ROLE_CHANGED', targetType: 'user', targetId: userId, metadata });
    }

    async logRepoAdded(orgId: string, actorId: string, repoId: string, metadata?: Record<string, any>) {
        await this.log({ orgId, actorId, action: 'REPO_ADDED', targetType: 'repo', targetId: repoId, metadata });
    }

    async logRepoRemoved(orgId: string, actorId: string, repoId: string, metadata?: Record<string, any>) {
        await this.log({ orgId, actorId, action: 'REPO_REMOVED', targetType: 'repo', targetId: repoId, metadata });
    }

    async logAccessDenied(orgId: string, actorId: string, metadata?: Record<string, any>) {
        await this.log({ orgId, actorId, action: 'ACCESS_DENIED', metadata });
    }

    async logIamMappingCreated(orgId: string, actorId: string, mappingId: string, metadata?: Record<string, any>) {
        await this.log({ orgId, actorId, action: 'IAM_MAPPING_CREATED', targetType: 'iam_mapping', targetId: mappingId, metadata });
    }
}
