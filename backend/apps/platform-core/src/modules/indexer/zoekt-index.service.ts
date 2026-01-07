import { Injectable, Logger } from '@nestjs/common';

/**
 * ZoektIndexService
 * Handles integration with Zoekt for code search indexing
 * In Phase-1, we rely on zoekt-git-index auto-indexing from the repos volume
 */
@Injectable()
export class ZoektIndexService {
    private readonly logger = new Logger(ZoektIndexService.name);

    private readonly ZOEKT_WEBSERVER_URL = process.env.ZOEKT_WEBSERVER_URL || 'http://localhost:6070';

    /**
     * Trigger Zoekt to reindex a repository
     * In Phase-1, zoekt-git-index auto-indexes on interval
     * This method just logs and could be extended to call zoekt APIs
     */
    async triggerIndex(repoId: string, localPath: string): Promise<void> {
        this.logger.log(`Zoekt will auto-index repo ${repoId} at ${localPath}`);
        // In Phase-1, zoekt-git-index watches the /repos directory
        // and indexes automatically every 60s
        // Future: could trigger immediate reindex via zoekt API
    }

    /**
     * Search code across all indexed repositories
     */
    async search(query: string, repoId?: string): Promise<any> {
        try {
            let url = `${this.ZOEKT_WEBSERVER_URL}/api/search?q=${encodeURIComponent(query)}`;
            if (repoId) {
                url += `&repo=${encodeURIComponent(repoId)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Zoekt search failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: any) {
            this.logger.error(`Zoekt search error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if Zoekt is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.ZOEKT_WEBSERVER_URL}/`);
            return response.ok;
        } catch {
            return false;
        }
    }
}
