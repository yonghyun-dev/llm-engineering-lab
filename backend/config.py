from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "llm engineering lab"
    openai_api_key: str = Field(validation_alias="OPENAI_API_KEY")
    model_name: str = "gpt-4.1-mini"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).with_name(".env"),
        env_file_encoding="utf-8",
    )

@lru_cache
def get_settings() -> Settings:
    return Settings()
