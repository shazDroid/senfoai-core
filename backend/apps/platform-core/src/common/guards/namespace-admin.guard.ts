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

        // Get namespace ID(s) from header, params, or body
        const namespaceId = 
            request.headers['x-namespace-id'] || 
            request.params?.namespaceId ||
            request.body?.namespaceId;
        
        const namespaceIds = request.body?.namespaceIds;

        // Handle both single namespaceId and multiple namespaceIds
        if (!namespaceId && (!namespaceIds || namespaceIds.length === 0)) {
            throw new ForbiddenException('Namespace ID required');
        }

        // If multiple namespaces are provided, check admin access to all of them
        if (namespaceIds && namespaceIds.length > 0) {
            const unauthorizedNamespaces = namespaceIds.filter(nsId => {
                const membership = user.namespaces.find(ns => ns.id === nsId);
                return !membership || membership.role !== NamespaceRole.ADMIN;
            });

            if (unauthorizedNamespaces.length > 0) {
                throw new ForbiddenException(`Namespace admin access required for all selected namespaces`);
            }

            return true;
        }

        // Single namespace check (backward compatibility)
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
