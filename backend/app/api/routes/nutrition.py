from typing import List
from fastapi import APIRouter, Query, HTTPException
import httpx

from app.config import settings

router = APIRouter()


@router.get("/search", response_model=List[dict])
async def search_external_foods(
    q: str = Query(..., min_length=2, description="Search query"),
    source: str = Query("openfoodfacts", pattern="^(openfoodfacts|usda)$"),
    limit: int = Query(20, ge=1, le=50),
):
    """Search for foods in external databases (Open Food Facts or USDA)."""
    if source == "openfoodfacts":
        return await search_openfoodfacts(q, limit)
    else:
        return await search_usda(q, limit)


async def search_openfoodfacts(query: str, limit: int) -> List[dict]:
    """Search Open Food Facts database. Returns nutrition per 100g."""
    # Use API v2 which is more reliable
    url = f"{settings.openfoodfacts_url}/search"
    params = {
        "search_terms": query,
        "page_size": min(limit * 3, 50),  # Get more results to filter
        "json": True,
        "fields": "code,product_name,brands,nutriments,completeness,unique_scans_n",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=15.0)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"External API error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Search error: {str(e)}")

    results = []
    for product in data.get("products", []):
        nutriments = product.get("nutriments", {})
        product_name = product.get("product_name", "").strip()
        
        # Skip products without names or basic nutrition info
        if not product_name or product_name == "Unknown":
            continue
            
        # Skip products without any calories (likely incomplete)
        calories = nutriments.get("energy-kcal_100g", 0) or 0
        if calories == 0:
            continue
            
        # Calculate relevance score (improved text matching)
        query_lower = query.lower()
        name_lower = product_name.lower()
        brand_lower = (product.get("brands") or "").lower()
        
        # Higher score = better match
        relevance_score = 0
        
        # Exact match in name (highest priority)
        if query_lower == name_lower:
            relevance_score += 1000
        # Query is entire name
        elif query_lower in name_lower:
            relevance_score += 500
            # Starts with query
            if name_lower.startswith(query_lower):
                relevance_score += 200
            # Word boundary match (e.g., "kitkat" in "KitKat Chunky")
            if f" {query_lower}" in f" {name_lower}" or name_lower.startswith(query_lower):
                relevance_score += 100
                
        # Check for query words in name
        query_words = query_lower.split()
        name_words = name_lower.split()
        matching_words = sum(1 for qw in query_words if any(qw in nw for nw in name_words))
        relevance_score += matching_words * 50
        
        # Brand matching
        if query_lower == brand_lower:
            relevance_score += 300
        elif query_lower in brand_lower:
            relevance_score += 150
            
        # Bonus for popularity (unique scans)
        unique_scans = product.get("unique_scans_n", 0) or 0
        relevance_score += min(unique_scans / 10, 100)  # Cap at 100 bonus points
        
        # Bonus for completeness (well-documented products)
        completeness = product.get("completeness", 0) or 0
        relevance_score += completeness * 0.5
        
        results.append({
            "external_id": product.get("code"),
            "source": "openfoodfacts",
            "name": product_name,
            "brand": product.get("brands"),
            "barcode": product.get("code"),
            # All values per 100g, default to 0
            "calories": calories,
            "protein": nutriments.get("proteins_100g", 0) or 0,
            "carbs": nutriments.get("carbohydrates_100g", 0) or 0,
            "fat": nutriments.get("fat_100g", 0) or 0,
            "fiber": nutriments.get("fiber_100g", 0) or 0,
            "sugar": nutriments.get("sugars_100g", 0) or 0,
            "sodium": nutriments.get("sodium_100g", 0) or 0,
            "_relevance": relevance_score,  # Internal use for sorting
        })
    
    # Sort by relevance score (highest first)
    results.sort(key=lambda x: x.get("_relevance", 0), reverse=True)
    
    # Remove the internal relevance score and limit results
    for r in results:
        r.pop("_relevance", None)
    
    return results[:limit]


async def search_usda(query: str, limit: int) -> List[dict]:
    """Search USDA FoodData Central database. Returns nutrition per 100g."""
    if not settings.usda_api_key:
        raise HTTPException(status_code=501, detail="USDA API key not configured")

    url = f"{settings.usda_api_url}/foods/search"
    params = {
        "api_key": settings.usda_api_key,
        "query": query,
        "pageSize": limit,
        "dataType": ["Survey (FNDDS)", "Foundation", "SR Legacy"],
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"External API error: {str(e)}")

    results = []
    for food in data.get("foods", []):
        # Extract nutrients by name
        nutrients = {n["nutrientName"]: n.get("value", 0) for n in food.get("foodNutrients", [])}
        results.append({
            "external_id": str(food.get("fdcId")),
            "source": "usda",
            "name": food.get("description", "Unknown"),
            "brand": food.get("brandOwner"),
            "barcode": food.get("gtinUpc"),
            # All values per 100g, default to 0
            "calories": nutrients.get("Energy", 0) or 0,
            "protein": nutrients.get("Protein", 0) or 0,
            "carbs": nutrients.get("Carbohydrate, by difference", 0) or 0,
            "fat": nutrients.get("Total lipid (fat)", 0) or 0,
            "fiber": nutrients.get("Fiber, total dietary", 0) or 0,
            "sugar": nutrients.get("Sugars, total including NLEA", 0) or 0,
            "sodium": nutrients.get("Sodium, Na", 0) or 0,
        })

    return results


@router.get("/barcode/{barcode}", response_model=dict)
async def lookup_barcode(barcode: str):
    """Look up a food by barcode using Open Food Facts. Returns nutrition per 100g."""
    url = f"{settings.openfoodfacts_url}/product/{barcode}"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"External API error: {str(e)}")

    if data.get("status") != 1:
        raise HTTPException(status_code=404, detail="Product not found")

    product = data.get("product", {})
    nutriments = product.get("nutriments", {})

    return {
        "external_id": product.get("code"),
        "source": "openfoodfacts",
        "name": product.get("product_name", "Unknown"),
        "brand": product.get("brands"),
        "barcode": product.get("code"),
        # All values per 100g, default to 0
        "calories": nutriments.get("energy-kcal_100g", 0) or 0,
        "protein": nutriments.get("proteins_100g", 0) or 0,
        "carbs": nutriments.get("carbohydrates_100g", 0) or 0,
        "fat": nutriments.get("fat_100g", 0) or 0,
        "fiber": nutriments.get("fiber_100g", 0) or 0,
        "sugar": nutriments.get("sugars_100g", 0) or 0,
        "sodium": nutriments.get("sodium_100g", 0) or 0,
    }
