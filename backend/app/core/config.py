from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
  model_config = SettingsConfigDict(
    env_file=ENV_FILE,
    env_file_encoding="utf-8",
    extra="ignore",
  )

  app_env: str = "dev"
  app_name: str = "homepage-backend"
  audit_log_retention_days: int = 90

  database_url: str
  database_pool_size: int = 20
  database_pool_max_overflow: int = 0
  database_pool_timeout: int = 30
  database_pool_warmup: int = 2

  jwt_secret: str
  jwt_algorithm: str = "HS256"
  jwt_exp_hours: int = 24

  bootstrap_admin_username: str | None = None
  bootstrap_admin_password: str | None = None

  cors_allow_origins: str = ""

  s3_endpoint_url: str | None = None
  s3_region: str | None = None
  s3_access_key_id: str
  s3_secret_access_key: str
  s3_bucket: str

  media_referer_allowlist: str = ""
  media_proxy_enabled: bool = True

  login_rate_limit: str = "10/minute"
  analytics_rate_limit: str = "60/minute"
  api_rate_limit: str = "120/minute"

  smtp_host: str = ""
  smtp_port: int = 465
  smtp_username: str = "business@t-react.com"
  smtp_password: str = ""
  smtp_use_ssl: bool = True
  smtp_use_starttls: bool = False
  smtp_timeout: int = 20
  mail_from_name: str = "T-React"
  mail_from_email: str = "business@t-react.com"
  business_notification_email: str = "403120057@qq.com"

  @field_validator(
    "audit_log_retention_days",
    "database_pool_size",
    "database_pool_timeout",
    "database_pool_warmup",
    "smtp_port",
    "smtp_timeout",
    mode="after",
  )
  @classmethod
  def _validate_positive_int(cls, value: int) -> int:
    if value < 1:
      raise ValueError("must be greater than or equal to 1")
    return value

  @field_validator("database_pool_max_overflow", mode="after")
  @classmethod
  def _validate_non_negative_int(cls, value: int) -> int:
    if value < 0:
      raise ValueError("must be greater than or equal to 0")
    return value

  @property
  def cors_origins_list(self) -> list[str]:
    return [item.strip() for item in self.cors_allow_origins.split(",") if item.strip()]

  @property
  def is_production(self) -> bool:
    return self.app_env.lower() in {"prod", "production"}

  @property
  def media_referer_allowlist_list(self) -> list[str]:
    return [item.strip() for item in self.media_referer_allowlist.split(",") if item.strip()]


settings = Settings()
