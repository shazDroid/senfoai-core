import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as ftp from 'basic-ftp';
import * as path from 'path';
import * as fs from 'fs';
import { DebugLogger } from '../../common/utils/debug-logger';

export interface FtpUploadResult {
    success: boolean;
    filesUploaded: number;
    bytesUploaded: number;
    remotePath: string;
    error?: string;
}

/**
 * FtpUploadService
 * Handles uploading cloned repositories to configured FTP server
 */
@Injectable()
export class FtpUploadService {
    private readonly debug = new DebugLogger('FtpUploadService');
    private prisma = new PrismaClient();

    /**
     * Upload a local directory to the configured FTP server
     */
    async uploadToFtp(
        orgId: string,
        repoId: string,
        repoName: string,
        localPath: string
    ): Promise<FtpUploadResult> {
        this.debug.ftpOp('UPLOAD_REQUEST', { orgId, repoId, repoName, localPath });

        // Check if local path exists
        if (!fs.existsSync(localPath)) {
            this.debug.ftpOp('ERROR', { error: 'Local path does not exist', localPath });
            return {
                success: false,
                filesUploaded: 0,
                bytesUploaded: 0,
                remotePath: '',
                error: `Local path does not exist: ${localPath}`
            };
        }

        // Get FTP configuration for the organization
        const ftpConfig = await this.prisma.ftpLocation.findFirst({
            where: { orgId, isActive: true }
        });

        this.debug.ftpOp('FTP_CONFIG', ftpConfig ? {
            host: ftpConfig.host,
            port: ftpConfig.port,
            path: ftpConfig.path,
            username: ftpConfig.username,
            hasPassword: !!ftpConfig.encryptedPassword
        } : { found: false });

        if (!ftpConfig) {
            const errorMsg = `No FTP configuration found for org ${orgId}. Please configure FTP in Settings.`;
            this.debug.error(errorMsg);
            this.debug.ftpOp('ERROR', { error: errorMsg, orgId });
            return {
                success: false,
                filesUploaded: 0,
                bytesUploaded: 0,
                remotePath: '',
                error: errorMsg
            };
        }

        const client = new ftp.Client();
        client.ftp.verbose = true; // Enable verbose logging for debugging

        try {
            this.debug.log(`Connecting to FTP: ${ftpConfig.host}:${ftpConfig.port}`);
            this.debug.log(`  Username: ${ftpConfig.username || 'anonymous'}`);
            this.debug.log(`  Path: ${ftpConfig.path}`);
            this.debug.ftpOp('CONNECTING', { 
                host: ftpConfig.host, 
                port: ftpConfig.port,
                username: ftpConfig.username || 'anonymous',
                path: ftpConfig.path
            });

            // Use passive mode by default (required for most FTP servers behind firewalls, including FileZilla)
            // The basic-ftp library uses passive mode by default, but we can explicitly set it
            const accessOptions: any = {
                host: ftpConfig.host,
                port: ftpConfig.port,
                user: ftpConfig.username || 'anonymous',
                password: ftpConfig.encryptedPassword || '',
                secure: false // Use true for FTPS
            };

            await client.access(accessOptions);

            this.debug.ftpOp('CONNECTED', { host: ftpConfig.host });

            // Create remote directory structure
            const remotePath = path.posix.join(ftpConfig.path, repoName);

            this.debug.log(`Uploading to FTP path: ${remotePath}`);
            this.debug.ftpOp('CREATING_DIR', { remotePath });

            // Ensure remote directory exists
            await client.ensureDir(remotePath);
            this.debug.ftpOp('DIR_CREATED', { remotePath });

            // Upload the directory recursively
            this.debug.ftpOp('UPLOAD_START', { localPath, remotePath });
            const stats = await this.uploadDirectory(client, localPath, remotePath);

            // Update last verified timestamp
            await this.prisma.ftpLocation.update({
                where: { id: ftpConfig.id },
                data: { lastVerified: new Date() }
            });

            this.debug.log(`FTP upload complete: ${stats.filesUploaded} files, ${stats.bytesUploaded} bytes`);
            this.debug.ftpOp('UPLOAD_COMPLETE', {
                filesUploaded: stats.filesUploaded,
                bytesUploaded: stats.bytesUploaded,
                remotePath
            });

            return {
                success: true,
                filesUploaded: stats.filesUploaded,
                bytesUploaded: stats.bytesUploaded,
                remotePath
            };
        } catch (error: any) {
            const errorMessage = error.message || 'Unknown FTP error';
            const errorStack = error.stack || '';
            this.debug.error(`FTP upload failed: ${errorMessage}`);
            this.debug.error(`FTP error details: ${JSON.stringify({
                message: errorMessage,
                code: error.code,
                host: ftpConfig.host,
                port: ftpConfig.port,
                path: ftpConfig.path
            })}`);
            this.debug.ftpOp('UPLOAD_ERROR', { 
                error: errorMessage, 
                code: error.code,
                stack: errorStack,
                host: ftpConfig.host,
                port: ftpConfig.port
            });
            return {
                success: false,
                filesUploaded: 0,
                bytesUploaded: 0,
                remotePath: '',
                error: `FTP upload failed: ${errorMessage}${error.code ? ` (Code: ${error.code})` : ''}`
            };
        } finally {
            try {
                client.close();
            } catch (closeError) {
                // Ignore close errors
            }
        }
    }

