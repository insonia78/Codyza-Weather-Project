import { Module } from '@nestjs/common';

import { SearchHistoryController } from './search-history.controller.js';
import { SearchHistoryService } from './search-history.service.js';

@Module({
  controllers: [SearchHistoryController],
  providers: [SearchHistoryService],
  exports: [SearchHistoryService],
})
export class SearchHistoryModule {}
