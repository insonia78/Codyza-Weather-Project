import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException
} from '@nestjs/common';
import { type Cache, createCache } from 'cache-manager';

import { CacheMetricsService } from '../admin/cache-metrics.service.js';
import {
  CurrentConditionsHistorySummary,
  DailyForecastPoint,
  DashboardRequestBody,
  HistoricalSummary,
  HourlyForecastPoint,
  LocationCategory,
  WeatherAlert,
  WeatherDashboard,
  WeatherLocation,
  WeatherMapLayerKey,
} from './weather.models.js';

interface OptionalRequestResult<T> {
  data: T | null;
  warning: string | null;
}

interface GoogleGeocodeAddressComponent {
  longText: string;
  shortText?: string;
  types: string[];
}

interface GoogleGeocodeResult {
  placeId?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  formattedAddress: string;
  addressComponents?: GoogleGeocodeAddressComponent[];
  types?: string[];
}

interface GoogleGeocodeResponse {
  results?: GoogleGeocodeResult[];
}

interface GoogleTimeZone {
  id: string;
}

interface GoogleWeatherCondition {
  iconBaseUri?: string;
  description?: {
    text?: string;
    languageCode?: string;
  };
  type?: string;
}

interface GoogleWeatherMeasurement {
  degrees?: number;
  quantity?: number;
  unit?: string;
  value?: number;
}

interface GoogleWeatherProbability {
  percent?: number;
  type?: string;
}

interface GoogleWeatherWind {
  direction?: {
    degrees?: number;
    cardinal?: string;
  };
  speed?: {
    value?: number;
    unit?: string;
  };
  gust?: {
    value?: number;
    unit?: string;
  };
}

interface GoogleWeatherPrecipitation {
  probability?: GoogleWeatherProbability;
  qpf?: {
    quantity?: number;
    unit?: string;
  };
}

interface GoogleWeatherCurrentResponse {
  currentTime: string;
  timeZone: GoogleTimeZone;
  isDaytime: boolean;
  weatherCondition?: GoogleWeatherCondition;
  temperature?: GoogleWeatherMeasurement;
  feelsLikeTemperature?: GoogleWeatherMeasurement;
  dewPoint?: GoogleWeatherMeasurement;
  relativeHumidity?: number;
  uvIndex?: number;
  precipitation?: GoogleWeatherPrecipitation;
  airPressure?: {
    meanSeaLevelMillibars?: number;
  };
  wind?: GoogleWeatherWind;
  visibility?: {
    distance?: number;
    unit?: string;
  };
  cloudCover?: number;
  currentConditionsHistory?: {
    temperatureChange?: GoogleWeatherMeasurement;
    maxTemperature?: GoogleWeatherMeasurement;
    minTemperature?: GoogleWeatherMeasurement;
    qpf?: {
      quantity?: number;
      unit?: string;
    };
  };
}

interface GoogleWeatherHourlyPoint {
  interval: {
    startTime: string;
    endTime: string;
  };
  isDaytime?: boolean;
  weatherCondition?: GoogleWeatherCondition;
  temperature?: GoogleWeatherMeasurement;
  feelsLikeTemperature?: GoogleWeatherMeasurement;
  dewPoint?: GoogleWeatherMeasurement;
  relativeHumidity?: number;
  uvIndex?: number;
  precipitation?: GoogleWeatherPrecipitation;
  airPressure?: {
    meanSeaLevelMillibars?: number;
  };
  wind?: GoogleWeatherWind;
  visibility?: {
    distance?: number;
    unit?: string;
  };
  cloudCover?: number;
}

interface GoogleWeatherHourlyResponse {
  forecastHours?: GoogleWeatherHourlyPoint[];
  historyHours?: GoogleWeatherHourlyPoint[];
  timeZone: GoogleTimeZone;
}

interface GoogleWeatherDailyPeriod {
  weatherCondition?: GoogleWeatherCondition;
  relativeHumidity?: number;
  uvIndex?: number;
  precipitation?: GoogleWeatherPrecipitation;
  thunderstormProbability?: number;
  wind?: GoogleWeatherWind;
  cloudCover?: number;
}

interface GoogleWeatherDailyPoint {
  interval: {
    startTime: string;
    endTime: string;
  };
  daytimeForecast?: GoogleWeatherDailyPeriod;
  nighttimeForecast?: GoogleWeatherDailyPeriod;
  maxTemperature?: GoogleWeatherMeasurement;
  minTemperature?: GoogleWeatherMeasurement;
  feelsLikeMaxTemperature?: GoogleWeatherMeasurement;
  feelsLikeMinTemperature?: GoogleWeatherMeasurement;
  sunEvents?: {
    sunriseTime?: string;
    sunsetTime?: string;
  };
}

