from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class FoodServingSize(Base):
    """
    Serving size options for a food item.
    Allows multiple serving sizes per food (e.g., 1 cup, 1 tbsp, 1 slice).
    """
    __tablename__ = "food_serving_sizes"

    id: Mapped[int] = mapped_column(primary_key=True)
    food_id: Mapped[int] = mapped_column(ForeignKey("foods.id", ondelete="CASCADE"), nullable=False)

    # Serving definition
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "cup", "slice", "container"
    grams: Mapped[float] = mapped_column(Float, nullable=False)  # grams per serving

    # Optional: for display purposes
    display_name: Mapped[str | None] = mapped_column(String(100))  # e.g., "1 cup (240g)"

    # Order for display (lower = shown first)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    # Is this the default/primary serving size?
    is_default: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship back to food
    food: Mapped["Food"] = relationship(back_populates="serving_sizes")
