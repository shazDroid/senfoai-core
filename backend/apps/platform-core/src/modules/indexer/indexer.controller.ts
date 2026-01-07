import { Controller, Post, Get, Param, Query, Req, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IndexerService } from './indexer.service';

interface AccessContext {
    userId: string;
    orgId: string;
    email: string;
    role: string;
}

/**
 * IndexerController
 * REST endpoints for triggering and monitoring indexing operations
 */
@Controller('repos')
@UseGuards(AuthGuard('jwt'))
export class IndexerController {
    constructor(private readonly indexerService: IndexerService) { }

    /**
     * Trigger indexing for a repository
     * POST /repos/:repoId/index/run?force=true|false
     */
    @Post(':repoId/index/run')
    async runIndex(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string,
        @Query('force') force?: string
    ) {
        const result = await this.indexerService.runIndex(repoId, {
            force: force === 'true'
        });

        if (!result.success) {
            throw new HttpException(result.error || 'Indexing failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return result;
    }

    /**
     * Get indexing status for a repository
     * GET /repos/:repoId/index/status
     */
    @Get(':repoId/index/status')
    async getStatus(
        @Req() req: { user: AccessContext },
        @Param('repoId') repoId: string
    ) {
        return this.indexerService.getStatus(repoId);
    }
}
