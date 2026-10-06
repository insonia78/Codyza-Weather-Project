/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_APP_NAME?: string;
    readonly REACT_APP_API_BASE_URL?: string;
    readonly REACT_APP_GATEWAY_BASE_URL?: string;
    readonly REACT_APP_ENVIRONMENT?: 'development' | 'production' | 'test';
  }
}
