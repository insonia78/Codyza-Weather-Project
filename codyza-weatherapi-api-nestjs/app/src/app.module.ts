import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SearchHistoryModule } from './search-history/search-history.module.js';
import { GatewayRequestMiddleware } from './security/gateway-request.middleware.js';
import { UserProfileModule } from './user-profile/user-profile.module.js';
import { WeatherModule } from './weather/weather.module.js';

@Module({
  imports: [AdminModule, WeatherModule, SearchHistoryModule, UserProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GatewayRequestMiddleware).forRoutes('*');
  }
}