interface GoogleWeatherDailyResponse {
  forecastDays: GoogleWeatherDailyPoint[];
  timeZone: GoogleTimeZone;
}

interface ProviderErrorPayload {
  message?: string;
  error?: {
    message?: string;
  };
}

interface OpenWeatherAlert {
  sender_name?: string;
  event?: string;
  start?: number;
  end?: number;
  description?: string;
  tags?: string[];
}

interface OpenWeatherOneCallResponse {
  alerts?: OpenWeatherAlert[];
}

interface OpenWeatherAirPollutionResponse {
  list?: Array<{
    main?: {
      aqi?: number;
    };
    components?: Record<string, number>;
  }>;
}

interface BinaryResponse {
  contentType: string;
  body: Buffer;
}

@Injectable()
export class WeatherProviderService {
  readonly providerName = 'Google Maps Weather API';

  private readonly cacheManager: Cache = createCache();
  private readonly pendingRequests = new Map<string, Promise<unknown>>();
  private readonly googleRequestTimestamps: number[] = [];
  private readonly supplementalRequestTimestamps: number[] = [];

  constructor(private readonly cacheMetricsService: CacheMetricsService) {}

  get apiKeyConfigured(): boolean {
    return Boolean(this.googleWeatherApiKey);
  }

  async searchLocations(query: string): Promise<WeatherLocation[]> {
    this.ensureApiKeyConfigured();

    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new BadRequestException('A search query is required.');
    }

    const coordinateMatch = normalizedQuery.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (coordinateMatch) {
      return this.reverseGeocode(Number(coordinateMatch[1]), Number(coordinateMatch[2]), 'search');
    }

    const primary = await this.request<GoogleGeocodeResponse>(
      this.buildGeocodeUrl(normalizedQuery),
      `search:${normalizedQuery.toLowerCase()}`,
      15 * 60 * 1000,
    );

    const primaryResults = this.rankSearchResults(
      normalizedQuery,
      this.uniqueLocations(
        this.getGeocodeResults(primary).map((result) => this.mapGeocodeResult(result, 'search', normalizedQuery))
      )
    ).slice(0, 6);

    if (!this.isAirportCodeQuery(normalizedQuery)) {
      return primaryResults;
    }

    const airport = await this.request<GoogleGeocodeResponse>(
      this.buildGeocodeUrl(`${normalizedQuery} airport`),
      `search-airport:${normalizedQuery.toLowerCase()}`,
      15 * 60 * 1000,
    );

