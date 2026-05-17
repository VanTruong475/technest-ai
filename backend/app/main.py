from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
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
from app.core.database import create_db_and_tables
from app.core.exceptions import AppException
from app.core.rate_limit import limiter

# Import models để SQLModel nhận diện bảng
from app.models import User, Category, Brand, Product, Cart, CartItem, Order, OrderItem  # noqa: F401

app = FastAPI(title="TechSphere AI - Backend")
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TechSphere AI Backend"
    }