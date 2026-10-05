# Codyza Weather

Codyza Weather is an Angular frontend backed by a NestJS API. The Nest service proxies Google Maps Weather API and Google geocoding requests so the server-side weather key no longer ships in the browser bundle. The Angular app is configured for Node `24.19.0`, bootstraps with standalone components, and uses NgRx store/effects plus Angular signals for UI state. The UI includes:

- location search for cities, addresses, ZIP/postal codes, and coordinates
- current conditions, hourly forecast, daily outlooks, 24-hour conditions history, and recent hourly history
- geolocation, favorites, recent searches, multi-city comparison, caching, rate limiting, and automatic refresh
- an interactive Google map for selecting locations and visualizing saved places

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

The frontend now calls the Nest API through `/api/weather` and no longer stores the weather provider key in Angular environment files.

If you want the interactive map enabled in the browser, set a public Google Maps JavaScript API key in:

- [src/environments/environment.ts](./src/environments/environment.ts)
- [src/environments/environment.prod.ts](./src/environments/environment.prod.ts)

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

## Unit tests

```bash
npm test
```
