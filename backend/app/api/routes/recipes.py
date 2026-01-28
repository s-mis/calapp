from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db
from app.models.recipe import Recipe, RecipeIngredient
from app.models.food import Food
from app.schemas.recipe import RecipeCreate, RecipeUpdate, RecipeResponse, NutritionSummary

router = APIRouter()


def calculate_recipe_nutrition(recipe: Recipe) -> tuple[NutritionSummary, NutritionSummary]:
    """
    Calculate total and per-serving nutrition for a recipe.
    All food nutrition values are per 100g, so we calculate based on ingredient amount.
    """
    total = NutritionSummary()

    for ingredient in recipe.ingredients:
        food = ingredient.food
        if not food:
            continue

        # Calculate nutrition: (amount in grams / 100) * nutrition per 100g
        ratio = ingredient.amount / 100.0

        total.calories += food.calories * ratio
        total.protein += food.protein * ratio
        total.carbs += food.carbs * ratio
        total.fat += food.fat * ratio
        total.fiber += food.fiber * ratio
        total.sugar += food.sugar * ratio
        total.sodium += food.sodium * ratio
        total.potassium += food.potassium * ratio

    # Round values
    for field in ["calories", "protein", "carbs", "fat", "fiber", "sugar", "sodium", "potassium"]:
        setattr(total, field, round(getattr(total, field), 1))

    # Calculate per serving
    servings = recipe.servings if recipe.servings > 0 else 1
    per_serving = NutritionSummary(
        calories=round(total.calories / servings, 1),
        protein=round(total.protein / servings, 1),
        carbs=round(total.carbs / servings, 1),
        fat=round(total.fat / servings, 1),
        fiber=round(total.fiber / servings, 1),
        sugar=round(total.sugar / servings, 1),
        sodium=round(total.sodium / servings, 1),
        potassium=round(total.potassium / servings, 1),
    )

    return total, per_serving


@router.get("", response_model=List[RecipeResponse])
def list_recipes(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None, min_length=1),
):
    """List all recipes."""
    query = db.query(Recipe).options(
        joinedload(Recipe.ingredients).joinedload(RecipeIngredient.food)
    )

    if search:
        search_term = f"%{search}%"
        query = query.filter(Recipe.name.ilike(search_term))

    recipes = query.offset(skip).limit(limit).all()

    # Calculate nutrition for each recipe
    result = []
    for recipe in recipes:
        total_nutrition, per_serving_nutrition = calculate_recipe_nutrition(recipe)
        recipe_dict = RecipeResponse.model_validate(recipe).model_dump()
        recipe_dict["total_nutrition"] = total_nutrition
        recipe_dict["per_serving_nutrition"] = per_serving_nutrition
        result.append(RecipeResponse(**recipe_dict))

    return result


@router.get("/{recipe_id}", response_model=RecipeResponse)
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    """Get a specific recipe by ID with calculated nutrition."""
    recipe = (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredients).joinedload(RecipeIngredient.food))
        .filter(Recipe.id == recipe_id)
        .first()
    )

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    total_nutrition, per_serving_nutrition = calculate_recipe_nutrition(recipe)
    recipe_dict = RecipeResponse.model_validate(recipe).model_dump()
    recipe_dict["total_nutrition"] = total_nutrition
    recipe_dict["per_serving_nutrition"] = per_serving_nutrition

    return RecipeResponse(**recipe_dict)


@router.post("", response_model=RecipeResponse, status_code=201)
def create_recipe(recipe_in: RecipeCreate, db: Session = Depends(get_db)):
    """Create a new recipe with ingredients."""
    # Verify all food IDs exist
    food_ids = [ing.food_id for ing in recipe_in.ingredients]
    if food_ids:
        existing_foods = db.query(Food.id).filter(Food.id.in_(food_ids)).all()
        existing_ids = {f.id for f in existing_foods}
        missing = set(food_ids) - existing_ids
        if missing:
            raise HTTPException(status_code=400, detail=f"Foods not found: {missing}")

    # Create recipe
    recipe_data = recipe_in.model_dump(exclude={"ingredients"})
    recipe = Recipe(**recipe_data)
    db.add(recipe)
    db.flush()

    # Create ingredients
    for ing_data in recipe_in.ingredients:
        ingredient = RecipeIngredient(
            recipe_id=recipe.id,
            food_id=ing_data.food_id,
            amount=ing_data.amount,
            order_index=ing_data.order_index,
        )
        db.add(ingredient)

    db.commit()
    db.refresh(recipe)

    # Load relationships and calculate nutrition
    recipe = (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredients).joinedload(RecipeIngredient.food))
        .filter(Recipe.id == recipe.id)
        .first()
    )

    total_nutrition, per_serving_nutrition = calculate_recipe_nutrition(recipe)
    recipe_dict = RecipeResponse.model_validate(recipe).model_dump()
    recipe_dict["total_nutrition"] = total_nutrition
    recipe_dict["per_serving_nutrition"] = per_serving_nutrition

    return RecipeResponse(**recipe_dict)


@router.put("/{recipe_id}", response_model=RecipeResponse)
def update_recipe(recipe_id: int, recipe_in: RecipeUpdate, db: Session = Depends(get_db)):
    """Update a recipe."""
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    update_data = recipe_in.model_dump(exclude_unset=True, exclude={"ingredients"})
    for field, value in update_data.items():
        setattr(recipe, field, value)

    # Update ingredients if provided
    if recipe_in.ingredients is not None:
        # Verify all food IDs exist
        food_ids = [ing.food_id for ing in recipe_in.ingredients]
        if food_ids:
            existing_foods = db.query(Food.id).filter(Food.id.in_(food_ids)).all()
            existing_ids = {f.id for f in existing_foods}
            missing = set(food_ids) - existing_ids
            if missing:
                raise HTTPException(status_code=400, detail=f"Foods not found: {missing}")

        # Delete existing ingredients and create new ones
        db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe_id).delete()

        for ing_data in recipe_in.ingredients:
            ingredient = RecipeIngredient(
                recipe_id=recipe.id,
                food_id=ing_data.food_id,
                amount=ing_data.amount,
                order_index=ing_data.order_index,
            )
            db.add(ingredient)

    db.commit()
    db.refresh(recipe)

    # Load relationships and calculate nutrition
    recipe = (
        db.query(Recipe)
        .options(joinedload(Recipe.ingredients).joinedload(RecipeIngredient.food))
        .filter(Recipe.id == recipe.id)
        .first()
    )

    total_nutrition, per_serving_nutrition = calculate_recipe_nutrition(recipe)
    recipe_dict = RecipeResponse.model_validate(recipe).model_dump()
    recipe_dict["total_nutrition"] = total_nutrition
    recipe_dict["per_serving_nutrition"] = per_serving_nutrition

    return RecipeResponse(**recipe_dict)


@router.delete("/{recipe_id}", status_code=204)
def delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    """Delete a recipe."""
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db.delete(recipe)
    db.commit()
    return None
