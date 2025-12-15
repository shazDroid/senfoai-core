import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AccessContext, NamespaceAccess } from './access-context.service';
import { GlobalRole } from '@prisma/client';

export interface JwtPayload {
    sub: string;          // userId
    orgId: string;
    email: string;
    name: string | null;
    globalRole: GlobalRole;
    namespaces: NamespaceAccess[];
    iat: number;
    exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'super_secret_for_dev_only',
        });
    }

    async validate(payload: JwtPayload): Promise<AccessContext> {
        if (!payload.sub || !payload.orgId) {
            throw new UnauthorizedException('Invalid token payload');
        }

        // Reconstruct AccessContext from JWT payload
        const accessContext: AccessContext = {
            userId: payload.sub,
            orgId: payload.orgId,
            email: payload.email,
            name: payload.name,
            globalRole: payload.globalRole,
            namespaces: payload.namespaces || [],
            isSuperuser: payload.globalRole === GlobalRole.SUPERUSER
        };

        return accessContext;
    }
}
