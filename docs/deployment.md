# Codyza Weather Deployment Guide

## Recommended production topology

- React root auth app on Vercel
- Angular weather dashboard on Vercel
- Next.js admin console on Vercel
- NestJS weather API on Render, Railway, or an equivalent Node host
- FastAPI registration API on Render, Railway, or an equivalent Python host
- Supabase Edge Functions for gateway and JWT flows
- PostgreSQL for account, weather-profile, observability, and JWT token persistence

## Deployment order

1. Provision PostgreSQL databases.
2. Deploy the FastAPI registration API.
3. Deploy the NestJS weather API.
4. Deploy Supabase Edge Functions and wire them to both backends.
5. Deploy the React auth app.
6. Deploy the Angular weather app.
7. Deploy the Next.js admin app.
8. Run a live smoke test across auth, weather, and admin flows.

## 1. Database provisioning

Create PostgreSQL databases or schemas reachable by:

- the FastAPI registration API
- the NestJS weather API
- the JWT token store used by Supabase Edge Functions

Minimum persisted entities are documented in [database-schema.md](./database-schema.md).

## 2. FastAPI registration API

Project path: [codyza-weather-registration-api-python/api/v1](../codyza-weather-registration-api-python/api/v1)

Required environment variables:

- `POSTGRES_URL`
- `POSTGRES_FILE_NAME`
- `JWT_SECRET_KEY`
- `WEATHER_GATEWAY_INTERNAL_SECRET`

Optional password-reset delivery variables:

- `PASSWORD_RESET_URL_BASE`
- `PASSWORD_RESET_TOKEN_TTL_MINUTES`
- `PASSWORD_RESET_DEBUG_LINKS_ENABLED`
- SMTP variables

Startup command example:

```bash
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

## 3. NestJS weather API

Project path: [codyza-weatherapi-api-nestjs/app](../codyza-weatherapi-api-nestjs/app)

Required environment variables:

- `PORT`
- `GOOGLE_WEATHER_API_KEY`
- `WEATHER_GATEWAY_INTERNAL_SECRET`
- `WEATHER_SEARCH_HISTORY_DATABASE_URL` or `DATABASE_URL`
- `WEATHER_OBSERVABILITY_DATABASE_URL` or `DATABASE_URL`

Optional environment variables:

- `OPENWEATHER_API_KEY`
- provider base URL overrides

Startup command example:

```bash
npm install
npm run build
npm run start:prod
```

## 4. Supabase Edge Functions

Project path: [codyza-supabase-edge-functions/supabase/functions](../codyza-supabase-edge-functions/supabase/functions)

Required environment variables:

- `WEATHER_REGISTRATION_API_URL`
- `WEATHER_API_URL`
- `JWT_CREATOR_URL`
- `JWT_VALIDATOR_URL`
- `JWT_REVOKE_URL`
- `WEATHER_GATEWAY_INTERNAL_SECRET`
- `MY_JWT_SECRET` or `CUSTOM_JWT_SECRET`
- `SUPABASE_JWT_SECRET`
- `JWT_TOKEN_DATABASE_URL`

Deploy the following functions:

- `weather-gateway`
- `jwt-creator`
- `jwt-validator`
- `jwt-revoke`

## 5. React root auth app

Project path: [codyza-weather-react/app](../codyza-weather-react/app)

Required environment variables:

- `REACT_APP_APP_NAME`
- `REACT_APP_ENVIRONMENT`
- `REACT_APP_API_BASE_URL`
- `REACT_APP_API_KEY`
- `REACT_APP_CODYZA_WEATHER_URL`
- `REACT_APP_ADMIN_APP_URL`

Build command:

```bash
npm install
npm run build
```

## 6. Angular weather app

Project path: [codyza-weather-angular/app](../codyza-weather-angular/app)

Update these files before building:

- [src/environments/environment.ts](../codyza-weather-angular/app/src/environments/environment.ts)
- [src/environments/environment.prod.ts](../codyza-weather-angular/app/src/environments/environment.prod.ts)

Set:

- root app URL
- gateway base URL
- weather API base URL
- publishable Supabase API key
- browser Google Maps key
- auto-refresh interval

Build command:

```bash
npm install
npm run build
```

## 7. Next.js admin app

Project path: [codyza-administration-nextjs/administration](../codyza-administration-nextjs/administration)

Required environment variables:

- `ADMIN_GATEWAY_BASE_URL`
- `ADMIN_GATEWAY_API_KEY`
- `NEXT_PUBLIC_ROOT_APP_URL`

Build command:

```bash
npm install
npm run build
```

## 8. Live smoke test checklist

After deployment, verify:

1. user registration
2. user login
3. weather search
4. dashboard load
5. favorites save and reload
6. comparison save and reload
7. search history persistence
8. profile preferences persistence
9. password reset request and confirmation
10. admin access check
11. admin login
12. admin dashboard load
13. weather map layer tile fetch
14. alerts and AQI in a supported location

## Current production URLs

- Root auth app: `https://codyza-weather-project-17oc.vercel.app/`
- Weather dashboard: `https://codyza-weather-project.vercel.app/dashboard`
- Admin console: `https://codyza-weather-project-rjf9.vercel.app/`
- Gateway: `https://ywdslwhykwgegkdnhvvi.supabase.co/functions/v1/weather-gateway`
