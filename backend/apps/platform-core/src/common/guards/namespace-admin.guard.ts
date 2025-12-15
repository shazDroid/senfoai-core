import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GlobalRole, NamespaceRole } from '@prisma/client';
import { AccessContext } from '../../modules/auth/access-context.service';

@Injectable()
export class NamespaceAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user: AccessContext = request.user;

        if (!user) {
            throw new ForbiddenException('Authentication required');
        }

        // Superuser bypasses all namespace checks
        if (user.globalRole === GlobalRole.SUPERUSER) {
            return true;
        }

        // Get namespace ID from header or body
        const namespaceId = 
            request.headers['x-namespace-id'] || 
            request.params?.namespaceId ||
            request.body?.namespaceId;

        if (!namespaceId) {
            throw new ForbiddenException('Namespace ID required');
        }

        // Check if user has admin access to this namespace
        const membership = user.namespaces.find(ns => ns.id === namespaceId);

        if (!membership) {
            throw new ForbiddenException('Access to this namespace denied');
        }

        if (membership.role !== NamespaceRole.ADMIN) {
            throw new ForbiddenException('Namespace admin access required');
        }

        return true;
    }
}
