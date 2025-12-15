import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private configService: ConfigService,
        private authService: AuthService
    ) {
        super({
            clientID: configService.get('GOOGLE_CLIENT_ID') || 'mock',
            clientSecret: configService.get('GOOGLE_CLIENT_SECRET') || 'mock',
            callbackURL: 'http://localhost:3000/auth/google/callback',
            scope: ['email', 'profile'],
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
        const user = await this.authService.validateOAuthLogin(profile, 'google');
        done(null, user);
    }
}
