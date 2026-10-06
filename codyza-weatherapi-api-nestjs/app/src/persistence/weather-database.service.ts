import {
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { buildDatabasePoolConfig } from './database-pool.config.js';

const observabilityDatabaseUrlEnvVar = 'WEATHER_OBSERVABILITY_DATABASE_URL';
const searchHistoryDatabaseUrlEnvVar = 'WEATHER_SEARCH_HISTORY_DATABASE_URL';
const fallbackDatabaseUrlEnvVar = 'DATABASE_URL';

export interface WeatherDatabaseQueryClient {
  query<T extends QueryResultRow>(
    queryText: string,
    values?: ReadonlyArray<unknown>,
  ): Promise<QueryResult<T>>;
}

@Injectable()
export class WeatherDatabaseService implements OnModuleDestroy {
  private pool: Pool | null = null;

  getClient(): WeatherDatabaseQueryClient {
    if (this.pool) {
      return this.pool;
    }

    const databaseUrl = process.env[searchHistoryDatabaseUrlEnvVar]
      ?? process.env[observabilityDatabaseUrlEnvVar]
      ?? process.env[fallbackDatabaseUrlEnvVar];
    if (!databaseUrl) {
      throw new ServiceUnavailableException(
        `Missing ${searchHistoryDatabaseUrlEnvVar}, ${observabilityDatabaseUrlEnvVar}, or ${fallbackDatabaseUrlEnvVar} environment variable.`,
      );
    }

    try {
      this.pool = new Pool(
        buildDatabasePoolConfig(databaseUrl, this.shouldUseSsl(databaseUrl), 'WEATHER_DATABASE_POOL'),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Failed to initialize weather database client: ${message}`);
    }

    return this.pool;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool?.end) {
      await this.pool.end();
      this.pool = null;
    }
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
}
