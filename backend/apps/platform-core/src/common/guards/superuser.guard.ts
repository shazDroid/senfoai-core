import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { GlobalRole } from '@prisma/client';
import { AccessContext } from '../../modules/auth/access-context.service';

@Injectable()
export class SuperuserGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user: AccessContext = request.user;

        if (!user) {
            throw new ForbiddenException('Authentication required');
        }

        if (user.globalRole !== GlobalRole.SUPERUSER) {
            throw new ForbiddenException('Superuser access required');
        }

        return true;
    }
}

