from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ServingSizeBase(BaseModel):
    """Base schema for serving sizes."""
    name: str = Field(..., min_length=1, max_length=100, description="e.g., cup, slice, container")
    grams: float = Field(..., gt=0, description="Grams per serving")
    display_name: Optional[str] = Field(None, max_length=100, description="e.g., 1 cup (240g)")
    sort_order: int = Field(0, ge=0)
    is_default: bool = False


class ServingSizeCreate(ServingSizeBase):
    """Schema for creating a serving size."""
    pass


class ServingSizeUpdate(BaseModel):
    """Schema for updating a serving size."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    grams: Optional[float] = Field(None, gt=0)
    display_name: Optional[str] = Field(None, max_length=100)
    sort_order: Optional[int] = Field(None, ge=0)
    is_default: Optional[bool] = None


class ServingSizeResponse(ServingSizeBase):
    """Schema for serving size response."""
    id: int
    food_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ServingSizeInFood(BaseModel):
    """Simplified serving size for inclusion in food responses."""
    id: int
    name: str
    grams: float
    display_name: Optional[str] = None
    is_default: bool = False

    class Config:
        from_attributes = True
