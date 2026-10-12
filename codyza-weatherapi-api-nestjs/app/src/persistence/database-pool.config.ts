import type { PoolConfig } from 'pg';

const defaultWeatherPoolMax = 6;
const defaultObservabilityPoolMax = 3;
const defaultCombinedPoolMax = 15;
const defaultPoolIdleTimeoutMs = 30_000;
const defaultPoolConnectionTimeoutMs = 5_000;
const defaultPoolMaxLifetimeSeconds = 1_800;

type PoolEnvPrefix = 'WEATHER_DATABASE_POOL' | 'WEATHER_OBSERVABILITY_POOL';

function readPositiveInteger(
  envVarNames: string[],
  fallback: number,
): number {
  for (const envVarName of envVarNames) {
    const rawValue = (process.env[envVarName] || '').trim();
    if (!rawValue) {
      continue;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }
  }

  return fallback;
}

function readPoolMax(prefix: PoolEnvPrefix): number {
  const defaultPoolMax = prefix === 'WEATHER_OBSERVABILITY_POOL'
    ? defaultObservabilityPoolMax
    : defaultWeatherPoolMax;

  return readPositiveInteger([`${prefix}_MAX`, 'WEATHER_DATABASE_POOL_MAX'], defaultPoolMax);
}

function validateCombinedPoolMaxes(
  weatherPoolMax: number,
  observabilityPoolMax: number,
): void {
  const totalPoolMax = weatherPoolMax + observabilityPoolMax;
  if (totalPoolMax <= defaultCombinedPoolMax) {
    return;
  }

  throw new RangeError(
    `Combined PostgreSQL pool max exceeds the shared ${defaultCombinedPoolMax}-connection budget (${weatherPoolMax} + ${observabilityPoolMax} = ${totalPoolMax}). Lower WEATHER_DATABASE_POOL_MAX and/or WEATHER_OBSERVABILITY_POOL_MAX.`,
  );
}

export function buildDatabasePoolConfig(
  connectionString: string,
  useSsl: boolean,
  prefix: PoolEnvPrefix,
): PoolConfig {
  const weatherPoolMax = readPoolMax('WEATHER_DATABASE_POOL');
  const observabilityPoolMax = readPoolMax('WEATHER_OBSERVABILITY_POOL');

  validateCombinedPoolMaxes(weatherPoolMax, observabilityPoolMax);

  return {
    connectionString,
    max: prefix === 'WEATHER_OBSERVABILITY_POOL' ? observabilityPoolMax : weatherPoolMax,
    idleTimeoutMillis: readPositiveInteger(
      [`${prefix}_IDLE_TIMEOUT_MS`, 'WEATHER_DATABASE_POOL_IDLE_TIMEOUT_MS'],
      defaultPoolIdleTimeoutMs,
    ),
    connectionTimeoutMillis: readPositiveInteger(
      [`${prefix}_CONNECTION_TIMEOUT_MS`, 'WEATHER_DATABASE_POOL_CONNECTION_TIMEOUT_MS'],
      defaultPoolConnectionTimeoutMs,
    ),
    maxLifetimeSeconds: readPositiveInteger(
      [`${prefix}_MAX_LIFETIME_SECONDS`, 'WEATHER_DATABASE_POOL_MAX_LIFETIME_SECONDS'],
      defaultPoolMaxLifetimeSeconds,
    ),
    allowExitOnIdle: false,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  };
}
