from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.health import router as health_router
from app.core.database import create_db_and_tables

# Import models để SQLModel nhận diện bảng
from app.models import User, Category, Brand, Product  # noqa: F401

app = FastAPI(title="TechSphere AI - Backend")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TechSphere AI Backend"
    }