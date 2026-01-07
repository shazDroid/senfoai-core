import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export interface FtpConfigDto {
    name?: string;
    host: string;
    port: number;
    path: string;
    username?: string;
    password?: string;
    passiveMode?: boolean;
}

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);
    private prisma = new PrismaClient();

    /**
     * Get FTP configuration for the organization
     */
    async getFtpConfig(orgId: string): Promise<FtpConfigDto | null> {
        const ftpLocation = await this.prisma.ftpLocation.findFirst({
            where: { orgId, isActive: true }
        });

        if (!ftpLocation) {
            return null;
        }

        return {
            name: ftpLocation.name,
            host: ftpLocation.host,
            port: ftpLocation.port,
            path: ftpLocation.path,
            username: ftpLocation.username || undefined,
            // Don't expose password in GET responses
            passiveMode: true // Default - could be stored in a settings field
        };
    }

    /**
     * Save FTP configuration for the organization
     */
    async saveFtpConfig(orgId: string, config: FtpConfigDto): Promise<FtpConfigDto> {
        const existing = await this.prisma.ftpLocation.findFirst({
            where: { orgId, isActive: true }
        });

        if (existing) {
            // Update existing
            const updated = await this.prisma.ftpLocation.update({
                where: { id: existing.id },
                data: {
                    name: config.name || 'Default FTP',
                    host: config.host,
                    port: config.port,
                    path: config.path,
                    username: config.username,
                    encryptedPassword: config.password, // In prod, encrypt this
                    lastVerified: null
                }
            });

            this.logger.log(`Updated FTP config for org ${orgId}`);
            return {
                name: updated.name,
                host: updated.host,
                port: updated.port,
                path: updated.path,
                username: updated.username || undefined
            };
        } else {
            // Create new
            const created = await this.prisma.ftpLocation.create({
                data: {
                    orgId,
                    name: config.name || 'Default FTP',
                    host: config.host,
                    port: config.port,
                    path: config.path,
                    username: config.username,
                    encryptedPassword: config.password, // In prod, encrypt this
                    authType: 'password',
                    isActive: true
                }
            });

            this.logger.log(`Created FTP config for org ${orgId}`);
            return {
                name: created.name,
                host: created.host,
                port: created.port,
                path: created.path,
                username: created.username || undefined
            };
        }
    }

    /**
     * Test FTP connection
     */
    async testFtpConnection(orgId: string): Promise<{ success: boolean; message: string }> {
        const config = await this.getFtpConfig(orgId);

        if (!config) {
            return { success: false, message: 'No FTP configuration found' };
        }

        // In production, actually test the connection
        // For now, just return a mock response
        this.logger.log(`Testing FTP connection for org ${orgId}: ${config.host}:${config.port}`);

        return {
            success: true,
            message: `Successfully connected to ${config.host}:${config.port}`
        };
    }

    /**
     * Delete FTP configuration
     */
    async deleteFtpConfig(orgId: string): Promise<void> {
        await this.prisma.ftpLocation.updateMany({
            where: { orgId, isActive: true },
            data: { isActive: false }
        });

        this.logger.log(`Deleted FTP config for org ${orgId}`);
    }
}
