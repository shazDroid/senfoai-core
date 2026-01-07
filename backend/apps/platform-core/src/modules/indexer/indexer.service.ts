import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RepoCheckoutService } from './repo-checkout.service';
import { NamespaceDetectorService } from './namespace-detector.service';
import { TreeSitterParseService } from './treesitter-parse.service';
import { Neo4jWriterService } from './neo4j-writer.service';
import { ZoektIndexService } from './zoekt-index.service';
import { FtpUploadService } from './ftp-upload.service';
import { IndexOptions, IndexResult, CodeNamespace } from './types';
import { DebugLogger } from '../../common/utils/debug-logger';

/**
 * IndexerService
 * Orchestrates the complete indexing pipeline for repositories
 */
@Injectable()
export class IndexerService {
    private readonly debug = new DebugLogger('IndexerService');
    private prisma = new PrismaClient();

    // Simple in-memory mutex for per-repo locking
    private readonly lockMap = new Map<string, Promise<void>>();
    
    // In-memory progress tracking for active indexing operations
    private readonly progressMap = new Map<string, {
        status: string;
        progress: number;
        currentStep: string;
        details: {
            filesProcessed?: number;
            totalFiles?: number;
            symbolsExtracted?: number;
            namespacesDetected?: number;
            bytesUploaded?: number;
            filesUploaded?: number;
            [key: string]: any;
        };
    }>();

    constructor(
        private readonly checkoutService: RepoCheckoutService,
        private readonly namespaceDetector: NamespaceDetectorService,
        private readonly parser: TreeSitterParseService,
        private readonly neo4jWriter: Neo4jWriterService,
        private readonly zoektIndex: ZoektIndexService,
        private readonly ftpUploadService: FtpUploadService
    ) { }

