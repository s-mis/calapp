from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

from app.schemas.serving_size import ServingSizeCreate, ServingSizeInFood


class FoodBase(BaseModel):
    """
    Base food schema. All nutritional values are per 100g.
    """
    name: str = Field(..., min_length=1, max_length=255)
    brand: Optional[str] = Field(None, max_length=255)
    barcode: Optional[str] = Field(None, max_length=50)

    # Optional serving size (e.g., 60g for a protein bar)
    serving_size: Optional[float] = Field(None, gt=0, description="Grams per serving/piece")
    serving_unit: Optional[str] = Field(None, max_length=50, description="e.g., bar, egg, slice")

    # Macros (per 100g)
    calories: float = Field(0.0, ge=0, description="kcal per 100g")
    protein: float = Field(0.0, ge=0, description="grams per 100g")
    carbs: float = Field(0.0, ge=0, description="grams per 100g")
    fat: float = Field(0.0, ge=0, description="grams per 100g")
    fiber: float = Field(0.0, ge=0, description="grams per 100g")
    sugar: float = Field(0.0, ge=0, description="grams per 100g")

    # Micros (per 100g) - all default to 0
    sodium: float = Field(0.0, ge=0, description="mg per 100g")
    potassium: float = Field(0.0, ge=0, description="mg per 100g")
    vitamin_a: float = Field(0.0, ge=0, description="mcg per 100g")
    vitamin_c: float = Field(0.0, ge=0, description="mg per 100g")
    calcium: float = Field(0.0, ge=0, description="mg per 100g")
    iron: float = Field(0.0, ge=0, description="mg per 100g")
    vitamin_d: float = Field(0.0, ge=0, description="mcg per 100g")
    vitamin_e: float = Field(0.0, ge=0, description="mg per 100g")
    vitamin_k: float = Field(0.0, ge=0, description="mcg per 100g")
    vitamin_b1: float = Field(0.0, ge=0, description="mg per 100g (thiamin)")
    vitamin_b2: float = Field(0.0, ge=0, description="mg per 100g (riboflavin)")
    vitamin_b3: float = Field(0.0, ge=0, description="mg per 100g (niacin)")
    vitamin_b6: float = Field(0.0, ge=0, description="mg per 100g")
    vitamin_b12: float = Field(0.0, ge=0, description="mcg per 100g")
    folate: float = Field(0.0, ge=0, description="mcg per 100g")
    magnesium: float = Field(0.0, ge=0, description="mg per 100g")
    zinc: float = Field(0.0, ge=0, description="mg per 100g")
    phosphorus: float = Field(0.0, ge=0, description="mg per 100g")


class FoodCreate(FoodBase):
    source: str = Field("manual", max_length=50)
    external_id: Optional[str] = Field(None, max_length=100)
    is_custom: bool = True
    is_favorite: bool = False

    # Optional serving sizes to create with the food
    serving_sizes: Optional[List[ServingSizeCreate]] = None


class FoodUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    brand: Optional[str] = Field(None, max_length=255)
    barcode: Optional[str] = Field(None, max_length=50)
    serving_size: Optional[float] = Field(None, gt=0)
    serving_unit: Optional[str] = Field(None, max_length=50)
    is_favorite: Optional[bool] = None

    # Macros
    calories: Optional[float] = Field(None, ge=0)
    protein: Optional[float] = Field(None, ge=0)
    carbs: Optional[float] = Field(None, ge=0)
    fat: Optional[float] = Field(None, ge=0)
    fiber: Optional[float] = Field(None, ge=0)
    sugar: Optional[float] = Field(None, ge=0)

    # Micros
    sodium: Optional[float] = Field(None, ge=0)
    potassium: Optional[float] = Field(None, ge=0)
    vitamin_a: Optional[float] = Field(None, ge=0)
    vitamin_c: Optional[float] = Field(None, ge=0)
    calcium: Optional[float] = Field(None, ge=0)
    iron: Optional[float] = Field(None, ge=0)
    vitamin_d: Optional[float] = Field(None, ge=0)
    vitamin_e: Optional[float] = Field(None, ge=0)
    vitamin_k: Optional[float] = Field(None, ge=0)
    vitamin_b1: Optional[float] = Field(None, ge=0)
    vitamin_b2: Optional[float] = Field(None, ge=0)
    vitamin_b3: Optional[float] = Field(None, ge=0)
    vitamin_b6: Optional[float] = Field(None, ge=0)
    vitamin_b12: Optional[float] = Field(None, ge=0)
    folate: Optional[float] = Field(None, ge=0)
    magnesium: Optional[float] = Field(None, ge=0)
    zinc: Optional[float] = Field(None, ge=0)
    phosphorus: Optional[float] = Field(None, ge=0)


class FoodResponse(FoodBase):
    id: int
    source: Optional[str]
    external_id: Optional[str]
    is_custom: bool
    is_favorite: bool = False
    created_at: datetime
    updated_at: datetime

    # Multiple serving size options
    serving_sizes: List[ServingSizeInFood] = []

    class Config:
        from_attributes = True
