import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SearchHistoryModule } from './search-history/search-history.module.js';
import { WeatherModule } from './weather/weather.module.js';

@Module({
  imports: [WeatherModule, SearchHistoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
