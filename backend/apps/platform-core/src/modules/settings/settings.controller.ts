import { Controller, Get, Post, Put, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettingsService, FtpConfigDto } from './settings.service';
import { AccessContext } from '../auth/access-context.service';

@Controller('settings')
@UseGuards(AuthGuard('jwt'))
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    /**
     * Get FTP configuration
     */
    @Get('ftp')
    async getFtpConfig(@Req() req: { user: AccessContext }): Promise<FtpConfigDto | null> {
        return this.settingsService.getFtpConfig(req.user.orgId);
    }

    /**
     * Save FTP configuration
     */
    @Put('ftp')
    async saveFtpConfig(
        @Req() req: { user: AccessContext },
        @Body() config: { host: string; port: number; path: string; username?: string; password?: string; passiveMode?: boolean; name?: string }
    ) {
        return this.settingsService.saveFtpConfig(req.user.orgId, config);
    }

    /**
     * Test FTP connection
     */
    @Post('ftp/test')
    async testFtpConnection(
        @Req() req: { user: AccessContext }
    ): Promise<{ success: boolean; message: string }> {
        return this.settingsService.testFtpConnection(req.user.orgId);
    }

    /**
     * Delete FTP configuration
     */
    @Delete('ftp')
    async deleteFtpConfig(@Req() req: { user: AccessContext }): Promise<{ message: string }> {
        await this.settingsService.deleteFtpConfig(req.user.orgId);
        return { message: 'FTP configuration deleted' };
    }
}
