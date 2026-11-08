import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    NVIDIA_API_KEY: str = "your_nvidia_api_key_here"
    NVIDIA_API_URL: str = "https://integrate.api.nvidia.com/v1"
    GEMINI_API_KEY: str = "your_gemini_api_key_here"
    
    RIVA_SERVER_URL: str = "localhost:50051"
    RIVA_USE_SSL: bool = False
    
    DATABASE_URL: str = "sqlite:///./sarthi.db"
    FAISS_INDEX_PATH: str = "./faiss_index"
    
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "mistral"
    
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
