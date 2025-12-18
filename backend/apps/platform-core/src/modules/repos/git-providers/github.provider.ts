// apps/platform-core/src/modules/repos/git-providers/github.provider.ts
// GitHub-specific Git provider implementation

import { BaseGitProvider } from './base.provider';
import { GitBranch, GitCommit, GitRepoInfo, GitProviderConfig } from './git-provider.interface';

export class GitHubProvider extends BaseGitProvider {
    private readonly apiBaseUrl: string;

    constructor(config: GitProviderConfig) {
        super(config);
        this.apiBaseUrl = config.baseUrl || 'https://api.github.com';
    }

    getType(): string {
        return 'github';
    }

    async listBranches(repoUrl: string): Promise<GitBranch[]> {
        const { owner, repo } = this.parseRepoPath(repoUrl);
        const response = await this.apiRequest(`/repos/${owner}/${repo}/branches`);

        // Get default branch info
        const repoInfo = await this.getRepoInfo(repoUrl);

        return response.map((branch: any) => ({
            name: branch.name,
            sha: branch.commit.sha,
            isDefault: branch.name === repoInfo.defaultBranch
        }));
    }

    async getRepoInfo(repoUrl: string): Promise<GitRepoInfo> {
        const { owner, repo } = this.parseRepoPath(repoUrl);
        const response = await this.apiRequest(`/repos/${owner}/${repo}`);

        return {
            name: response.name,
            fullName: response.full_name,
            defaultBranch: response.default_branch,
            private: response.private,
            cloneUrl: response.clone_url,
            htmlUrl: response.html_url,
            description: response.description,
            language: response.language
        };
    }

    async getLatestCommit(repoUrl: string, branch?: string): Promise<GitCommit> {
        const { owner, repo } = this.parseRepoPath(repoUrl);
        const targetBranch = branch || await this.getDefaultBranch(repoUrl);

        const response = await this.apiRequest(
            `/repos/${owner}/${repo}/commits/${targetBranch}`
        );

        return {
            sha: response.sha,
            message: response.commit.message,
            author: response.commit.author.name,
            authorEmail: response.commit.author.email,
            timestamp: new Date(response.commit.author.date),
            parentSha: response.parents?.[0]?.sha
        };
    }

    async getCommitsSince(repoUrl: string, sinceSha: string, branch?: string): Promise<GitCommit[]> {
        const { owner, repo } = this.parseRepoPath(repoUrl);
        const targetBranch = branch || await this.getDefaultBranch(repoUrl);

        const response = await this.apiRequest(
            `/repos/${owner}/${repo}/commits?sha=${targetBranch}`
        );

        const commits: GitCommit[] = [];
        for (const commit of response) {
            if (commit.sha === sinceSha) break;
            commits.push({
                sha: commit.sha,
                message: commit.commit.message,
                author: commit.commit.author.name,
                authorEmail: commit.commit.author.email,
                timestamp: new Date(commit.commit.author.date),
                parentSha: commit.parents?.[0]?.sha
            });
        }

        return commits;
    }

    async validateAccess(repoUrl: string): Promise<boolean> {
        try {
            await this.getRepoInfo(repoUrl);
            return true;
        } catch (error) {
            this.logger.warn(`Cannot access repository: ${repoUrl}`, error);
            return false;
        }
    }

    private async apiRequest(endpoint: string): Promise<any> {
        const url = `${this.apiBaseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Senfo-Platform'
        };

        if (this.config.accessToken) {
            headers['Authorization'] = `Bearer ${this.config.accessToken}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }
}
