from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import api_router
from app.db.init_db import init_db

# Initialize database tables on startup
init_db()

app = FastAPI(
    title=settings.app_name,
    description="A calorie tracking application with recipe building capabilities",
    version="1.0.0",
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Welcome to Calorie AI API", "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
