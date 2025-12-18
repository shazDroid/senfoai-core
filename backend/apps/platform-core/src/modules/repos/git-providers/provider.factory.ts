// apps/platform-core/src/modules/repos/git-providers/provider.factory.ts
// Factory to create appropriate Git provider based on URL or configuration

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IGitProvider, GitProviderConfig } from './git-provider.interface';
import { GitHubProvider } from './github.provider';
import { GitLabProvider } from './gitlab.provider';
import { BitbucketProvider } from './bitbucket.provider';
import { LocalProvider } from './local.provider';

export type ProviderType = 'github' | 'gitlab' | 'bitbucket' | 'local' | 'auto';

@Injectable()
export class GitProviderFactory {
    private readonly logger = new Logger(GitProviderFactory.name);
    private readonly providers: Map<string, IGitProvider> = new Map();

    constructor(private configService: ConfigService) {
        this.initializeProviders();
    }

    private initializeProviders(): void {
        // Initialize GitHub provider
        const githubConfig: GitProviderConfig = {
            type: 'github',
            accessToken: this.configService.get<string>('GITHUB_ACCESS_TOKEN'),
            baseUrl: this.configService.get<string>('GITHUB_API_URL')
        };
        this.providers.set('github', new GitHubProvider(githubConfig));

        // Initialize GitLab provider
        const gitlabConfig: GitProviderConfig = {
            type: 'gitlab',
            accessToken: this.configService.get<string>('GITLAB_ACCESS_TOKEN'),
            baseUrl: this.configService.get<string>('GITLAB_API_URL')
        };
        this.providers.set('gitlab', new GitLabProvider(gitlabConfig));

        // Initialize Bitbucket provider
        const bitbucketConfig: GitProviderConfig = {
            type: 'bitbucket',
            accessToken: this.configService.get<string>('BITBUCKET_ACCESS_TOKEN'),
            username: this.configService.get<string>('BITBUCKET_USERNAME'),
            password: this.configService.get<string>('BITBUCKET_APP_PASSWORD'),
            baseUrl: this.configService.get<string>('BITBUCKET_API_URL')
        };
        this.providers.set('bitbucket', new BitbucketProvider(bitbucketConfig));

        // Initialize Local provider
        const localConfig: GitProviderConfig = {
            type: 'local'
        };
        this.providers.set('local', new LocalProvider(localConfig));

        this.logger.log('Git providers initialized');
    }

    /**
     * Get provider by explicit type
     */
    getProvider(type: ProviderType): IGitProvider {
        if (type === 'auto') {
            throw new Error('Use getProviderForUrl for auto-detection');
        }

        const provider = this.providers.get(type);
        if (!provider) {
            throw new Error(`Unknown provider type: ${type}`);
        }
        return provider;
    }

    /**
     * Auto-detect provider from repository URL
     */
    getProviderForUrl(repoUrl: string): IGitProvider {
        const type = this.detectProviderType(repoUrl);
        return this.getProvider(type);
    }

    /**
     * Detect provider type from URL pattern
     */
    detectProviderType(repoUrl: string): Exclude<ProviderType, 'auto'> {
        const url = repoUrl.toLowerCase();

        // Local paths
        if (url.startsWith('local://') || url.startsWith('/') || url.match(/^[a-z]:\\/i)) {
            return 'local';
        }

        // GitHub patterns
        if (url.includes('github.com') || url.includes('github.')) {
            return 'github';
        }

        // GitLab patterns
        if (url.includes('gitlab.com') || url.includes('gitlab.')) {
            return 'gitlab';
        }

        // Bitbucket patterns
        if (url.includes('bitbucket.org') || url.includes('bitbucket.')) {
            return 'bitbucket';
        }

        // Self-hosted detection based on configured URLs
        const gitlabBaseUrl = this.configService.get<string>('GITLAB_API_URL');
        if (gitlabBaseUrl && url.includes(new URL(gitlabBaseUrl).hostname)) {
            return 'gitlab';
        }

        const bitbucketBaseUrl = this.configService.get<string>('BITBUCKET_API_URL');
        if (bitbucketBaseUrl && url.includes(new URL(bitbucketBaseUrl).hostname)) {
            return 'bitbucket';
        }

        // Default to GitHub for unknown HTTPS git URLs
        if (url.includes('.git') || url.startsWith('https://') || url.startsWith('git@')) {
            this.logger.warn(`Unknown git provider for ${repoUrl}, defaulting to GitHub`);
            return 'github';
        }

        // Assume local for anything else
        return 'local';
    }

    /**
     * Get all available provider types
     */
    getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Check if a provider has valid credentials configured
     */
    hasCredentials(type: Exclude<ProviderType, 'auto'>): boolean {
        switch (type) {
            case 'github':
                return !!this.configService.get<string>('GITHUB_ACCESS_TOKEN');
            case 'gitlab':
                return !!this.configService.get<string>('GITLAB_ACCESS_TOKEN');
            case 'bitbucket':
                return !!(
                    this.configService.get<string>('BITBUCKET_ACCESS_TOKEN') ||
                    (this.configService.get<string>('BITBUCKET_USERNAME') &&
                        this.configService.get<string>('BITBUCKET_APP_PASSWORD'))
                );
            case 'local':
                return true; // Local always works
            default:
                return false;
        }
    }
}

// Export barrel
export * from './git-provider.interface';
export * from './github.provider';
export * from './gitlab.provider';
export * from './bitbucket.provider';
export * from './local.provider';
