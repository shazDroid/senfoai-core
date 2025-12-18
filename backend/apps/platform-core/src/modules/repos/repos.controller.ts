// apps/platform-core/src/modules/repos/repos.controller.ts
// Repository management controller with branch detection and sync endpoints

import {
    Controller, Post, Get, Put, Delete, Body, Param, Query,
    UseGuards, Req, HttpException, HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReposService } from './repos.service';
import {
    CreateRepositoryDto,
    UpdateRepositoryDto,
    UpdateSyncSettingsDto,
    DetectBranchRequestDto
} from './dto/create-repo.dto';
import { AccessContext } from '../auth/access-context.service';

@Controller('repos')
@UseGuards(AuthGuard('jwt'))
export class ReposController {
    constructor(private reposService: ReposService) { }

    // ============================================
    // BRANCH DETECTION (for Import Modal)
    // ============================================

    /**
     * Detect branches and default branch for a repository URL
     * Used by frontend before import to populate branch dropdown
     */
    @Post('detect-branches')
    async detectBranches(@Body() body: DetectBranchRequestDto) {
        if (!body.gitUrl) {
            throw new HttpException('Git URL is required', HttpStatus.BAD_REQUEST);
        }
        return this.reposService.detectBranches(body.gitUrl);
    }

    // ============================================
    // REPOSITORY CRUD
    // ============================================

    /**
     * Create a new repository
     */
    @Post()
    async createRepository(
        @Req() req: { user: AccessContext },
        @Body() dto: CreateRepositoryDto
    ) {
        if (!dto.namespaceIds || dto.namespaceIds.length === 0) {
            throw new HttpException('At least one namespace is required', HttpStatus.BAD_REQUEST);
        }
        return this.reposService.createRepository(
            req.user.orgId,
            req.user.userId,
            dto
        );
    }

    /**
     * Get all repositories for the user's organization
     */
    @Get()
    async getRepositories(
        @Req() req: { user: AccessContext },
        @Query('namespaceId') namespaceId?: string
    ) {
        return this.reposService.getRepositoriesByOrg(req.user.orgId, {
            namespaceId,
            includeNamespaces: true
        });
    }

    /**
     * Get a specific repository by ID
     */
    @Get(':repoId')
    async getRepository(@Param('repoId') repoId: string) {
        return this.reposService.getRepositoryById(repoId);
    }

    /**
     * Update repository settings
     */
    @Put(':repoId')
    async updateRepository(
        @Param('repoId') repoId: string,
        @Body() dto: UpdateRepositoryDto
    ) {
        return this.reposService.updateRepository(repoId, dto);
    }

    /**
     * Delete a repository
     */
    @Delete(':repoId')
    async deleteRepository(@Param('repoId') repoId: string) {
        await this.reposService.deleteRepository(repoId);
        return { success: true, message: 'Repository deleted' };
    }

    // ============================================
    // SYNC MANAGEMENT
    // ============================================

    /**
     * Get sync status for a repository
     */
    @Get(':repoId/sync/status')
    async getSyncStatus(@Param('repoId') repoId: string) {
        return this.reposService.getSyncStatus(repoId);
    }

    /**
     * Update sync settings (enable/disable realtime sync)
     */
    @Put(':repoId/sync/settings')
    async updateSyncSettings(
        @Param('repoId') repoId: string,
        @Body() dto: UpdateSyncSettingsDto
    ) {
        return this.reposService.updateSyncSettings(repoId, dto);
    }

    /**
     * Trigger manual sync/refresh (pull latest commits)
     */
    @Post(':repoId/sync/refresh')
    async triggerManualSync(@Param('repoId') repoId: string) {
        return this.reposService.triggerManualSync(repoId);
    }
}
