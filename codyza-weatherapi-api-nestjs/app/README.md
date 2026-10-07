<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>




[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

This app is validated with Node.js `24.19.0` and npm `11.17.0`.

Copy [`.env.example`](./.env.example) to `.env` and then fill in the provider keys, database URLs, and `WEATHER_GATEWAY_INTERNAL_SECRET`.

```bash
$ npm install
```

## Gateway-only inbound traffic

This Nest API now accepts inbound HTTP traffic only from the trusted Supabase weather gateway.

- every request must include trusted `x-weather-gateway-caller` and `x-weather-gateway-secret` headers
- the shared secret must match `WEATHER_GATEWAY_INTERNAL_SECRET`
- the application now fails at startup if `WEATHER_GATEWAY_INTERNAL_SECRET` is missing
- direct browser, curl, or third-party calls to the Nest API are rejected unless they come through the trusted gateway flow

Set the same `WEATHER_GATEWAY_INTERNAL_SECRET` value in:

- the Nest API environment
- the Supabase `weather-gateway` function environment
- related gateway-side functions such as the JWT validator that already use the shared secret

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Weather caching

The weather API now uses an in-memory cache manager for provider responses. The cache is applied inside [weather.service.ts](./src/weather/weather.service.ts) so it covers both `GET` and `POST` endpoints that share the same upstream calls.

- location search cache: 15 minutes
- reverse geocoding cache: 6 hours
- current conditions cache: 5 minutes
- hourly forecast cache: 10 minutes
- daily forecast cache: 30 minutes
- hourly history cache: 60 minutes
- severe weather alerts cache: 10 minutes
- air-quality cache: 15 minutes
- weather map tiles cache: 15 minutes

`forceRefresh: true` on the dashboard request still bypasses cached provider data and fetches fresh weather details.

## Supplemental provider features

The weather dashboard can now enrich the primary Google weather response with:

- severe weather alerts
- air-quality data
- radar and weather-map tile overlays

Set `OPENWEATHER_API_KEY` in the Nest environment to enable those supplemental capabilities. When that key is missing, the dashboard still returns current conditions, forecast, and history from Google, but it also includes a warning message so the frontend can explain why alerts/AQI/layers are unavailable.

The weather-map tile proxy is exposed at `GET /weather/map-layers/:layer/:z/:x/:y`, where `layer` is one of:

- `clouds_new`
- `precipitation_new`
- `temp_new`
- `wind_new`

## Search history persistence

Recent searches are now handled by a dedicated Nest search-history service instead of being mixed into [weather.service.ts](./src/weather/weather.service.ts). The API surface is:

- `GET /weather/search-history`
- `POST /weather/search-history`
- `DELETE /weather/search-history`
- `GET /weather/profile`
- `PUT /weather/profile`

These endpoints expect the authenticated user identity in the `X-User-Id` header that the gateway already forwards from the validated JWT subject.

Set `WEATHER_SEARCH_HISTORY_DATABASE_URL` so the search-history and protected profile services can persist user data in PostgreSQL. If that variable is not set, the Nest app now falls back to `WEATHER_OBSERVABILITY_DATABASE_URL`, then `DATABASE_URL`, which helps environments that share a single PostgreSQL instance across admin observability and user profile storage.

The search-history/profile database client uses an explicit `pg.Pool` with configurable settings:

- `WEATHER_DATABASE_POOL_MAX`
- `WEATHER_DATABASE_POOL_IDLE_TIMEOUT_MS`
- `WEATHER_DATABASE_POOL_CONNECTION_TIMEOUT_MS`
- `WEATHER_DATABASE_POOL_MAX_LIFETIME_SECONDS`

Recommended shared 15-connection budget:

- Nest weather/profile/search-history pool: `6`

The Nest API now bootstraps the `weather_search_history` table and its indexes automatically on first use, and it backfills newly introduced columns plus the unique user/location index in older deployments, so both new and already-running environments do not need a separate manual migration before recent-search or admin top-search features can work.

```sql
CREATE TABLE weather_search_history (
  id BIGSERIAL PRIMARY KEY,
  user_email VARCHAR(320) NOT NULL,
  query_text VARCHAR(255),
  location_id VARCHAR(255) NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  state_region VARCHAR(255),
  country VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('search', 'favorite', 'recent', 'geolocation', 'map')),
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weather_search_history_user_location_unique UNIQUE (user_email, location_id)
);

CREATE INDEX idx_weather_search_history_user_email_searched_at
  ON weather_search_history (user_email, searched_at DESC);

CREATE TABLE weather_user_profiles (
  user_email VARCHAR(320) PRIMARY KEY,
  favorites JSONB NOT NULL DEFAULT '[]'::jsonb,
  comparison_locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  temperature_unit VARCHAR(20) NOT NULL DEFAULT 'celsius',
  measurement_system VARCHAR(20) NOT NULL DEFAULT 'metric',
  selected_map_layer VARCHAR(30) NOT NULL DEFAULT 'clouds_new',
  auto_refresh BOOLEAN NOT NULL DEFAULT true,
  notification_preferences JSONB NOT NULL DEFAULT '{"dailySummary": true, "severeWeather": true, "airQuality": false, "weekendOutlook": false}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`GET /weather/profile` returns the protected user dashboard payload that combines persisted favorites, comparisons, units, map-layer settings, notification preferences, and backend-backed recent searches. The service also lazily creates `weather_user_profiles` if the table is missing and backfills any newly introduced profile columns in older deployments, which helps both fresh and already-running environments bootstrap cleanly.

## Admin observability dashboard

The API now includes dedicated admin observability surfaces at:

- `POST /admin/dashboard` for one-shot snapshots
- `GET /admin/dashboard/stream` for real-time server-sent events

They aggregate:

- API usage in the last 24 hours
- failed requests
- most searched locations
- active authenticated users
- in-memory cache performance counters
- runtime and database health

Request logs are persisted to PostgreSQL by a dedicated admin module and middleware. Configure `WEATHER_OBSERVABILITY_DATABASE_URL`, or let it fall back to `WEATHER_SEARCH_HISTORY_DATABASE_URL` / `DATABASE_URL`.

The observability database client also uses an explicit `pg.Pool`, with optional admin-specific overrides:

- `WEATHER_OBSERVABILITY_POOL_MAX`
- `WEATHER_OBSERVABILITY_POOL_IDLE_TIMEOUT_MS`
- `WEATHER_OBSERVABILITY_POOL_CONNECTION_TIMEOUT_MS`
- `WEATHER_OBSERVABILITY_POOL_MAX_LIFETIME_SECONDS`

If an observability-specific pool variable is not set, the service falls back to the shared `WEATHER_DATABASE_POOL_*` value before using its internal defaults.

- Nest admin observability pool: `3`
This endpoint now requires:

- a JWT that was validated by the gateway
- the `admin` role in the forwarded user payload
- trusted gateway headers that match `WEATHER_GATEWAY_INTERNAL_SECRET`

Set `WEATHER_GATEWAY_INTERNAL_SECRET` in the Nest environment to the same shared secret used by the Supabase `weather-gateway` function so the role guard can reject spoofed direct requests.

Set `ADMIN_DASHBOARD_STREAM_INTERVAL_MS` if you want to override the default 5-second real-time refresh interval for the SSE stream.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

This project is already instrumented. Create a free account at [observe.nestjs.com](https://observe.nestjs.com), add an application, and paste the generated app key and secret into the `ObserveModule.forRoot()` call in `src/app.module.ts`.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## for admininstrators 
contact me in slack and I will provide how to log in the administrator pannel 
