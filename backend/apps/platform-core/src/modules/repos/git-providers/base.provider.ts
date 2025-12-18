// apps/platform-core/src/modules/repos/git-providers/base.provider.ts
// Base abstract class for Git providers with common functionality

import { Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
    IGitProvider,
    GitBranch,
    GitCommit,
    GitRepoInfo,
    GitProviderConfig
} from './git-provider.interface';

export abstract class BaseGitProvider implements IGitProvider {
    protected readonly logger: Logger;
    protected config: GitProviderConfig;

    constructor(config: GitProviderConfig) {
        this.config = config;
        this.logger = new Logger(this.constructor.name);
    }

    abstract getType(): string;
    abstract listBranches(repoUrl: string): Promise<GitBranch[]>;
    abstract getRepoInfo(repoUrl: string): Promise<GitRepoInfo>;
    abstract validateAccess(repoUrl: string): Promise<boolean>;

    /**
     * Auto-detect default branch by checking common names
     */
    async getDefaultBranch(repoUrl: string): Promise<string> {
        try {
            const branches = await this.listBranches(repoUrl);

            // Check for explicit default
            const defaultBranch = branches.find(b => b.isDefault);
            if (defaultBranch) return defaultBranch.name;

            // Try common defaults
            const commonDefaults = ['main', 'master', 'develop', 'trunk'];
            for (const name of commonDefaults) {
                if (branches.find(b => b.name === name)) {
                    return name;
                }
            }

            // Fallback to first branch
            return branches[0]?.name || 'main';
        } catch (error) {
            this.logger.warn(`Could not detect default branch for ${repoUrl}, defaulting to 'main'`);
            return 'main';
        }
    }

    /**
     * Get latest commit using git CLI
     */
    async getLatestCommit(repoUrl: string, branch?: string): Promise<GitCommit> {
        // Implementation depends on provider - override in subclasses for API access
        throw new Error('Method must be implemented by provider');
    }

    /**
     * Get commits since a specific SHA
     */
    async getCommitsSince(repoUrl: string, sinceSha: string, branch?: string): Promise<GitCommit[]> {
        // Implementation depends on provider - override in subclasses for API access
        throw new Error('Method must be implemented by provider');
    }

    /**
     * Clone or pull repository using git CLI
     */
    async cloneOrPull(repoUrl: string, localPath: string, branch?: string): Promise<void> {
        const targetBranch = branch || await this.getDefaultBranch(repoUrl);

        if (fs.existsSync(path.join(localPath, '.git'))) {
            // Pull existing repo
            await this.execGit(localPath, ['fetch', 'origin']);
            await this.execGit(localPath, ['checkout', targetBranch]);
            await this.execGit(localPath, ['pull', 'origin', targetBranch]);
            this.logger.log(`Pulled latest changes for ${repoUrl} on branch ${targetBranch}`);
        } else {
            // Clone new repo
            const authUrl = this.getAuthenticatedUrl(repoUrl);
            await this.execGit(path.dirname(localPath), [
                'clone',
                '--branch', targetBranch,
                '--single-branch',
                authUrl,
                path.basename(localPath)
            ]);
            this.logger.log(`Cloned ${repoUrl} to ${localPath} on branch ${targetBranch}`);
        }
    }

    /**
     * Get authenticated URL if credentials are available
     */
    protected getAuthenticatedUrl(repoUrl: string): string {
        if (!this.config.accessToken && !this.config.password) {
            return repoUrl;
        }

        try {
            const url = new URL(repoUrl);
            if (this.config.accessToken) {
                // Token-based auth (GitHub, GitLab)
                url.username = this.config.accessToken;
                url.password = 'x-oauth-basic';
            } else if (this.config.username && this.config.password) {
                // Basic auth
                url.username = this.config.username;
                url.password = this.config.password;
            }
            return url.toString();
        } catch {
            return repoUrl;
        }
    }

    /**
     * Execute git command
     */
    protected execGit(cwd: string, args: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const proc = spawn('git', args, { cwd, shell: true });
            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(`Git command failed: ${stderr || stdout}`));
                }
            });

            proc.on('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Parse owner/repo from URL
     */
    protected parseRepoPath(repoUrl: string): { owner: string; repo: string } {
        try {
            const url = new URL(repoUrl);
            const pathParts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
            return {
                owner: pathParts[0] || '',
                repo: pathParts[1] || pathParts[0] || ''
            };
        } catch {
            // Handle SSH-style URLs: git@github.com:owner/repo.git
            const match = repoUrl.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
            if (match) {
                return { owner: match[1], repo: match[2] };
            }
            return { owner: '', repo: '' };
        }
    }
}
