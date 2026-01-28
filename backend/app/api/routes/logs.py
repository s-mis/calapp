from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.api.deps import get_db
from app.models.log import FoodLog
from app.models.food import Food
from app.models.serving_size import FoodServingSize
from app.models.recipe import Recipe, RecipeIngredient
from app.schemas.log import FoodLogCreate, FoodLogUpdate, FoodLogResponse, DailySummary

router = APIRouter()


def get_amount_in_grams(log: FoodLog) -> float:
    """
    Calculate the amount in grams for a log entry.
    Supports both direct gram amounts and serving-based logging.
    """
    if log.amount is not None:
        return log.amount

    if log.serving_size_id is not None and log.servings is not None:
        if log.serving_size:
            return log.serving_size.grams * log.servings

    return 0.0


def calculate_log_nutrition(log: FoodLog) -> dict:
    """
    Calculate nutrition for a single log entry.
    Supports:
    1. Food/Recipe by grams
    2. Food by serving size
    3. Quick-add calories
    """
    nutrition = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "amount_in_grams": 0.0}

    # Quick-add: use the quick values directly
    if log.quick_calories is not None:
        nutrition["calories"] = round(log.quick_calories, 1)
        nutrition["protein"] = round(log.quick_protein or 0.0, 1)
        nutrition["carbs"] = round(log.quick_carbs or 0.0, 1)
        nutrition["fat"] = round(log.quick_fat or 0.0, 1)
        return nutrition

    # Get amount in grams (either direct or calculated from servings)
    amount_grams = get_amount_in_grams(log)
    nutrition["amount_in_grams"] = round(amount_grams, 1)

    if log.food:
        # Direct food entry: (amount / 100) * nutrition per 100g
        food = log.food
        ratio = amount_grams / 100.0

        nutrition["calories"] = round(food.calories * ratio, 1)
        nutrition["protein"] = round(food.protein * ratio, 1)
        nutrition["carbs"] = round(food.carbs * ratio, 1)
        nutrition["fat"] = round(food.fat * ratio, 1)

    elif log.recipe:
        # Recipe entry - first calculate total recipe nutrition
        recipe = log.recipe
        total_cals = total_protein = total_carbs = total_fat = 0.0
        total_weight = 0.0

        for ingredient in recipe.ingredients:
            food = ingredient.food
            if not food:
                continue
            ratio = ingredient.amount / 100.0
            total_cals += food.calories * ratio
            total_protein += food.protein * ratio
            total_carbs += food.carbs * ratio
            total_fat += food.fat * ratio
            total_weight += ingredient.amount

        # Calculate nutrition for the logged amount
        if total_weight > 0:
            proportion = amount_grams / total_weight
            nutrition["calories"] = round(total_cals * proportion, 1)
            nutrition["protein"] = round(total_protein * proportion, 1)
            nutrition["carbs"] = round(total_carbs * proportion, 1)
            nutrition["fat"] = round(total_fat * proportion, 1)

    return nutrition


def load_log_relationships(query):
    """Add all necessary relationship joins to a FoodLog query."""
    return query.options(
        joinedload(FoodLog.food).joinedload(Food.serving_sizes),
        joinedload(FoodLog.recipe).joinedload(Recipe.ingredients).joinedload(RecipeIngredient.food),
        joinedload(FoodLog.serving_size),
    )


def build_log_response(log: FoodLog) -> FoodLogResponse:
    """Build a FoodLogResponse with calculated nutrition."""
    nutrition = calculate_log_nutrition(log)
    log_dict = FoodLogResponse.model_validate(log).model_dump()
    log_dict.update(nutrition)
    return FoodLogResponse(**log_dict)


@router.get("", response_model=List[FoodLogResponse])
def list_logs(
    db: Session = Depends(get_db),
    log_date: date = Query(..., description="Date to get logs for"),
    meal_type: str = Query(None, pattern="^(breakfast|lunch|dinner|snack)$"),
):
    """Get all food logs for a specific date."""
    query = load_log_relationships(db.query(FoodLog)).filter(FoodLog.log_date == log_date)

    if meal_type:
        query = query.filter(FoodLog.meal_type == meal_type)

    logs = query.order_by(FoodLog.logged_at).all()

    return [build_log_response(log) for log in logs]


