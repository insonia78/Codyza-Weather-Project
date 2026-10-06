import { Module } from '@nestjs/common';

import { WeatherDatabaseService } from './weather-database.service.js';

@Module({
  providers: [WeatherDatabaseService],
  exports: [WeatherDatabaseService],
})
export class PersistenceModule {}
