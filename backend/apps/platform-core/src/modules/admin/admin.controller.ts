import {
    Controller, Post, Get, Delete, Put, Body, Param, Query,
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
    constructor(private adminService: AdminService) { }

    // ============================================
    // REPOSITORY MANAGEMENT (Admin Only)
    // ============================================

    @Post('repos')
    @UseGuards(NamespaceAdminGuard)
    async addRepository(
        @Req() req: { user: AccessContext },
        @Body() body: { name: string; gitUrl: string; defaultBranch?: string; namespaceIds: string[] }
    ) {
        if (!body.namespaceIds || body.namespaceIds.length === 0) {
            throw new HttpException('At least one namespace is required', HttpStatus.BAD_REQUEST);
        }
        return this.adminService.addRepository(
            req.user.orgId,
            req.user.userId,
            body.namespaceIds,
            body
        );
    }

    @Put('repos/:repoId/namespaces')
    @UseGuards(NamespaceAdminGuard)
    async updateRepositoryNamespaces(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string,
        @Body() body: { namespaceIds: string[] }
    ) {
        if (!body.namespaceIds || body.namespaceIds.length === 0) {
            throw new HttpException('At least one namespace is required', HttpStatus.BAD_REQUEST);
        }
        return this.adminService.updateRepositoryNamespaces(
            req.user.orgId,
            req.user.userId,
            repoId,
            body.namespaceIds
        );
    }

    @Delete('repos/:repoId')
    async requestDeleteRepository(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string
    ) {
        return this.adminService.requestDeleteRepository(
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

    // ============================================
    // USER MANAGEMENT (Admin - Namespace-scoped)
    // ============================================

    @Get('users')
    async getUsersInNamespaces(
        @Req() req: { user: AccessContext }
    ) {
        return this.adminService.getUsersInAdminNamespaces(
            req.user.orgId,
            req.user.userId
        );
    }

    @Post('namespaces/:namespaceId/users')
    @UseGuards(NamespaceAdminGuard)
    async createUserAndAssign(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string,
        @Body() body: { email: string; name?: string; namespaceRole?: 'ADMIN' | 'USER' }
    ) {
        return this.adminService.createUserAndAssign(
            req.user.orgId,
            req.user.userId,
            namespaceId,
            body.email,
            body.name,
            body.namespaceRole || 'USER'
        );
    }

    // ============================================
    // STATISTICS
    // ============================================

    @Get('stats')
    async getStats(@Req() req: { user: AccessContext }) {
        return this.adminService.getStats(req.user.orgId, req.user.userId);
    }

    @Get('repos')
    async getAllRepositories(@Req() req: { user: AccessContext }) {
        return this.adminService.getAllRepositories(req.user.orgId, req.user.userId);
    }
}
