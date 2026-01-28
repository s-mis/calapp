from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, desc

from app.api.deps import get_db
from app.models.food import Food
from app.models.serving_size import FoodServingSize
from app.models.log import FoodLog
from app.schemas.food import FoodCreate, FoodUpdate, FoodResponse
from app.schemas.serving_size import ServingSizeCreate, ServingSizeUpdate, ServingSizeResponse

router = APIRouter()


def load_food_with_servings(query):
    """Add serving sizes relationship to food query."""
    return query.options(joinedload(Food.serving_sizes))


@router.get("", response_model=List[FoodResponse])
def list_foods(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None, min_length=1),
    custom_only: bool = Query(False),
    favorites_only: bool = Query(False),
):
    """List all foods with optional search and filtering."""
    query = load_food_with_servings(db.query(Food))

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Food.name.ilike(search_term),
                Food.brand.ilike(search_term),
                Food.barcode.ilike(search_term),
            )
        )

    if custom_only:
        query = query.filter(Food.is_custom == True)

    if favorites_only:
        query = query.filter(Food.is_favorite == True)

    return query.offset(skip).limit(limit).all()


@router.get("/{food_id}", response_model=FoodResponse)
def get_food(food_id: int, db: Session = Depends(get_db)):
    """Get a specific food by ID."""
    food = load_food_with_servings(db.query(Food)).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    return food


@router.post("", response_model=FoodResponse, status_code=201)
def create_food(food_in: FoodCreate, db: Session = Depends(get_db)):
    """
    Create a new food item with optional serving sizes.

    Example with serving sizes:
    ```json
    {
        "name": "Milk",
        "calories": 42,
        "protein": 3.4,
        "carbs": 5,
        "fat": 1,
        "serving_sizes": [
            {"name": "cup", "grams": 244, "is_default": true},
            {"name": "tbsp", "grams": 15},
            {"name": "fl oz", "grams": 30.6}
        ]
    }
    ```
    """
    # Check for duplicate barcode
    if food_in.barcode:
        existing = db.query(Food).filter(Food.barcode == food_in.barcode).first()
        if existing:
            raise HTTPException(status_code=400, detail="Food with this barcode already exists")

    # Extract serving sizes before creating food
    serving_sizes_data = food_in.serving_sizes
    food_data = food_in.model_dump(exclude={"serving_sizes"})

    food = Food(**food_data)
    db.add(food)
    db.flush()  # Get the food ID

    # Create serving sizes if provided
    if serving_sizes_data:
        for i, ss_data in enumerate(serving_sizes_data):
            serving_size = FoodServingSize(
                food_id=food.id,
                name=ss_data.name,
                grams=ss_data.grams,
                display_name=ss_data.display_name or f"1 {ss_data.name} ({ss_data.grams}g)",
                sort_order=ss_data.sort_order if ss_data.sort_order else i,
                is_default=ss_data.is_default,
            )
            db.add(serving_size)

    db.commit()

    # Reload with serving sizes
    food = load_food_with_servings(db.query(Food)).filter(Food.id == food.id).first()
    return food


@router.put("/{food_id}", response_model=FoodResponse)
def update_food(food_id: int, food_in: FoodUpdate, db: Session = Depends(get_db)):
    """Update a food item."""
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    update_data = food_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(food, field, value)

    db.commit()

    # Reload with serving sizes
    food = load_food_with_servings(db.query(Food)).filter(Food.id == food.id).first()
    return food


@router.delete("/{food_id}", status_code=204)
def delete_food(food_id: int, db: Session = Depends(get_db)):
    """Delete a food item (and its serving sizes via cascade)."""
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    db.delete(food)
    db.commit()
    return None


# ============================================================================
# Serving Size Management
# ============================================================================


@router.get("/{food_id}/serving-sizes", response_model=List[ServingSizeResponse])
def list_serving_sizes(food_id: int, db: Session = Depends(get_db)):
    """Get all serving sizes for a food."""
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    return db.query(FoodServingSize).filter(FoodServingSize.food_id == food_id).order_by(FoodServingSize.sort_order).all()


@router.post("/{food_id}/serving-sizes", response_model=ServingSizeResponse, status_code=201)
def create_serving_size(food_id: int, ss_in: ServingSizeCreate, db: Session = Depends(get_db)):
    """Add a new serving size to a food."""
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    serving_size = FoodServingSize(
        food_id=food_id,
        name=ss_in.name,
        grams=ss_in.grams,
        display_name=ss_in.display_name or f"1 {ss_in.name} ({ss_in.grams}g)",
        sort_order=ss_in.sort_order,
        is_default=ss_in.is_default,
    )

    # If this is set as default, unset other defaults
    if ss_in.is_default:
        db.query(FoodServingSize).filter(
            FoodServingSize.food_id == food_id,
            FoodServingSize.is_default == True
        ).update({"is_default": False})

    db.add(serving_size)
    db.commit()
    db.refresh(serving_size)
    return serving_size


