import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Put,
  UnauthorizedException,
} from '@nestjs/common';

import { UserProfileService } from './user-profile.service.js';
import { isSaveWeatherUserProfileRequestBody } from './user-profile.models.js';

@Controller('weather/profile')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get()
  async getProfile(@Headers('x-user-id') userEmail: string | undefined) {
    return this.userProfileService.getProfile(this.requireUserEmail(userEmail));
  }

  @Put()
  async saveProfile(
    @Headers('x-user-id') userEmail: string | undefined,
    @Body() body: unknown,
  ) {
    if (!isSaveWeatherUserProfileRequestBody(body)) {
      throw new BadRequestException(
        'Request body must include favorites, comparisonLocations, temperatureUnit, measurementSystem, selectedMapLayer, autoRefresh, and notificationPreferences.',
      );
    }

    return this.userProfileService.saveProfile(
      this.requireUserEmail(userEmail),
      body,
    );
  }

  private requireUserEmail(userEmail: string | undefined): string {
    const normalizedUserEmail = userEmail?.trim();
    if (!normalizedUserEmail) {
      throw new UnauthorizedException('Missing X-User-Id header.');
    }

    return normalizedUserEmail;
  }
}
