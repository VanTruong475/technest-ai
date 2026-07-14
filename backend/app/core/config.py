import logging
import warnings

from pydantic import model_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger("techsphere")


_DEFAULT_SECRET_KEY = "change_me"
_DEFAULT_ADMIN_PASSWORD = "admin123"
_MIN_SECRET_KEY_LENGTH = 32


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = _DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4173"
    ENVIRONMENT: str = "development"
    COOKIE_SECURE: bool = True  # False for local HTTP dev
    COOKIE_SAMESITE: str = "lax"  # lax for local, none for production cross-site
    ADMIN_EMAIL: str = "admin@techsphere.com"
    ADMIN_PASSWORD: str = _DEFAULT_ADMIN_PASSWORD
    ADMIN_FULL_NAME: str = "Admin Demo"
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.0
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    EMAIL_ENABLED: bool = False
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "TechSphere AI <onboarding@resend.dev>"
    FRONTEND_URL: str = "http://localhost:5173"
    VNPAY_TMN_CODE: str = ""
    VNPAY_HASH_SECRET: str = ""
    VNPAY_PAYMENT_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNPAY_RETURN_URL: str = "http://localhost:8000/api/payments/vnpay-return"
    REDIS_URL: str = ""

    # AI / LLM (optional — chatbot fallback về rule-based nếu disabled hoặc lỗi)
    AI_LLM_ENABLED: bool = False
    # AI_PROVIDERS: comma-list theo thứ tự ưu tiên (vd "gemini,groq"). Mỗi
    # provider lỗi → thử provider kế tiếp; hết → fallback rule-based.
    # Nếu rỗng, hệ thống dùng [AI_PROVIDER] làm singleton chain (backwards compat).
    AI_PROVIDERS: str = ""
    AI_PROVIDER: str = "gemini"
    AI_LLM_TIMEOUT_SECONDS: float = 10.0
    # Cache TTL cho LLM response (Redis) — 0 để disable cache. Default 1h.
    AI_LLM_CACHE_TTL_SECONDS: int = 3600
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    class Config:
        env_file = ".env"

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        # Production: hard fail
        if self.ENVIRONMENT == "production":
            if self.SECRET_KEY == _DEFAULT_SECRET_KEY:
                raise ValueError(
                    "SECRET_KEY must be set to a strong random value in production "
                    "(must not equal the default placeholder)."
                )
            if len(self.SECRET_KEY) < _MIN_SECRET_KEY_LENGTH:
                raise ValueError(
                    f"SECRET_KEY must be at least {_MIN_SECRET_KEY_LENGTH} characters in production."
                )
            if self.ADMIN_PASSWORD == _DEFAULT_ADMIN_PASSWORD:
                raise ValueError(
                    "ADMIN_PASSWORD must be changed from the default in production."
                )
            cors = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
            if any(o == "*" for o in cors):
                raise ValueError(
                    "CORS_ORIGINS cannot contain '*' in production "
                    "(incompatible with allow_credentials=True)."
                )
            self.COOKIE_SAMESITE = "none"
        else:
            # Non-production: loud warnings
            if self.SECRET_KEY == _DEFAULT_SECRET_KEY:
                warnings.warn(
                    "SECRET_KEY is using the default value 'change_me'. "
                    "Set a strong SECRET_KEY in .env for security.",
                    stacklevel=1,
                )
            if self.ADMIN_PASSWORD == _DEFAULT_ADMIN_PASSWORD:
                warnings.warn(
                    "ADMIN_PASSWORD is using the default value 'admin123'. "
                    "Change it in .env for security.",
                    stacklevel=1,
                )
            self.COOKIE_SAMESITE = "lax"
            self.COOKIE_SECURE = False

        return self


settings = Settings()