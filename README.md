# Codyza Weather

Production-oriented global weather platform with:

- a React root authentication app
- an Angular weather dashboard
- a Next.js administration console
- a NestJS weather and observability API
- a FastAPI registration and account API
- Supabase Edge Functions for gateway and JWT orchestration

## Live production URLs

- Root auth app: `https://codyza-weather-project-17oc.vercel.app/`
- Weather dashboard: `https://codyza-weather-project.vercel.app/dashboard`
- Admin console: `https://codyza-weather-project-rjf9.vercel.app/`
- Supabase gateway: `https://ywdslwhykwgegkdnhvvi.supabase.co/functions/v1/weather-gateway`

The NestJS weather API and Python registration API are intended to stay behind the trusted gateway and are not meant to receive direct browser traffic.

## Platform capabilities

Implemented in the current codebase:

- live weather search for cities, countries, airports, ZIP or postal codes, and coordinates
- geolocation and an interactive weather map
- current conditions, hourly forecast, daily forecast, and recent historical conditions
- severe weather alerts, air quality, and weather map layers
- Celsius or Fahrenheit plus metric or imperial preferences
- recent searches, favorites, saved multi-city comparisons, and notification preferences
- protected signup, login, logout, and password reset flows
- admin observability dashboard with usage, failed requests, search demand, cache metrics, active users, and system health
- trusted gateway-only access into protected backend services

## Repository structure

- [codyza-weather-react/app](./codyza-weather-react/app) - React root auth app
- [codyza-weather-angular/app](./codyza-weather-angular/app) - Angular weather experience
- [codyza-administration-nextjs/administration](./codyza-administration-nextjs/administration) - Next.js admin console
- [codyza-weatherapi-api-nestjs/app](./codyza-weatherapi-api-nestjs/app) - NestJS weather and admin API
- [codyza-weather-registration-api-python/api/v1](./codyza-weather-registration-api-python/api/v1) - FastAPI account API
- [codyza-supabase-edge-functions/supabase/functions](./codyza-supabase-edge-functions/supabase/functions) - Supabase gateway and JWT edge functions

## Submission artifacts

- Acceptance checklist: [docs/acceptance-checklist.md](./docs/acceptance-checklist.md)
- API documentation: [docs/API.md](./docs/API.md)
- Database schema and ER diagram: [docs/database-schema.md](./docs/database-schema.md)
- Deployment guide: [docs/deployment.md](./docs/deployment.md)
- Shared environment template: [.env.example](./.env.example)

Service-specific setup docs:

- [codyza-weather-react/app/README.md](./codyza-weather-react/app/README.md)
- [codyza-weather-angular/app/README.md](./codyza-weather-angular/app/README.md)
- [codyza-administration-nextjs/administration/README.md](./codyza-administration-nextjs/administration/README.md)
- [codyza-weatherapi-api-nestjs/app/README.md](./codyza-weatherapi-api-nestjs/app/README.md)
- [codyza-weather-registration-api-python/README.md](./codyza-weather-registration-api-python/README.md)

## Continuous integration

GitHub Actions now validates the full multi-application workspace through [.github/workflows/ci.yml](./.github/workflows/ci.yml):

- React auth app unit and route-flow tests plus production build
- Angular weather dashboard tests plus production build
- Next.js admin tests, lint, and production build
- NestJS unit and e2e API coverage plus build
- FastAPI unittest suites plus Python compile checks
- Supabase Edge Function Deno tests

## Test access

The platform supports self-service user registration, so a seeded end-user account is not strictly required for evaluation. For admin validation, provision an account in the registration database with `role=admin`, or use an environment-specific admin test account managed outside the repository.

## Notes

- Weather provider credentials remain server-side and must not be exposed in browser bundles.
- Public browser-facing keys such as a publishable Supabase key or a browser maps key should still be scoped and rotated through provider consoles as needed.
- Supabase Edge Functions now reuse a shared pooled PostgreSQL client for JWT token persistence, configured by `JWT_TOKEN_DATABASE_URL`, `JWT_TOKEN_DATABASE_POOL_MAX`, `JWT_TOKEN_DATABASE_IDLE_TIMEOUT_SECONDS`, and `JWT_TOKEN_DATABASE_CONNECT_TIMEOUT_SECONDS`.
- See [docs/acceptance-checklist.md](./docs/acceptance-checklist.md) for the current pass, partial, and follow-up items mapped to the original requirements.
