import type {
  LocationCategory,
  MeasurementSystem,
  TemperatureUnit,
  WeatherLocation,
  WeatherMapLayerKey,
} from '../weather/weather.models.js';

export interface NotificationPreferences {
  dailySummary: boolean;
  severeWeather: boolean;
  airQuality: boolean;
  weekendOutlook: boolean;
}

export interface WeatherUserProfile {
  email: string;
  favorites: WeatherLocation[];
  comparisonLocations: WeatherLocation[];
  recentSearches: WeatherLocation[];
  temperatureUnit: TemperatureUnit;
  measurementSystem: MeasurementSystem;
  selectedMapLayer: WeatherMapLayerKey;
  autoRefresh: boolean;
  notificationPreferences: NotificationPreferences;
  updatedAt: string | null;
}

export interface SaveWeatherUserProfileRequestBody {
  favorites: WeatherLocation[];
  comparisonLocations: WeatherLocation[];
  temperatureUnit: TemperatureUnit;
  measurementSystem: MeasurementSystem;
  selectedMapLayer: WeatherMapLayerKey;
  autoRefresh: boolean;
  notificationPreferences: NotificationPreferences;
}

export interface WeatherUserProfileRow {
  favorites: unknown;
  comparisonLocations: unknown;
  temperatureUnit: TemperatureUnit;
  measurementSystem: MeasurementSystem;
  selectedMapLayer: WeatherMapLayerKey;
  autoRefresh: boolean;
  notificationPreferences: unknown;
  updatedAt: Date | string | null;
}

const validLocationSources = ['search', 'favorite', 'recent', 'geolocation', 'map'] as const;
const validLocationCategories = ['city', 'airport', 'postal_code', 'address', 'coordinates'] as const;
const validTemperatureUnits = ['celsius', 'fahrenheit'] as const;
const validMeasurementSystems = ['metric', 'imperial'] as const;
const validMapLayers = ['clouds_new', 'precipitation_new', 'temp_new', 'wind_new'] as const;

export const defaultNotificationPreferences: NotificationPreferences = {
  dailySummary: true,
  severeWeather: true,
  airQuality: false,
  weekendOutlook: false,
};

export function isWeatherLocation(value: unknown): value is WeatherLocation {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const category = candidate['category'];
  const airportCode = candidate['airportCode'];

  return typeof candidate['id'] === 'string' &&
    typeof candidate['name'] === 'string' &&
    (typeof candidate['state'] === 'undefined' || typeof candidate['state'] === 'string') &&
    typeof candidate['country'] === 'string' &&
    typeof candidate['lat'] === 'number' &&
    Number.isFinite(candidate['lat']) &&
    typeof candidate['lon'] === 'number' &&
    Number.isFinite(candidate['lon']) &&
    typeof candidate['label'] === 'string' &&
    validLocationSources.includes(candidate['source'] as (typeof validLocationSources)[number]) &&
    (typeof category === 'undefined' || validLocationCategories.includes(category as LocationCategory)) &&
    (typeof airportCode === 'undefined' || typeof airportCode === 'string');
}

export function isNotificationPreferences(value: unknown): value is NotificationPreferences {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate['dailySummary'] === 'boolean' &&
    typeof candidate['severeWeather'] === 'boolean' &&
    typeof candidate['airQuality'] === 'boolean' &&
    typeof candidate['weekendOutlook'] === 'boolean';
}

export function isSaveWeatherUserProfileRequestBody(value: unknown): value is SaveWeatherUserProfileRequestBody {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate['favorites']) &&
    candidate['favorites'].every((entry) => isWeatherLocation(entry)) &&
    Array.isArray(candidate['comparisonLocations']) &&
    candidate['comparisonLocations'].every((entry) => isWeatherLocation(entry)) &&
    validTemperatureUnits.includes(candidate['temperatureUnit'] as TemperatureUnit) &&
    validMeasurementSystems.includes(candidate['measurementSystem'] as MeasurementSystem) &&
    validMapLayers.includes(candidate['selectedMapLayer'] as WeatherMapLayerKey) &&
    typeof candidate['autoRefresh'] === 'boolean' &&
    isNotificationPreferences(candidate['notificationPreferences']);
}
