# Registration API v1

`api/v1` is a FastAPI service for account registration management in the Codyza Weather Project.

## Features

- Health check endpoint
- Create, list, update, partially update, and delete accounts
- PostgreSQL connection through SQLModel and SQLAlchemy
- Database existence check during startup
- Table creation during startup

## Requirements

- Python 3.12 or newer
- PostgreSQL
- `uv`

## Project structure

```text
api/v1/
  controller/
    accounts_controller/
      models/
        models.py
      accounts_controller.py
  database/
    postgres.py
  routes/
    accounts.py
  main.py
  pyproject.toml
```

## Configuration

The service reads its configuration from a local `.env` file.

Required environment variables:

- `POSTGRES_URL`: PostgreSQL connection string used by the application
- `POSTGRES_FILE_NAME`: Database name checked and created at startup if missing
- `JWT_SECRET_KEY`: Secret used to validate incoming bearer tokens
- `JWT_ALGORITHM`: JWT signing algorithm, defaults to `HS256`

Example shape:

```env
POSTGRES_URL=postgresql+psycopg://username:password@localhost:5432/app_database
POSTGRES_FILE_NAME=app_database
JWT_SECRET_KEY=replace-with-a-secure-secret
JWT_ALGORITHM=HS256
```

## Local development

From the `api/v1` folder:

1. Install dependencies:

   ```powershell
   uv sync
   ```

2. Start the development server:

   ```powershell
   uv run uvicorn main:app --reload
   ```

3. Open the API docs:

   - `http://127.0.0.1:8000/docs`
   - `http://127.0.0.1:8000/redoc`

## Startup behavior

When the application starts:

1. It loads values from `.env`
2. It connects to PostgreSQL
3. It checks whether the configured database exists
4. It creates the database if needed
5. It creates the SQLModel tables

## Authentication

JWT middleware checks bearer tokens on protected routes.

Public routes:

- `/health`
- `/docs`
- `/docs/oauth2-redirect`
- `/openapi.json`
- `/redoc`

The middleware only checks requests whose full URL starts with:

- `http://127.0.0.1:54321/functions/v1/weather-gateway/accounts/`

Matching requests must send:

```http
Authorization: Bearer <jwt-token>
```

If the token is missing, malformed, expired, or invalid, the API returns `401 Unauthorized`.
Requests outside that URL prefix bypass the JWT middleware.

## Endpoints

### Health

#### `GET /health`

Returns:

```json
{
  "Hello": "World"
}
```

### Accounts

#### `GET /accounts/`

Returns all accounts.

#### `POST /accounts/`

Creates an account.

Example request body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### `PUT /accounts/{id}`

Replaces an existing account.

Example request body:

```json
{
  "email": "updated@example.com",
  "password": "updated123"
}
```

#### `PATCH /accounts/{id}`

Partially updates an existing account.

Example request body:

```json
{
  "email": "patched@example.com"
}
```

#### `DELETE /accounts/{id}`

Deletes an account and returns the deleted record.

## Data model

The current account model includes:

- `id: int`
- `email: valid email address`
- `password: string with minimum length of 8 characters`

## Notes

- The current implementation returns `404` when an account is not found for update, patch, or delete operations.
- Database errors are surfaced as `500` responses.
- The API currently creates tables automatically on startup.
- Request validation rejects invalid email addresses and passwords shorter than 8 characters.
