from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Calorie AI"
    debug: bool = True
    database_url: str = f"sqlite:///{Path(__file__).parent.parent / 'data' / 'calorie_ai.db'}"

    # External API settings
    openfoodfacts_url: str = "https://world.openfoodfacts.org/api/v2"
    usda_api_key: str = ""  # Optional: set via environment variable
    usda_api_url: str = "https://api.nal.usda.gov/fdc/v1"

    class Config:
        env_file = ".env"


settings = Settings()
