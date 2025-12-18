// apps/platform-core/src/modules/repos/repos.service.ts
// Repository management service

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { GitProviderFactory } from './git-providers/provider.factory';
import { SyncService } from './sync/sync.service';
import {
    CreateRepositoryDto,
    UpdateRepositoryDto,
    UpdateSyncSettingsDto,
    DetectBranchResponseDto
} from './dto/create-repo.dto';

@Injectable()
export class ReposService {
    private readonly logger = new Logger(ReposService.name);
    private readonly prisma = new PrismaClient();

    constructor(
        private readonly providerFactory: GitProviderFactory,
        private readonly syncService: SyncService
    ) { }

    /**
     * Detect default branch and list all branches for a repository URL
     */
    async detectBranches(gitUrl: string): Promise<DetectBranchResponseDto> {
        try {
            const provider = this.providerFactory.getProviderForUrl(gitUrl);

            const [branches, defaultBranch] = await Promise.all([
                provider.listBranches(gitUrl),
                provider.getDefaultBranch(gitUrl)
            ]);

            return {
                defaultBranch,
                branches: branches.map(b => ({
                    name: b.name,
                    sha: b.sha,
                    isDefault: b.isDefault
                })),
                providerType: provider.getType()
            };
        } catch (error: any) {
            this.logger.error(`Failed to detect branches for ${gitUrl}:`, error);
            // Return fallback for public repos or when API fails
            return {
                defaultBranch: 'main',
                branches: [
                    { name: 'main', sha: '', isDefault: true },
                    { name: 'master', sha: '', isDefault: false }
                ],
                providerType: 'unknown'
            };
        }
    }

    /**
     * Create a new repository with auto-detected or specified branch
     */
    async createRepository(
        orgId: string,
        userId: string,
        dto: CreateRepositoryDto
    ): Promise<any> {
        // Auto-detect branch if not specified
        let defaultBranch = dto.defaultBranch;
        if (!defaultBranch || defaultBranch === 'auto') {
            try {
                const provider = this.providerFactory.getProviderForUrl(dto.gitUrl);
                defaultBranch = await provider.getDefaultBranch(dto.gitUrl);
            } catch {
                defaultBranch = 'main'; // Fallback
            }
        }

        // Validate access to repository
        try {
            const provider = this.providerFactory.getProviderForUrl(dto.gitUrl);
            const hasAccess = await provider.validateAccess(dto.gitUrl);
            if (!hasAccess) {
                throw new BadRequestException('Cannot access repository. Check URL and permissions.');
            }
        } catch (error: any) {
            if (error instanceof BadRequestException) throw error;
            this.logger.warn(`Could not validate repository access: ${error.message}`);
        }

        // Create repository
        const repo = await this.prisma.repository.create({
            data: {
                orgId,
                name: dto.name,
                gitUrl: dto.gitUrl,
                defaultBranch,
                addedById: userId,
                scanStatus: 'PENDING',
                // @ts-ignore - will add these fields in schema update
                realtimeSyncEnabled: dto.realtimeSyncEnabled || false,
                syncIntervalMinutes: dto.syncIntervalMinutes || 5
            }
        });

        // Create namespace associations
        for (const namespaceId of dto.namespaceIds) {
            await this.prisma.repositoryNamespace.create({
                data: {
                    orgId,
                    repositoryId: repo.id,
                    namespaceId
                }
            });
        }

        // If realtime sync enabled, trigger initial sync
        if (dto.realtimeSyncEnabled) {
            this.syncService.manualSync(repo.id).catch(err => {
                this.logger.error(`Initial sync failed for ${repo.id}:`, err);
            });
        }

        return this.getRepositoryById(repo.id);
    }

    /**
     * Get repository by ID with namespaces
     */
    async getRepositoryById(repoId: string): Promise<any> {
        const repo = await this.prisma.repository.findUnique({
            where: { id: repoId },
            include: {
                namespaces: {
                    include: {
                        namespace: true
                    }
                },
                addedBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });

        if (!repo) {
            throw new NotFoundException('Repository not found');
        }

        return {
            ...repo,
            namespaces: repo.namespaces.map(rn => rn.namespace)
        };
    }

    /**
     * Update repository settings
     */
    async updateRepository(repoId: string, dto: UpdateRepositoryDto): Promise<any> {
        const repo = await this.prisma.repository.findUnique({
            where: { id: repoId }
        });

        if (!repo) {
            throw new NotFoundException('Repository not found');
        }

        const updated = await this.prisma.repository.update({
            where: { id: repoId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.defaultBranch && { defaultBranch: dto.defaultBranch }),
                // @ts-ignore
                ...(dto.realtimeSyncEnabled !== undefined && { realtimeSyncEnabled: dto.realtimeSyncEnabled }),
                // @ts-ignore
                ...(dto.syncIntervalMinutes && { syncIntervalMinutes: dto.syncIntervalMinutes })
            }
        });

        return this.getRepositoryById(updated.id);
    }

    /**
     * Update sync settings for a repository
     */
    async updateSyncSettings(repoId: string, dto: UpdateSyncSettingsDto): Promise<any> {
        const repo = await this.prisma.repository.findUnique({
            where: { id: repoId }
        });

        if (!repo) {
            throw new NotFoundException('Repository not found');
        }

        await this.prisma.repository.update({
            where: { id: repoId },
            data: {
                // @ts-ignore
                realtimeSyncEnabled: dto.realtimeSyncEnabled,
                // @ts-ignore
                syncIntervalMinutes: dto.syncIntervalMinutes || 5
            }
        });

        return this.getSyncStatus(repoId);
    }

    /**
     * Get sync status for a repository
     */
    async getSyncStatus(repoId: string): Promise<any> {
        return this.syncService.getSyncStatus(repoId);
    }

    /**
     * Trigger manual sync/refresh
     */
    async triggerManualSync(repoId: string): Promise<any> {
        return this.syncService.manualSync(repoId);
    }

    /**
     * Get repositories for an organization
     */
    async getRepositoriesByOrg(orgId: string, options?: {
        namespaceId?: string;
        includeNamespaces?: boolean;
    }): Promise<any[]> {
        const where: any = { orgId };

        if (options?.namespaceId) {
            where.namespaces = {
                some: { namespaceId: options.namespaceId }
            };
        }

        const repos = await this.prisma.repository.findMany({
            where,
            include: {
                namespaces: options?.includeNamespaces ? {
                    include: { namespace: true }
                } : false,
                addedBy: {
                    select: { id: true, name: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        if (options?.includeNamespaces) {
            return repos.map(repo => ({
                ...repo,
                namespaces: repo.namespaces.map((rn: any) => rn.namespace)
            }));
        }

        return repos;
    }

    /**
     * Delete a repository
     */
    async deleteRepository(repoId: string): Promise<void> {
        const repo = await this.prisma.repository.findUnique({
            where: { id: repoId }
        });

        if (!repo) {
            throw new NotFoundException('Repository not found');
        }

        // Delete namespace associations first
        await this.prisma.repositoryNamespace.deleteMany({
            where: { repositoryId: repoId }
        });

        // Delete repository
        await this.prisma.repository.delete({
            where: { id: repoId }
        });
    }
}
