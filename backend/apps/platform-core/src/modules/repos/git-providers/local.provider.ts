// apps/platform-core/src/modules/repos/git-providers/local.provider.ts
// Local filesystem Git provider for local repository imports

import { BaseGitProvider } from './base.provider';
import { GitBranch, GitCommit, GitRepoInfo, GitProviderConfig } from './git-provider.interface';
import * as fs from 'fs';
import * as path from 'path';

export class LocalProvider extends BaseGitProvider {
    constructor(config: GitProviderConfig) {
        super(config);
    }

    getType(): string {
        return 'local';
    }

    /**
     * Parse local path from URL (local:///path/to/repo)
     */
    private getLocalPath(repoUrl: string): string {
        if (repoUrl.startsWith('local://')) {
            return repoUrl.replace('local://', '');
        }
        return repoUrl;
    }

    async listBranches(repoUrl: string): Promise<GitBranch[]> {
        const localPath = this.getLocalPath(repoUrl);

        // Get all branches
        const branchOutput = await this.execGit(localPath, ['branch', '-a', '--format=%(refname:short)']);
        const currentBranch = await this.execGit(localPath, ['rev-parse', '--abbrev-ref', 'HEAD']);

        const branches = branchOutput.split('\n').filter(b => b && !b.includes('->'));

        const result: GitBranch[] = [];
        for (const branch of branches) {
            const cleanName = branch.replace('origin/', '');
            if (result.find(b => b.name === cleanName)) continue;

            const sha = await this.execGit(localPath, ['rev-parse', cleanName]).catch(() => '');
            result.push({
                name: cleanName,
                sha,
                isDefault: cleanName === currentBranch.trim()
            });
        }

        return result;
    }

    async getRepoInfo(repoUrl: string): Promise<GitRepoInfo> {
        const localPath = this.getLocalPath(repoUrl);
        const repoName = path.basename(localPath);

        // Try to get remote URL
        let remoteUrl = '';
        try {
            remoteUrl = await this.execGit(localPath, ['remote', 'get-url', 'origin']);
        } catch {
            remoteUrl = localPath;
        }

        // Get current branch as default
        const defaultBranch = await this.execGit(localPath, ['rev-parse', '--abbrev-ref', 'HEAD']);

        return {
            name: repoName,
            fullName: repoName,
            defaultBranch: defaultBranch.trim(),
            private: true,
            cloneUrl: remoteUrl.trim() || localPath,
            htmlUrl: localPath,
            description: undefined,
            language: undefined
        };
    }

    async getLatestCommit(repoUrl: string, branch?: string): Promise<GitCommit> {
        const localPath = this.getLocalPath(repoUrl);
        const targetBranch = branch || 'HEAD';

        const commitInfo = await this.execGit(localPath, [
            'log', '-1',
            '--format=%H|%s|%an|%ae|%aI|%P',
            targetBranch
        ]);

        const [sha, message, author, authorEmail, timestamp, parentSha] = commitInfo.split('|');

        return {
            sha,
            message,
            author,
            authorEmail,
            timestamp: new Date(timestamp),
            parentSha: parentSha?.split(' ')[0]
        };
    }

    async getCommitsSince(repoUrl: string, sinceSha: string, branch?: string): Promise<GitCommit[]> {
        const localPath = this.getLocalPath(repoUrl);
        const targetBranch = branch || 'HEAD';

        const commitOutput = await this.execGit(localPath, [
            'log',
            '--format=%H|%s|%an|%ae|%aI|%P',
            `${sinceSha}..${targetBranch}`
        ]);

        if (!commitOutput.trim()) return [];

        return commitOutput.split('\n').filter(Boolean).map(line => {
            const [sha, message, author, authorEmail, timestamp, parentSha] = line.split('|');
            return {
                sha,
                message,
                author,
                authorEmail,
                timestamp: new Date(timestamp),
                parentSha: parentSha?.split(' ')[0]
            };
        });
    }

    async validateAccess(repoUrl: string): Promise<boolean> {
        const localPath = this.getLocalPath(repoUrl);

        // Check if path exists and is a git repository
        const gitDir = path.join(localPath, '.git');
        return fs.existsSync(gitDir) || fs.existsSync(path.join(localPath, 'HEAD'));
    }

    async cloneOrPull(repoUrl: string, localPath: string, branch?: string): Promise<void> {
        const sourcePath = this.getLocalPath(repoUrl);

        if (sourcePath === localPath) {
            // Same path, just pull if it's a git repo
            if (fs.existsSync(path.join(localPath, '.git'))) {
                const targetBranch = branch || 'HEAD';
                await this.execGit(localPath, ['fetch', '--all']);
                if (branch) {
                    await this.execGit(localPath, ['checkout', targetBranch]);
                }
            }
            return;
        }

        // Copy the repository to target location
        if (!fs.existsSync(localPath)) {
            fs.mkdirSync(localPath, { recursive: true });
        }

        // Use git clone for local-to-local
        await this.execGit(path.dirname(localPath), [
            'clone',
            sourcePath,
            path.basename(localPath)
        ]);

        if (branch) {
            await this.execGit(localPath, ['checkout', branch]);
        }
    }
}
