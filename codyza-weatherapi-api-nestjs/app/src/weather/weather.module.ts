import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module.js';
import { WeatherController } from './weather.controller.js';
import { WeatherProviderService } from './weather.service.js';

@Module({
  imports: [AdminModule],
  controllers: [WeatherController],
  providers: [WeatherProviderService],
  exports: [WeatherProviderService],
})
export class WeatherModule {}
