from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Float, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.serving_size import FoodServingSize


class Food(Base):
    """
    Food item with nutritional information per 100g.
    All nutritional values are stored per 100 grams.
    """
    __tablename__ = "foods"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(255))
    barcode: Mapped[Optional[str]] = mapped_column(String(50), unique=True)

    # Default serving size in grams (e.g., 60g for a protein bar, 50g for an egg)
    serving_size: Mapped[Optional[float]] = mapped_column(Float)
    serving_unit: Mapped[Optional[str]] = mapped_column(String(50))  # e.g., "bar", "egg", "slice"

    # MyFitnessPal-style features
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)

    # Macros (per 100g)
    calories: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    protein: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    carbs: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    fat: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    fiber: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    sugar: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Micros (per 100g) - all default to 0
    sodium: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    potassium: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_a: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_c: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    calcium: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    iron: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_d: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_e: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_k: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_b1: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_b2: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_b3: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_b6: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vitamin_b12: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    folate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    magnesium: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    zinc: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    phosphorus: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Metadata
    source: Mapped[Optional[str]] = mapped_column(String(50))  # 'manual', 'openfoodfacts', 'usda'
    external_id: Mapped[Optional[str]] = mapped_column(String(100))
    is_custom: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    serving_sizes: Mapped[List["FoodServingSize"]] = relationship(
        back_populates="food",
        cascade="all, delete-orphan",
        order_by="FoodServingSize.sort_order"
    )
