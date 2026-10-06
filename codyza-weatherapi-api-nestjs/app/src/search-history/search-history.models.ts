import type { LocationSource, WeatherLocation } from '../weather/weather.models.js';

export interface SaveSearchHistoryRequestBody {
  location: WeatherLocation;
  queryText?: string;
}

export interface SearchHistoryRow {
  locationId: string;
  locationName: string;
  stateRegion: string | null;
  country: string;
  latitude: number;
  longitude: number;
  source: LocationSource;
}

const validLocationSources: LocationSource[] = ['search', 'favorite', 'recent', 'geolocation', 'map'];

export function isWeatherLocation(value: unknown): value is WeatherLocation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate['id'] === 'string' &&
    typeof candidate['name'] === 'string' &&
    (typeof candidate['state'] === 'undefined' || typeof candidate['state'] === 'string') &&
    typeof candidate['country'] === 'string' &&
    typeof candidate['lat'] === 'number' &&
    Number.isFinite(candidate['lat']) &&
    typeof candidate['lon'] === 'number' &&
    Number.isFinite(candidate['lon']) &&
    typeof candidate['label'] === 'string' &&
    validLocationSources.includes(candidate['source'] as LocationSource);
}

export function isSaveSearchHistoryRequestBody(value: unknown): value is SaveSearchHistoryRequestBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isWeatherLocation(candidate['location']) &&
    (typeof candidate['queryText'] === 'undefined' || typeof candidate['queryText'] === 'string');
}
