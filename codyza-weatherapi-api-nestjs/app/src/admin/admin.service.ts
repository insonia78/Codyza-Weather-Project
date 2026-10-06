import {
  Injectable,
  InternalServerErrorException,
  type MessageEvent,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { defer, from, interval, of, type Observable } from 'rxjs';
import { catchError, concatMap, map, startWith } from 'rxjs/operators';

import { CacheMetricsService } from './cache-metrics.service.js';
import type {
  AdminDashboardSnapshot,
  AdminRequestLogRow,
  ApiUsageSummaryRow,
  TopSearchRow
} from './admin.models.js';

const observabilityDatabaseUrlEnvVar = 'WEATHER_OBSERVABILITY_DATABASE_URL';
const searchHistoryDatabaseUrlEnvVar = 'WEATHER_SEARCH_HISTORY_DATABASE_URL';
const fallbackDatabaseUrlEnvVar = 'DATABASE_URL';

interface QueryClient {
  query<T extends QueryResultRow>(
    queryText: string,
    values?: ReadonlyArray<unknown>,
  ): Promise<QueryResult<T>>;
  end?(): Promise<void>;
}

@Injectable()
export class AdminService implements OnModuleDestroy {
  private pool: Pool | null = null;
  private schemaReadyPromise: Promise<void> | null = null;

  constructor(private readonly cacheMetricsService: CacheMetricsService) {}

  async logRequest(entry: {
    requestPath: string;
    requestMethod: string;
    statusCode: number;
    durationMs: number;
    userEmail: string | null;
    userAgent: string | null;
    requestId: string | null;
    tokenType: string | null;
  }): Promise<void> {
    await this.ensureSchema();
    await this.getDatabaseClient().query(
      `
        INSERT INTO weather_api_request_logs (
          request_path,
          request_method,
          status_code,
          duration_ms,
          user_email,
          user_agent,
          request_id,
          token_type,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `,
      [
        entry.requestPath,
        entry.requestMethod,
        entry.statusCode,
        entry.durationMs,
        entry.userEmail,
        entry.userAgent,
        entry.requestId,
        entry.tokenType,
      ],
    );
  }

  async getDashboard() {
    return this.getDashboardSnapshot();
  }

  streamDashboard(): Observable<MessageEvent> {
    return interval(this.dashboardStreamIntervalMs).pipe(
      startWith(0),
      concatMap(() =>
        defer(() => from(this.getDashboardSnapshot())).pipe(
          map((dashboard): MessageEvent => ({
            type: 'dashboard',
            data: {
              dashboard,
              generatedAt: new Date().toISOString(),
            },
          })),
          catchError((error: unknown) => of<MessageEvent>({
            type: 'dashboard-error',
            data: {
              message: error instanceof Error ? error.message : String(error),
              generatedAt: new Date().toISOString(),
            },
          })),
        ),
      ),
    );
  }

  async getDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
    await this.ensureSchema();

    const [
      totalsResult,
      recentFailuresResult,
      apiUsageResult,
      topSearchesResult,
      activeUsersResult,
      databaseHealthResult,
    ] = await Promise.all([
      this.getDatabaseClient().query<{
        requestCount: number;
        failureCount: number;
        averageDurationMs: number;
        lastRequestAt: Date | string | null;
      }>(
        `
          SELECT
            COUNT(*)::int AS "requestCount",
            COUNT(*) FILTER (WHERE status_code >= 400)::int AS "failureCount",
            COALESCE(AVG(duration_ms), 0)::float AS "averageDurationMs",
            MAX(created_at) AS "lastRequestAt"
          FROM weather_api_request_logs
          WHERE created_at >= NOW() - INTERVAL '24 hours'
        `,
      ),
      this.getDatabaseClient().query<AdminRequestLogRow>(
        `
          SELECT
            request_path AS "requestPath",
            request_method AS "requestMethod",
            status_code AS "statusCode",
            duration_ms AS "durationMs",
            user_email AS "userEmail",
            user_agent AS "userAgent",
            request_id AS "requestId",
            token_type AS "tokenType",
            created_at AS "createdAt"
          FROM weather_api_request_logs
          WHERE status_code >= 400
          ORDER BY created_at DESC
          LIMIT 10
        `,
      ),
      this.getDatabaseClient().query<ApiUsageSummaryRow>(
        `
          SELECT
            request_path AS "requestPath",
            COUNT(*)::int AS "requestCount",
            COALESCE(AVG(duration_ms), 0)::float AS "averageDurationMs",
            COUNT(*) FILTER (WHERE status_code >= 400)::int AS "failureCount"
          FROM weather_api_request_logs
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY request_path
          ORDER BY "requestCount" DESC, request_path ASC
          LIMIT 10
        `,
      ),
      this.getDatabaseClient().query<TopSearchRow>(
        `
          SELECT
            CASE
              WHEN COALESCE(state_region, '') = ''
                THEN location_name || ', ' || country
              ELSE location_name || ', ' || state_region || ', ' || country
            END AS "locationLabel",
            COUNT(*)::int AS "searchCount",
            MAX(searched_at) AS "lastSearchedAt"
          FROM weather_search_history
          GROUP BY location_name, state_region, country
          ORDER BY "searchCount" DESC, "lastSearchedAt" DESC
          LIMIT 10
        `,
      ),
      this.getDatabaseClient().query<{ activeUsers: number }>(
        `
          SELECT COUNT(DISTINCT user_email)::int AS "activeUsers"
          FROM weather_api_request_logs
          WHERE user_email IS NOT NULL
            AND user_email <> ''
            AND created_at >= NOW() - INTERVAL '24 hours'
        `,
      ),
      this.getDatabaseClient().query('SELECT 1'),
    ]);

    const totals = totalsResult.rows[0] ?? {
      requestCount: 0,
      failureCount: 0,
      averageDurationMs: 0,
      lastRequestAt: null,
    };

    return {
      totals: {
        requestsLast24Hours: totals.requestCount,
        failedRequestsLast24Hours: totals.failureCount,
        averageDurationMs: Number(totals.averageDurationMs.toFixed(2)),
        lastRequestAt: totals.lastRequestAt,
      },
      activeUsers: {
        last24Hours: activeUsersResult.rows[0]?.activeUsers ?? 0,
      },
      cachePerformance: this.cacheMetricsService.getSnapshot(),
      apiUsage: apiUsageResult.rows.map((row) => ({
        requestPath: row.requestPath,
        requestCount: row.requestCount,
        averageDurationMs: Number(row.averageDurationMs.toFixed(2)),
        failureCount: row.failureCount,
      })),
      failedRequests: recentFailuresResult.rows,
      mostSearchedLocations: topSearchesResult.rows,
      systemHealth: {
        status: 'ok',
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsage: process.memoryUsage(),
        googleWeatherApiConfigured: Boolean((process.env['GOOGLE_WEATHER_API_KEY'] || '').trim()),
        observabilityDatabaseConfigured: Boolean(this.resolveDatabaseUrl()),
        databaseReachable: databaseHealthResult.rowCount === 1,
      },
    };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool?.end) {
      await this.pool.end();
      this.pool = null;
    }
  }

  protected getDatabaseClient(): QueryClient {
    if (this.pool) {
      return this.pool;
    }

    const databaseUrl = this.resolveDatabaseUrl();
    if (!databaseUrl) {
      throw new ServiceUnavailableException(
        `Missing ${observabilityDatabaseUrlEnvVar}, ${searchHistoryDatabaseUrlEnvVar}, or ${fallbackDatabaseUrlEnvVar} environment variable.`,
      );
    }

    try {
      this.pool = new Pool({
        connectionString: databaseUrl,
        max: 10,
        ssl: this.shouldUseSsl(databaseUrl) ? { rejectUnauthorized: false } : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to initialize observability database client: ${message}`);
    }

    return this.pool;
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaReadyPromise) {
      return this.schemaReadyPromise;
    }

    this.schemaReadyPromise = this.getDatabaseClient()
      .query(
        `
          CREATE TABLE IF NOT EXISTS weather_api_request_logs (
            id BIGSERIAL PRIMARY KEY,
            request_path VARCHAR(255) NOT NULL,
            request_method VARCHAR(10) NOT NULL,
            status_code INTEGER NOT NULL,
            duration_ms INTEGER NOT NULL,
            user_email VARCHAR(320),
            user_agent TEXT,
            request_id VARCHAR(64),
            token_type VARCHAR(32),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_weather_api_request_logs_created_at
            ON weather_api_request_logs (created_at DESC);

          CREATE INDEX IF NOT EXISTS idx_weather_api_request_logs_request_path
            ON weather_api_request_logs (request_path);

          CREATE INDEX IF NOT EXISTS idx_weather_api_request_logs_status_code
            ON weather_api_request_logs (status_code);

          CREATE INDEX IF NOT EXISTS idx_weather_api_request_logs_user_email
            ON weather_api_request_logs (user_email);

          CREATE TABLE IF NOT EXISTS weather_search_history (
            id BIGSERIAL PRIMARY KEY,
            user_email VARCHAR(320) NOT NULL,
            query_text VARCHAR(255),
            location_id VARCHAR(255) NOT NULL,
            location_name VARCHAR(255) NOT NULL,
            state_region VARCHAR(255),
            country VARCHAR(255) NOT NULL,
            latitude DOUBLE PRECISION NOT NULL,
            longitude DOUBLE PRECISION NOT NULL,
            source VARCHAR(20) NOT NULL CHECK (source IN ('search', 'favorite', 'recent', 'geolocation', 'map')),
            searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT weather_search_history_user_location_unique UNIQUE (user_email, location_id)
          );

          CREATE INDEX IF NOT EXISTS idx_weather_search_history_location_id
            ON weather_search_history (location_id);

          CREATE INDEX IF NOT EXISTS idx_weather_search_history_query_text
            ON weather_search_history (query_text);

          CREATE INDEX IF NOT EXISTS idx_weather_search_history_searched_at
            ON weather_search_history (searched_at DESC);

          CREATE INDEX IF NOT EXISTS idx_weather_search_history_user_email_searched_at
            ON weather_search_history (user_email, searched_at DESC);
        `,
      )
      .then(() => undefined)
      .catch((error) => {
        this.schemaReadyPromise = null;
        throw error;
      });

    return this.schemaReadyPromise;
  }

  private resolveDatabaseUrl(): string {
    return (
      process.env[observabilityDatabaseUrlEnvVar] ??
      process.env[searchHistoryDatabaseUrlEnvVar] ??
      process.env[fallbackDatabaseUrlEnvVar] ??
      ''
    ).trim();
  }

  private shouldUseSsl(connectionString: string): boolean {
    try {
      const parsedUrl = new URL(connectionString);
      const sslMode = parsedUrl.searchParams.get('sslmode');
      return parsedUrl.hostname !== 'localhost' &&
        parsedUrl.hostname !== '127.0.0.1' &&
        sslMode !== 'disable';
    } catch {
      return true;
    }
  }

  private get dashboardStreamIntervalMs(): number {
    return this.readPositiveInteger('ADMIN_DASHBOARD_STREAM_INTERVAL_MS', 5000);
  }

  private readPositiveInteger(name: string, fallback: number): number {
    const rawValue = (process.env[name] || '').trim();
    const parsedValue = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
  }
}
