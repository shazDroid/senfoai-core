// apps/platform-core/src/modules/repos/git-providers/gitlab.provider.ts
// GitLab-specific Git provider implementation

import { BaseGitProvider } from './base.provider';
import { GitBranch, GitCommit, GitRepoInfo, GitProviderConfig } from './git-provider.interface';

export class GitLabProvider extends BaseGitProvider {
    private readonly apiBaseUrl: string;

    constructor(config: GitProviderConfig) {
        super(config);
        this.apiBaseUrl = config.baseUrl || 'https://gitlab.com/api/v4';
    }

    getType(): string {
        return 'gitlab';
    }

    private encodeProjectPath(repoUrl: string): string {
        const { owner, repo } = this.parseRepoPath(repoUrl);
        return encodeURIComponent(`${owner}/${repo}`);
    }

    async listBranches(repoUrl: string): Promise<GitBranch[]> {
        const projectPath = this.encodeProjectPath(repoUrl);
        const [branches, project] = await Promise.all([
            this.apiRequest(`/projects/${projectPath}/repository/branches`),
            this.apiRequest(`/projects/${projectPath}`)
        ]);

        return branches.map((branch: any) => ({
            name: branch.name,
            sha: branch.commit.id,
            isDefault: branch.name === project.default_branch
        }));
    }

    async getRepoInfo(repoUrl: string): Promise<GitRepoInfo> {
        const projectPath = this.encodeProjectPath(repoUrl);
        const response = await this.apiRequest(`/projects/${projectPath}`);

        return {
            name: response.name,
            fullName: response.path_with_namespace,
            defaultBranch: response.default_branch,
            private: response.visibility !== 'public',
            cloneUrl: response.http_url_to_repo,
            htmlUrl: response.web_url,
            description: response.description,
            language: undefined // GitLab doesn't provide primary language in basic endpoint
        };
    }

    async getLatestCommit(repoUrl: string, branch?: string): Promise<GitCommit> {
        const projectPath = this.encodeProjectPath(repoUrl);
        const targetBranch = branch || await this.getDefaultBranch(repoUrl);

        const response = await this.apiRequest(
            `/projects/${projectPath}/repository/commits?ref_name=${targetBranch}&per_page=1`
        );

        const commit = response[0];
        return {
            sha: commit.id,
            message: commit.message,
            author: commit.author_name,
            authorEmail: commit.author_email,
            timestamp: new Date(commit.authored_date),
            parentSha: commit.parent_ids?.[0]
        };
    }

    async getCommitsSince(repoUrl: string, sinceSha: string, branch?: string): Promise<GitCommit[]> {
        const projectPath = this.encodeProjectPath(repoUrl);
        const targetBranch = branch || await this.getDefaultBranch(repoUrl);

        const response = await this.apiRequest(
            `/projects/${projectPath}/repository/commits?ref_name=${targetBranch}&per_page=100`
        );

        const commits: GitCommit[] = [];
        for (const commit of response) {
            if (commit.id === sinceSha) break;
            commits.push({
                sha: commit.id,
                message: commit.message,
                author: commit.author_name,
                authorEmail: commit.author_email,
                timestamp: new Date(commit.authored_date),
                parentSha: commit.parent_ids?.[0]
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
            'Content-Type': 'application/json'
        };

        if (this.config.accessToken) {
            headers['PRIVATE-TOKEN'] = this.config.accessToken;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }
}
