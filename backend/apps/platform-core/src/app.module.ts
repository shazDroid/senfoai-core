import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { SuperModule } from './modules/super/super.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReposModule } from './modules/repos/repos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),  // Enable cron jobs for sync
    AuditModule,  // Global audit service
    AuthModule,
    SuperModule,
    AdminModule,
    ReposModule,  // Repository management with sync
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
