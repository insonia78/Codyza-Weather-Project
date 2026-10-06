This is the Codyza Weather administration app built with the Next.js App Router.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the admin dashboard.

The admin UI is served from:

- [app/page.tsx](./app/page.tsx)

The App Router admin API route is served from:

- [app/api/admin/dashboard/route.ts](./app/api/admin/dashboard/route.ts)

The route handler proxies server-side requests through the Supabase `weather-gateway` function before the request reaches the Nest admin endpoint.

Create a `.env.local` file when running this app outside local defaults:

```bash
ADMIN_GATEWAY_BASE_URL=http://localhost:54321/functions/v1/weather-gateway
ADMIN_GATEWAY_API_KEY=
ADMIN_DASHBOARD_GATEWAY_SECRET=replace-with-the-shared-gateway-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password
```

You can start from [`.env.local.example`](./.env.local.example) and copy it to `.env.local`.

Both the App Router page (`/`) and the App Route (`/api/admin/dashboard`) are protected by Next middleware using HTTP Basic authentication.
The App Route then fetches the admin dashboard data through the Supabase `weather-gateway` function, which validates `ADMIN_DASHBOARD_GATEWAY_SECRET` before proxying to the Nest admin API.

## Available functionality

- API usage summary
- failed request reporting
- most searched locations
- active user count
- cache performance metrics
- runtime and database health overview

## Learn More

To learn more about Next.js App Router and route handlers:

- [Next.js Documentation](https://nextjs.org/docs)
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

## Deploy

Deploy this app alongside the Nest API and configure:

- `ADMIN_GATEWAY_BASE_URL` to the live `weather-gateway` function URL
- `ADMIN_DASHBOARD_GATEWAY_SECRET` to the same shared secret configured in [supabase/functions/.env](../codyza-supabase-edge-functions/supabase/functions/.env)
- `ADMIN_USERNAME` / `ADMIN_PASSWORD` for the Next.js admin Basic auth gate
