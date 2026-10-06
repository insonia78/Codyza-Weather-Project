import { Injectable } from '@nestjs/common';

import { WeatherDatabaseService, type WeatherDatabaseQueryClient } from '../persistence/weather-database.service.js';
import { SearchHistoryService } from '../search-history/search-history.service.js';
import type { MeasurementSystem, TemperatureUnit, WeatherLocation, WeatherMapLayerKey } from '../weather/weather.models.js';
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
  type SaveWeatherUserProfileRequestBody,
  type WeatherUserProfile,
  type WeatherUserProfileRow,
} from './user-profile.models.js';

const maxFavorites = 8;
const maxComparisonLocations = 5;

@Injectable()
export class UserProfileService {
  private schemaEnsured = false;
  private schemaPromise: Promise<void> | null = null;

  constructor(
    private readonly databaseService: WeatherDatabaseService,
    private readonly searchHistoryService: SearchHistoryService,
  ) {}

  async getProfile(userEmail: string): Promise<WeatherUserProfile> {
    await this.ensureProfileSchema();

    const [profileResult, recentSearches] = await Promise.all([
      this.getDatabaseClient().query<WeatherUserProfileRow>(
        `
          SELECT
            favorites,
            comparison_locations AS "comparisonLocations",
            temperature_unit AS "temperatureUnit",
            measurement_system AS "measurementSystem",
            selected_map_layer AS "selectedMapLayer",
            auto_refresh AS "autoRefresh",
            notification_preferences AS "notificationPreferences",
            updated_at AS "updatedAt"
          FROM weather_user_profiles
          WHERE user_email = $1
        `,
        [userEmail],
      ),
      this.searchHistoryService.listRecentSearches(userEmail),
    ]);

    const row = profileResult.rows[0];
    if (!row) {
      return this.buildDefaultProfile(userEmail, recentSearches);
    }

    return {
      email: userEmail,
      favorites: this.normalizeLocations(row.favorites, maxFavorites),
      comparisonLocations: this.normalizeLocations(row.comparisonLocations, maxComparisonLocations),
      recentSearches,
      temperatureUnit: this.normalizeTemperatureUnit(row.temperatureUnit),
      measurementSystem: this.normalizeMeasurementSystem(row.measurementSystem),
      selectedMapLayer: this.normalizeMapLayer(row.selectedMapLayer),
      autoRefresh: Boolean(row.autoRefresh),
      notificationPreferences: this.normalizeNotificationPreferences(row.notificationPreferences),
      updatedAt: this.normalizeUpdatedAt(row.updatedAt),
    };
  }

  async saveProfile(
    userEmail: string,
    payload: SaveWeatherUserProfileRequestBody,
  ): Promise<WeatherUserProfile> {
    await this.ensureProfileSchema();

    const sanitizedFavorites = this.normalizeLocations(payload.favorites, maxFavorites);
    const sanitizedComparisonLocations = this.normalizeLocations(payload.comparisonLocations, maxComparisonLocations);
    const sanitizedNotificationPreferences = this.normalizeNotificationPreferences(payload.notificationPreferences);

    await this.getDatabaseClient().query(
      `
        INSERT INTO weather_user_profiles (
          user_email,
          favorites,
          comparison_locations,
          temperature_unit,
          measurement_system,
          selected_map_layer,
          auto_refresh,
          notification_preferences,
          updated_at
        )
        VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7, $8::jsonb, NOW())
        ON CONFLICT (user_email)
        DO UPDATE SET
          favorites = EXCLUDED.favorites,
          comparison_locations = EXCLUDED.comparison_locations,
          temperature_unit = EXCLUDED.temperature_unit,
          measurement_system = EXCLUDED.measurement_system,
          selected_map_layer = EXCLUDED.selected_map_layer,
          auto_refresh = EXCLUDED.auto_refresh,
          notification_preferences = EXCLUDED.notification_preferences,
          updated_at = NOW()
      `,
      [
        userEmail,
        JSON.stringify(sanitizedFavorites),
        JSON.stringify(sanitizedComparisonLocations),
        this.normalizeTemperatureUnit(payload.temperatureUnit),
        this.normalizeMeasurementSystem(payload.measurementSystem),
        this.normalizeMapLayer(payload.selectedMapLayer),
        payload.autoRefresh,
        JSON.stringify(sanitizedNotificationPreferences),
      ],
    );

    return this.getProfile(userEmail);
  }

  protected getDatabaseClient(): WeatherDatabaseQueryClient {
    return this.databaseService.getClient();
  }

