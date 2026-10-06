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
- [app/login/page.tsx](./app/login/page.tsx)
- [app/create-password/page.tsx](./app/create-password/page.tsx)

These major admin surfaces now include Codyza branding with a reusable logo treatment, a short About Codyza section, Visit Codyza actions, and a Powered by Codyza footer.

The App Router admin API route is served from:

- [app/api/admin/dashboard/route.ts](./app/api/admin/dashboard/route.ts)

The route handler proxies server-side requests through the Supabase `weather-gateway` function before the request reaches the Nest admin endpoint.
Gateway-facing server routes automatically retry short-lived network failures and `502`/`503`/`504` responses before surfacing an error to the user.
The deployed `weather-gateway` must forward the admin dashboard route to the Nest `/api/admin/dashboard` endpoint. The gateway now normalizes admin requests correctly even when its weather backend base URL ends with `/api/weather`.

Authentication for the admin UI is handled by:

- [app/api/auth/access/route.ts](./app/api/auth/access/route.ts)
- [app/api/auth/create-password/route.ts](./app/api/auth/create-password/route.ts)
- [app/api/auth/login/route.ts](./app/api/auth/login/route.ts)
- [app/api/auth/logout/route.ts](./app/api/auth/logout/route.ts)

## Admin bootstrap and login flow

The admin login flow is email-first:

1. enter the administrator email that already exists in the accounts database
2. the app checks whether that account already has a password
3. if no password exists, the app redirects to `/create-password`
4. if a password exists, the app prompts for it on `/login`
5. successful login or first-time password creation returns a JWT from the shared token service, stores it in an HttpOnly session cookie, and uses that token for protected admin requests through the gateway

Both the App Router page (`/`) and the App Route (`/api/admin/dashboard`) are protected by [proxy.ts](./proxy.ts), which requires a valid admin JWT session cookie and redirects unauthenticated browser requests to `/login`.

The App Route fetches dashboard data through the Supabase `weather-gateway` function with a `POST /admin/dashboard` request and:

```http
Authorization: Bearer <token>
apikey: <ADMIN_GATEWAY_API_KEY>
```

The administrator account is not configured through gateway environment variables. Instead, the account must already exist in the registration database with `role=admin`. If that database record has no password yet, the admin app uses the `/create-password` bootstrap flow.

## Configuration

Create a `.env.local` file when running this app outside local defaults:

```bash
ADMIN_GATEWAY_BASE_URL=http://localhost:54321/functions/v1/weather-gateway
ADMIN_GATEWAY_API_KEY=
```

You can start from [`.env.local.example`](./.env.local.example) and copy it to `.env.local`.

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
- `ADMIN_GATEWAY_API_KEY` to a key that can call the live `weather-gateway` function
- an administrator account record in the registration database with `role=admin`
