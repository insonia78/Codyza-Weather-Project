import { buildDatabasePoolConfig } from './database-pool.config.js';

describe('buildDatabasePoolConfig', () => {
  const originalEnv = {
    weatherDatabasePoolMax: process.env.WEATHER_DATABASE_POOL_MAX,
    weatherDatabasePoolIdleTimeoutMs: process.env.WEATHER_DATABASE_POOL_IDLE_TIMEOUT_MS,
    weatherDatabasePoolConnectionTimeoutMs: process.env.WEATHER_DATABASE_POOL_CONNECTION_TIMEOUT_MS,
    weatherDatabasePoolMaxLifetimeSeconds: process.env.WEATHER_DATABASE_POOL_MAX_LIFETIME_SECONDS,
    weatherObservabilityPoolMax: process.env.WEATHER_OBSERVABILITY_POOL_MAX,
  };

  afterEach(() => {
    process.env.WEATHER_DATABASE_POOL_MAX = originalEnv.weatherDatabasePoolMax;
    process.env.WEATHER_DATABASE_POOL_IDLE_TIMEOUT_MS = originalEnv.weatherDatabasePoolIdleTimeoutMs;
    process.env.WEATHER_DATABASE_POOL_CONNECTION_TIMEOUT_MS = originalEnv.weatherDatabasePoolConnectionTimeoutMs;
    process.env.WEATHER_DATABASE_POOL_MAX_LIFETIME_SECONDS = originalEnv.weatherDatabasePoolMaxLifetimeSeconds;
    process.env.WEATHER_OBSERVABILITY_POOL_MAX = originalEnv.weatherObservabilityPoolMax;
  });

  it('uses shared pool defaults when no overrides are configured', () => {
    delete process.env.WEATHER_DATABASE_POOL_MAX;
    delete process.env.WEATHER_DATABASE_POOL_IDLE_TIMEOUT_MS;
    delete process.env.WEATHER_DATABASE_POOL_CONNECTION_TIMEOUT_MS;
    delete process.env.WEATHER_DATABASE_POOL_MAX_LIFETIME_SECONDS;
    delete process.env.WEATHER_OBSERVABILITY_POOL_MAX;

    expect(buildDatabasePoolConfig('******example.com:5432/weather', true, 'WEATHER_DATABASE_POOL')).toMatchObject({
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      maxLifetimeSeconds: 1_800,
      allowExitOnIdle: false,
      ssl: { rejectUnauthorized: false },
    });
  });

  it('prefers prefix-specific overrides over shared defaults', () => {
    process.env.WEATHER_DATABASE_POOL_MAX = '12';
    process.env.WEATHER_OBSERVABILITY_POOL_MAX = '3';

    expect(buildDatabasePoolConfig('******example.com:5432/weather', true, 'WEATHER_OBSERVABILITY_POOL')).toMatchObject({
      max: 3,
    });
    expect(buildDatabasePoolConfig('******example.com:5432/weather', false, 'WEATHER_DATABASE_POOL')).toMatchObject({
      max: 12,
      ssl: undefined,
    });
  });
});