    /**
     * Run the complete indexing pipeline for a repository
     */
    async runIndex(repoId: string, options: IndexOptions = {}): Promise<IndexResult> {
        const startTime = Date.now();

        // Acquire per-repo lock
        await this.acquireLock(repoId);

        try {
            this.debug.log(`Starting index for repo ${repoId}, force=${options.force}`);
            this.debug.step('INDEX_START', { repoId, force: options.force });

            // Get repository from database
            const repo = await this.prisma.repository.findUnique({
                where: { id: repoId }
            });

            if (!repo) {
                this.debug.step('INDEX_ERROR', { error: 'Repository not found', repoId });
                throw new Error(`Repository ${repoId} not found`);
            }

            this.debug.step('REPO_FOUND', {
                repoId,
                name: repo.name,
                gitUrl: repo.gitUrl,
                branch: repo.defaultBranch,
                orgId: repo.orgId
            });

            // Update status to CLONING
            await this.updateRepoStatus(repoId, 'CLONING');
            this.updateProgress(repoId, 'CLONING', 5, 'Initializing repository clone...', {});
            this.debug.step('STATUS_UPDATE', { status: 'CLONING' });

            // 1. Checkout/update repository
            const cloneStartTime = Date.now();
            this.debug.step('CLONE_START', { gitUrl: repo.gitUrl, branch: repo.defaultBranch });
            this.updateProgress(repoId, 'CLONING', 10, `Cloning from ${repo.gitUrl}...`, {
                branch: repo.defaultBranch
            });

            const { localPath, headSha } = await this.checkoutService.ensureCheckout(
                repoId,
                repo.gitUrl,
                repo.defaultBranch
            );

            this.debug.timing('GIT_CLONE', cloneStartTime);
            this.debug.step('CLONE_COMPLETE', { localPath, headSha });
            this.updateProgress(repoId, 'CLONING', 15, 'Repository cloned successfully', {
                headSha: headSha.substring(0, 8)
            });

            // 2. Check if we need to index (SHA comparison)
            if (!options.force && repo.lastIndexedSha === headSha) {
                this.debug.log(`Repo ${repoId} already indexed at SHA ${headSha}, skipping`);
                await this.updateRepoStatus(repoId, 'COMPLETED');
                return {
                    success: true,
                    repoId,
                    sha: headSha,
                    filesCount: 0,
                    symbolsCount: 0,
                    namespacesCount: 0,
                    durationMs: Date.now() - startTime
                };
            }

            // Update status to UPLOADING_TO_FTP
            await this.updateRepoStatus(repoId, 'UPLOADING_TO_FTP');
            this.updateProgress(repoId, 'UPLOADING_TO_FTP', 20, 'Preparing to upload to FTP...', {});
            this.debug.step('STATUS_UPDATE', { status: 'UPLOADING_TO_FTP' });

            // 2.5. Upload to FTP (if configured)
            const ftpStartTime = Date.now();
            this.debug.ftpOp('UPLOAD_START', { repoName: repo.name, localPath });
            this.updateProgress(repoId, 'UPLOADING_TO_FTP', 25, 'Uploading files to FTP server...', {});

            const ftpResult = await this.ftpUploadService.uploadToFtp(
                repo.orgId,
                repoId,
                repo.name,
                localPath
            );

            this.debug.timing('FTP_UPLOAD', ftpStartTime);
            this.debug.ftpOp('UPLOAD_RESULT', {
                success: ftpResult.success,
                filesUploaded: ftpResult.filesUploaded,
                bytesUploaded: ftpResult.bytesUploaded,
                remotePath: ftpResult.remotePath,
                error: ftpResult.error
            });

            if (ftpResult.success && ftpResult.filesUploaded > 0) {
                this.debug.log(`FTP upload complete: ${ftpResult.filesUploaded} files to ${ftpResult.remotePath}`);
                this.updateProgress(repoId, 'UPLOADING_TO_FTP', 30, `Uploaded ${ftpResult.filesUploaded} files`, {
                    filesUploaded: ftpResult.filesUploaded,
                    bytesUploaded: ftpResult.bytesUploaded
                });
            } else if (ftpResult.error) {
                this.debug.warn(`FTP upload issue: ${ftpResult.error}`);
                this.updateProgress(repoId, 'UPLOADING_TO_FTP', 30, 'FTP upload skipped or failed', {});
            } else {
                this.updateProgress(repoId, 'UPLOADING_TO_FTP', 30, 'FTP upload completed', {});
            }

            // Update status to SCANNING_NAMESPACES
            await this.updateRepoStatus(repoId, 'SCANNING_NAMESPACES');
            this.updateProgress(repoId, 'SCANNING_NAMESPACES', 35, 'Scanning repository structure...', {});

            // 3. Detect namespaces
            const namespaces = await this.namespaceDetector.detectNamespaces(localPath);

            // Store namespaces in database
            await this.prisma.repository.update({
                where: { id: repoId },
                data: {
                    codeNamespacesJson: JSON.stringify(namespaces)
                }
            });

            this.updateProgress(repoId, 'SCANNING_NAMESPACES', 45, `Detected ${namespaces.length} module(s)`, {
                namespacesDetected: namespaces.length
            });

            // Update status to PARSING_FILES
            await this.updateRepoStatus(repoId, 'PARSING_FILES');
            this.updateProgress(repoId, 'PARSING_FILES', 50, 'Starting file parsing...', {});

            // 4. Parse files and extract symbols
            // Note: We'll need to modify parseRepository to accept a progress callback
            const parseResult = await this.parser.parseRepository(repoId, localPath, namespaces);
            
            this.updateProgress(repoId, 'PARSING_FILES', 65, `Parsed ${parseResult.files.length} files, extracted ${parseResult.symbols.length} symbols`, {
                filesProcessed: parseResult.files.length,
                totalFiles: parseResult.files.length,
                symbolsExtracted: parseResult.symbols.length
            });

            // Update status to GENERATING_GRAPH
            await this.updateRepoStatus(repoId, 'GENERATING_GRAPH');
            this.updateProgress(repoId, 'GENERATING_GRAPH', 70, 'Building knowledge graph...', {
                filesCount: parseResult.files.length,
                symbolsCount: parseResult.symbols.length
            });

            // 5. Write to Neo4j
            await this.neo4jWriter.writeSnapshot(
                repoId,
                repo.name,
                repo.gitUrl,
                repo.defaultBranch,
                headSha,
                namespaces,
                parseResult.files,
                parseResult.symbols
            );

            this.updateProgress(repoId, 'GENERATING_GRAPH', 85, 'Knowledge graph created', {
                nodesCreated: parseResult.files.length + parseResult.symbols.length
            });

            // 6. Trigger Zoekt indexing (auto-indexed in Phase-1)
            // No status update needed for this async background task
            if (!options.skipZoekt) {
                this.updateProgress(repoId, 'INDEXING', 90, 'Indexing for search...', {});
                await this.zoektIndex.triggerIndex(repoId, localPath);
                this.updateProgress(repoId, 'INDEXING', 95, 'Search index updated', {});
            }

            // 7. Update repository status to COMPLETED
            await this.prisma.repository.update({
                where: { id: repoId },
                data: {
                    scanStatus: 'COMPLETED',
                    lastIndexedSha: headSha,
                    lastIndexedAt: new Date(),
                    lastIndexError: null
                }
            });

            this.updateProgress(repoId, 'COMPLETED', 100, 'Indexing completed successfully', {
                filesCount: parseResult.files.length,
                symbolsCount: parseResult.symbols.length,
                namespacesCount: namespaces.length,
                durationMs: Date.now() - startTime
            });

            const result: IndexResult = {
                success: true,
                repoId,
                sha: headSha,
                filesCount: parseResult.files.length,
                symbolsCount: parseResult.symbols.length,
                namespacesCount: namespaces.length,
                durationMs: Date.now() - startTime
            };

            this.debug.log(`Index complete for repo ${repoId}: ${result.filesCount} files, ${result.symbolsCount} symbols in ${result.durationMs}ms`);

            return result;

        } catch (error: any) {
            this.debug.error(`Index failed for repo ${repoId}: ${error.message}`);

            // Update error status
            await this.prisma.repository.update({
                where: { id: repoId },
                data: {
                    scanStatus: 'ERROR',
                    lastIndexError: error.message
                }
            });

            return {
                success: false,
                repoId,
                sha: '',
                filesCount: 0,
                symbolsCount: 0,
                namespacesCount: 0,
                durationMs: Date.now() - startTime,
                error: error.message
            };
        } finally {
            this.releaseLock(repoId);
            // Clean up progress tracking after a delay (in case status is checked)
            setTimeout(() => {
                this.progressMap.delete(repoId);
            }, 60000); // Keep for 60 seconds after completion
        }
    }

