import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { CheckoutResult } from './types';
import { DebugLogger } from '../../common/utils/debug-logger';

/**
 * RepoCheckoutService
 * Handles cloning, fetching, and checking out repositories to temporary filesystem
 * Uses OS temp directory to avoid storing repos in project directory (Docker-friendly)
 */
@Injectable()
export class RepoCheckoutService {
    private readonly debug = new DebugLogger('RepoCheckoutService');
    private prisma = new PrismaClient();

    // Base path for all repo checkouts - use OS temp directory, not project directory
    // This ensures repos are not stored in the Docker image
    private readonly REPOS_BASE_PATH = process.env.REPOS_BASE_PATH || 
        path.join(os.tmpdir(), 'senfo-repos');

    /**
     * Ensure a repository is checked out locally and up-to-date
     * Returns the local path and current HEAD SHA
     */
    async ensureCheckout(
        repoId: string,
        gitUrl: string,
        defaultBranch: string,
        authToken?: string
    ): Promise<CheckoutResult> {
        const localPath = this.getLocalPath(repoId);
        const gitDir = path.join(localPath, '.git');
        const absoluteLocalPath = path.resolve(localPath);
        const absoluteParentDir = path.resolve(path.dirname(localPath));

        this.debug.log(`Ensuring checkout for repo ${repoId}`);
        this.debug.log(`  Local path (relative): ${localPath}`);
        this.debug.log(`  Local path (absolute): ${absoluteLocalPath}`);
        this.debug.log(`  Parent dir (absolute): ${absoluteParentDir}`);
        this.debug.log(`  Base repos path: ${this.REPOS_BASE_PATH}`);
        this.debug.step('CHECKOUT_START', {
            repoId,
            gitUrl,
            defaultBranch,
            localPath,
            absolutePath: absoluteLocalPath,
            absoluteParentDir,
            basePath: this.REPOS_BASE_PATH
        });

        try {
            // Ensure parent directory exists
            const parentDir = path.dirname(localPath);
            const absoluteParentDir = path.resolve(parentDir);
            this.debug.log(`Checking parent directory: ${parentDir} (absolute: ${absoluteParentDir})`);
            this.debug.fileOp('CHECK_PARENT_DIR', parentDir, { 
                exists: fs.existsSync(parentDir),
                absolutePath: absoluteParentDir
            });

            if (!fs.existsSync(parentDir)) {
                this.debug.log(`Creating parent directory: ${absoluteParentDir}`);
                fs.mkdirSync(parentDir, { recursive: true });
                this.debug.fileOp('CREATED_PARENT_DIR', parentDir);
                this.debug.log(`Parent directory created successfully: ${absoluteParentDir}`);
            }

            // Build authenticated URL if token provided
            const cloneUrl = authToken ? this.addAuthToUrl(gitUrl, authToken) : gitUrl;

            const absoluteGitDir = path.resolve(gitDir);
            const gitDirExists = fs.existsSync(gitDir);
            this.debug.log(`Checking git directory: ${gitDir} (absolute: ${absoluteGitDir})`);
            this.debug.log(`  Git directory exists: ${gitDirExists}`);
            this.debug.fileOp('CHECK_GIT_DIR', gitDir, { 
                exists: gitDirExists,
                absolutePath: absoluteGitDir
            });

            if (!gitDirExists) {
                // Fresh clone - cleanup if directory exists but not a git repo
                const localPathExists = fs.existsSync(localPath);
                this.debug.log(`Checking if local path exists: ${localPath} (absolute: ${absoluteLocalPath})`);
                this.debug.log(`  Local path exists: ${localPathExists}`);
                
                if (localPathExists) {
                    this.debug.log(`Directory exists but is not a git repo. Starting cleanup...`);
                    this.debug.log(`  Full path to cleanup: ${absoluteLocalPath}`);
                    await this.cleanupDirectory(localPath);
                    
                    // Verify directory is actually gone before proceeding
                    const stillExists = fs.existsSync(localPath);
                    this.debug.log(`After cleanup, directory still exists: ${stillExists}`);
                    if (stillExists) {
                        const errorMessage = 
                            `Directory still exists after cleanup for repo ${repoId}. ` +
                            `Relative path: ${localPath} | Absolute path: ${absoluteLocalPath}. ` +
                            `This may be due to file locks on Windows. Please manually delete the directory and try again.`;
                        this.debug.error(errorMessage);
                        throw new Error(errorMessage);
                    }
                    this.debug.log(`Directory successfully cleaned up: ${absoluteLocalPath}`);
                }

                // Final safety check before cloning
                const finalCheck = fs.existsSync(localPath);
                this.debug.log(`Final pre-clone check: directory exists = ${finalCheck}`);
                if (finalCheck) {
                    const errorMessage = 
                        `Directory exists before clone attempt for repo ${repoId}. ` +
                        `Relative path: ${localPath} | Absolute path: ${absoluteLocalPath}. ` +
                        `This should not happen after cleanup. Please check for file locks or manually delete the directory.`;
                    this.debug.error(errorMessage);
                    throw new Error(errorMessage);
                }

                this.debug.log(`Starting git clone for repo ${repoId}...`);
                this.debug.log(`  Clone URL: ${cloneUrl.replace(/https:\/\/[^@]+@/, 'https://***@')}`);
                this.debug.log(`  Target path (relative): ${localPath}`);
                this.debug.log(`  Target path (absolute): ${absoluteLocalPath}`);
                this.debug.log(`  Branch: ${defaultBranch}`);
                this.debug.step('GIT_CLONE_START', { 
                    repoId, 
                    branch: defaultBranch,
                    localPath,
                    absolutePath: absoluteLocalPath
                });
                await this.cloneRepository(cloneUrl, localPath, defaultBranch, repoId);
                this.debug.step('GIT_CLONE_COMPLETE', { localPath, absolutePath: absoluteLocalPath });
            } else {
                // Fetch and reset
                this.debug.log(`Updating existing checkout for ${repoId}...`);
                this.debug.step('GIT_UPDATE_START', { repoId, branch: defaultBranch });
                await this.updateRepository(localPath, defaultBranch, authToken);
                this.debug.step('GIT_UPDATE_COMPLETE', { localPath });
            }

            // Get HEAD SHA
            const headSha = this.getHeadSha(localPath);
            this.debug.log(`Checkout complete. HEAD SHA: ${headSha}`);

            // List files in repo for debugging
            const files = fs.readdirSync(localPath);
            this.debug.step('CHECKOUT_COMPLETE', {
                headSha,
                localPath,
                fileCount: files.length,
                topLevelFiles: files.slice(0, 20) // First 20 files
            });

            // Update repo local path in database
            await this.prisma.repository.update({
                where: { id: repoId },
                data: { repoLocalPath: localPath }
            });

            return {
                localPath,
                headSha
            };
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown error during checkout';
            const fullErrorMessage = 
                `Checkout failed for repo ${repoId}. ` +
                `Relative path: ${localPath} | Absolute path: ${absoluteLocalPath}. ` +
                `Error: ${errorMessage}. ` +
                `If this is a directory cleanup issue, please manually delete ${absoluteLocalPath} and try again.`;
            
            this.debug.error(`=== CHECKOUT ERROR ===`);
            this.debug.error(`  Repo ID: ${repoId}`);
            this.debug.error(`  Relative path: ${localPath}`);
            this.debug.error(`  Absolute path: ${absoluteLocalPath}`);
            this.debug.error(`  Error: ${errorMessage}`);
            this.debug.error(fullErrorMessage);
            this.debug.step('CHECKOUT_ERROR', { 
                repoId, 
                localPath,
                absolutePath: absoluteLocalPath,
                error: errorMessage, 
                stack: error.stack 
            });
            
            // Re-throw with improved message if it's a cleanup/clone error
            if (errorMessage.includes('cleanup') || errorMessage.includes('already exists')) {
                throw new Error(fullErrorMessage);
            }
            throw error;
        }
    }

