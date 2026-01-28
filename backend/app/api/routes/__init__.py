from fastapi import APIRouter

from app.api.routes import foods, recipes, logs, nutrition

api_router = APIRouter()

api_router.include_router(foods.router, prefix="/foods", tags=["foods"])
api_router.include_router(recipes.router, prefix="/recipes", tags=["recipes"])
api_router.include_router(logs.router, prefix="/logs", tags=["logs"])
api_router.include_router(nutrition.router, prefix="/nutrition", tags=["nutrition"])