    return this.rankSearchResults(
      normalizedQuery,
      this.uniqueLocations([
        ...primaryResults,
        ...this.getGeocodeResults(airport).map((result) => this.mapGeocodeResult(result, 'search', normalizedQuery))
      ]),
    ).slice(0, 8);
  }

  async reverseGeocode(lat: number, lon: number, source: WeatherLocation['source']): Promise<WeatherLocation[]> {
    this.ensureApiKeyConfigured();

    const response = await this.request<GoogleGeocodeResponse>(
      this.buildReverseGeocodeUrl(lat, lon),
      `reverse:${lat.toFixed(3)}:${lon.toFixed(3)}`,
      6 * 60 * 60 * 1000,
    );

    const results = this.getGeocodeResults(response);
    if (!results.length) {
      return [this.createCoordinateLocation(lat, lon, source)];
    }

    return this.uniqueLocations(results.map((result) => this.mapGeocodeResult(result, source)));
  }

  async getDashboard(request: DashboardRequestBody): Promise<WeatherDashboard> {
    this.ensureApiKeyConfigured();
    this.assertValidLocation(request.location);

    const forceRefresh = Boolean(request.forceRefresh);
    const coordinateKey = `${request.location.lat.toFixed(3)}:${request.location.lon.toFixed(3)}`;
    const warnings: string[] = [];

    const [current, hourly, daily, history, alerts, airQuality] = await Promise.all([
      this.request<GoogleWeatherCurrentResponse>(
        this.buildCurrentConditionsUrl(request.location),
        `current:${coordinateKey}`,
        5 * 60 * 1000,
        forceRefresh,
      ),
      this.request<GoogleWeatherHourlyResponse>(
        this.buildHourlyForecastUrl(request.location),
        `hourly:${coordinateKey}`,
        10 * 60 * 1000,
        forceRefresh,
      ),
      this.request<GoogleWeatherDailyResponse>(
        this.buildDailyForecastUrl(request.location),
        `daily:${coordinateKey}`,
        30 * 60 * 1000,
        forceRefresh,
      ),
      this.optionalRequest<GoogleWeatherHourlyResponse>(
        this.buildHourlyHistoryUrl(request.location),
        `history:${coordinateKey}`,
        60 * 60 * 1000,
        'Hourly history',
        forceRefresh,
      ),
      this.openWeatherApiKey
        ? this.optionalSupplementalRequest<OpenWeatherOneCallResponse>(
            this.buildOpenWeatherAlertsUrl(request.location),
            `openweather-alerts:${coordinateKey}`,
            10 * 60 * 1000,
            'Severe weather alerts',
            forceRefresh,
          )
        : Promise.resolve({
            data: null,
            warning: 'Set OPENWEATHER_API_KEY to enable severe weather alerts, air-quality data, and weather-map layers.',
          }),
      this.openWeatherApiKey
        ? this.optionalSupplementalRequest<OpenWeatherAirPollutionResponse>(
            this.buildOpenWeatherAirQualityUrl(request.location),
            `openweather-air-quality:${coordinateKey}`,
            15 * 60 * 1000,
            'Air-quality data',
            forceRefresh,
          )
        : Promise.resolve({ data: null, warning: null }),
    ]);

    warnings.push(...[history.warning, alerts.warning, airQuality.warning].filter((warning): warning is string => Boolean(warning)));
    const firstDailyPoint = daily.forecastDays[0];
    const currentTime = this.isoToUnixSeconds(current.currentTime);
    const timeZone = current.timeZone.id || hourly.timeZone.id || daily.timeZone.id || 'UTC';

    return {
      location: request.location,
      timezone: timeZone,
      timezoneOffset: this.getTimeZoneOffsetSeconds(currentTime, timeZone),
      current: this.mapCurrentConditions(current, firstDailyPoint),
      currentHistory: this.mapCurrentConditionsHistory(current.currentConditionsHistory),
      hourly: (hourly.forecastHours || []).slice(0, this.forecastHours).map((point) => this.mapHourlyPoint(point)),
      daily: daily.forecastDays.slice(0, this.forecastDays).map((point) => this.mapDailyPoint(point)),
      alerts: this.mapOpenWeatherAlerts(alerts.data),
      airQuality: this.mapAirQuality(airQuality.data),
      historical: history.data ? this.mapHistorical(history.data) : null,
      warnings,
      providerForecastDays: Math.min(daily.forecastDays.length, this.forecastDays),
      fetchedAt: Date.now()
    };
  }

  async getMapLayerTile(
    layer: WeatherMapLayerKey,
    z: number,
    x: number,
    y: number,
  ): Promise<BinaryResponse> {
    if (!this.openWeatherApiKey) {
      throw new ServiceUnavailableException(
        'The Nest weather API is missing OPENWEATHER_API_KEY. Set it to enable weather-map layers.',
      );
    }

    return this.requestBinary(
      this.buildOpenWeatherTileUrl(layer, z, x, y),
      `openweather-map-tile:${layer}:${z}:${x}:${y}`,
      15 * 60 * 1000,
    );
  }

  private get googleWeatherApiKey(): string {
    return (process.env['GOOGLE_WEATHER_API_KEY'] || '').trim();
  }

  private get weatherBaseUrl(): string {
    return (process.env['GOOGLE_WEATHER_BASE_URL'] || 'https://weather.googleapis.com/v1').trim();
  }

  private get geocodeBaseUrl(): string {
    return (process.env['GOOGLE_GEOCODE_BASE_URL'] || 'https://geocode.googleapis.com/v4/geocode').trim();
  }

  private get openWeatherApiKey(): string {
    return (process.env['OPENWEATHER_API_KEY'] || '').trim();
  }

  private get openWeatherOneCallBaseUrl(): string {
    return (process.env['OPENWEATHER_ONE_CALL_BASE_URL'] || 'https://api.openweathermap.org/data/3.0/onecall').trim();
  }

  private get openWeatherAirPollutionBaseUrl(): string {
    return (process.env['OPENWEATHER_AIR_POLLUTION_BASE_URL'] || 'https://api.openweathermap.org/data/2.5/air_pollution').trim();
  }

  private get openWeatherTileBaseUrl(): string {
    return (process.env['OPENWEATHER_TILE_BASE_URL'] || 'https://tile.openweathermap.org/map').trim();
  }

  private get forecastHours(): number {
    return this.readPositiveInteger('GOOGLE_WEATHER_FORECAST_HOURS', 12);
  }

  private get forecastDays(): number {
    return this.readPositiveInteger('GOOGLE_WEATHER_FORECAST_DAYS', 5);
  }

  private get historyHours(): number {
    return this.readPositiveInteger('GOOGLE_WEATHER_HISTORY_HOURS', 12);
  }

  private get googleRequestLimitPerMinute(): number {
    return this.readPositiveInteger('GOOGLE_WEATHER_REQUEST_LIMIT_PER_MINUTE', 25);
  }

  private get supplementalRequestLimitPerMinute(): number {
    return this.readPositiveInteger('OPENWEATHER_REQUEST_LIMIT_PER_MINUTE', 180);
  }

  private ensureApiKeyConfigured(): void {
    if (!this.apiKeyConfigured) {
      throw new ServiceUnavailableException(
        'The Nest weather API is missing GOOGLE_WEATHER_API_KEY. Set it in backend/.env before making weather requests.',
      );
    }
  }

  private readPositiveInteger(name: string, fallback: number): number {
    const rawValue = process.env[name];
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number(rawValue);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private assertValidLocation(location: WeatherLocation | undefined): asserts location is WeatherLocation {
    if (!location) {
      throw new BadRequestException('A weather location is required.');
    }

    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lon)) {
      throw new BadRequestException('The weather location must include valid latitude and longitude values.');
    }
  }

  private async optionalRequest<T>(
    url: string,
    cacheKey: string,
    ttlMs: number,
    surfaceName: string,
    forceRefresh = false,
  ): Promise<OptionalRequestResult<T>> {
    try {
      const data = await this.request<T>(url, cacheKey, ttlMs, forceRefresh);
      return { data, warning: null };
    } catch (error) {
      return {
        data: null,
        warning: this.formatApiError(surfaceName, error)
      };
    }
  }

  private async optionalSupplementalRequest<T>(
    url: string,
    cacheKey: string,
    ttlMs: number,
    surfaceName: string,
    forceRefresh = false,
  ): Promise<OptionalRequestResult<T>> {
    try {
      const data = await this.requestSupplemental<T>(url, cacheKey, ttlMs, forceRefresh);
      return { data, warning: null };
    } catch (error) {
      return {
        data: null,
        warning: this.formatApiError(surfaceName, error),
      };
    }
  }

  private async request<T>(url: string, cacheKey: string, ttlMs: number, forceRefresh = false): Promise<T> {
    const cachedValue = await this.readCache<T>(cacheKey, forceRefresh);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const pendingRequest = this.pendingRequests.get(cacheKey) as Promise<T> | undefined;
    if (pendingRequest) {
      return pendingRequest;
    }

    const requestPromise = this.executeRequest<T>(url)
      .then(async (response) => {
        await this.writeCache(cacheKey, response, ttlMs);
        return response;
      })
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  private async requestSupplemental<T>(url: string, cacheKey: string, ttlMs: number, forceRefresh = false): Promise<T> {
    const cachedValue = await this.readCache<T>(cacheKey, forceRefresh);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const pendingRequest = this.pendingRequests.get(cacheKey) as Promise<T> | undefined;
    if (pendingRequest) {
      return pendingRequest;
    }

    const requestPromise = this.executeRequest<T>(url, 'supplemental')
      .then(async (response) => {
        await this.writeCache(cacheKey, response, ttlMs);
        return response;
      })
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  private async requestBinary(url: string, cacheKey: string, ttlMs: number, forceRefresh = false): Promise<BinaryResponse> {
    const cachedValue = await this.readCache<BinaryResponse>(cacheKey, forceRefresh);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const pendingRequest = this.pendingRequests.get(cacheKey) as Promise<BinaryResponse> | undefined;
    if (pendingRequest) {
      return pendingRequest;
    }

    const requestPromise = this.executeBinaryRequest(url)
      .then(async (response) => {
        await this.writeCache(cacheKey, response, ttlMs);
        return response;
      })
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  private async executeRequest<T>(url: string, provider: 'google' | 'supplemental' = 'google'): Promise<T> {
    await this.applyRateLimit(provider);

    const response = await fetch(url);
    const responseText = await response.text();
    const responseJson = responseText ? JSON.parse(responseText) as T | ProviderErrorPayload : null;

    if (!response.ok) {
      const providerMessage = this.getProviderMessage(responseJson);

      throw new ProviderRequestError(response.status, response.statusText, providerMessage);
    }

    if (responseJson === null) {
      throw new InternalServerErrorException('The weather provider returned an empty response.');
    }

    return responseJson as T;
  }

  private async executeBinaryRequest(url: string): Promise<BinaryResponse> {
    await this.applyRateLimit('supplemental');

    const response = await fetch(url);
    if (!response.ok) {
      throw new ProviderRequestError(response.status, response.statusText);
    }

    return {
      contentType: response.headers.get('content-type') || 'image/png',
      body: Buffer.from(await response.arrayBuffer()),
    };
  }

  private async applyRateLimit(provider: 'google' | 'supplemental'): Promise<void> {
    const requestTimestamps = provider === 'google'
      ? this.googleRequestTimestamps
      : this.supplementalRequestTimestamps;
    const requestLimitPerMinute = provider === 'google'
      ? this.googleRequestLimitPerMinute
      : this.supplementalRequestLimitPerMinute;
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    while (requestTimestamps.length && requestTimestamps[0] < oneMinuteAgo) {
      requestTimestamps.shift();
    }

    if (requestTimestamps.length < requestLimitPerMinute) {
      requestTimestamps.push(now);
      return;
    }

    const waitMs = 60 * 1000 - (now - requestTimestamps[0]) + 50;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    requestTimestamps.push(Date.now());
  }

  private async readCache<T>(cacheKey: string, forceRefresh: boolean): Promise<T | null> {
    if (forceRefresh) {
      this.cacheMetricsService.registerBypass();
      return null;
    }

    const cachedValue = await this.cacheManager.get<T>(cacheKey) ?? null;
    if (cachedValue === null) {
      this.cacheMetricsService.registerMiss();
    } else {
      this.cacheMetricsService.registerHit();
    }

    return cachedValue;
  }

  private async writeCache<T>(cacheKey: string, value: T, ttlMs: number): Promise<void> {
    this.cacheMetricsService.registerWrite();
    await this.cacheManager.set(cacheKey, value, ttlMs);
  }

  private buildGeocodeUrl(query: string): string {
    return `${this.geocodeBaseUrl}/address/${encodeURIComponent(query)}?key=${this.googleWeatherApiKey}`;
  }

  private buildReverseGeocodeUrl(lat: number, lon: number): string {
    return `${this.geocodeBaseUrl}/location?location.latitude=${lat}&location.longitude=${lon}&key=${this.googleWeatherApiKey}`;
  }

  private buildCurrentConditionsUrl(location: WeatherLocation): string {
    return `${this.weatherBaseUrl}/currentConditions:lookup?key=${this.googleWeatherApiKey}&location.latitude=${location.lat}&location.longitude=${location.lon}&unitsSystem=METRIC`;
  }

  private buildHourlyForecastUrl(location: WeatherLocation): string {
    return `${this.weatherBaseUrl}/forecast/hours:lookup?key=${this.googleWeatherApiKey}&location.latitude=${location.lat}&location.longitude=${location.lon}&hours=${this.forecastHours}&unitsSystem=METRIC`;
  }

  private buildDailyForecastUrl(location: WeatherLocation): string {
    return `${this.weatherBaseUrl}/forecast/days:lookup?key=${this.googleWeatherApiKey}&location.latitude=${location.lat}&location.longitude=${location.lon}&days=${this.forecastDays}&unitsSystem=METRIC`;
  }

  private buildHourlyHistoryUrl(location: WeatherLocation): string {
    return `${this.weatherBaseUrl}/history/hours:lookup?key=${this.googleWeatherApiKey}&location.latitude=${location.lat}&location.longitude=${location.lon}&hours=${this.historyHours}&unitsSystem=METRIC`;
  }

  private getGeocodeResults(response: GoogleGeocodeResponse): GoogleGeocodeResult[] {
    if (!response || typeof response !== 'object') {
      throw new InternalServerErrorException('The geocoding provider returned an invalid response.');
    }

    if (typeof response.results === 'undefined') {
      return [];
    }

    if (!Array.isArray(response.results)) {
      throw new InternalServerErrorException('The geocoding provider returned an invalid geocoding payload.');
    }

    return response.results;
  }

  private isAirportCodeQuery(query: string): boolean {
    return /^[A-Za-z]{3,4}$/.test(query);
  }

  private mapGeocodeResult(
    result: GoogleGeocodeResult,
    source: WeatherLocation['source'],
    query = '',
  ): WeatherLocation {
    const locality = this.findAddressComponent(result, ['locality', 'postal_town', 'administrative_area_level_2']);
    const state = this.findAddressComponent(result, ['administrative_area_level_1'], true);
    const country = this.findAddressComponent(result, ['country']) || 'Unknown';
    const category = this.detectLocationCategory(result, locality);
    const airportCode = category === 'airport'
      ? this.extractAirportCode(result, query)
      : undefined;
    const fallbackName = result.formattedAddress.split(',')[0] || 'Selected location';
    const airportName = this.normalizeAirportName(fallbackName, airportCode);
    const name = category === 'airport'
      ? airportName
      : locality || fallbackName;

    return {
      id: `${result.location.latitude.toFixed(3)}:${result.location.longitude.toFixed(3)}`,
      name,
      state: state || undefined,
      country,
      lat: result.location.latitude,
      lon: result.location.longitude,
      label: this.buildLocationLabel(result.formattedAddress, category, airportCode),
      source,
      category,
      airportCode,
    };
  }

  private findAddressComponent(result: GoogleGeocodeResult, preferredTypes: string[], useShortText = false): string | null {
    const component = result.addressComponents?.find((entry) => preferredTypes.some((type) => entry.types.includes(type)));
    if (!component) {
      return null;
    }

    return useShortText && component.shortText ? component.shortText : component.longText;
  }

  private uniqueLocations(results: WeatherLocation[]): WeatherLocation[] {
    const deduped = new Map<string, WeatherLocation>();
    results.forEach((result) => {
      if (!deduped.has(result.id)) {
        deduped.set(result.id, result);
      }
    });
    return [...deduped.values()];
  }

  private createCoordinateLocation(lat: number, lon: number, source: WeatherLocation['source']): WeatherLocation {
    return {
      id: `${lat.toFixed(3)}:${lon.toFixed(3)}`,
      name: 'Coordinates',
      country: 'Custom',
      lat,
      lon,
      label: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      source,
      category: 'coordinates',
    };
  }

  private detectLocationCategory(result: GoogleGeocodeResult, locality: string | null): LocationCategory {
    if (result.types?.includes('airport') || /airport/i.test(result.formattedAddress)) {
      return 'airport';
    }

    if (result.types?.includes('postal_code')) {
      return 'postal_code';
    }

    if (locality) {
      return 'city';
    }

    return 'address';
  }

  private extractAirportCode(result: GoogleGeocodeResult, query: string): string | undefined {
    const sourceText = [
      result.placeId,
      result.formattedAddress,
      this.findAddressComponent(result, ['airport'], true),
      query,
    ].filter((entry): entry is string => Boolean(entry));

    for (const entry of sourceText) {
      const codeMatch = entry.toUpperCase().match(/\b([A-Z]{3,4})\b/);
      if (codeMatch) {
        return codeMatch[1];
      }
    }

    return query && this.isAirportCodeQuery(query) ? query.toUpperCase() : undefined;
  }

  private normalizeAirportName(name: string, airportCode?: string): string {
    if (!airportCode || name.toUpperCase().includes(`(${airportCode})`)) {
      return name;
    }

    return /airport/i.test(name)
      ? `${name} (${airportCode})`
      : `${name} Airport (${airportCode})`;
  }

  private buildLocationLabel(label: string, category: LocationCategory, airportCode?: string): string {
    if (category !== 'airport' || !airportCode || label.toUpperCase().includes(`(${airportCode})`)) {
      return label;
    }

    return `${label} (${airportCode})`;
  }

  private rankSearchResults(query: string, results: WeatherLocation[]): WeatherLocation[] {
    const normalizedQuery = query.trim().toLowerCase();
    const airportCodeQuery = this.isAirportCodeQuery(query);

    return [...results].sort((left, right) => this.scoreLocation(right, normalizedQuery, airportCodeQuery) - this.scoreLocation(left, normalizedQuery, airportCodeQuery));
  }

  private scoreLocation(location: WeatherLocation, normalizedQuery: string, airportCodeQuery: boolean): number {
    const normalizedName = location.name.toLowerCase();
    const normalizedLabel = location.label.toLowerCase();
    const normalizedAirportCode = location.airportCode?.toLowerCase() || '';

    let score = 0;

    if (normalizedAirportCode && normalizedAirportCode === normalizedQuery) {
      score += 40;
    }
    if (normalizedName === normalizedQuery) {
      score += 24;
    }
    if (normalizedLabel === normalizedQuery) {
      score += 20;
    }
    if (normalizedName.startsWith(normalizedQuery)) {
      score += 14;
    }
    if (normalizedLabel.startsWith(normalizedQuery)) {
      score += 10;
    }
    if (normalizedName.includes(normalizedQuery)) {
      score += 6;
    }
    if (normalizedLabel.includes(normalizedQuery)) {
      score += 4;
    }
    if (location.category === 'airport') {
      score += airportCodeQuery ? 12 : 2;
    }
    if (location.category === 'city') {
      score += airportCodeQuery ? 0 : 3;
    }

    return score;
  }

  private mapCurrentConditions(
    current: GoogleWeatherCurrentResponse,
    firstDailyPoint: GoogleWeatherDailyPoint | undefined,
  ): WeatherDashboard['current'] {
    return {
      observedAt: this.isoToUnixSeconds(current.currentTime),
      summary: current.weatherCondition?.description?.text || 'Weather',
      description: current.weatherCondition?.description?.text || 'Live weather',
      icon: this.buildIconUrl(current.weatherCondition?.iconBaseUri),
      temperatureC: current.temperature?.degrees || 0,
      feelsLikeC: current.feelsLikeTemperature?.degrees || current.temperature?.degrees || 0,
      humidity: current.relativeHumidity || 0,
      pressure: current.airPressure?.meanSeaLevelMillibars || 0,
      windSpeedMs: this.toMetersPerSecond(current.wind?.speed?.value, current.wind?.speed?.unit),
      windDeg: current.wind?.direction?.degrees || 0,
      visibilityM: this.toMeters(current.visibility?.distance, current.visibility?.unit),
      uvIndex: current.uvIndex || 0,
      cloudCover: current.cloudCover || 0,
      precipitationMm: this.toMillimeters(current.precipitation?.qpf?.quantity, current.precipitation?.qpf?.unit),
      sunrise: this.isoToUnixSeconds(firstDailyPoint?.sunEvents?.sunriseTime),
      sunset: this.isoToUnixSeconds(firstDailyPoint?.sunEvents?.sunsetTime),
      dewPointC: current.dewPoint?.degrees || 0
    };
  }

  private mapCurrentConditionsHistory(history: GoogleWeatherCurrentResponse['currentConditionsHistory']): CurrentConditionsHistorySummary | null {
    if (!history) {
      return null;
    }

    return {
      temperatureChangeC: history.temperatureChange?.degrees || 0,
      maxTemperatureC: history.maxTemperature?.degrees || 0,
      minTemperatureC: history.minTemperature?.degrees || 0,
      precipitationMm: this.toMillimeters(history.qpf?.quantity, history.qpf?.unit),
    };
  }

  private mapHourlyPoint(point: GoogleWeatherHourlyPoint): HourlyForecastPoint {
    return {
      timestamp: this.isoToUnixSeconds(point.interval.startTime),
      temperatureC: point.temperature?.degrees || 0,
      feelsLikeC: point.feelsLikeTemperature?.degrees || point.temperature?.degrees || 0,
      precipitationProbability: point.precipitation?.probability?.percent || 0,
      precipitationMm: this.toMillimeters(point.precipitation?.qpf?.quantity, point.precipitation?.qpf?.unit),
      windSpeedMs: this.toMetersPerSecond(point.wind?.speed?.value, point.wind?.speed?.unit),
      windDeg: point.wind?.direction?.degrees || 0,
      cloudCover: point.cloudCover || 0,
      icon: this.buildIconUrl(point.weatherCondition?.iconBaseUri),
      summary: point.weatherCondition?.description?.text || 'Weather',
    };
  }

  private mapDailyPoint(point: GoogleWeatherDailyPoint): DailyForecastPoint {
    const daytime = point.daytimeForecast || point.nighttimeForecast;
    const nighttime = point.nighttimeForecast || point.daytimeForecast;

    return {
      timestamp: this.isoToUnixSeconds(point.interval.startTime),
      sunrise: this.isoToUnixSeconds(point.sunEvents?.sunriseTime),
      sunset: this.isoToUnixSeconds(point.sunEvents?.sunsetTime),
      summary: daytime?.weatherCondition?.description?.text || nighttime?.weatherCondition?.description?.text || 'Weather',
      icon: this.buildIconUrl(daytime?.weatherCondition?.iconBaseUri || nighttime?.weatherCondition?.iconBaseUri),
      minTempC: point.minTemperature?.degrees || 0,
      maxTempC: point.maxTemperature?.degrees || 0,
      precipitationProbability: Math.max(
        daytime?.precipitation?.probability?.percent || 0,
        nighttime?.precipitation?.probability?.percent || 0,
      ),
      precipitationMm: this.toMillimeters(daytime?.precipitation?.qpf?.quantity, daytime?.precipitation?.qpf?.unit)
        + this.toMillimeters(nighttime?.precipitation?.qpf?.quantity, nighttime?.precipitation?.qpf?.unit),
      windSpeedMs: this.toMetersPerSecond(daytime?.wind?.speed?.value, daytime?.wind?.speed?.unit),
      windDeg: daytime?.wind?.direction?.degrees || 0,
      humidity: daytime?.relativeHumidity || nighttime?.relativeHumidity || 0,
      uvIndex: daytime?.uvIndex || nighttime?.uvIndex || 0,
    };
  }

  private mapHistorical(response: GoogleWeatherHourlyResponse): HistoricalSummary {
    const points = [...(response.historyHours || [])]
      .sort((left, right) => this.isoToUnixSeconds(left.interval.startTime) - this.isoToUnixSeconds(right.interval.startTime))
      .slice(-this.historyHours)
      .map((point) => this.mapHourlyPoint(point));

    return {
      available: points.length > 0,
      points,
    };
  }

  private mapOpenWeatherAlerts(response: OpenWeatherOneCallResponse | null): WeatherAlert[] {
    return (response?.alerts || []).map((alert) => ({
      sender: alert.sender_name || 'OpenWeather',
      event: alert.event || 'Weather alert',
      start: alert.start || 0,
      end: alert.end || 0,
      description: alert.description || '',
      tags: alert.tags || [],
    }));
  }

  private mapAirQuality(response: OpenWeatherAirPollutionResponse | null): WeatherDashboard['airQuality'] {
    const entry = response?.list?.[0];
    const aqi = entry?.main?.aqi;
    if (!aqi) {
      return null;
    }

    return {
      aqi,
      label: this.airQualityLabel(aqi),
      components: entry.components || {},
    };
  }

  private airQualityLabel(aqi: number): string {
    switch (aqi) {
      case 1:
        return 'Good';
      case 2:
        return 'Fair';
      case 3:
        return 'Moderate';
      case 4:
        return 'Poor';
      case 5:
        return 'Very poor';
      default:
        return 'Unknown';
    }
  }

  private buildIconUrl(iconBaseUri?: string): string {
    if (!iconBaseUri) {
      return '◌';
    }

    return `${iconBaseUri}_dark.svg`;
  }

  private toMetersPerSecond(value?: number, unit?: string): number {
    if (!value) {
      return 0;
    }

    if (unit === 'MILES_PER_HOUR') {
      return value * 0.44704;
    }

    if (unit === 'METERS_PER_SECOND') {
      return value;
    }

    return value / 3.6;
  }

  private toMeters(distance?: number, unit?: string): number {
    if (!distance) {
      return 0;
    }

    if (unit === 'MILES') {
      return distance * 1609.34;
    }

    if (unit === 'METERS') {
      return distance;
    }

    return distance * 1000;
  }

  private toMillimeters(quantity?: number, unit?: string): number {
    if (!quantity) {
      return 0;
    }

    if (unit === 'INCHES') {
      return quantity * 25.4;
    }

    return quantity;
  }

  private isoToUnixSeconds(value?: string): number {
    if (!value) {
      return 0;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
  }

  private buildOpenWeatherAlertsUrl(location: WeatherLocation): string {
    return `${this.openWeatherOneCallBaseUrl}?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${this.openWeatherApiKey}`;
  }

  private buildOpenWeatherAirQualityUrl(location: WeatherLocation): string {
    return `${this.openWeatherAirPollutionBaseUrl}?lat=${location.lat}&lon=${location.lon}&appid=${this.openWeatherApiKey}`;
  }

  private buildOpenWeatherTileUrl(layer: WeatherMapLayerKey, z: number, x: number, y: number): string {
    return `${this.openWeatherTileBaseUrl}/${layer}/${z}/${x}/${y}.png?appid=${this.openWeatherApiKey}`;
  }

  private getTimeZoneOffsetSeconds(epochSeconds: number, timeZone: string): number {
    try {
      const date = new Date(epochSeconds * 1000);
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const values = formatter.formatToParts(date).reduce<Record<string, string>>((parts, part) => {
        if (part.type !== 'literal') {
          parts[part.type] = part.value;
        }
        return parts;
      }, {});
      const zonedAsUtcMs = Date.UTC(
        Number(values['year']),
        Number(values['month']) - 1,
        Number(values['day']),
        Number(values['hour']),
        Number(values['minute']),
        Number(values['second']),
      );
      return Math.round((zonedAsUtcMs - date.getTime()) / 1000);
    } catch (error) {
      console.error(`Invalid timezone "${timeZone}" from provider.`, error);
      return 0;
    }
  }

  private formatApiError(surfaceName: string, error: unknown): string {
    if (error instanceof ProviderRequestError) {
      if ((error.status === 400 || error.status === 403) && error.providerMessage) {
        return `${surfaceName} is unavailable from the current Google Maps project configuration: ${error.providerMessage}`;
      }

      if (error.status === 401 || error.status === 403) {
        return `${surfaceName} is unavailable because the Google weather API key is invalid or missing permissions.`;
      }

      if (error.status === 404) {
        return `${surfaceName} is not available for this location from Google Maps Weather API.`;
      }

      if (error.status === 429) {
        return `${surfaceName} is temporarily rate limited by Google Maps Weather API. Please retry in a moment.`;
      }

      return `${surfaceName} could not be loaded (${error.status} ${error.statusText || 'Request failed'}).`;
    }

    if (error instanceof Error) {
      return `${surfaceName} could not be loaded: ${error.message}`;
    }

    return `${surfaceName} could not be loaded.`;
  }

  private getProviderMessage(responseJson: ProviderErrorPayload | unknown): string | undefined {
    if (!responseJson || typeof responseJson !== 'object') {
      return undefined;
    }

    if ('error' in responseJson && typeof responseJson.error === 'object' && responseJson.error &&
      'message' in responseJson.error && typeof responseJson.error.message === 'string') {
      return responseJson.error.message;
    }

    if ('message' in responseJson && typeof responseJson.message === 'string') {
      return responseJson.message;
    }

    return undefined;
  }
}

class ProviderRequestError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly providerMessage?: string,
  ) {
    super(providerMessage || `${status} ${statusText}`);
  }
}
