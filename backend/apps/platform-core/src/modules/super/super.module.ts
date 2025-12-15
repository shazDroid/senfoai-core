import { Module } from '@nestjs/common';
import { SuperService } from './super.service';
import { SuperController } from './super.controller';
import { AuditService } from '../audit/audit.service';

@Module({
    providers: [SuperService, AuditService],
    controllers: [SuperController],
    exports: [SuperService],
})
export class SuperModule { }
