import { Module } from '@nestjs/common';

import { PersistenceModule } from '../persistence/persistence.module.js';
import { SearchHistoryController } from './search-history.controller.js';
import { SearchHistoryService } from './search-history.service.js';

@Module({
  imports: [PersistenceModule],
  controllers: [SearchHistoryController],
  providers: [SearchHistoryService],
  exports: [SearchHistoryService],
})
export class SearchHistoryModule {}
