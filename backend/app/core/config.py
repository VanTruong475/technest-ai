from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "change_me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4173"
    ENVIRONMENT: str = "development"
    ADMIN_EMAIL: str = "admin@techsphere.com"
    ADMIN_PASSWORD: str = "admin123"
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

    class Config:
        env_file = ".env"


settings = Settings()