    /**
     * Recursively upload a directory to FTP
     */
    private async uploadDirectory(
        client: ftp.Client,
        localDir: string,
        remoteDir: string
    ): Promise<{ filesUploaded: number; bytesUploaded: number }> {
        let filesUploaded = 0;
        let bytesUploaded = 0;

        const entries = fs.readdirSync(localDir, { withFileTypes: true });

        for (const entry of entries) {
            const localPath = path.join(localDir, entry.name);
            const remotePath = path.posix.join(remoteDir, entry.name);

            // Skip .git directory and node_modules
            if (entry.name === '.git' || entry.name === 'node_modules') {
                continue;
            }

            if (entry.isDirectory()) {
                // Create remote directory and recurse
                await client.ensureDir(remotePath);
                const subStats = await this.uploadDirectory(client, localPath, remotePath);
                filesUploaded += subStats.filesUploaded;
                bytesUploaded += subStats.bytesUploaded;
            } else if (entry.isFile()) {
                // Upload file
                try {
                    const stats = fs.statSync(localPath);
                    this.debug.log(`Uploading file: ${entry.name} (${stats.size} bytes)`);
                    await client.uploadFrom(localPath, remotePath);
                    filesUploaded++;
                    bytesUploaded += stats.size;
                    if (filesUploaded % 100 === 0) {
                        this.debug.log(`Progress: ${filesUploaded} files uploaded...`);
                    }
                } catch (err: any) {
                    const errorMsg = `Failed to upload ${entry.name}: ${err.message}`;
                    this.debug.error(errorMsg);
                    // Continue with other files, but log the error
                    // Don't throw - allow partial uploads to complete
                }
            }
        }

        return { filesUploaded, bytesUploaded };
    }

    /**
     * Test FTP connection
     */
    async testConnection(orgId: string): Promise<{ success: boolean; message: string }> {
        const ftpConfig = await this.prisma.ftpLocation.findFirst({
            where: { orgId, isActive: true }
        });

        if (!ftpConfig) {
            return { success: false, message: 'No FTP configuration found' };
        }

        const client = new ftp.Client();

        try {
            await client.access({
                host: ftpConfig.host,
                port: ftpConfig.port,
                user: ftpConfig.username || 'anonymous',
                password: ftpConfig.encryptedPassword || '',
                secure: false
            });

            // Update last verified
            await this.prisma.ftpLocation.update({
                where: { id: ftpConfig.id },
                data: { lastVerified: new Date() }
            });

            return { success: true, message: `Connected to ${ftpConfig.host}:${ftpConfig.port}` };
        } catch (error: any) {
            return { success: false, message: error.message };
        } finally {
            client.close();
        }
    }
}