@router.put("/{food_id}/serving-sizes/{serving_size_id}", response_model=ServingSizeResponse)
def update_serving_size(
    food_id: int,
    serving_size_id: int,
    ss_in: ServingSizeUpdate,
    db: Session = Depends(get_db)
):
    """Update a serving size."""
    serving_size = db.query(FoodServingSize).filter(
        FoodServingSize.id == serving_size_id,
        FoodServingSize.food_id == food_id
    ).first()

    if not serving_size:
        raise HTTPException(status_code=404, detail="Serving size not found")

    update_data = ss_in.model_dump(exclude_unset=True)

    # If setting as default, unset other defaults
    if update_data.get("is_default"):
        db.query(FoodServingSize).filter(
            FoodServingSize.food_id == food_id,
            FoodServingSize.id != serving_size_id,
            FoodServingSize.is_default == True
        ).update({"is_default": False})

    for field, value in update_data.items():
        setattr(serving_size, field, value)

    db.commit()
    db.refresh(serving_size)
    return serving_size


@router.delete("/{food_id}/serving-sizes/{serving_size_id}", status_code=204)
def delete_serving_size(food_id: int, serving_size_id: int, db: Session = Depends(get_db)):
    """Delete a serving size."""
    serving_size = db.query(FoodServingSize).filter(
        FoodServingSize.id == serving_size_id,
        FoodServingSize.food_id == food_id
    ).first()

    if not serving_size:
        raise HTTPException(status_code=404, detail="Serving size not found")

    db.delete(serving_size)
    db.commit()
    return None


# ============================================================================
# Favorites
# ============================================================================


@router.post("/{food_id}/favorite", response_model=FoodResponse)
def add_to_favorites(food_id: int, db: Session = Depends(get_db)):
    """Add a food to favorites."""
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    food.is_favorite = True
    db.commit()

    food = load_food_with_servings(db.query(Food)).filter(Food.id == food.id).first()
    return food


@router.delete("/{food_id}/favorite", response_model=FoodResponse)
def remove_from_favorites(food_id: int, db: Session = Depends(get_db)):
    """Remove a food from favorites."""
    food = db.query(Food).filter(Food.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    food.is_favorite = False
    db.commit()

    food = load_food_with_servings(db.query(Food)).filter(Food.id == food.id).first()
    return food


@router.get("/favorites", response_model=List[FoodResponse])
def list_favorites(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """Get all favorite foods."""
    return (
        load_food_with_servings(db.query(Food))
        .filter(Food.is_favorite == True)
        .offset(skip)
        .limit(limit)
        .all()
    )


# ============================================================================
# Recent & Frequent Foods (MyFitnessPal style)
# ============================================================================


@router.get("/recent", response_model=List[FoodResponse])
def list_recent_foods(
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90, description="Number of days to look back"),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get recently logged foods, ordered by most recent first.
    Returns unique foods that were logged in the specified time period.
    """
    cutoff_date = date.today() - timedelta(days=days)

    # Subquery to get distinct food_ids ordered by most recent log
    recent_food_ids = (
        db.query(FoodLog.food_id, func.max(FoodLog.logged_at).label("last_logged"))
        .filter(
            FoodLog.food_id.isnot(None),
            FoodLog.log_date >= cutoff_date
        )
        .group_by(FoodLog.food_id)
        .order_by(desc("last_logged"))
        .limit(limit)
        .subquery()
    )

    foods = (
        load_food_with_servings(db.query(Food))
        .join(recent_food_ids, Food.id == recent_food_ids.c.food_id)
        .order_by(desc(recent_food_ids.c.last_logged))
        .all()
    )

    return foods


@router.get("/frequent", response_model=List[FoodResponse])
def list_frequent_foods(
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get most frequently logged foods, ordered by log count.
    Returns unique foods ranked by how often they were logged.
    """
    cutoff_date = date.today() - timedelta(days=days)

    # Subquery to get food_ids ordered by log count
    frequent_food_ids = (
        db.query(FoodLog.food_id, func.count(FoodLog.id).label("log_count"))
        .filter(
            FoodLog.food_id.isnot(None),
            FoodLog.log_date >= cutoff_date
        )
        .group_by(FoodLog.food_id)
        .order_by(desc("log_count"))
        .limit(limit)
        .subquery()
    )

    foods = (
        load_food_with_servings(db.query(Food))
        .join(frequent_food_ids, Food.id == frequent_food_ids.c.food_id)
        .order_by(desc(frequent_food_ids.c.log_count))
        .all()
    )

    return foods
