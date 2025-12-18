// apps/platform-core/src/modules/repos/git-providers/bitbucket.provider.ts
// Bitbucket-specific Git provider implementation

import { BaseGitProvider } from './base.provider';
import { GitBranch, GitCommit, GitRepoInfo, GitProviderConfig } from './git-provider.interface';

export class BitbucketProvider extends BaseGitProvider {
    private readonly apiBaseUrl: string;

    constructor(config: GitProviderConfig) {
        super(config);
        this.apiBaseUrl = config.baseUrl || 'https://api.bitbucket.org/2.0';
    }

    getType(): string {
        return 'bitbucket';
    }

    async listBranches(repoUrl: string): Promise<GitBranch[]> {
        const { owner, repo } = this.parseRepoPath(repoUrl);
        const [branchesRes, repoInfo] = await Promise.all([
            this.apiRequest(`/repositories/${owner}/${repo}/refs/branches`),
            this.getRepoInfo(repoUrl)
        ]);

        return branchesRes.values.map((branch: any) => ({
            name: branch.name,
            sha: branch.target.hash,
            isDefault: branch.name === repoInfo.defaultBranch
        }));
    }

    async getRepoInfo(repoUrl: string): Promise<GitRepoInfo> {
        const { owner, repo } = this.parseRepoPath(repoUrl);
        const response = await this.apiRequest(`/repositories/${owner}/${repo}`);

        return {
            name: response.name,
            fullName: response.full_name,
            defaultBranch: response.mainbranch?.name || 'main',
            private: response.is_private,
            cloneUrl: response.links.clone.find((l: any) => l.name === 'https')?.href || '',
            htmlUrl: response.links.html.href,
            description: response.description,
            language: response.language
        };
    }

    async getLatestCommit(repoUrl: string, branch?: string): Promise<GitCommit> {
        const { owner, repo } = this.parseRepoPath(repoUrl);
        const targetBranch = branch || await this.getDefaultBranch(repoUrl);

        const response = await this.apiRequest(
            `/repositories/${owner}/${repo}/commits/${targetBranch}?pagelen=1`
        );

        const commit = response.values[0];
        return {
            sha: commit.hash,
            message: commit.message,
            author: commit.author.user?.display_name || commit.author.raw.split('<')[0].trim(),
            authorEmail: commit.author.raw.match(/<(.+)>/)?.[1] || '',
            timestamp: new Date(commit.date),
            parentSha: commit.parents?.[0]?.hash
        };
    }

    async getCommitsSince(repoUrl: string, sinceSha: string, branch?: string): Promise<GitCommit[]> {
        const { owner, repo } = this.parseRepoPath(repoUrl);
        const targetBranch = branch || await this.getDefaultBranch(repoUrl);

        const response = await this.apiRequest(
            `/repositories/${owner}/${repo}/commits/${targetBranch}?pagelen=50`
        );

        const commits: GitCommit[] = [];
        for (const commit of response.values) {
            if (commit.hash === sinceSha || commit.hash.startsWith(sinceSha)) break;
            commits.push({
                sha: commit.hash,
                message: commit.message,
                author: commit.author.user?.display_name || commit.author.raw.split('<')[0].trim(),
                authorEmail: commit.author.raw.match(/<(.+)>/)?.[1] || '',
                timestamp: new Date(commit.date),
                parentSha: commit.parents?.[0]?.hash
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
            'Accept': 'application/json'
        };

        if (this.config.accessToken) {
            headers['Authorization'] = `Bearer ${this.config.accessToken}`;
        } else if (this.config.username && this.config.password) {
            const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
            headers['Authorization'] = `Basic ${auth}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`Bitbucket API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }
}
