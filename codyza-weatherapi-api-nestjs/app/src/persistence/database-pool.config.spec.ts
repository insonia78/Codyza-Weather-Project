import { buildDatabasePoolConfig } from './database-pool.config.js';

describe('buildDatabasePoolConfig', () => {
  const originalEnv = {
    weatherDatabasePoolMax: process.env.WEATHER_DATABASE_POOL_MAX,
    weatherDatabasePoolIdleTimeoutMs: process.env.WEATHER_DATABASE_POOL_IDLE_TIMEOUT_MS,
    weatherDatabasePoolConnectionTimeoutMs: process.env.WEATHER_DATABASE_POOL_CONNECTION_TIMEOUT_MS,
    weatherDatabasePoolMaxLifetimeSeconds: process.env.WEATHER_DATABASE_POOL_MAX_LIFETIME_SECONDS,
    weatherObservabilityPoolMax: process.env.WEATHER_OBSERVABILITY_POOL_MAX,
    weatherObservabilityPoolIdleTimeoutMs: process.env.WEATHER_OBSERVABILITY_POOL_IDLE_TIMEOUT_MS,
    weatherObservabilityPoolConnectionTimeoutMs: process.env.WEATHER_OBSERVABILITY_POOL_CONNECTION_TIMEOUT_MS,
    weatherObservabilityPoolMaxLifetimeSeconds: process.env.WEATHER_OBSERVABILITY_POOL_MAX_LIFETIME_SECONDS,
  };

  afterEach(() => {
    process.env.WEATHER_DATABASE_POOL_MAX = originalEnv.weatherDatabasePoolMax;
    process.env.WEATHER_DATABASE_POOL_IDLE_TIMEOUT_MS = originalEnv.weatherDatabasePoolIdleTimeoutMs;
    process.env.WEATHER_DATABASE_POOL_CONNECTION_TIMEOUT_MS = originalEnv.weatherDatabasePoolConnectionTimeoutMs;
    process.env.WEATHER_DATABASE_POOL_MAX_LIFETIME_SECONDS = originalEnv.weatherDatabasePoolMaxLifetimeSeconds;
    process.env.WEATHER_OBSERVABILITY_POOL_MAX = originalEnv.weatherObservabilityPoolMax;
    process.env.WEATHER_OBSERVABILITY_POOL_IDLE_TIMEOUT_MS = originalEnv.weatherObservabilityPoolIdleTimeoutMs;
    process.env.WEATHER_OBSERVABILITY_POOL_CONNECTION_TIMEOUT_MS = originalEnv.weatherObservabilityPoolConnectionTimeoutMs;
    process.env.WEATHER_OBSERVABILITY_POOL_MAX_LIFETIME_SECONDS = originalEnv.weatherObservabilityPoolMaxLifetimeSeconds;
  });

  it('uses shared pool defaults when no overrides are configured', () => {
    delete process.env.WEATHER_DATABASE_POOL_MAX;
    delete process.env.WEATHER_DATABASE_POOL_IDLE_TIMEOUT_MS;
    delete process.env.WEATHER_DATABASE_POOL_CONNECTION_TIMEOUT_MS;
    delete process.env.WEATHER_DATABASE_POOL_MAX_LIFETIME_SECONDS;
    delete process.env.WEATHER_OBSERVABILITY_POOL_MAX;

    expect(buildDatabasePoolConfig('******example.com:5432/weather', true, 'WEATHER_DATABASE_POOL')).toMatchObject({
      max: 6,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      maxLifetimeSeconds: 1_800,
      maxUses: 1,
      allowExitOnIdle: false,
      ssl: { rejectUnauthorized: false },
    });

    expect(buildDatabasePoolConfig('******example.com:5432/weather', true, 'WEATHER_OBSERVABILITY_POOL')).toMatchObject({
      max: 3,
    });
  });

  it('prefers prefix-specific overrides over shared defaults', () => {
    process.env.WEATHER_DATABASE_POOL_MAX = '7';
    process.env.WEATHER_OBSERVABILITY_POOL_MAX = '3';

    expect(buildDatabasePoolConfig('******example.com:5432/weather', true, 'WEATHER_OBSERVABILITY_POOL')).toMatchObject({
      max: 3,
    });
    expect(buildDatabasePoolConfig('******example.com:5432/weather', false, 'WEATHER_DATABASE_POOL')).toMatchObject({
      max: 7,
      ssl: undefined,
    });
  });

  it('allows a combined pool max of exactly 10 connections', () => {
    process.env.WEATHER_DATABASE_POOL_MAX = '6';
    process.env.WEATHER_OBSERVABILITY_POOL_MAX = '4';

    expect(buildDatabasePoolConfig('******example.com:5432/weather', true, 'WEATHER_DATABASE_POOL')).toMatchObject({
      max: 6,
    });
  });

  it('rejects pool max settings that exceed the shared 10-connection budget', () => {
    process.env.WEATHER_DATABASE_POOL_MAX = '7';
    process.env.WEATHER_OBSERVABILITY_POOL_MAX = '4';

    expect(() => buildDatabasePoolConfig('******example.com:5432/weather', true, 'WEATHER_DATABASE_POOL')).toThrowError(
      new RangeError(
        'Combined PostgreSQL pool max exceeds the shared 10-connection budget (7 + 4 = 11). Lower WEATHER_DATABASE_POOL_MAX and/or WEATHER_OBSERVABILITY_POOL_MAX.',
      ),
    );
  });

  it('applies the shared weather pool override to observability when a specific override is missing', () => {
    process.env.WEATHER_DATABASE_POOL_MAX = '6';
    delete process.env.WEATHER_OBSERVABILITY_POOL_MAX;

    expect(() => buildDatabasePoolConfig('******example.com:5432/weather', true, 'WEATHER_OBSERVABILITY_POOL')).toThrowError(
      new RangeError(
        'Combined PostgreSQL pool max exceeds the shared 10-connection budget (6 + 6 = 12). Lower WEATHER_DATABASE_POOL_MAX and/or WEATHER_OBSERVABILITY_POOL_MAX.',
      ),
    );
  });
});
