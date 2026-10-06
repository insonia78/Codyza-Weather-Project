import type { QueryResult } from 'pg';

import { CacheMetricsService } from './cache-metrics.service.js';
import { AdminService } from './admin.service.js';

interface MockQueryClient {
  query: ReturnType<typeof vi.fn>;
}

class TestAdminService extends AdminService {
  constructor(
    private readonly mockClient: MockQueryClient,
    cacheMetricsService: CacheMetricsService,
  ) {
    super(cacheMetricsService);
  }

  protected override getDatabaseClient() {
    return this.mockClient as never;
  }
}

describe('AdminService', () => {
  const createQueryResult = <T>(rows: T[]): QueryResult<T> => ({
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  });

  it('returns dashboard metrics from request logs and search history', async () => {
    const cacheMetricsService = new CacheMetricsService();
    cacheMetricsService.registerHit();
    cacheMetricsService.registerMiss();
    cacheMetricsService.registerWrite();

    const mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce(createQueryResult([]))
        .mockResolvedValueOnce(createQueryResult([{ requestCount: 12, failureCount: 2, averageDurationMs: 48.25, lastRequestAt: '2026-10-06T00:00:00.000Z' }]))
        .mockResolvedValueOnce(createQueryResult([{ requestPath: '/api/weather/search', requestMethod: 'GET', statusCode: 500, durationMs: 130, userEmail: 'user@example.com', userAgent: 'Chrome', requestId: '1', tokenType: 'custom', createdAt: '2026-10-06T00:00:00.000Z' }]))
        .mockResolvedValueOnce(createQueryResult([{ requestPath: '/api/weather/search', requestCount: 8, averageDurationMs: 30.55, failureCount: 1 }]))
        .mockResolvedValueOnce(createQueryResult([{ locationLabel: 'Rome, Italy', searchCount: 4, lastSearchedAt: '2026-10-06T00:00:00.000Z' }]))
        .mockResolvedValueOnce(createQueryResult([{ activeUsers: 3 }]))
        .mockResolvedValueOnce(createQueryResult([{ '?column?': 1 }])),
    };

    const service = new TestAdminService(mockClient, cacheMetricsService);

    const dashboard = await service.getDashboard();

    expect(dashboard.totals.requestsLast24Hours).toBe(12);
    expect(dashboard.activeUsers.last24Hours).toBe(3);
    expect(dashboard.cachePerformance).toEqual({
      hits: 1,
      misses: 1,
      bypasses: 0,
      writes: 1,
      hitRate: 0.5,
    });
    expect(dashboard.mostSearchedLocations[0]).toMatchObject({
      locationLabel: 'Rome, Italy',
      searchCount: 4,
    });
  });
});
