import { Module } from '@nestjs/common';
import { SuperService } from './super.service';
import { SuperController } from './super.controller';
import { AuditService } from '../audit/audit.service';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
    imports: [IndexerModule], // Import to access RepoCheckoutService and Neo4jWriterService
    providers: [SuperService, AuditService],
    controllers: [SuperController],
    exports: [SuperService],
})
export class SuperModule { }