    /**
     * Get indexing status for a repository
     */
    async getStatus(repoId: string): Promise<{
        scanStatus: string;
        lastIndexedSha: string | null;
        lastIndexedAt: Date | null;
        lastIndexError: string | null;
        namespaces: CodeNamespace[];
        progress?: number;
        currentStep?: string;
        details?: {
            filesProcessed?: number;
            totalFiles?: number;
            symbolsExtracted?: number;
            namespacesDetected?: number;
            bytesUploaded?: number;
            filesUploaded?: number;
            [key: string]: any;
        };
    }> {
        const repo = await this.prisma.repository.findUnique({
            where: { id: repoId },
            select: {
                scanStatus: true,
                lastIndexedSha: true,
                lastIndexedAt: true,
                lastIndexError: true,
                codeNamespacesJson: true
            }
        });

        if (!repo) {
            throw new Error(`Repository ${repoId} not found`);
        }

        let namespaces: CodeNamespace[] = [];
        if (repo.codeNamespacesJson) {
            try {
                namespaces = JSON.parse(repo.codeNamespacesJson);
            } catch { }
        }

        // Get progress from in-memory map if available
        const progressInfo = this.progressMap.get(repoId);
        
        const baseStatus = {
            scanStatus: repo.scanStatus,
            lastIndexedSha: repo.lastIndexedSha,
            lastIndexedAt: repo.lastIndexedAt,
            lastIndexError: repo.lastIndexError,
            namespaces
        };

        // If we have progress info, merge it
        if (progressInfo) {
            return {
                ...baseStatus,
                progress: progressInfo.progress,
                currentStep: progressInfo.currentStep,
                details: progressInfo.details
            };
        }

        // Otherwise, calculate progress from status
        const statusProgress = this.getStatusProgress(repo.scanStatus);
        return {
            ...baseStatus,
            progress: statusProgress,
            currentStep: this.getStatusLabel(repo.scanStatus)
        };
    }

    /**
     * Update progress for a repository
     */
    private updateProgress(
        repoId: string,
        status: string,
        progress: number,
        currentStep: string,
        details: any
    ): void {
        this.progressMap.set(repoId, {
            status,
            progress,
            currentStep,
            details
        });
    }

    /**
     * Get progress percentage from status (fallback)
     */
    private getStatusProgress(status: string): number {
        switch (status?.toUpperCase()) {
            case 'PENDING': return 0;
            case 'CLONING': return 15;
            case 'UPLOADING_TO_FTP': return 30;
            case 'SCANNING_NAMESPACES': return 45;
            case 'PARSING_FILES': return 60;
            case 'GENERATING_GRAPH': return 80;
            case 'INDEXING': return 90;
            case 'COMPLETED': return 100;
            default: return 0;
        }
    }

    /**
     * Get status label
     */
    private getStatusLabel(status: string): string {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return 'Completed';
            case 'CLONING': return 'Cloning Repository...';
            case 'UPLOADING_TO_FTP': return 'Uploading to FTP...';
            case 'SCANNING_NAMESPACES': return 'Detecting Modules...';
            case 'PARSING_FILES': return 'Parsing Source Code...';
            case 'GENERATING_GRAPH': return 'Building Knowledge Graph...';
            case 'INDEXING': return 'Indexing...';
            case 'SCANNING': return 'Scanning...';
            case 'PENDING': return 'Pending';
            case 'FAILED':
            case 'ERROR': return 'Failed';
            default: return status || 'Pending';
        }
    }

    /**
     * Update repository scan status
     */
    private async updateRepoStatus(repoId: string, status: string): Promise<void> {
        await this.prisma.repository.update({
            where: { id: repoId },
            data: { scanStatus: status as any }
        });
    }

    /**
     * Acquire a lock for a repository
     */
    private async acquireLock(repoId: string): Promise<void> {
        while (this.lockMap.has(repoId)) {
            await this.lockMap.get(repoId);
        }

        let resolve: () => void;
        const promise = new Promise<void>(r => { resolve = r; });
        this.lockMap.set(repoId, promise);
    }

    /**
     * Release a lock for a repository
     */
    private releaseLock(repoId: string): void {
        this.lockMap.delete(repoId);
    }
}