    /**
     * Get the local filesystem path for a repository
     */
    getLocalPath(repoId: string): string {
        return path.join(this.REPOS_BASE_PATH, repoId, 'repo');
    }

    /**
     * Robustly cleanup a directory with retry logic for Windows file locks
     * @param dirPath Directory path to cleanup
     * @param maxRetries Maximum number of retry attempts
     */
    private async cleanupDirectory(dirPath: string, maxRetries: number = 3): Promise<void> {
        const absoluteDirPath = path.resolve(dirPath);
        const exists = fs.existsSync(dirPath);
        
        this.debug.log(`=== CLEANUP DIRECTORY START ===`);
        this.debug.log(`  Relative path: ${dirPath}`);
        this.debug.log(`  Absolute path: ${absoluteDirPath}`);
        this.debug.log(`  Directory exists: ${exists}`);
        
        if (!exists) {
            this.debug.log(`Directory does not exist, no cleanup needed`);
            this.debug.log(`=== CLEANUP DIRECTORY END (no action needed) ===`);
            return; // Already gone
        }

        const retryDelays = [100, 500, 1000]; // ms
        let lastError: Error | null = null;

        this.debug.log(`Starting cleanup of directory (max ${maxRetries} attempts)`);
        this.debug.log(`  Target: ${absoluteDirPath}`);

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            this.debug.log(`--- Cleanup attempt ${attempt + 1}/${maxRetries} ---`);
            this.debug.log(`  Target: ${absoluteDirPath}`);
            try {
                // Try to remove
                this.debug.log(`  Attempting fs.rmSync with recursive: true, force: true`);
                fs.rmSync(dirPath, { recursive: true, force: true });
                this.debug.log(`  fs.rmSync completed without exception`);
                
                // Verify it's actually gone
                const stillExists = fs.existsSync(dirPath);
                this.debug.log(`  Directory still exists after rmSync: ${stillExists}`);
                
                if (!stillExists) {
                    this.debug.log(`✓ Successfully cleaned up directory on attempt ${attempt + 1}`);
                    this.debug.log(`  Removed: ${absoluteDirPath}`);
                    this.debug.log(`=== CLEANUP DIRECTORY END (success) ===`);
                    return;
                }
                
                // Still exists, wait and retry
                if (attempt < maxRetries - 1) {
                    const delay = retryDelays[attempt] || 1000;
                    this.debug.log(`  Directory still exists, waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error: any) {
                lastError = error;
                this.debug.error(`  Cleanup attempt ${attempt + 1} threw exception: ${error.message}`);
                this.debug.error(`  Error stack: ${error.stack}`);
                if (attempt < maxRetries - 1) {
                    const delay = retryDelays[attempt] || 1000;
                    this.debug.warn(`  Will retry in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All retries failed, try rename as last resort
        this.debug.log(`All ${maxRetries} deletion attempts failed, trying rename as fallback...`);
        try {
            const backupPath = `${dirPath}_backup_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const absoluteBackupPath = path.resolve(backupPath);
            this.debug.log(`  Attempting to rename directory`);
            this.debug.log(`    From: ${absoluteDirPath}`);
            this.debug.log(`    To: ${absoluteBackupPath}`);
            fs.renameSync(dirPath, backupPath);
            const originalStillExists = fs.existsSync(dirPath);
            const backupExists = fs.existsSync(backupPath);
            this.debug.log(`  After rename: original exists = ${originalStillExists}, backup exists = ${backupExists}`);
            if (!originalStillExists) {
                this.debug.log(`✓ Successfully renamed directory to backup`);
                this.debug.log(`  Backup location: ${absoluteBackupPath}`);
                this.debug.log(`=== CLEANUP DIRECTORY END (renamed) ===`);
                return;
            }
        } catch (renameErr: any) {
            this.debug.error(`  Rename fallback failed: ${renameErr.message}`);
            this.debug.error(`  Rename error stack: ${renameErr.stack}`);
        }

        // All attempts failed
        const errorMessage = 
            `Failed to cleanup directory after ${maxRetries} attempts. ` +
            `Relative path: ${dirPath} | Absolute path: ${absoluteDirPath}. ` +
            `This is often caused by file locks on Windows (antivirus, file indexers, etc.). ` +
            `Please manually delete the directory and try again. ` +
            `Last error: ${lastError?.message || 'Unknown error'}`;
        
        this.debug.error(`=== CLEANUP DIRECTORY END (failed) ===`);
        this.debug.error(errorMessage);
        throw new Error(errorMessage);
    }

    /**
     * Clone a repository
     */
    private async cloneRepository(
        url: string,
        localPath: string,
        branch: string,
        repoId?: string
    ): Promise<void> {
        const absoluteLocalPath = path.resolve(localPath);
        const absoluteParentDir = path.resolve(path.dirname(localPath));
        
        this.debug.log(`=== CLONE REPOSITORY START ===`);
        this.debug.log(`  Repo ID: ${repoId || 'unknown'}`);
        this.debug.log(`  URL: ${url.replace(/https:\/\/[^@]+@/, 'https://***@')}`);
        this.debug.log(`  Branch: ${branch}`);
        this.debug.log(`  Target path (relative): ${localPath}`);
        this.debug.log(`  Target path (absolute): ${absoluteLocalPath}`);
        this.debug.log(`  Parent dir (absolute): ${absoluteParentDir}`);
        
        // Safety check: if directory exists and is not a git repo, attempt cleanup
        const localPathExists = fs.existsSync(localPath);
        this.debug.log(`  Target directory exists: ${localPathExists}`);
        
        if (localPathExists) {
            const gitDir = path.join(localPath, '.git');
            const absoluteGitDir = path.resolve(gitDir);
            const gitDirExists = fs.existsSync(gitDir);
            this.debug.log(`  Git directory exists: ${gitDirExists}`);
            this.debug.log(`  Git dir path (absolute): ${absoluteGitDir}`);
            
            if (!gitDirExists) {
                this.debug.warn(`Directory exists but is not a git repo, attempting cleanup before clone...`);
                this.debug.warn(`  Full path: ${absoluteLocalPath}`);
                try {
                    await this.cleanupDirectory(localPath);
                    // Verify it's gone
                    const stillExists = fs.existsSync(localPath);
                    this.debug.log(`  After cleanup, directory still exists: ${stillExists}`);
                    if (stillExists) {
                        throw new Error(
                            `Directory still exists after cleanup. ` +
                            `Relative: ${localPath} | Absolute: ${absoluteLocalPath}. ` +
                            `Cannot proceed with git clone. Please manually delete the directory${repoId ? ` for repo ${repoId}` : ''}.`
                        );
                    }
                } catch (cleanupError: any) {
                    const errorMessage = 
                        `Cannot clone repository${repoId ? ` ${repoId}` : ''}: directory exists and cleanup failed. ` +
                        `Relative path: ${localPath} | Absolute path: ${absoluteLocalPath}. ` +
                        `Error: ${cleanupError.message}. Please manually delete the directory and try again.`;
                    this.debug.error(errorMessage);
                    throw new Error(errorMessage);
                }
            } else {
                // It's a valid git repo, we shouldn't be here (should have been handled in ensureCheckout)
                this.debug.warn(`Directory already contains a valid git repository, skipping clone`);
                this.debug.warn(`  Git repo path: ${absoluteLocalPath}`);
                return;
            }
        }

        this.debug.log(`Executing git clone command...`);
        this.debug.log(`  Working directory: ${absoluteParentDir}`);
        // Use absolute path for destination to avoid nested directory issues
        const cmd = `git clone --branch ${branch} --single-branch --depth 100 "${url}" "${absoluteLocalPath}"`;
        this.execGit(cmd, absoluteParentDir);
        this.debug.log(`=== CLONE REPOSITORY END (success) ===`);
    }

    /**
     * Update an existing checkout (fetch + reset)
     */
    private async updateRepository(
        localPath: string,
        branch: string,
        authToken?: string
    ): Promise<void> {
        // Fetch latest
        this.execGit(`git fetch origin ${branch}`, localPath);

        // Checkout branch
        this.execGit(`git checkout ${branch}`, localPath);

        // Reset hard to origin
        this.execGit(`git reset --hard origin/${branch}`, localPath);

        // Clean untracked files
        this.execGit(`git clean -fd`, localPath);
    }

    /**
     * Get the current HEAD SHA
     */
    private getHeadSha(localPath: string): string {
        const output = execSync('git rev-parse HEAD', {
            cwd: localPath,
            encoding: 'utf8'
        });
        return output.trim();
    }

    /**
     * Add authentication token to Git URL
     */
    private addAuthToUrl(url: string, token: string): string {
        const urlObj = new URL(url);
        urlObj.username = token;
        urlObj.password = 'x-oauth-basic';
        return urlObj.toString();
    }

    /**
     * Execute a git command safely
     */
    private execGit(command: string, cwd: string): string {
        const absoluteCwd = path.resolve(cwd);
        this.debug.log(`Executing git command in: ${absoluteCwd}`);
        this.debug.gitOp('EXEC', { 
            command: command.replace(/https:\/\/[^@]+@/g, 'https://***@'), 
            cwd: absoluteCwd 
        });
        try {
            // Ensure directory exists before running git commands
            if (!fs.existsSync(absoluteCwd)) {
                this.debug.log(`Creating working directory: ${absoluteCwd}`);
                fs.mkdirSync(absoluteCwd, { recursive: true });
                this.debug.fileOp('CREATED_CWD', absoluteCwd);
            }

            // Determine shell for Windows - use ComSpec if available, otherwise undefined (auto-detect)
            let shell: string | undefined = undefined;
            if (process.platform === 'win32') {
                // Use ComSpec environment variable if available, otherwise undefined (Node.js will auto-detect)
                shell = process.env.ComSpec;
                this.debug.log(`Using shell: ${shell || 'auto-detect (Node.js default)'}`);
            } else {
                shell = '/bin/sh';
            }

            const result = execSync(command, {
                cwd: absoluteCwd,
                timeout: 300000, // 5 minute timeout
                shell: shell,
                windowsHide: true
            });
            return result.toString('utf8');
        } catch (error: any) {
            // Clean sensitive info from error
            let cleanMessage = error.message?.replace(/https:\/\/[^@]+@/g, 'https://***@') || 'Unknown git error';
            
            // Improve error message for "already exists" errors
            if (cleanMessage.includes('already exists') && cleanMessage.includes('not an empty directory')) {
                cleanMessage = 
                    `Git clone failed: destination directory already exists and is not empty. ` +
                    `This usually means a previous import attempt failed. ` +
                    `The system should have cleaned this up automatically. ` +
                    `Please try again, or manually delete the directory if the issue persists. ` +
                    `Original error: ${cleanMessage}`;
            }
            
            this.debug.error(`Git command failed: ${cleanMessage}`);
            throw new Error(`Git command failed: ${cleanMessage}`);
        }
    }

    /**
     * Check if a local checkout exists
     */
    hasLocalCheckout(repoId: string): boolean {
        const gitDir = path.join(this.getLocalPath(repoId), '.git');
        return fs.existsSync(gitDir);
    }

    /**
     * Delete a local checkout
     * This should be called after indexing is complete since repos are stored on FTP
     */
    async deleteCheckout(repoId: string): Promise<void> {
        const repoDir = path.join(this.REPOS_BASE_PATH, repoId);
        const absoluteRepoDir = path.resolve(repoDir);
        
        this.debug.log(`Deleting local checkout for repo ${repoId}`);
        this.debug.log(`  Repo directory (relative): ${repoDir}`);
        this.debug.log(`  Repo directory (absolute): ${absoluteRepoDir}`);
        
        if (fs.existsSync(repoDir)) {
            try {
                // Use the robust cleanup method
                await this.cleanupDirectory(repoDir);
                this.debug.log(`✓ Successfully deleted checkout for repo ${repoId}`);
            } catch (error: any) {
                this.debug.error(`Failed to delete checkout for repo ${repoId}: ${error.message}`);
                throw error;
            }
        } else {
            this.debug.log(`Checkout directory does not exist for repo ${repoId}, nothing to delete`);
        }
    }
}
