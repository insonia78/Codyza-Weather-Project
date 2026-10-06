import type { PoolConfig } from 'pg';

const defaultPoolMax = 10;
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

export function buildDatabasePoolConfig(
  connectionString: string,
  useSsl: boolean,
  prefix: PoolEnvPrefix,
): PoolConfig {
  return {
    connectionString,
    max: readPositiveInteger([`${prefix}_MAX`, 'WEATHER_DATABASE_POOL_MAX'], defaultPoolMax),
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