  private async ensureProfileSchema(): Promise<void> {
    if (this.schemaEnsured) {
      return;
    }

    if (!this.schemaPromise) {
      this.schemaPromise = this.getDatabaseClient().query(
        `
          CREATE TABLE IF NOT EXISTS weather_user_profiles (
            user_email VARCHAR(320) PRIMARY KEY,
            favorites JSONB NOT NULL DEFAULT '[]'::jsonb,
            comparison_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
            temperature_unit VARCHAR(20) NOT NULL DEFAULT 'celsius',
            measurement_system VARCHAR(20) NOT NULL DEFAULT 'metric',
            selected_map_layer VARCHAR(30) NOT NULL DEFAULT 'clouds_new',
            auto_refresh BOOLEAN NOT NULL DEFAULT true,
            notification_preferences JSONB NOT NULL DEFAULT '{"dailySummary": true, "severeWeather": true, "airQuality": false, "weekendOutlook": false}'::jsonb,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `,
      ).then(() => {
        this.schemaEnsured = true;
      });
    }

    await this.schemaPromise;
  }

  private buildDefaultProfile(userEmail: string, recentSearches: WeatherLocation[]): WeatherUserProfile {
    return {
      email: userEmail,
      favorites: [],
      comparisonLocations: [],
      recentSearches,
      temperatureUnit: 'celsius',
      measurementSystem: 'metric',
      selectedMapLayer: 'clouds_new',
      autoRefresh: true,
      notificationPreferences: { ...defaultNotificationPreferences },
      updatedAt: null,
    };
  }

  private normalizeLocations(value: unknown, limit: number): WeatherLocation[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const deduped = new Map<string, WeatherLocation>();
    value.forEach((entry) => {
      const location = this.normalizeLocation(entry);
      if (location && !deduped.has(location.id)) {
        deduped.set(location.id, location);
      }
    });
    return [...deduped.values()].slice(0, limit);
  }

  private normalizeLocation(value: unknown): WeatherLocation | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    if (typeof candidate['id'] !== 'string' ||
      typeof candidate['name'] !== 'string' ||
      typeof candidate['country'] !== 'string' ||
      typeof candidate['lat'] !== 'number' ||
      !Number.isFinite(candidate['lat']) ||
      typeof candidate['lon'] !== 'number' ||
      !Number.isFinite(candidate['lon']) ||
      typeof candidate['label'] !== 'string' ||
      !['search', 'favorite', 'recent', 'geolocation', 'map'].includes(String(candidate['source']))) {
      return null;
    }

    const normalizedCategory = ['city', 'airport', 'postal_code', 'address', 'coordinates'].includes(String(candidate['category']))
      ? String(candidate['category']) as WeatherLocation['category']
      : undefined;
    const airportCode = typeof candidate['airportCode'] === 'string' && candidate['airportCode'].trim()
      ? candidate['airportCode'].trim().toUpperCase()
      : undefined;

    return {
      id: candidate['id'],
      name: candidate['name'],
      state: typeof candidate['state'] === 'string' ? candidate['state'] : undefined,
      country: candidate['country'],
      lat: candidate['lat'],
      lon: candidate['lon'],
      label: candidate['label'],
      source: candidate['source'] as WeatherLocation['source'],
      category: normalizedCategory,
      airportCode,
    };
  }

  private normalizeNotificationPreferences(value: unknown): NotificationPreferences {
    if (typeof value !== 'object' || value === null) {
      return { ...defaultNotificationPreferences };
    }

    const candidate = value as Record<string, unknown>;
    return {
      dailySummary: typeof candidate['dailySummary'] === 'boolean' ? candidate['dailySummary'] : defaultNotificationPreferences.dailySummary,
      severeWeather: typeof candidate['severeWeather'] === 'boolean' ? candidate['severeWeather'] : defaultNotificationPreferences.severeWeather,
      airQuality: typeof candidate['airQuality'] === 'boolean' ? candidate['airQuality'] : defaultNotificationPreferences.airQuality,
      weekendOutlook: typeof candidate['weekendOutlook'] === 'boolean' ? candidate['weekendOutlook'] : defaultNotificationPreferences.weekendOutlook,
    };
  }

  private normalizeTemperatureUnit(value: unknown): TemperatureUnit {
    return value === 'fahrenheit' ? 'fahrenheit' : 'celsius';
  }

  private normalizeMeasurementSystem(value: unknown): MeasurementSystem {
    return value === 'imperial' ? 'imperial' : 'metric';
  }

  private normalizeMapLayer(value: unknown): WeatherMapLayerKey {
    return ['clouds_new', 'precipitation_new', 'temp_new', 'wind_new'].includes(String(value))
      ? value as WeatherMapLayerKey
      : 'clouds_new';
  }

  private normalizeUpdatedAt(value: Date | string | null): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}
