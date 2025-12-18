import {
    Controller, Post, Get, Patch, Delete, Put, Body, Param, Query,
    UseGuards, Req, HttpException, HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperService } from './super.service';
import { SuperuserGuard } from '../../common/guards/superuser.guard';
import { AccessContext } from '../auth/access-context.service';

@Controller('super')
@UseGuards(AuthGuard('jwt'), SuperuserGuard)
export class SuperController {
    constructor(private superService: SuperService) { }

    // ============================================
    // NAMESPACE MANAGEMENT
    // ============================================

    @Post('namespaces')
    async createNamespace(
        @Req() req: { user: AccessContext },
        @Body() body: { name: string; description?: string }
    ) {
        return this.superService.createNamespace(
            req.user.orgId,
            req.user.userId,
            body.name,
            body.description
        );
    }

    @Get('namespaces')
    async getNamespaces(@Req() req: { user: AccessContext }) {
        return this.superService.getAllNamespaces(req.user.orgId);
    }

    @Get('namespaces/:id')
    async getNamespace(
        @Req() req: { user: AccessContext },
        @Param('id') namespaceId: string
    ) {
        return this.superService.getNamespace(req.user.orgId, namespaceId);
    }

    // ============================================
    // IAM GROUP MAPPINGS
    // ============================================

    @Post('iam-group-mappings')
    async createIamGroupMapping(
        @Req() req: { user: AccessContext },
        @Body() body: {
            idp: string;
            groupId: string;
            groupName?: string;
            namespaceId?: string;
            namespaceRole?: 'ADMIN' | 'USER';
            grantsGlobalRole?: 'SUPERUSER';
        }
    ) {
        return this.superService.createIamGroupMapping(
            req.user.orgId,
            req.user.userId,
            body
        );
    }

    @Get('iam-group-mappings')
    async getIamGroupMappings(@Req() req: { user: AccessContext }) {
        return this.superService.getIamGroupMappings(req.user.orgId);
    }

    @Delete('iam-group-mappings/:id')
    async deleteIamGroupMapping(
        @Req() req: { user: AccessContext },
        @Param('id') mappingId: string
    ) {
        return this.superService.deleteIamGroupMapping(
            req.user.orgId,
            req.user.userId,
            mappingId
        );
    }

    // ============================================
    // NAMESPACE MEMBERSHIP MANAGEMENT
    // ============================================

    @Post('namespaces/:namespaceId/members')
    async assignNamespaceMember(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string,
        @Body() body: { userId: string; role: 'ADMIN' | 'USER' }
    ) {
        return this.superService.assignNamespaceMember(
            req.user.orgId,
            req.user.userId,
            namespaceId,
            body.userId,
            body.role
        );
    }

    @Delete('namespaces/:namespaceId/members/:userId')
    async removeNamespaceMember(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string,
        @Param('userId') userId: string
    ) {
        return this.superService.removeNamespaceMember(
            req.user.orgId,
            req.user.userId,
            namespaceId,
            userId
        );
    }

    @Get('namespaces/:namespaceId/members')
    async getNamespaceMembers(
        @Req() req: { user: AccessContext },
        @Param('namespaceId') namespaceId: string
    ) {
        return this.superService.getNamespaceMembers(req.user.orgId, namespaceId);
    }

    // ============================================
    // USER MANAGEMENT
    // ============================================

    @Post('users')
    async createUser(
        @Req() req: { user: AccessContext },
        @Body() body: {
            email: string;
            name?: string;
            globalRole?: 'SUPERUSER' | 'ADMIN' | 'USER';
            namespaceId?: string;
            namespaceRole?: 'ADMIN' | 'USER';
        }
    ) {
        return this.superService.createUser(
            req.user.orgId,
            req.user.userId,
            body
        );
    }

    @Get('users')
    async getAllUsers(
        @Req() req: { user: AccessContext },
        @Query('limit') limit?: string,
        @Query('offset') offset?: string
    ) {
        return this.superService.getAllUsers(
            req.user.orgId,
            parseInt(limit || '50'),
            parseInt(offset || '0')
        );
    }

    @Get('users/:id')
    async getUser(
        @Req() req: { user: AccessContext },
        @Param('id') userId: string
    ) {
        return this.superService.getUser(req.user.orgId, userId);
    }

