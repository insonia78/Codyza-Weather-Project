/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_APP_NAME?: string;
    readonly REACT_APP_API_BASE_URL?: string;
    readonly REACT_APP_API_KEY?: string;
    readonly REACT_APP_ADMIN_APP_URL?: string;
    readonly REACT_APP_CODYZA_WEATHER_URL?: string;
    readonly REACT_APP_ENVIRONMENT?: 'development' | 'production' | 'test';
    readonly REACT_APP_TURNSTILE_SITE_KEY?: string;
  }
}
