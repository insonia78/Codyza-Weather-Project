import type { WeatherDatabaseQueryClient } from '../persistence/weather-database.service.js';
import { UserProfileService } from './user-profile.service.js';

describe('UserProfileService', () => {
  const createQueryResult = <T>(rows: T[]) => ({
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  });

  it('returns a default protected dashboard profile when no row exists', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([])),
    };

    const service = new UserProfileService(
      {
        getClient: () => client as WeatherDatabaseQueryClient,
      } as never,
      {
        listRecentSearches: vi.fn().mockResolvedValue([]),
      } as never,
    );

    await expect(service.getProfile('weather.user@example.com')).resolves.toEqual({
      email: 'weather.user@example.com',
      favorites: [],
      comparisonLocations: [],
      recentSearches: [],
      temperatureUnit: 'celsius',
      measurementSystem: 'metric',
      selectedMapLayer: 'clouds_new',
      autoRefresh: true,
      notificationPreferences: {
        dailySummary: true,
        severeWeather: true,
        airQuality: false,
        weekendOutlook: false,
      },
      updatedAt: null,
    });
  });

  it('sanitizes and returns the saved profile payload', async () => {
    const searchHistoryService = {
      listRecentSearches: vi.fn().mockResolvedValue([
        {
          id: '41.903:12.496',
          name: 'Rome',
          country: 'Italy',
          lat: 41.9028,
          lon: 12.4964,
          label: 'Rome, Italy',
          source: 'recent',
        },
      ]),
    };
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([
          {
            favorites: [
              {
                id: 'jfk',
                name: 'John F. Kennedy International Airport',
                country: 'United States',
                lat: 40.64,
                lon: -73.78,
                label: 'John F. Kennedy International Airport, Queens, NY, USA',
                source: 'favorite',
                category: 'airport',
                airportCode: 'JFK',
              },
              {
                id: 'jfk',
                name: 'Duplicate Airport',
                country: 'United States',
                lat: 40.64,
                lon: -73.78,
                label: 'Duplicate',
                source: 'favorite',
              },
            ],
            comparisonLocations: [
              {
                id: 'lhr',
                name: 'Heathrow Airport',
                country: 'United Kingdom',
                lat: 51.47,
                lon: -0.45,
                label: 'Heathrow Airport, Hounslow, UK',
                source: 'search',
                category: 'airport',
                airportCode: 'LHR',
              },
            ],
            temperatureUnit: 'fahrenheit',
            measurementSystem: 'imperial',
            selectedMapLayer: 'wind_new',
            autoRefresh: false,
            notificationPreferences: {
              dailySummary: false,
              severeWeather: true,
              airQuality: true,
              weekendOutlook: true,
            },
            updatedAt: '2026-10-06T18:00:00.000Z',
          },
        ])),
    };

    const service = new UserProfileService(
      {
        getClient: () => client as WeatherDatabaseQueryClient,
      } as never,
      searchHistoryService as never,
    );

    await expect(service.saveProfile('weather.user@example.com', {
      favorites: [
        {
          id: 'jfk',
          name: 'John F. Kennedy International Airport',
          country: 'United States',
          lat: 40.64,
          lon: -73.78,
          label: 'John F. Kennedy International Airport, Queens, NY, USA',
          source: 'favorite',
          category: 'airport',
          airportCode: 'jfk',
        },
      ],
      comparisonLocations: [
        {
          id: 'lhr',
          name: 'Heathrow Airport',
          country: 'United Kingdom',
          lat: 51.47,
          lon: -0.45,
          label: 'Heathrow Airport, Hounslow, UK',
          source: 'search',
          category: 'airport',
          airportCode: 'lhr',
        },
      ],
      temperatureUnit: 'fahrenheit',
      measurementSystem: 'imperial',
      selectedMapLayer: 'wind_new',
      autoRefresh: false,
      notificationPreferences: {
        dailySummary: false,
        severeWeather: true,
        airQuality: true,
        weekendOutlook: true,
      },
    })).resolves.toEqual({
      email: 'weather.user@example.com',
      favorites: [
        {
          id: 'jfk',
          name: 'John F. Kennedy International Airport',
          country: 'United States',
          lat: 40.64,
          lon: -73.78,
          label: 'John F. Kennedy International Airport, Queens, NY, USA',
          source: 'favorite',
          category: 'airport',
          airportCode: 'JFK',
        },
      ],
      comparisonLocations: [
        {
          id: 'lhr',
          name: 'Heathrow Airport',
          country: 'United Kingdom',
          lat: 51.47,
          lon: -0.45,
          label: 'Heathrow Airport, Hounslow, UK',
          source: 'search',
          category: 'airport',
          airportCode: 'LHR',
        },
      ],
      recentSearches: [
        {
          id: '41.903:12.496',
          name: 'Rome',
          country: 'Italy',
          lat: 41.9028,
          lon: 12.4964,
          label: 'Rome, Italy',
          source: 'recent',
        },
      ],
      temperatureUnit: 'fahrenheit',
      measurementSystem: 'imperial',
      selectedMapLayer: 'wind_new',
      autoRefresh: false,
      notificationPreferences: {
        dailySummary: false,
        severeWeather: true,
        airQuality: true,
        weekendOutlook: true,
      },
      updatedAt: '2026-10-06T18:00:00.000Z',
    });

    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO weather_user_profiles'),
      [
        'weather.user@example.com',
        JSON.stringify([
          {
            id: 'jfk',
            name: 'John F. Kennedy International Airport',
            country: 'United States',
            lat: 40.64,
            lon: -73.78,
            label: 'John F. Kennedy International Airport, Queens, NY, USA',
            source: 'favorite',
            category: 'airport',
            airportCode: 'JFK',
          },
        ]),
        JSON.stringify([
          {
            id: 'lhr',
            name: 'Heathrow Airport',
            country: 'United Kingdom',
            lat: 51.47,
            lon: -0.45,
            label: 'Heathrow Airport, Hounslow, UK',
            source: 'search',
            category: 'airport',
            airportCode: 'LHR',
          },
        ]),
        'fahrenheit',
        'imperial',
        'wind_new',
        false,
        JSON.stringify({
          dailySummary: false,
          severeWeather: true,
          airQuality: true,
          weekendOutlook: true,
        }),
      ],
    );
  });
});
