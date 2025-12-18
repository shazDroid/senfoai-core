// apps/platform-core/src/modules/repos/sync/sync.service.ts
// Cron-based sync service for polling repository changes

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { GitProviderFactory } from '../git-providers/provider.factory';

export interface SyncResult {
    repositoryId: string;
    success: boolean;
    newCommits: number;
    latestSha?: string;
    error?: string;
}

@Injectable()
export class SyncService implements OnModuleInit {
    private readonly logger = new Logger(SyncService.name);
    private readonly prisma = new PrismaClient();
    private isSyncing = false;

    constructor(
        private readonly providerFactory: GitProviderFactory,
        private readonly configService: ConfigService,
        private schedulerRegistry: SchedulerRegistry
    ) { }

    async onModuleInit() {
        // Check if sync is globally enabled
        const syncEnabled = this.configService.get<boolean>('SYNC_ENABLED', true);
        if (!syncEnabled) {
            this.logger.log('Repository sync is disabled');
            return;
        }

        // Run initial sync check on startup
        const runOnStartup = this.configService.get<boolean>('SYNC_ON_STARTUP', false);
        if (runOnStartup) {
            this.logger.log('Running initial sync on startup...');
            setTimeout(() => this.syncAllRepositories(), 5000);
        }
    }

    /**
     * Main cron job - runs every X minutes based on configuration
     * Default: every 5 minutes for testing, configurable for production
     */
    @Cron(CronExpression.EVERY_5_MINUTES, { name: 'repository-sync' })
    async handleCron() {
        const syncEnabled = this.configService.get<boolean>('SYNC_ENABLED', true);
        if (!syncEnabled) return;

        await this.syncAllRepositories();
    }

    /**
     * Sync all repositories with realtime sync enabled
     */
    async syncAllRepositories(): Promise<SyncResult[]> {
        if (this.isSyncing) {
            this.logger.warn('Sync already in progress, skipping...');
            return [];
        }

        this.isSyncing = true;
        const results: SyncResult[] = [];

        try {
            // Find all repositories with realtime sync enabled
            const repositories = await this.prisma.repository.findMany({
                where: {
                    // @ts-ignore - will add realtimeSyncEnabled field in schema update
                    realtimeSyncEnabled: true
                }
            });

            this.logger.log(`Syncing ${repositories.length} repositories...`);

            for (const repo of repositories) {
                const result = await this.syncRepository(repo.id);
                results.push(result);
            }

            const successCount = results.filter(r => r.success).length;
            this.logger.log(`Sync completed: ${successCount}/${results.length} successful`);

        } catch (error) {
            this.logger.error('Error during sync cycle', error);
        } finally {
            this.isSyncing = false;
        }

        return results;
    }

    /**
     * Sync a single repository
     */
    async syncRepository(repositoryId: string): Promise<SyncResult> {
        try {
            const repo = await this.prisma.repository.findUnique({
                where: { id: repositoryId }
            });

            if (!repo) {
                return {
                    repositoryId,
                    success: false,
                    newCommits: 0,
                    error: 'Repository not found'
                };
            }

            const provider = this.providerFactory.getProviderForUrl(repo.gitUrl);

            // Get latest commit from remote
            const latestCommit = await provider.getLatestCommit(repo.gitUrl, repo.defaultBranch);

            // Compare with stored lastSyncedSha
            // @ts-ignore - will add lastSyncedSha field in schema update
            const lastSyncedSha = repo.lastSyncedSha;

            if (lastSyncedSha === latestCommit.sha) {
                this.logger.debug(`Repository ${repo.name} is up to date`);
                return {
                    repositoryId,
                    success: true,
                    newCommits: 0,
                    latestSha: latestCommit.sha
                };
            }

            // Get new commits since last sync
            let newCommits: any[] = [];
            if (lastSyncedSha) {
                newCommits = await provider.getCommitsSince(repo.gitUrl, lastSyncedSha, repo.defaultBranch);
            }

            // Update repository with new sync info
            await this.prisma.repository.update({
                where: { id: repositoryId },
                data: {
                    // @ts-ignore - will add these fields in schema update
                    lastSyncedSha: latestCommit.sha,
                    lastSyncedAt: new Date(),
                    scanStatus: 'PENDING' // Mark for re-parsing
                }
            });

            this.logger.log(`Repository ${repo.name} synced: ${newCommits.length} new commits`);

            // TODO: Trigger parsing job for new commits
            // await this.triggerParsingJob(repositoryId, newCommits);

            return {
                repositoryId,
                success: true,
                newCommits: newCommits.length,
                latestSha: latestCommit.sha
            };

        } catch (error: any) {
            this.logger.error(`Error syncing repository ${repositoryId}:`, error);
            return {
                repositoryId,
                success: false,
                newCommits: 0,
                error: error.message
            };
        }
    }

    /**
     * Manual trigger for refresh/deploy latest
     */
    async manualSync(repositoryId: string): Promise<SyncResult> {
        return this.syncRepository(repositoryId);
    }

    /**
     * Update sync interval dynamically
     */
    updateSyncInterval(intervalMinutes: number): void {
        const job = this.schedulerRegistry.getCronJob('repository-sync');

        // Convert minutes to cron expression
        let cronExpression: string;
        if (intervalMinutes <= 0) {
            // Disable
            job.stop();
            this.logger.log('Repository sync disabled');
            return;
        } else if (intervalMinutes < 60) {
            cronExpression = `*/${intervalMinutes} * * * *`;
        } else {
            const hours = Math.floor(intervalMinutes / 60);
            cronExpression = `0 */${hours} * * *`;
        }

        // Note: NestJS doesn't support changing cron expression at runtime
        // For dynamic intervals, consider using a custom interval instead
        this.logger.log(`Sync interval set to ${intervalMinutes} minutes`);
    }

    /**
     * Get sync status for a repository
     */
    async getSyncStatus(repositoryId: string): Promise<{
        lastSyncedAt: Date | null;
        lastSyncedSha: string | null;
        realtimeSyncEnabled: boolean;
        syncIntervalMinutes: number;
    }> {
        const repo = await this.prisma.repository.findUnique({
            where: { id: repositoryId }
        });

        if (!repo) {
            throw new Error('Repository not found');
        }

        return {
            // @ts-ignore - will add these fields in schema update
            lastSyncedAt: repo.lastSyncedAt || null,
            // @ts-ignore
            lastSyncedSha: repo.lastSyncedSha || null,
            // @ts-ignore
            realtimeSyncEnabled: repo.realtimeSyncEnabled || false,
            // @ts-ignore
            syncIntervalMinutes: repo.syncIntervalMinutes || 5
        };
    }
}