    @Patch('users/:id/global-role')
    async updateUserGlobalRole(
        @Req() req: { user: AccessContext },
        @Param('id') userId: string,
        @Body() body: { globalRole: 'SUPERUSER' | 'ADMIN' | 'USER' }
    ) {
        // Get current user to check their role
        const currentUser = await this.superService.getUser(req.user.orgId, userId);

        // Only prevent demotion if user is currently a superuser and we're changing to non-superuser
        if (currentUser.globalRole === 'SUPERUSER' && body.globalRole !== 'SUPERUSER') {
            const canDemote = await this.superService.canDemoteSuperuser(
                req.user.orgId,
                userId
            );
            if (!canDemote) {
                throw new HttpException(
                    'Cannot remove the last superuser',
                    HttpStatus.BAD_REQUEST
                );
            }
        }

        return this.superService.updateUserGlobalRole(
            req.user.orgId,
            req.user.userId,
            userId,
            body.globalRole
        );
    }

    @Patch('users/:id/status')
    async updateUserStatus(
        @Req() req: { user: AccessContext },
        @Param('id') userId: string,
        @Body() body: { status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }
    ) {
        return this.superService.updateUserStatus(
            req.user.orgId,
            req.user.userId,
            userId,
            body.status
        );
    }

    // ============================================
    // AUDIT LOGS
    // ============================================

    @Get('audit-logs')
    async getAuditLogs(
        @Req() req: { user: AccessContext },
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('action') action?: string,
        @Query('actorId') actorId?: string
    ) {
        return this.superService.getAuditLogs(req.user.orgId, {
            limit: parseInt(limit || '50'),
            offset: parseInt(offset || '0'),
            action,
            actorId
        });
    }

    // ============================================
    // ORGANIZATION SETTINGS
    // ============================================

    @Get('organization')
    async getOrganization(@Req() req: { user: AccessContext }) {
        return this.superService.getOrganization(req.user.orgId);
    }

    @Patch('organization')
    async updateOrganization(
        @Req() req: { user: AccessContext },
        @Body() body: {
            name?: string;
            authMode?: 'IAM_GROUPS' | 'SSO_MANAGED' | 'HYBRID';
            bootstrapSuperuserEmail?: string;
            bootstrapSuperuserGroupId?: string;
        }
    ) {
        return this.superService.updateOrganization(
            req.user.orgId,
            req.user.userId,
            body
        );
    }

    // ============================================
    // SYSTEM HEALTH
    // ============================================

    @Get('health')
    async health() {
        return this.superService.getSystemHealth();
    }

    // ============================================
    // STATISTICS
    // ============================================

    @Get('stats')
    async getStats(@Req() req: { user: AccessContext }) {
        return this.superService.getStats(req.user.orgId);
    }

    // ============================================
    // REPOSITORY MANAGEMENT (Superuser - All Namespaces)
    // ============================================

    @Post('repos')
    async addRepository(
        @Req() req: { user: AccessContext },
        @Body() body: { name: string; gitUrl: string; defaultBranch?: string; namespaceIds: string[] }
    ) {
        if (!body.namespaceIds || body.namespaceIds.length === 0) {
            throw new HttpException('At least one namespace is required', HttpStatus.BAD_REQUEST);
        }
        return this.superService.addRepository(
            req.user.orgId,
            req.user.userId,
            body.namespaceIds,
            body
        );
    }

    @Get('repos')
    async getAllRepositories(@Req() req: { user: AccessContext }) {
        return this.superService.getAllRepositories(req.user.orgId);
    }

    @Delete('repos/:repoId')
    async removeRepository(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string
    ) {
        return this.superService.removeRepository(
            req.user.orgId,
            req.user.userId,
            repoId
        );
    }

    @Post('repos/:repoId/scan')
    async triggerScan(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string
    ) {
        return this.superService.triggerScan(
            req.user.orgId,
            req.user.userId,
            repoId
        );
    }

    @Put('repos/:repoId/namespaces')
    async updateRepositoryNamespaces(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string,
        @Body() body: { namespaceIds: string[] }
    ) {
        if (!body.namespaceIds || body.namespaceIds.length === 0) {
            throw new HttpException('At least one namespace is required', HttpStatus.BAD_REQUEST);
        }
        return this.superService.updateRepositoryNamespaces(
            req.user.orgId,
            req.user.userId,
            repoId,
            body.namespaceIds
        );
    }

    // ============================================
    // DELETION APPROVAL WORKFLOW
    // ============================================

    @Get('pending-deletions')
    async getPendingDeletions(@Req() req: { user: AccessContext }) {
        return this.superService.getPendingDeletions(req.user.orgId);
    }

    @Post('repos/:repoId/approve-delete')
    async approveDeletion(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string
    ) {
        return this.superService.approveDeletion(
            req.user.orgId,
            req.user.userId,
            repoId
        );
    }

    @Post('repos/:repoId/reject-delete')
    async rejectDeletion(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string
    ) {
        return this.superService.rejectDeletion(
            req.user.orgId,
            req.user.userId,
            repoId
        );
    }
}
