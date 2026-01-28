from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator

from app.schemas.food import FoodResponse
from app.schemas.recipe import RecipeResponse
from app.schemas.serving_size import ServingSizeInFood


class FoodLogBase(BaseModel):
    """
    Food log entry. Supports multiple logging styles:
    1. By grams: food_id/recipe_id + amount
    2. By serving: food_id + serving_size_id + servings
    3. Quick-add: quick_calories (+ optional macros)
    """
    log_date: date
    meal_type: Optional[str] = Field(None, pattern="^(breakfast|lunch|dinner|snack)$")

    # Food/Recipe reference
    food_id: Optional[int] = None
    recipe_id: Optional[int] = None

    # Option 1: Amount in grams
    amount: Optional[float] = Field(None, gt=0, description="Amount in grams")

    # Option 2: Serving-based logging (MyFitnessPal style)
    serving_size_id: Optional[int] = None
    servings: Optional[float] = Field(None, gt=0, description="Number of servings")

    # Option 3: Quick-add calories
    quick_calories: Optional[float] = Field(None, ge=0)
    quick_protein: Optional[float] = Field(None, ge=0)
    quick_carbs: Optional[float] = Field(None, ge=0)
    quick_fat: Optional[float] = Field(None, ge=0)
    quick_name: Optional[str] = Field(None, max_length=255, description="Label for quick-add entry")

    @model_validator(mode="after")
    def check_valid_log_type(self):
        has_food = self.food_id is not None
        has_recipe = self.recipe_id is not None
        has_quick = self.quick_calories is not None

        # Must have exactly one of: food, recipe, or quick-add
        if not (has_food or has_recipe or has_quick):
            raise ValueError("Must provide food_id, recipe_id, or quick_calories")

        if has_food and has_recipe:
            raise ValueError("Cannot specify both food_id and recipe_id")

        if has_quick and (has_food or has_recipe):
            raise ValueError("Quick-add cannot be combined with food_id or recipe_id")

        # If food/recipe, must have either amount OR (serving_size_id + servings)
        if has_food or has_recipe:
            has_amount = self.amount is not None
            has_servings = self.serving_size_id is not None and self.servings is not None

            if not (has_amount or has_servings):
                raise ValueError("Must provide either 'amount' in grams or 'serving_size_id' + 'servings'")

        return self


class FoodLogCreate(FoodLogBase):
    pass


class FoodLogUpdate(BaseModel):
    log_date: Optional[date] = None
    meal_type: Optional[str] = Field(None, pattern="^(breakfast|lunch|dinner|snack)$")
    food_id: Optional[int] = None
    recipe_id: Optional[int] = None
    amount: Optional[float] = Field(None, gt=0, description="Amount in grams")
    serving_size_id: Optional[int] = None
    servings: Optional[float] = Field(None, gt=0)
    quick_calories: Optional[float] = Field(None, ge=0)
    quick_protein: Optional[float] = Field(None, ge=0)
    quick_carbs: Optional[float] = Field(None, ge=0)
    quick_fat: Optional[float] = Field(None, ge=0)
    quick_name: Optional[str] = Field(None, max_length=255)


class FoodLogResponse(BaseModel):
    id: int
    log_date: date
    meal_type: Optional[str]
    food_id: Optional[int]
    recipe_id: Optional[int]

    # Amount fields
    amount: Optional[float] = None  # in grams (if logging by weight)
    serving_size_id: Optional[int] = None
    servings: Optional[float] = None
    serving_size: Optional[ServingSizeInFood] = None

    # Quick-add fields
    quick_calories: Optional[float] = None
    quick_protein: Optional[float] = None
    quick_carbs: Optional[float] = None
    quick_fat: Optional[float] = None
    quick_name: Optional[str] = None

    logged_at: datetime
    food: Optional[FoodResponse] = None
    recipe: Optional[RecipeResponse] = None

    # Calculated nutrition for this log entry
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fat: Optional[float] = None

    # Convenience: amount in grams (calculated from servings if needed)
    amount_in_grams: Optional[float] = None

    class Config:
        from_attributes = True


class DailySummary(BaseModel):
    """Summary of nutrition for a single day."""
    date: date
    total_calories: float = 0.0
    total_protein: float = 0.0
    total_carbs: float = 0.0
    total_fat: float = 0.0
    total_fiber: float = 0.0
    total_sugar: float = 0.0
    total_sodium: float = 0.0
    entries_count: int = 0

    # Breakdown by meal
    breakfast_calories: float = 0.0
    lunch_calories: float = 0.0
    dinner_calories: float = 0.0
    snack_calories: float = 0.0
