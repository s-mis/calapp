from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Float, Date, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class FoodLog(Base):
    """
    Food log entry. Supports multiple logging styles:
    1. By grams (amount field)
    2. By serving size (serving_size_id + servings fields)
    3. Quick-add calories (quick_calories field, no food required)
    """
    __tablename__ = "food_logs"
    __table_args__ = (
        # Either: food/recipe/quick-add calories must be set
        CheckConstraint(
            "food_id IS NOT NULL OR recipe_id IS NOT NULL OR quick_calories IS NOT NULL",
            name="check_food_or_recipe_or_quick"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[Optional[str]] = mapped_column(String(20))  # breakfast, lunch, dinner, snack

    # Food/Recipe reference
    food_id: Mapped[Optional[int]] = mapped_column(ForeignKey("foods.id"))
    recipe_id: Mapped[Optional[int]] = mapped_column(ForeignKey("recipes.id"))

    # Amount in grams (used when logging by weight)
    amount: Mapped[Optional[float]] = mapped_column(Float)

    # Serving-based logging (MyFitnessPal style)
    serving_size_id: Mapped[Optional[int]] = mapped_column(ForeignKey("food_serving_sizes.id"))
    servings: Mapped[Optional[float]] = mapped_column(Float)  # e.g., 1.5 servings

    # Quick-add calories (no food required)
    quick_calories: Mapped[Optional[float]] = mapped_column(Float)
    quick_protein: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    quick_carbs: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    quick_fat: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    quick_name: Mapped[Optional[str]] = mapped_column(String(255))  # optional label for quick-add

    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    food: Mapped[Optional["Food"]] = relationship()
    recipe: Mapped[Optional["Recipe"]] = relationship()
    serving_size: Mapped[Optional["FoodServingSize"]] = relationship()