@router.get("/summary", response_model=DailySummary)
def get_daily_summary(
    db: Session = Depends(get_db),
    log_date: date = Query(..., description="Date to get summary for"),
):
    """Get a nutrition summary for a specific date."""
    logs = load_log_relationships(db.query(FoodLog)).filter(FoodLog.log_date == log_date).all()

    summary = DailySummary(date=log_date)

    for log in logs:
        nutrition = calculate_log_nutrition(log)
        summary.total_calories += nutrition["calories"]
        summary.total_protein += nutrition["protein"]
        summary.total_carbs += nutrition["carbs"]
        summary.total_fat += nutrition["fat"]
        summary.entries_count += 1

        # Track by meal type
        if log.meal_type == "breakfast":
            summary.breakfast_calories += nutrition["calories"]
        elif log.meal_type == "lunch":
            summary.lunch_calories += nutrition["calories"]
        elif log.meal_type == "dinner":
            summary.dinner_calories += nutrition["calories"]
        elif log.meal_type == "snack":
            summary.snack_calories += nutrition["calories"]

    # Round totals
    summary.total_calories = round(summary.total_calories, 1)
    summary.total_protein = round(summary.total_protein, 1)
    summary.total_carbs = round(summary.total_carbs, 1)
    summary.total_fat = round(summary.total_fat, 1)

    return summary


@router.post("", response_model=FoodLogResponse, status_code=201)
def create_log(log_in: FoodLogCreate, db: Session = Depends(get_db)):
    """
    Create a new food log entry.

    Supports three logging styles:
    1. By grams: food_id/recipe_id + amount
    2. By serving: food_id + serving_size_id + servings
    3. Quick-add: quick_calories (+ optional quick_protein, quick_carbs, quick_fat, quick_name)
    """
    # Verify food exists
    if log_in.food_id:
        food = db.query(Food).filter(Food.id == log_in.food_id).first()
        if not food:
            raise HTTPException(status_code=400, detail="Food not found")

    # Verify recipe exists
    if log_in.recipe_id:
        recipe = db.query(Recipe).filter(Recipe.id == log_in.recipe_id).first()
        if not recipe:
            raise HTTPException(status_code=400, detail="Recipe not found")

    # Verify serving size exists and belongs to the food
    if log_in.serving_size_id:
        serving_size = db.query(FoodServingSize).filter(FoodServingSize.id == log_in.serving_size_id).first()
        if not serving_size:
            raise HTTPException(status_code=400, detail="Serving size not found")
        if log_in.food_id and serving_size.food_id != log_in.food_id:
            raise HTTPException(status_code=400, detail="Serving size does not belong to the specified food")

    log = FoodLog(**log_in.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)

    # Load relationships
    log = load_log_relationships(db.query(FoodLog)).filter(FoodLog.id == log.id).first()

    return build_log_response(log)


