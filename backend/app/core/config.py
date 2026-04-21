from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    SENDGRID_API_KEY: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PRO_PRICE_ID: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()