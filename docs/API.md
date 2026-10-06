# Codyza Weather API Documentation

## Entry points

- Public browser traffic should call the Supabase gateway: `https://ywdslwhykwgegkdnhvvi.supabase.co/functions/v1/weather-gateway`
- The NestJS weather API and FastAPI registration API are private upstream services behind that gateway
- The Next.js admin console uses its own server routes, which proxy through the gateway

## Authentication model

- Public auth routes go through the gateway and the FastAPI registration service
- Protected weather routes require a valid Bearer token
- Protected Nest routes also require trusted gateway headers:
  - `x-weather-gateway-caller: weather-gateway`
  - `x-weather-gateway-secret: <WEATHER_GATEWAY_INTERNAL_SECRET>`
- Admin routes require a valid admin JWT plus trusted gateway headers

## Gateway routes

Base URL: `/functions/v1/weather-gateway`

### Accounts

| Method | Route | Purpose |
|---|---|---|
| POST | `/accounts` | Register an end user account |
| POST | `/accounts/access` | Check whether an account exists and whether password setup is required |
| POST | `/accounts/login` | Log in with email and password |
| POST | `/accounts/password/setup` | Bootstrap an administrator password |
| POST | `/accounts/reset-password` | Request a reset email or debug preview link |
| POST | `/accounts/reset-password/confirm` | Confirm a password reset with token and new password |
| PUT | `/accounts/{id}` | Replace an account record |
| PATCH | `/accounts/{id}` | Partially update an account record |
| DELETE | `/accounts/{id}` | Delete an account record |

### Session

| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/logout` | Revoke the current JWT session |

### Weather

| Method | Route | Purpose |
|---|---|---|
| GET | `/weather/status` | Service health and provider availability snapshot |
| GET | `/weather/search` | Search locations by text query |
| GET | `/weather/reverse` | Reverse geocode coordinates to a location |
| POST | `/weather/dashboard` | Fetch current conditions, forecasts, history, alerts, AQI, and metadata |
| GET | `/weather/map-layers/{layer}/{z}/{x}/{y}` | Proxy weather tiles for `clouds_new`, `precipitation_new`, `temp_new`, or `wind_new` |
| GET | `/weather/search-history` | List recent searches for the authenticated user |
| POST | `/weather/search-history` | Upsert a recent search for the authenticated user |
| DELETE | `/weather/search-history` | Clear the authenticated user's recent searches |
| GET | `/weather/profile` | Load the authenticated user's saved weather profile |
| PUT | `/weather/profile` | Save favorites, comparisons, unit preferences, map layer, auto-refresh, and notification preferences |

### Admin

| Method | Route | Purpose |
|---|---|---|
| POST | `/admin/access` | Check whether the submitted email is an administrator account |
| POST | `/admin/login` | Authenticate an administrator and mint an admin-capable JWT |
| POST | `/admin/create-password` | Create the first password for an admin account |
| POST | `/admin/dashboard` | Return a one-shot observability snapshot |
| GET | `/admin/dashboard/stream` | Stream realtime observability updates with server-sent events |

## Request shapes

### `POST /accounts`

```json
{
  "email": "person@example.com",
  "password": "minimum-eight-characters"
}
```

### `POST /accounts/login`

```json
{
  "email": "person@example.com",
  "password": "minimum-eight-characters"
}
```

### `POST /accounts/reset-password`

```json
{
  "email": "person@example.com"
}
```

### `POST /accounts/reset-password/confirm`

```json
{
  "token": "reset-token-from-email-or-preview-link",
  "password": "new-password"
}
```

### `POST /weather/dashboard`

```json
{
  "location": {
    "id": "paris-fr",
    "name": "Paris",
    "country": "France",
    "lat": 48.8566,
    "lon": 2.3522,
    "label": "Paris, France",
    "source": "search"
  },
  "forceRefresh": false
}
```

### `PUT /weather/profile`

```json
{
  "favorites": [],
  "comparisonLocations": [],
  "temperatureUnit": "celsius",
  "measurementSystem": "metric",
  "selectedMapLayer": "clouds_new",
  "autoRefresh": true,
  "notificationPreferences": {
    "dailySummary": true,
    "severeWeather": true,
    "airQuality": false,
    "weekendOutlook": false
  }
}
```

## Response highlights

- Account login responses include `role` and `passwordSetupRequired`
- Weather dashboard responses include:
  - `location`
  - `timezone`
  - `current`
  - `hourly`
  - `daily`
  - `alerts`
  - `airQuality`
  - `historical`
  - `providerForecastDays`
  - `warnings`
- Admin dashboard snapshot responses include:
  - request totals
  - failed request list
  - active users
  - most searched locations
  - cache performance
  - system health

## Frontend server routes

### React auth app

The React app submits directly to gateway-backed account routes using:

- `REACT_APP_API_BASE_URL`
- `REACT_APP_API_KEY`

### Next.js admin app

The admin app exposes internal server routes that forward to the gateway:

| Method | Route |
|---|---|
| POST | `/api/auth/access` |
| POST | `/api/auth/login` |
| POST | `/api/auth/create-password` |
| POST | `/api/auth/logout` |
| GET | `/api/admin/dashboard` |
| GET | `/api/admin/dashboard/stream` |

See the service-level docs for more implementation detail:

- [codyza-weather-registration-api-python/api/v1/README.md](../codyza-weather-registration-api-python/api/v1/README.md)
- [codyza-weatherapi-api-nestjs/app/README.md](../codyza-weatherapi-api-nestjs/app/README.md)
- [codyza-administration-nextjs/administration/README.md](../codyza-administration-nextjs/administration/README.md)