@router.put("/{log_id}", response_model=FoodLogResponse)
def update_log(log_id: int, log_in: FoodLogUpdate, db: Session = Depends(get_db)):
    """Update a food log entry."""
    log = db.query(FoodLog).filter(FoodLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    update_data = log_in.model_dump(exclude_unset=True)

    # Verify food exists if being updated
    if "food_id" in update_data and update_data["food_id"]:
        food = db.query(Food).filter(Food.id == update_data["food_id"]).first()
        if not food:
            raise HTTPException(status_code=400, detail="Food not found")

    # Verify recipe exists if being updated
    if "recipe_id" in update_data and update_data["recipe_id"]:
        recipe = db.query(Recipe).filter(Recipe.id == update_data["recipe_id"]).first()
        if not recipe:
            raise HTTPException(status_code=400, detail="Recipe not found")

    # Verify serving size exists if being updated
    if "serving_size_id" in update_data and update_data["serving_size_id"]:
        serving_size = db.query(FoodServingSize).filter(FoodServingSize.id == update_data["serving_size_id"]).first()
        if not serving_size:
            raise HTTPException(status_code=400, detail="Serving size not found")

    for field, value in update_data.items():
        setattr(log, field, value)

    db.commit()
    db.refresh(log)

    # Load relationships
    log = load_log_relationships(db.query(FoodLog)).filter(FoodLog.id == log.id).first()

    return build_log_response(log)


@router.delete("/{log_id}", status_code=204)
def delete_log(log_id: int, db: Session = Depends(get_db)):
    """Delete a food log entry."""
    log = db.query(FoodLog).filter(FoodLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")

    db.delete(log)
    db.commit()
    return None


# ============================================================================
# MyFitnessPal-style features
# ============================================================================


@router.post("/copy-meal", response_model=List[FoodLogResponse], status_code=201)
def copy_meal(
    db: Session = Depends(get_db),
    source_date: date = Query(..., description="Date to copy from"),
    source_meal: str = Query(..., pattern="^(breakfast|lunch|dinner|snack)$"),
    target_date: date = Query(..., description="Date to copy to"),
    target_meal: Optional[str] = Query(None, pattern="^(breakfast|lunch|dinner|snack)$"),
):
    """
    Copy all log entries from one meal to another.
    If target_meal is not specified, copies to the same meal type.
    """
    if target_meal is None:
        target_meal = source_meal

    # Get source logs
    source_logs = (
        load_log_relationships(db.query(FoodLog))
        .filter(FoodLog.log_date == source_date, FoodLog.meal_type == source_meal)
        .all()
    )

    if not source_logs:
        raise HTTPException(status_code=404, detail="No logs found for the source meal")

    # Create copies
    new_logs = []
    for source_log in source_logs:
        new_log = FoodLog(
            log_date=target_date,
            meal_type=target_meal,
            food_id=source_log.food_id,
            recipe_id=source_log.recipe_id,
            amount=source_log.amount,
            serving_size_id=source_log.serving_size_id,
            servings=source_log.servings,
            quick_calories=source_log.quick_calories,
            quick_protein=source_log.quick_protein,
            quick_carbs=source_log.quick_carbs,
            quick_fat=source_log.quick_fat,
            quick_name=source_log.quick_name,
        )
        db.add(new_log)
        new_logs.append(new_log)

    db.commit()

    # Reload with relationships
    new_log_ids = [log.id for log in new_logs]
    loaded_logs = (
        load_log_relationships(db.query(FoodLog))
        .filter(FoodLog.id.in_(new_log_ids))
        .order_by(FoodLog.logged_at)
        .all()
    )

    return [build_log_response(log) for log in loaded_logs]


@router.post("/copy-day", response_model=List[FoodLogResponse], status_code=201)
def copy_day(
    db: Session = Depends(get_db),
    source_date: date = Query(..., description="Date to copy from"),
    target_date: date = Query(..., description="Date to copy to"),
):
    """Copy all log entries from one day to another."""
    # Get source logs
    source_logs = (
        load_log_relationships(db.query(FoodLog))
        .filter(FoodLog.log_date == source_date)
        .all()
    )

    if not source_logs:
        raise HTTPException(status_code=404, detail="No logs found for the source date")

    # Create copies
    new_logs = []
    for source_log in source_logs:
        new_log = FoodLog(
            log_date=target_date,
            meal_type=source_log.meal_type,
            food_id=source_log.food_id,
            recipe_id=source_log.recipe_id,
            amount=source_log.amount,
            serving_size_id=source_log.serving_size_id,
            servings=source_log.servings,
            quick_calories=source_log.quick_calories,
            quick_protein=source_log.quick_protein,
            quick_carbs=source_log.quick_carbs,
            quick_fat=source_log.quick_fat,
            quick_name=source_log.quick_name,
        )
        db.add(new_log)
        new_logs.append(new_log)

    db.commit()

    # Reload with relationships
    new_log_ids = [log.id for log in new_logs]
    loaded_logs = (
        load_log_relationships(db.query(FoodLog))
        .filter(FoodLog.id.in_(new_log_ids))
        .order_by(FoodLog.meal_type, FoodLog.logged_at)
        .all()
    )

    return [build_log_response(log) for log in loaded_logs]


@router.post("/multi-add", response_model=List[FoodLogResponse], status_code=201)
def multi_add_logs(
    logs_in: List[FoodLogCreate],
    db: Session = Depends(get_db),
):
    """
    Add multiple food log entries at once.
    Useful for logging an entire meal quickly.
    """
    if not logs_in:
        raise HTTPException(status_code=400, detail="At least one log entry is required")

    if len(logs_in) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 entries per request")

    # Validate all entries first
    for log_in in logs_in:
        if log_in.food_id:
            food = db.query(Food).filter(Food.id == log_in.food_id).first()
            if not food:
                raise HTTPException(status_code=400, detail=f"Food with id {log_in.food_id} not found")

        if log_in.recipe_id:
            recipe = db.query(Recipe).filter(Recipe.id == log_in.recipe_id).first()
            if not recipe:
                raise HTTPException(status_code=400, detail=f"Recipe with id {log_in.recipe_id} not found")

        if log_in.serving_size_id:
            serving_size = db.query(FoodServingSize).filter(FoodServingSize.id == log_in.serving_size_id).first()
            if not serving_size:
                raise HTTPException(status_code=400, detail=f"Serving size with id {log_in.serving_size_id} not found")

    # Create all logs
    new_logs = []
    for log_in in logs_in:
        log = FoodLog(**log_in.model_dump())
        db.add(log)
        new_logs.append(log)

    db.commit()

    # Reload with relationships
    new_log_ids = [log.id for log in new_logs]
    loaded_logs = (
        load_log_relationships(db.query(FoodLog))
        .filter(FoodLog.id.in_(new_log_ids))
        .order_by(FoodLog.logged_at)
        .all()
    )

    return [build_log_response(log) for log in loaded_logs]
