import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { AdminService } from './../src/admin/admin.service.js';
import { RequestLoggingMiddleware } from './../src/admin/request-logging.middleware.js';
import { SearchHistoryService } from './../src/search-history/search-history.service.js';
import { weatherGatewayCallerHeader, weatherGatewayCallerValue, weatherGatewaySecretHeader } from './../src/security/gateway-request.constants.js';
import { UserProfileService } from './../src/user-profile/user-profile.service.js';
import { WeatherProviderService } from './../src/weather/weather.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const gatewaySecret = 'test-weather-gateway-secret';
  const searchHistoryService = {
    listRecentSearches: vi.fn(),
    saveRecentSearch: vi.fn(),
    clearRecentSearches: vi.fn(),
  };
  const userProfileService = {
    getProfile: vi.fn(),
    saveProfile: vi.fn(),
  };
  const adminService = {
    getDashboard: vi.fn(),
    streamDashboard: vi.fn(),
    logRequest: vi.fn().mockResolvedValue(undefined),
  };
  const weatherService = {
    apiKeyConfigured: true,
    providerName: 'Google Maps Weather API',
    getDashboard: vi.fn(),
    searchLocations: vi.fn(),
    reverseGeocode: vi.fn(),
    getMapLayerTile: vi.fn(),
  };
  const requestLoggingMiddleware = {
    use: (_req: unknown, _res: unknown, next: () => void) => next(),
  };

  beforeEach(async () => {
    process.env.WEATHER_GATEWAY_INTERNAL_SECRET = gatewaySecret;
    vi.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SearchHistoryService)
      .useValue(searchHistoryService)
      .overrideProvider(UserProfileService)
      .useValue(userProfileService)
      .overrideProvider(AdminService)
      .useValue(adminService)
      .overrideProvider(RequestLoggingMiddleware)
      .useValue(requestLoggingMiddleware)
      .overrideProvider(WeatherProviderService)
      .useValue(weatherService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Codyza Weather API');
  });

  it('/api/weather/status (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/weather/status')
      .set(weatherGatewayCallerHeader, weatherGatewayCallerValue)
      .set(weatherGatewaySecretHeader, gatewaySecret)
      .expect(200)
      .expect(({ body }) => {
        expect(body.providerName).toBe('Google Maps Weather API');
        expect(typeof body.configured).toBe('boolean');
      });
  });

  it('/api/weather/search-history (GET) returns recent searches for the authenticated user', () => {
    searchHistoryService.listRecentSearches.mockResolvedValue([
      {
        id: 'rome-it',
        name: 'Rome',
      },
    ]);

    return request(app.getHttpServer())
      .get('/api/weather/search-history?limit=5')
      .set(weatherGatewayCallerHeader, weatherGatewayCallerValue)
      .set(weatherGatewaySecretHeader, gatewaySecret)
      .set('x-user-id', 'traveler@example.com')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([
          {
            id: 'rome-it',
            name: 'Rome',
          },
        ]);
      });
  });

  it('/api/weather/search-history (POST) stores a recent search', () => {
    searchHistoryService.saveRecentSearch.mockResolvedValue({
      id: 'lhr',
      queryText: 'london heathrow',
    });

    return request(app.getHttpServer())
      .post('/api/weather/search-history')
      .set(weatherGatewayCallerHeader, weatherGatewayCallerValue)
      .set(weatherGatewaySecretHeader, gatewaySecret)
      .set('x-user-id', 'traveler@example.com')
      .send({
        location: {
          id: 'lhr',
          name: 'London Heathrow',
          state: 'England',
          country: 'United Kingdom',
          lat: 51.47,
          lon: -0.4543,
          label: 'London Heathrow, England, United Kingdom',
          source: 'search',
        },
        queryText: 'london heathrow',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBe('lhr');
        expect(body.queryText).toBe('london heathrow');
      });
  });

  it('/api/weather/profile (GET) returns the persisted profile', () => {
    userProfileService.getProfile.mockResolvedValue({
      email: 'traveler@example.com',
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

    return request(app.getHttpServer())
      .get('/api/weather/profile')
      .set(weatherGatewayCallerHeader, weatherGatewayCallerValue)
      .set(weatherGatewaySecretHeader, gatewaySecret)
      .set('x-user-id', 'traveler@example.com')
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe('traveler@example.com');
        expect(body.autoRefresh).toBe(true);
      });
  });

  it('/api/weather/profile (PUT) saves the profile', () => {
    userProfileService.saveProfile.mockResolvedValue({
      email: 'traveler@example.com',
      favorites: [{
        id: 'rome-it',
        name: 'Rome',
        state: 'Lazio',
        country: 'Italy',
        lat: 41.9028,
        lon: 12.4964,
        label: 'Rome, Lazio, Italy',
        source: 'favorite',
      }],
      comparisonLocations: [],
      recentSearches: [],
      temperatureUnit: 'fahrenheit',
      measurementSystem: 'imperial',
      selectedMapLayer: 'wind_new',
      autoRefresh: false,
      notificationPreferences: {
        dailySummary: false,
        severeWeather: true,
        airQuality: true,
        weekendOutlook: false,
      },
      updatedAt: null,
    });

    return request(app.getHttpServer())
      .put('/api/weather/profile')
      .set(weatherGatewayCallerHeader, weatherGatewayCallerValue)
      .set(weatherGatewaySecretHeader, gatewaySecret)
      .set('x-user-id', 'traveler@example.com')
      .send({
        favorites: [{
          id: 'rome-it',
          name: 'Rome',
          state: 'Lazio',
          country: 'Italy',
          lat: 41.9028,
          lon: 12.4964,
          label: 'Rome, Lazio, Italy',
          source: 'favorite',
        }],
        comparisonLocations: [],
        temperatureUnit: 'fahrenheit',
        measurementSystem: 'imperial',
        selectedMapLayer: 'wind_new',
        autoRefresh: false,
        notificationPreferences: {
          dailySummary: false,
          severeWeather: true,
          airQuality: true,
          weekendOutlook: false,
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.temperatureUnit).toBe('fahrenheit');
        expect(body.selectedMapLayer).toBe('wind_new');
      });
  });

  it('/api/admin/dashboard (POST) returns the admin snapshot for administrators', () => {
    adminService.getDashboard.mockResolvedValue({
      apiUsage: {
        totalRequests: 42,
      },
      cachePerformance: {
        hitRate: 0.9,
      },
    });

    return request(app.getHttpServer())
      .post('/api/admin/dashboard')
      .set(weatherGatewayCallerHeader, weatherGatewayCallerValue)
      .set(weatherGatewaySecretHeader, gatewaySecret)
      .set('x-user-payload', JSON.stringify({ role: 'admin' }))
      .expect(201)
      .expect(({ body }) => {
        expect(body.apiUsage.totalRequests).toBe(42);
        expect(body.cachePerformance.hitRate).toBe(0.9);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
