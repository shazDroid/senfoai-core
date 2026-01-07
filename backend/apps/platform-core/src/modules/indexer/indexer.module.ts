import { Module } from '@nestjs/common';
import { IndexerController } from './indexer.controller';
import { IndexerService } from './indexer.service';
import { RepoCheckoutService } from './repo-checkout.service';
import { NamespaceDetectorService } from './namespace-detector.service';
import { TreeSitterParseService } from './treesitter-parse.service';
import { Neo4jWriterService } from './neo4j-writer.service';
import { ZoektIndexService } from './zoekt-index.service';
import { FtpUploadService } from './ftp-upload.service';

@Module({
    controllers: [IndexerController],
    providers: [
        IndexerService,
        RepoCheckoutService,
        NamespaceDetectorService,
        TreeSitterParseService,
        Neo4jWriterService,
        ZoektIndexService,
        FtpUploadService
    ],
    exports: [IndexerService, Neo4jWriterService, RepoCheckoutService]
})
export class IndexerModule { }
