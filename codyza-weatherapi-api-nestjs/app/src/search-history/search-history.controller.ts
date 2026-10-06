import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';

import {
  isSaveSearchHistoryRequestBody,
  type SaveSearchHistoryRequestBody,
} from './search-history.models.js';
import { SearchHistoryService } from './search-history.service.js';

@Controller('weather/search-history')
export class SearchHistoryController {
  constructor(private readonly searchHistoryService: SearchHistoryService) {}

  @Get()
  async listRecentSearches(
    @Headers('x-user-id') userEmail: string | undefined,
    @Query('limit') limit?: string,
  ) {
    return this.searchHistoryService.listRecentSearches(
      this.requireUserEmail(userEmail),
      this.parseLimit(limit),
    );
  }

  @Post()
  async saveRecentSearch(
    @Headers('x-user-id') userEmail: string | undefined,
    @Body() body: unknown,
  ) {
    if (!isSaveSearchHistoryRequestBody(body)) {
      throw new BadRequestException(
        'Request body must contain a valid location object and an optional queryText string.',
      );
    }

    return this.searchHistoryService.saveRecentSearch(
      this.requireUserEmail(userEmail),
      body as SaveSearchHistoryRequestBody,
    );
  }

  @Delete()
  async clearRecentSearches(@Headers('x-user-id') userEmail: string | undefined) {
    await this.searchHistoryService.clearRecentSearches(this.requireUserEmail(userEmail));
    return { cleared: true };
  }

  private requireUserEmail(userEmail: string | undefined): string {
    const normalizedUserEmail = userEmail?.trim();
    if (!normalizedUserEmail) {
      throw new UnauthorizedException('Missing X-User-Id header.');
    }

    return normalizedUserEmail;
  }

  private parseLimit(value?: string): number {
    if (typeof value === 'undefined') {
      return 8;
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue) || parsedValue < 1) {
      throw new BadRequestException('The limit query parameter must be a positive integer.');
    }

    return parsedValue;
  }
}
