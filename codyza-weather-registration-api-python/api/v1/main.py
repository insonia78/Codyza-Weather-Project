from fastapi import FastAPI, status
from database.postgres import create_db_and_tables
from middleware.weather_gateway_auth import WeatherGatewayAuthMiddleware
from routes.accounts import accounts_router


app = FastAPI()
app.add_middleware(
    WeatherGatewayAuthMiddleware,
    public_paths={"/health", "/docs", "/docs/oauth2-redirect", "/openapi.json", "/redoc"},
    protected_path_prefixes={"/accounts"},
)

app.include_router(accounts_router)


@app.on_event("startup")
def on_startup():
    # Ensure DB and tables exist before accepting requests
    create_db_and_tables()

@app.get("/health",status_code=status.HTTP_200_OK,tags=["health"])
def read_root():
    return {"Hello": "World"}

