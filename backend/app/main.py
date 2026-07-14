import sentry_sdk
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.user import router as user_router
from app.api.category import router as category_router
from app.api.brand import router as brand_router
from app.api.product import router as product_router
from app.api.cart import router as cart_router
from app.api.order import router as order_router
from app.api.ai import router as ai_router
from app.api.review import router as review_router
from app.api.upload import router as upload_router
from app.api.wishlist import router as wishlist_router
from app.api.payment import router as payment_router
from app.api.admin import router as admin_router
from app.api.homepage import router as homepage_router
from app.api.blog import router as blog_router
from app.core.cache import get_redis, close_redis
from app.core.config import settings
from app.core.database import create_db_and_tables
from app.core.exceptions import AppException
from app.core.logging_middleware import LoggingMiddleware
from app.core.origin_check import OriginCheckMiddleware
from app.core.rate_limit import limiter
from app.core.security_headers import SecurityHeadersMiddleware

# Import models để SQLModel nhận diện bảng
from app.models import User, Category, Brand, Product, Cart, CartItem, Order, OrderItem, Review, WishlistItem, AuditLog  # noqa: F401
from app.models.blog_post import BlogPost  # noqa: F401

# Init Sentry (chỉ khi có DSN)
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    if settings.ENVIRONMENT == "development":
        create_db_and_tables()
    get_redis()
    yield
    # Shutdown
    close_redis()


app = FastAPI(title="TechSphere AI - Backend", lifespan=lifespan)
app.state.limiter = limiter
app.add_middleware(LoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(OriginCheckMiddleware)
app.add_middleware(SlowAPIMiddleware)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(GZipMiddleware, minimum_size=500)


@app.middleware("http")
async def _disable_gzip_for_sse(request: Request, call_next):
    """SSE (/api/ai/chat/stream) không được nén — GZip buffer sẽ phá streaming.

    Bỏ 'gzip' khỏi Accept-Encoding cho path stream để GZipMiddleware skip,
    giữ nguyên nén cho mọi response khác. Middleware này nằm ngoài cùng nên
    chỉnh request trước khi GZip nhìn thấy.
    """
    if request.url.path == "/api/ai/chat/stream":
        headers = [
            (k, v)
            for (k, v) in request.scope.get("headers", [])
            if k != b"accept-encoding"
        ]
        request.scope["headers"] = headers
    return await call_next(request)

app.include_router(health_router)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": exc.error_code,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    import logging
    logging.getLogger("uvicorn.error").exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_code": "INTERNAL_ERROR"},
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(category_router)
app.include_router(brand_router)
app.include_router(product_router)
app.include_router(cart_router)
app.include_router(order_router)
app.include_router(ai_router)
app.include_router(review_router)
app.include_router(upload_router)
app.include_router(wishlist_router)
app.include_router(payment_router)
app.include_router(admin_router)
app.include_router(homepage_router)
app.include_router(blog_router)


@app.get("/")
def root():
    return {
        "service": "TechSphere AI Backend",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }