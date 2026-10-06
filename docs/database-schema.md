# Codyza Weather Database Schema

This repository currently persists data across three main areas:

1. account and password-reset data in the FastAPI registration database
2. weather profile, search history, and admin observability data in the NestJS PostgreSQL database
3. custom JWT token records for edge-function validation and revocation

## Entity relationship diagram

```mermaid
erDiagram
    accounts {
        int id PK
        string email
        string password
        string password_salt
        string role
    }

    password_reset_tokens {
        uuid id PK
        int account_id FK
        string token_hash
        datetime created_at
        datetime expires_at
        datetime used_at
    }

    weather_user_profiles {
        string user_email PK
        jsonb favorites
        jsonb comparison_locations
        string temperature_unit
        string measurement_system
        string selected_map_layer
        boolean auto_refresh
        jsonb notification_preferences
        datetime updated_at
    }

    weather_search_history {
        bigint id PK
        string user_email
        string query_text
        string location_id
        string location_name
        string state_region
        string country
        float latitude
        float longitude
        string source
        datetime searched_at
    }

    weather_api_request_logs {
        bigint id PK
        string request_path
        string request_method
        int status_code
        int duration_ms
        string user_email
        string user_agent
        string request_id
        string token_type
        datetime created_at
    }

    jwt_tokens {
        string token_id PK
        string token_sha
        string user_id
        string role
        string issuer
        bigint issued_at
        bigint expires_at
        bigint revoked_at
    }

    accounts ||--o{ password_reset_tokens : owns
    accounts ||..o| weather_user_profiles : "email-based profile"
    accounts ||..o{ weather_search_history : "email-based history"
    accounts ||..o{ weather_api_request_logs : "email-based activity"
    accounts ||..o{ jwt_tokens : "issued tokens"
```

## Table details

### `accounts`

Stores end-user and administrator accounts.

Important columns:

- `email`
- `password`
- `password_salt`
- `role` with `user` or `admin`

### `password_reset_tokens`

Stores hashed, expiring, single-use reset tokens.

Important properties:

- one record per reset request
- `token_hash` is stored instead of the raw token
- `used_at` marks token consumption

### `weather_user_profiles`

Stores weather-specific user preferences and saved state:

- favorites
- comparison locations
- temperature unit
- measurement system
- selected map layer
- auto-refresh preference
- notification preferences

### `weather_search_history`

Stores recent searches for authenticated users. The service deduplicates by `(user_email, location_id)` and updates recency.

### `weather_api_request_logs`

Stores observability records used by the admin dashboard:

- request path and method
- status code
- duration
- user identity when available
- token type and request metadata

### `jwt_tokens`

Stores the custom JWT `jti` and `sha` claims so the gateway can validate that a token was issued by the system and revoke it on logout.

## Known gap

The current schema persists notification preferences, but it does not yet define a dedicated `notification_history` table. If final acceptance requires stored delivery history for outbound notifications, add a separate notification pipeline and persistence model.
