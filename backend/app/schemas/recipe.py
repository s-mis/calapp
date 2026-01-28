from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.schemas.food import FoodResponse


class RecipeIngredientCreate(BaseModel):
    food_id: int
    amount: float = Field(..., gt=0, description="Amount in grams")
    order_index: int = Field(0, ge=0)


class RecipeIngredientResponse(BaseModel):
    id: int
    food_id: int
    amount: float
    order_index: int
    food: FoodResponse

    class Config:
        from_attributes = True


class RecipeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    servings: int = Field(1, gt=0)
    prep_time_minutes: Optional[int] = Field(None, ge=0)
    cook_time_minutes: Optional[int] = Field(None, ge=0)
    instructions: Optional[str] = None


class RecipeCreate(RecipeBase):
    ingredients: List[RecipeIngredientCreate] = Field(default_factory=list)


class RecipeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    servings: Optional[int] = Field(None, gt=0)
    prep_time_minutes: Optional[int] = Field(None, ge=0)
    cook_time_minutes: Optional[int] = Field(None, ge=0)
    instructions: Optional[str] = None
    ingredients: Optional[List[RecipeIngredientCreate]] = None


class NutritionSummary(BaseModel):
    """Calculated nutrition for the entire recipe or per serving."""
    calories: float = 0.0
    protein: float = 0.0
    carbs: float = 0.0
    fat: float = 0.0
    fiber: float = 0.0
    sugar: float = 0.0
    sodium: float = 0.0
    potassium: float = 0.0


class RecipeResponse(RecipeBase):
    id: int
    ingredients: List[RecipeIngredientResponse]
    created_at: datetime
    updated_at: datetime
    total_nutrition: Optional[NutritionSummary] = None
    per_serving_nutrition: Optional[NutritionSummary] = None

    class Config:
        from_attributes = True
