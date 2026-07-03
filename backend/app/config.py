from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://malgeum:malgeum-dev@localhost:5433/malgeum"
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_prefix = "MALGEUM_"
        env_file = ".env"


settings = Settings()
