import { ServiceUnavailableException } from '@nestjs/common';

import { WeatherDatabaseService } from './weather-database.service.js';

describe('WeatherDatabaseService', () => {
  const originalSearchHistoryDatabaseUrl = process.env.WEATHER_SEARCH_HISTORY_DATABASE_URL;
  const originalObservabilityDatabaseUrl = process.env.WEATHER_OBSERVABILITY_DATABASE_URL;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(async () => {
    process.env.WEATHER_SEARCH_HISTORY_DATABASE_URL = originalSearchHistoryDatabaseUrl;
    process.env.WEATHER_OBSERVABILITY_DATABASE_URL = originalObservabilityDatabaseUrl;
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('uses the observability database URL when the search-history URL is missing', async () => {
    delete process.env.WEATHER_SEARCH_HISTORY_DATABASE_URL;
    process.env.WEATHER_OBSERVABILITY_DATABASE_URL = 'postgresql://postgres:password@example.com:5432/weather';
    delete process.env.DATABASE_URL;

    const service = new WeatherDatabaseService();
    const client = service.getClient();

    expect(client).toBeTruthy();

    await service.onModuleDestroy();
  });

  it('fails with a clear message when no database URL is configured', () => {
    delete process.env.WEATHER_SEARCH_HISTORY_DATABASE_URL;
    delete process.env.WEATHER_OBSERVABILITY_DATABASE_URL;
    delete process.env.DATABASE_URL;

    const service = new WeatherDatabaseService();

    expect(() => service.getClient()).toThrowError(new ServiceUnavailableException(
      'Missing WEATHER_SEARCH_HISTORY_DATABASE_URL, WEATHER_OBSERVABILITY_DATABASE_URL, or DATABASE_URL environment variable.',
    ));
  });
});
