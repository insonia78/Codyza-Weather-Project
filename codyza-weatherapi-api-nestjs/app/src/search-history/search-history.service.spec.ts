import type { WeatherDatabaseQueryClient } from '../persistence/weather-database.service.js';
import type { SaveSearchHistoryRequestBody } from './search-history.models.js';
import { SearchHistoryService } from './search-history.service.js';

describe('SearchHistoryService', () => {
  const createQueryResult = <T>(rows: T[]) => ({
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  });

  it('returns recent searches ordered for the user', async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(
          createQueryResult([
            {
              locationId: '45.464:9.190',
              locationName: 'Milan',
              stateRegion: null,
              country: 'Italy',
              latitude: 45.4642,
              longitude: 9.19,
              source: 'recent',
            },
          ]),
        ),
    };

    const service = new SearchHistoryService({
      getClient: () => client as WeatherDatabaseQueryClient,
    } as never);

    await expect(service.listRecentSearches('user@example.com')).resolves.toEqual([
      {
        id: '45.464:9.190',
        name: 'Milan',
        state: undefined,
        country: 'Italy',
        lat: 45.4642,
        lon: 9.19,
        label: 'Milan, Italy',
        source: 'recent',
      },
    ]);

    expect(client.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('CREATE TABLE IF NOT EXISTS weather_search_history'),
    );
    expect(client.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM weather_search_history'), [
      'user@example.com',
      8,
    ]);
  });

  it('upserts a recent search and returns the trimmed list', async () => {
    const savedSearchBody: SaveSearchHistoryRequestBody = {
      queryText: 'Milan',
      location: {
        id: '45.464:9.190',
        name: 'Milan',
        country: 'Italy',
        lat: 45.4642,
        lon: 9.19,
        label: 'Milan, Italy',
        source: 'search',
      },
    };

    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(
          createQueryResult([
            {
              locationId: '45.464:9.190',
              locationName: 'Milan',
              stateRegion: null,
              country: 'Italy',
              latitude: 45.4642,
              longitude: 9.19,
              source: 'search',
            },
          ]),
        ),
    };

    const service = new SearchHistoryService({
      getClient: () => client as WeatherDatabaseQueryClient,
    } as never);

    await expect(service.saveRecentSearch('user@example.com', savedSearchBody)).resolves.toEqual([
      {
        id: '45.464:9.190',
        name: 'Milan',
        state: undefined,
        country: 'Italy',
        lat: 45.4642,
        lon: 9.19,
        label: 'Milan, Italy',
        source: 'search',
      },
    ]);

    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO weather_search_history'),
      ['user@example.com', 'Milan', '45.464:9.190', 'Milan', null, 'Italy', 45.4642, 9.19, 'search'],
    );
    expect(client.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('DELETE FROM weather_search_history'),
      ['user@example.com', 8],
    );
  });
});
