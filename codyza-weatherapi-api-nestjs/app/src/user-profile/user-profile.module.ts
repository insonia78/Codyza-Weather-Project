import { Module } from '@nestjs/common';

import { PersistenceModule } from '../persistence/persistence.module.js';
import { SearchHistoryModule } from '../search-history/search-history.module.js';
import { UserProfileController } from './user-profile.controller.js';
import { UserProfileService } from './user-profile.service.js';

@Module({
  imports: [PersistenceModule, SearchHistoryModule],
  controllers: [UserProfileController],
  providers: [UserProfileService],
})
export class UserProfileModule {}
