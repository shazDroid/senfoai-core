import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditService } from '../audit/audit.service';

@Module({
    providers: [AdminService, AuditService],
    controllers: [AdminController],
    exports: [AdminService],
})
export class AdminModule { }
