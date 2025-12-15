import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AccessContextService } from './access-context.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { AuditService } from '../audit/audit.service';

// Optional: LDAP strategy for on-prem
// import { LdapStrategy } from './ldap.strategy';

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'dev-secret-key',
                signOptions: { expiresIn: '24h' }, // Extended for better UX
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [
        AuthService, 
        AccessContextService,
        AuditService,
        GoogleStrategy, 
        JwtStrategy,
        // LdapStrategy, // Uncomment for on-prem LDAP
    ],
    controllers: [AuthController],
    exports: [AuthService, AccessContextService, JwtStrategy],
})
export class AuthModule { }
