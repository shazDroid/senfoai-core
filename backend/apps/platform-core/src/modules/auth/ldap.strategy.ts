import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy from 'passport-ldapauth';
import { ConfigService } from '@nestjs/config';

interface LdapProfile {
    mail?: string;
    cn?: string;
    displayName?: string;
    dn?: string;
    memberOf?: string[];  // AD groups
}

@Injectable()
export class LdapStrategy extends PassportStrategy(Strategy, 'ldap') {
    constructor(configService: ConfigService) {
        super({
            passReqToCallback: true,
            server: {
                url: configService.get<string>('LDAP_URL') || 'ldap://localhost:389',
                bindDN: configService.get<string>('LDAP_BIND_DN') || '',
                bindCredentials: configService.get<string>('LDAP_BIND_CREDENTIALS') || '',
                searchBase: configService.get<string>('LDAP_SEARCH_BASE') || 'dc=example,dc=org',
                searchFilter: '(mail={{username}})', // Login via email
                searchAttributes: ['displayName', 'mail', 'cn', 'memberOf'],
            },
        });
    }

    async validate(req: any, profile: LdapProfile) {
        // Profile contains LDAP attributes
        // Return the profile - actual user creation/login handled by AuthController
        if (!profile || !profile.mail) {
            throw new UnauthorizedException('LDAP authentication failed');
        }
        
        return {
            email: profile.mail,
            name: profile.displayName || profile.cn,
            dn: profile.dn,
            memberOf: profile.memberOf || []  // AD groups for IAM mapping
        };
    }
}
