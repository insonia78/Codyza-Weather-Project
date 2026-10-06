import {
  Injectable,
} from '@nestjs/common';

import { WeatherDatabaseService, type WeatherDatabaseQueryClient } from '../persistence/weather-database.service.js';
import type { WeatherLocation } from '../weather/weather.models.js';
import type { SaveSearchHistoryRequestBody, SearchHistoryRow } from './search-history.models.js';

const maxRecentSearches = 8;

@Injectable()
export class SearchHistoryService {
  constructor(private readonly databaseService: WeatherDatabaseService) {}

  async listRecentSearches(userEmail: string, limit = maxRecentSearches): Promise<WeatherLocation[]> {
    const safeLimit = this.normalizeLimit(limit);
    const result = await this.getDatabaseClient().query<SearchHistoryRow>(
      `
        SELECT
          location_id AS "locationId",
          location_name AS "locationName",
          state_region AS "stateRegion",
          country,
          latitude,
          longitude,
          source
        FROM weather_search_history
        WHERE user_email = $1
        ORDER BY searched_at DESC
        LIMIT $2
      `,
      [userEmail, safeLimit],
    );

    return result.rows.map((row) => this.mapRowToLocation(row));
  }

  async saveRecentSearch(
    userEmail: string,
    payload: SaveSearchHistoryRequestBody,
    limit = maxRecentSearches,
  ): Promise<WeatherLocation[]> {
    const queryText = this.normalizeQueryText(payload.queryText);
    const safeLimit = this.normalizeLimit(limit);

    await this.getDatabaseClient().query(
      `
        INSERT INTO weather_search_history (
          user_email,
          query_text,
          location_id,
          location_name,
          state_region,
          country,
          latitude,
          longitude,
          source,
          searched_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (user_email, location_id)
        DO UPDATE SET
          query_text = EXCLUDED.query_text,
          location_name = EXCLUDED.location_name,
          state_region = EXCLUDED.state_region,
          country = EXCLUDED.country,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          source = EXCLUDED.source,
          searched_at = NOW()
      `,
      [
        userEmail,
        queryText,
        payload.location.id,
        payload.location.name,
        payload.location.state ?? null,
        payload.location.country,
        payload.location.lat,
        payload.location.lon,
        payload.location.source,
      ],
    );

    await this.getDatabaseClient().query(
      `
        DELETE FROM weather_search_history
        WHERE user_email = $1
          AND location_id NOT IN (
            SELECT location_id
            FROM weather_search_history
            WHERE user_email = $1
            ORDER BY searched_at DESC
            LIMIT $2
          )
      `,
      [userEmail, safeLimit],
    );

    return this.listRecentSearches(userEmail, safeLimit);
  }

  async clearRecentSearches(userEmail: string): Promise<void> {
    await this.getDatabaseClient().query(
      'DELETE FROM weather_search_history WHERE user_email = $1',
      [userEmail],
    );
  }

  protected getDatabaseClient(): WeatherDatabaseQueryClient {
    return this.databaseService.getClient();
  }

  private mapRowToLocation(row: SearchHistoryRow): WeatherLocation {
    return {
      id: row.locationId,
      name: row.locationName,
      state: row.stateRegion ?? undefined,
      country: row.country,
      lat: row.latitude,
      lon: row.longitude,
      label: row.stateRegion
        ? `${row.locationName}, ${row.stateRegion}, ${row.country}`
        : `${row.locationName}, ${row.country}`,
      source: row.source,
    };
  }

  private normalizeLimit(value: number): number {
    if (!Number.isFinite(value) || value < 1) {
      return maxRecentSearches;
    }

    return Math.min(Math.floor(value), maxRecentSearches);
  }

  private normalizeQueryText(value?: string): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue ? normalizedValue.slice(0, 255) : null;
  }
}
