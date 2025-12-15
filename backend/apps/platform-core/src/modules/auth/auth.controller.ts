import { Controller, Get, Req, Res, UseGuards, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AccessContext } from './access-context.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    // ============================================
    // GOOGLE OAUTH
    // ============================================

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req) { }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req, @Res() res) {
        const profile = req.user;
        const { access_token } = await this.authService.validateOAuthLogin(
            {
                email: profile.email,
                name: profile.name,
                picture: profile.picture,
                sub: profile.id,
                groups: profile.groups // If IdP provides groups
            },
            'google',
            profile.groups
        );
        // In production, use env variable for frontend URL
        res.redirect(`http://localhost:5173/auth/callback?token=${access_token}`);
    }

    // ============================================
    // LDAP/ACTIVE DIRECTORY
    // ============================================

    @Post('ldap/login')
    @UseGuards(AuthGuard('ldap'))
    async ldapLogin(@Req() req) {
        const profile = req.user;
        return this.authService.validateOAuthLogin(
            {
                email: profile.email,
                name: profile.name,
                sub: profile.dn || profile.email,
                groups: profile.memberOf // AD groups
            },
            'ldap',
            profile.memberOf
        );
    }

    // ============================================
    // DEV LOGIN (Development Only)
    // ============================================

    @Post('dev/login')
    async devLogin(@Body('email') email: string) {
        if (!email) {
            throw new UnauthorizedException('Email is required');
        }
        return this.authService.devLogin(email);
    }

    // ============================================
    // TOKEN REFRESH
    // ============================================

    @Post('refresh')
    @UseGuards(AuthGuard('jwt'))
    async refreshToken(@Req() req: { user: AccessContext }) {
        return this.authService.refreshAccessContext(req.user.userId);
    }

    // ============================================
    // CURRENT USER INFO
    // ============================================

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getCurrentUser(@Req() req: { user: AccessContext }) {
        return req.user;
    }

    // ============================================
    // LOGOUT
    // ============================================

    @Post('logout')
    @UseGuards(AuthGuard('jwt'))
    async logout(@Req() req: { user: AccessContext }) {
        // Log logout event for audit
        // Note: Since JWTs are stateless, we can't invalidate them server-side
        // In production, you might want to implement token blacklisting
        return { message: 'Logged out successfully' };
    }
}
