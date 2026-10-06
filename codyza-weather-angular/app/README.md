# Codyza Weather

Codyza Weather is an Angular frontend backed by a NestJS API. The Nest service proxies Google Maps Weather API and Google geocoding requests so the server-side weather key no longer ships in the browser bundle. The Angular app is configured for Node `24.19.0`, bootstraps with standalone components, and uses NgRx store/effects plus Angular signals for UI state. The UI includes:

- location search for cities, addresses, ZIP/postal codes, and coordinates
- current conditions, hourly forecast, daily outlooks, 24-hour conditions history, and recent hourly history
- geolocation, favorites, recent searches, multi-city comparison, caching, rate limiting, and automatic refresh
- an interactive Google map for selecting locations and visualizing saved places
- Codyza branding with a logo, About Codyza section, Visit Codyza action, and Powered by Codyza footer treatment

## Architecture



- [app/](.) contains the Angular frontend
- [../backend/](../backend/README.md) contains the NestJS backend that owns the weather/geocoding key
- [src/app/store/weather/](./src/app/store/weather/) contains the weather actions, effects, storage keys, and nested state slices for search, dashboard, preferences, saved/comparison data, map state, and UI messages

## Backend setup

Start the backend first:

```bash
cd ..\backend
copy .env.example .env
npm install
npm run start:dev
```

Set `GOOGLE_WEATHER_API_KEY` in `backend\.env`.

## Frontend setup

The Angular app uses two weather API base URLs:

- development: `/api/weather`, which the dev server proxies to `http://localhost:3000`
- production: the deployed Supabase weather gateway at `https://ywdslwhykwgegkdnhvvi.supabase.co/functions/v1/weather-gateway/weather`

When this app is deployed on Vercel, [vercel.json](./vercel.json) also rewrites `/api/:match*` to the Supabase `weather-gateway` function so same-origin `/api/...` requests keep working for weather routes, logout, and persisted search-history calls.

When a `jwt_token` exists in local storage, Angular automatically sends it as a `Bearer` token on outbound API requests through the shared HTTP interceptor. In production, the `weather-gateway` validates that token before forwarding the request to the weather API. The interceptor also sends the public Supabase `apikey` required by the deployed gateway validator.

If you want the interactive map enabled in the browser, set a public Google Maps JavaScript API key in:

- [src/environments/environment.ts](./src/environments/environment.ts)
- [src/environments/environment.prod.ts](./src/environments/environment.prod.ts)

The same environment files also define `rootAppUrl`, which is where the Angular logout button sends the user after clearing local session state.

Update:

```ts
googleWeather: {
  browserApiKey: 'YOUR_BROWSER_MAPS_KEY'
}
```

Without a browser key, the weather features still work through Nest, but the embedded Google map is intentionally disabled.

## Development server

Run:

```bash
nvm use 24.19.0
npm install
npm start
```

Then open `http://localhost:4200/`.

The Angular dev server proxies `/api` to `http://localhost:3000`.

## Build

```bash
npm run build
```

Production builds use the `/codyza-weather-angular-assets/` deploy URL so the app can run as a Vercel child microfrontend under `/codyza-weather-angular`. The accompanying [vercel.json](./vercel.json) rewrite maps those asset requests back to the generated bundle files on the standalone Angular deployment.

## Unit tests

```bash
npm test
```
