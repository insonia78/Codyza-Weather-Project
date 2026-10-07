import { ServiceUnavailableException } from '@nestjs/common';

import { WeatherProviderService } from './weather.service.js';
import { CacheMetricsService } from '../admin/cache-metrics.service.js';

describe('WeatherProviderService', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env['GOOGLE_WEATHER_API_KEY'];
  const createFetchResponse = (body: string): Response => ({
    ok: true,
    text: vi.fn().mockResolvedValue(body),
  }) as unknown as Response;

  beforeEach(() => {
    process.env['GOOGLE_WEATHER_API_KEY'] = 'test-api-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;

    if (typeof originalApiKey === 'string') {
      process.env['GOOGLE_WEATHER_API_KEY'] = originalApiKey;
      return;
    }

    delete process.env['GOOGLE_WEATHER_API_KEY'];
  });

  it('returns an empty result set when the geocoder omits results for a text search', async () => {
    global.fetch = vi.fn().mockResolvedValue(createFetchResponse('{}'));

    const service = new WeatherProviderService(new CacheMetricsService());

    await expect(service.searchLocations('Milan')).resolves.toEqual([]);
  });

  it('returns the coordinate fallback when reverse geocoding omits results', async () => {
    global.fetch = vi.fn().mockResolvedValue(createFetchResponse('{}'));

    const service = new WeatherProviderService(new CacheMetricsService());

    await expect(service.reverseGeocode(45.4642, 9.19, 'search')).resolves.toEqual([
      {
        id: '45.464:9.190',
        name: 'Coordinates',
        country: 'Custom',
        lat: 45.4642,
        lon: 9.19,
        label: '45.464, 9.190',
        source: 'search',
        category: 'coordinates',
      },
    ]);
  });

  it('keeps airport searches working when the airport-specific response omits results', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            results: [
              {
                placeId: 'mxp',
                location: {
                  latitude: 45.63,
                  longitude: 8.723,
                },
                formattedAddress: 'Milan, Italy',
                addressComponents: [
                  {
                    longText: 'Milan',
                    types: ['locality'],
                  },
                  {
                    longText: 'Italy',
                    types: ['country'],
                  },
                ],
              },
            ],
          }),
        ),
      } as unknown as Response)
      .mockResolvedValueOnce(createFetchResponse('{}'));

    const service = new WeatherProviderService(new CacheMetricsService());

    await expect(service.searchLocations('MXP')).resolves.toEqual([
      {
        id: '45.630:8.723',
        name: 'Milan',
        state: undefined,
        country: 'Italy',
        lat: 45.63,
        lon: 8.723,
        label: 'Milan, Italy',
        source: 'search',
        category: 'city',
        airportCode: undefined,
      },
    ]);
  });

  it('reuses cached search responses until they expire', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createFetchResponse(
        JSON.stringify({
          results: [
            {
              placeId: 'milan',
              location: {
                latitude: 45.4642,
                longitude: 9.19,
              },
              formattedAddress: 'Milan, Italy',
              addressComponents: [
                {
                  longText: 'Milan',
                  types: ['locality'],
                },
                {
                  longText: 'Italy',
                  types: ['country'],
                },
              ],
            },
          ],
        }),
      ),
    );

    const service = new WeatherProviderService(new CacheMetricsService());

    const firstResult = await service.searchLocations('Milan');
    const secondResult = await service.searchLocations(' Milan ');

    expect(secondResult).toEqual(firstResult);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('avoids a second airport lookup when the primary results already contain the exact airport code', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createFetchResponse(
        JSON.stringify({
          results: [
            {
              placeId: 'jfk',
              location: {
                latitude: 40.6413,
                longitude: -73.7781,
              },
              formattedAddress: 'John F. Kennedy International Airport, Queens, NY, USA',
              addressComponents: [
                {
                  longText: 'John F. Kennedy International Airport',
                  shortText: 'JFK',
                  types: ['airport'],
                },
                {
                  longText: 'United States',
                  types: ['country'],
                },
              ],
              types: ['airport'],
            },
          ],
        }),
      ),
    );

    const service = new WeatherProviderService(new CacheMetricsService());

    await expect(service.searchLocations('JFK')).resolves.toEqual([
      {
        id: '40.641:-73.778',
        name: 'John F. Kennedy International Airport (JFK)',
        state: undefined,
        country: 'United States',
        lat: 40.6413,
        lon: -73.7781,
        label: 'John F. Kennedy International Airport, Queens, NY, USA (JFK)',
        source: 'search',
        category: 'airport',
        airportCode: 'JFK',
      },
    ]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('prioritizes airport matches and annotates airport codes for airport-style queries', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            results: [
              {
                placeId: 'new-york-city',
                location: {
                  latitude: 40.7128,
                  longitude: -74.006,
                },
                formattedAddress: 'New York, NY, USA',
                addressComponents: [
                  {
                    longText: 'New York',
                    types: ['locality'],
                  },
                  {
                    longText: 'United States',
                    types: ['country'],
                  },
                ],
              },
            ],
          }),
        ),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            results: [
              {
                placeId: 'jfk',
                location: {
                  latitude: 40.6413,
                  longitude: -73.7781,
                },
                formattedAddress: 'John F. Kennedy International Airport, Queens, NY, USA',
                addressComponents: [
                  {
                    longText: 'John F. Kennedy International Airport',
                    shortText: 'JFK',
                    types: ['airport'],
                  },
                  {
                    longText: 'United States',
                    types: ['country'],
                  },
                ],
                types: ['airport'],
              },
            ],
          }),
        ),
      } as unknown as Response);

    const service = new WeatherProviderService(new CacheMetricsService());

    await expect(service.searchLocations('JFK')).resolves.toEqual([
      {
        id: '40.641:-73.778',
        name: 'John F. Kennedy International Airport (JFK)',
        state: undefined,
        country: 'United States',
        lat: 40.6413,
        lon: -73.7781,
        label: 'John F. Kennedy International Airport, Queens, NY, USA (JFK)',
        source: 'search',
        category: 'airport',
        airportCode: 'JFK',
      },
      {
        id: '40.713:-74.006',
        name: 'New York',
        state: undefined,
        country: 'United States',
        lat: 40.7128,
        lon: -74.006,
        label: 'New York, NY, USA',
        source: 'search',
        category: 'city',
      },
    ]);
  });

  it('surfaces provider rate limits as a service-unavailable location search error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: vi.fn().mockResolvedValue(JSON.stringify({
        error: {
          message: 'Quota exceeded for geocoding requests.',
        },
      })),
    } as unknown as Response);

    const service = new WeatherProviderService(new CacheMetricsService());

    await expect(service.searchLocations('JFK')).rejects.toEqual(
      new ServiceUnavailableException(
        'Location search is temporarily rate limited by Google Maps Weather API. Please retry in a moment.',
      ),
    );
  });
});
