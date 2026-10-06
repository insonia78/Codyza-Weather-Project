import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';

import type { DashboardRequestBody, LocationSource, WeatherMapLayerKey } from './weather.models.js';
import { WeatherProviderService } from './weather.service.js';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherProviderService) {}

  @Get('status')
  getStatus() {
    return {
      configured: this.weatherService.apiKeyConfigured,
      providerName: this.weatherService.providerName,
    };
  }

  @Get('search')
  async searchLocations(@Query('query') query: string) {
    if (typeof query !== 'string' || !query.trim()) {
      throw new BadRequestException('A search query is required.');
    }

    return this.weatherService.searchLocations(query);
  }

  @Get('reverse')
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('source') source?: string,
  ) {
    return this.weatherService.reverseGeocode(
      this.parseCoordinate(lat, 'lat'),
      this.parseCoordinate(lon, 'lon'),
      this.parseSource(source),
    );
  }

  @Post('dashboard')
  async getDashboard(@Body() body: DashboardRequestBody) {
    return this.weatherService.getDashboard(body);
  }

  @Get('map-layers/:layer/:z/:x/:y')
  async getMapLayerTile(
    @Param('layer') layer: string,
    @Param('z') z: string,
    @Param('x') x: string,
    @Param('y') y: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tile = await this.weatherService.getMapLayerTile(
      this.parseLayer(layer),
      this.parseTileCoordinate(z, 'z'),
      this.parseTileCoordinate(x, 'x'),
      this.parseTileCoordinate(y, 'y'),
    );
    response.setHeader('Content-Type', tile.contentType);
    response.setHeader('Cache-Control', 'public, max-age=900');
    return new StreamableFile(tile.body);
  }

  private parseCoordinate(value: string, name: string): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`A valid ${name} query parameter is required.`);
    }

    return parsed;
  }

  private parseSource(source?: string): LocationSource {
    if (!source) {
      return 'search';
    }

    const validSources: LocationSource[] = ['search', 'favorite', 'recent', 'geolocation', 'map'];
    if (validSources.includes(source as LocationSource)) {
      return source as LocationSource;
    }

    throw new BadRequestException('The source query parameter is invalid.');
  }

  private parseLayer(layer: string): WeatherMapLayerKey {
    const validLayers: WeatherMapLayerKey[] = ['clouds_new', 'precipitation_new', 'temp_new', 'wind_new'];
    if (validLayers.includes(layer as WeatherMapLayerKey)) {
      return layer as WeatherMapLayerKey;
    }

    throw new BadRequestException('The map layer is invalid.');
  }

  private parseTileCoordinate(value: string, name: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`A valid ${name} tile parameter is required.`);
    }

    return parsed;
  }
}
