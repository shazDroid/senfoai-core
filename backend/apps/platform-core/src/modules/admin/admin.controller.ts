import { 
    Controller, Post, Get, Delete, Body, Param, Query,
    UseGuards, Req, HttpException, HttpStatus 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { NamespaceAdminGuard } from '../../common/guards/namespace-admin.guard';
import { NamespaceMemberGuard } from '../../common/guards/namespace-member.guard';
import { AccessContext } from '../auth/access-context.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
    constructor(private adminService: AdminService) {}

    // ============================================
    // REPOSITORY MANAGEMENT (Admin Only)
    // ============================================

    @Post('namespaces/:namespaceId/repos')
    @UseGuards(NamespaceAdminGuard)
    async addRepository(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string,
        @Body() body: { name: string; gitUrl: string; defaultBranch?: string }
    ) {
        return this.adminService.addRepository(
            req.user.orgId,
            req.user.userId,
            namespaceId,
            body
        );
    }

    @Delete('repos/:repoId')
    @UseGuards(NamespaceAdminGuard)
    async removeRepository(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string
    ) {
        return this.adminService.removeRepository(
            req.user.orgId,
            req.user.userId,
            repoId
        );
    }

    @Post('repos/:repoId/scan')
    @UseGuards(NamespaceAdminGuard)
    async triggerScan(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string
    ) {
        return this.adminService.triggerScan(
            req.user.orgId,
            req.user.userId,
            repoId
        );
    }

    @Get('namespaces/:namespaceId/repos')
    @UseGuards(NamespaceMemberGuard)
    async getNamespaceRepos(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string
    ) {
        return this.adminService.getNamespaceRepos(req.user.orgId, namespaceId);
    }

    // ============================================
    // NAMESPACE MEMBER MANAGEMENT (Admin Only)
    // ============================================

    @Post('namespaces/:namespaceId/members')
    @UseGuards(NamespaceAdminGuard)
    async assignMember(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string,
        @Body() body: { userId: string; role: 'ADMIN' | 'USER' }
    ) {
        return this.adminService.assignMember(
            req.user.orgId,
            req.user.userId,
            namespaceId,
            body.userId,
            body.role
        );
    }

    @Delete('namespaces/:namespaceId/members/:userId')
    @UseGuards(NamespaceAdminGuard)
    async removeMember(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string,
        @Param('userId') userId: string
    ) {
        return this.adminService.removeMember(
            req.user.orgId,
            req.user.userId,
            namespaceId,
            userId
        );
    }

    @Get('namespaces/:namespaceId/members')
    @UseGuards(NamespaceMemberGuard)
    async getMembers(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string
    ) {
        return this.adminService.getMembers(req.user.orgId, namespaceId);
    }

    // ============================================
    // USER INVITATION (Optional - SSO-Managed Mode)
    // ============================================

    @Post('namespaces/:namespaceId/invites')
    @UseGuards(NamespaceAdminGuard)
    async inviteUser(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string,
        @Body() body: { email: string; role?: 'ADMIN' | 'USER' }
    ) {
        return this.adminService.inviteUser(
            req.user.orgId,
            req.user.userId,
            namespaceId,
            body.email,
            body.role || 'USER'
        );
    }
}
