// apps/platform-core/src/modules/repos/git-providers/git-provider.interface.ts
// Generic Git provider interface for multi-provider support

export interface GitBranch {
    name: string;
    isDefault: boolean;
    sha: string;
}

export interface GitCommit {
    sha: string;
    message: string;
    author: string;
    authorEmail: string;
    timestamp: Date;
    parentSha?: string;
}

export interface GitRepoInfo {
    name: string;
    fullName: string;
    defaultBranch: string;
    private: boolean;
    cloneUrl: string;
    htmlUrl: string;
    description?: string;
    language?: string;
}

export interface GitProviderConfig {
    type: 'github' | 'gitlab' | 'bitbucket' | 'local';
    baseUrl?: string; // For self-hosted instances
    accessToken?: string;
    username?: string;
    password?: string;
}

export interface IGitProvider {
    /**
     * Get the provider type
     */
    getType(): string;

    /**
     * List all branches for a repository
     * @param repoUrl The repository URL
     */
    listBranches(repoUrl: string): Promise<GitBranch[]>;

    /**
     * Get the default branch name (auto-detect main/master)
     * @param repoUrl The repository URL
     */
    getDefaultBranch(repoUrl: string): Promise<string>;

    /**
     * Get repository information
     * @param repoUrl The repository URL
     */
    getRepoInfo(repoUrl: string): Promise<GitRepoInfo>;

    /**
     * Get the latest commit for a branch
     * @param repoUrl The repository URL
     * @param branch The branch name (optional, uses default if not provided)
     */
    getLatestCommit(repoUrl: string, branch?: string): Promise<GitCommit>;

    /**
     * Get commits since a specific SHA
     * @param repoUrl The repository URL
     * @param sinceSha The SHA to get commits after
     * @param branch The branch name
     */
    getCommitsSince(repoUrl: string, sinceSha: string, branch?: string): Promise<GitCommit[]>;

    /**
     * Clone or pull repository to local path
     * @param repoUrl The repository URL
     * @param localPath The local destination path
     * @param branch The branch to checkout
     */
    cloneOrPull(repoUrl: string, localPath: string, branch?: string): Promise<void>;

    /**
     * Validate repository access
     * @param repoUrl The repository URL
     */
    validateAccess(repoUrl: string): Promise<boolean>;
}
