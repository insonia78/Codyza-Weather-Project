import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { CacheMetricsService } from './cache-metrics.service.js';
import { RequestLoggingMiddleware } from './request-logging.middleware.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService, CacheMetricsService, RequestLoggingMiddleware],
  exports: [AdminService, CacheMetricsService],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
