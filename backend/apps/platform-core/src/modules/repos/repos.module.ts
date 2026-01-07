// apps/platform-core/src/modules/repos/repos.module.ts
// Repository management module

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { ReposController } from './repos.controller';
import { ReposService } from './repos.service';
import { GitProviderFactory } from './git-providers/provider.factory';
import { SyncService } from './sync/sync.service';
import { FtpCacheService } from './cache/ftp-cache.service';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
    imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        forwardRef(() => IndexerModule)  // Import for indexing after repo creation
    ],
    controllers: [ReposController],
    providers: [
        ReposService,
        GitProviderFactory,
        SyncService,
        FtpCacheService
    ],
    exports: [
        ReposService,
        GitProviderFactory,
        SyncService,
        FtpCacheService
    ]
})
export class ReposModule { }

