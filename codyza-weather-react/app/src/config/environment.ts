const DEFAULT_APP_NAME = 'Codyza Weather';

const defaultApiBaseUrlByEnvironment: Record<string, string> = {
  development: 'http://localhost:4000/api',
  production: '/api',
  test: 'http://localhost:4000/api',
};

const environment =
  process.env.REACT_APP_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';

const apiBaseUrl =
  process.env.REACT_APP_API_BASE_URL ??
  defaultApiBaseUrlByEnvironment[environment] ??
  defaultApiBaseUrlByEnvironment.development;

export const appConfig = {
  appName: process.env.REACT_APP_APP_NAME ?? DEFAULT_APP_NAME,
  apiBaseUrl,
  environment,
  isProduction: environment === 'production',
};
