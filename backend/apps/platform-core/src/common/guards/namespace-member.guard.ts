import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { AccessContext } from '../../modules/auth/access-context.service';

@Injectable()
export class NamespaceMemberGuard implements CanActivate {
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

        // Get namespace ID from header, params, or body
        const namespaceId = 
            request.headers['x-namespace-id'] || 
            request.params?.namespaceId ||
            request.body?.namespaceId;

        if (!namespaceId) {
            throw new ForbiddenException('Namespace ID required');
        }

        // Check if user has any access to this namespace (USER or ADMIN)
        const membership = user.namespaces.find(ns => ns.id === namespaceId);

        if (!membership) {
            throw new ForbiddenException('Access to this namespace denied');
        }

        return true;
    }
}

