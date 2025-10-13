from pydantic import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    allowed_origins: str = "*"
    database_url: str = "postgresql://akirah:akirah@localhost:5432/akirah"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me"
    jwt_expires_min: int = 60
    turn_url: str = ""
    turn_username: str = ""
    turn_password: str = ""

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> "Settings":
    return Settings()

settings = get_settings()
