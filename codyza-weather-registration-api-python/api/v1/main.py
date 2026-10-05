from fastapi import FastAPI, status
from database.postgres import create_db_and_tables
from middleware.jwt_auth import JWTAuthMiddleware
from routes.accounts import accounts_router
# from supabase import create_client, Client


app = FastAPI()
# app.add_middleware(
#     JWTAuthMiddleware,
#     public_paths={"/health", "/docs", "/docs/oauth2-redirect", "/openapi.json", "/redoc"},
#     protected_url_prefixes={"http://127.0.0.1:54331/functions/v1/weather-gateway/accounts/"},
# )

app.include_router(accounts_router)


@app.on_event("startup")
def on_startup():
    # Ensure DB and tables exist before accepting requests
    create_db_and_tables()

@app.get("/health",status_code=status.HTTP_200_OK,tags=["health"])
def read_root():
    return {"Hello": "World"}


