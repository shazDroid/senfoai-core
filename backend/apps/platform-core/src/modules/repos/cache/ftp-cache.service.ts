// apps/platform-core/src/modules/repos/cache/ftp-cache.service.ts
// In-memory cache for FTP locations, designed to be easily swapped for Redis

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

export interface FtpLocation {
    id: string;
    host: string;
    port: number;
    path: string;
    authType: 'password' | 'key';
    username?: string;
    // Credentials stored encrypted in DB, not cached
    lastVerified?: Date;
    isActive: boolean;
}

export interface CacheConfig {
    refreshIntervalMs: number;
    enabled: boolean;
}

/**
 * In-memory cache service for FTP locations
 * Designed with interface that matches Redis operations for easy migration
 */
@Injectable()
export class FtpCacheService implements OnModuleInit {
    private readonly logger = new Logger(FtpCacheService.name);
    private readonly prisma = new PrismaClient();
    private cache: Map<string, FtpLocation> = new Map();
    private refreshInterval: NodeJS.Timeout | null = null;
    private readonly config: CacheConfig;

    constructor(private configService: ConfigService) {
        // Default: 1 day (86400000ms), configurable for testing
        const refreshIntervalMs = this.configService.get<number>(
            'FTP_CACHE_REFRESH_INTERVAL_MS',
            86400000
        );

        this.config = {
            refreshIntervalMs,
            enabled: this.configService.get<boolean>('FTP_CACHE_ENABLED', true)
        };
    }

    async onModuleInit() {
        if (!this.config.enabled) {
            this.logger.log('FTP cache is disabled');
            return;
        }

        // Load initial cache
        await this.refreshCache();

        // Set up periodic refresh
        this.refreshInterval = setInterval(
            () => this.refreshCache(),
            this.config.refreshIntervalMs
        );

        this.logger.log(
            `FTP cache initialized, refresh interval: ${this.config.refreshIntervalMs}ms`
        );
    }

    /**
     * Refresh cache from database
     */
    async refreshCache(): Promise<void> {
        try {
            // Note: FtpLocation model will be added to Prisma schema
            // For now, this is a placeholder implementation
            const locations = await this.fetchLocationsFromDb();

            this.cache.clear();
            for (const location of locations) {
                this.cache.set(location.id, location);
            }

            this.logger.debug(`Cache refreshed: ${locations.length} FTP locations loaded`);
        } catch (error) {
            this.logger.error('Failed to refresh FTP cache', error);
        }
    }

    /**
     * Get all cached FTP locations
     */
    getAll(): FtpLocation[] {
        return Array.from(this.cache.values());
    }

    /**
     * Get FTP location by ID
     */
    get(id: string): FtpLocation | undefined {
        return this.cache.get(id);
    }

    /**
     * Get FTP locations by organization
     */
    getByOrg(orgId: string): FtpLocation[] {
        return this.getAll().filter(loc => (loc as any).orgId === orgId);
    }

    /**
     * Invalidate cache and force refresh
     */
    async invalidate(): Promise<void> {
        this.cache.clear();
        await this.refreshCache();
    }

    /**
     * Set cache refresh interval (for testing)
     */
    setRefreshInterval(intervalMs: number): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.config.refreshIntervalMs = intervalMs;

        if (intervalMs > 0) {
            this.refreshInterval = setInterval(
                () => this.refreshCache(),
                intervalMs
            );
            this.logger.log(`Cache refresh interval updated to ${intervalMs}ms`);
        }
    }

    /**
     * Check if a location is in cache
     */
    has(id: string): boolean {
        return this.cache.has(id);
    }

    /**
     * Get cache statistics
     */
    getStats(): { size: number; lastRefresh: Date | null } {
        return {
            size: this.cache.size,
            lastRefresh: null // TODO: track this
        };
    }

    /**
     * Clean up on module destroy
     */
    onModuleDestroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    /**
     * Fetch locations from database
     * This will be replaced with actual Prisma query when FtpLocation model is added
     */
    private async fetchLocationsFromDb(): Promise<FtpLocation[]> {
        // TODO: Replace with actual Prisma query
        // return this.prisma.ftpLocation.findMany({ where: { isActive: true } });

        // Placeholder - return empty array until schema is updated
        return [];
    }

    // =========================================
    // Redis-compatible interface methods
    // These methods mirror Redis operations for easy migration
    // =========================================

    /**
     * Redis-compatible SET operation
     */
    async set(key: string, value: FtpLocation): Promise<void> {
        this.cache.set(key, value);
    }

    /**
     * Redis-compatible DEL operation
     */
    async del(key: string): Promise<boolean> {
        return this.cache.delete(key);
    }

    /**
     * Redis-compatible KEYS operation
     */
    async keys(pattern: string = '*'): Promise<string[]> {
        if (pattern === '*') {
            return Array.from(this.cache.keys());
        }
        // Simple pattern matching for basic wildcards
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(this.cache.keys()).filter(key => regex.test(key));
    }

    /**
     * Redis-compatible MGET operation
     */
    async mget(keys: string[]): Promise<(FtpLocation | undefined)[]> {
        return keys.map(key => this.cache.get(key));
    }

    /**
     * Redis-compatible FLUSHALL operation
     */
    async flushAll(): Promise<void> {
        this.cache.clear();
    }
}
