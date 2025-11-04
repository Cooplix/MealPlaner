from typing import Dict, List, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user
from ..config import get_settings
from ..constants import MEASUREMENT_UNITS
from ..db import get_database
from ..schemas import DishBase, DishCreate, DishInDB, DishUpdate, Ingredient, UserPublic

router = APIRouter(prefix="/api/dishes", tags=["dishes"])


def _coerce_unit(value: str) -> str:
    unit = value.strip().lower()
    if unit in MEASUREMENT_UNITS:
        return unit
    return MEASUREMENT_UNITS[0]


def _ingredient_key(name: str, unit: str) -> str:
    return f"{name.strip().lower()}__{_coerce_unit(unit)}"


def _collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.dishes_collection]

def _ingredients_collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.ingredients_collection]


def _calories_collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.calories_collection]

def _normalize_ingredients(raw: List[dict]) -> List[Ingredient]:
    normalized: List[Ingredient] = []
    for item in raw or []:
        ingredient = Ingredient.model_validate(item)
        unit = _coerce_unit(ingredient.unit)
        qty = float(ingredient.qty) if ingredient.qty is not None else 0.0
        normalized.append(
            Ingredient(
                name=ingredient.name.strip(),
                unit=unit,
                qty=max(qty, 0.0),
            )
        )
    return normalized

def _serialize_dish(doc: dict) -> DishBase:
    document = dict(doc)
    document["_id"] = str(document["_id"])
    ingredients = _normalize_ingredients(document.get("ingredients", []))
    document["ingredients"] = [ingredient.model_dump(by_alias=False) for ingredient in ingredients]
    document["calories"] = float(document.get("calories") or 0)
    return DishBase(**DishInDB(**document).model_dump())

async def _ensure_ingredient_entries(db: AsyncIOMotorDatabase, ingredients: List[Ingredient]) -> None:
    coll = _ingredients_collection(db)
    for ing in ingredients:
        key = _ingredient_key(ing.name, ing.unit)
        updates: dict[str, dict] = {
            "$setOnInsert": {
                "key": key,
                "translations": {},
            }
        }
        set_payload = updates.setdefault("$set", {})
        set_payload["name"] = ing.name.strip()
        set_payload["unit"] = _coerce_unit(ing.unit)
        await coll.update_one(
            {"key": key},
            updates,
            upsert=True,
        )


async def _compute_dish_calories(
    db: AsyncIOMotorDatabase, ingredients: List[Ingredient]
) -> float:
    if not ingredients:
        return 0.0

    keys = {_ingredient_key(ing.name, ing.unit) for ing in ingredients}
    mapping: Dict[Tuple[str, str], List[dict]] = {}
    cursor = _calories_collection(db).find({"ingredient_key": {"$in": list(keys)}})
    async for doc in cursor:
        bucket = mapping.setdefault((doc["ingredient_key"], _coerce_unit(doc["unit"])), [])
        bucket.append(doc)

    total = 0.0
    for ingredient in ingredients:
        key = _ingredient_key(ingredient.name, ingredient.unit)
        candidates = mapping.get((key, ingredient.unit))
        if not candidates:
            continue
        # prefer entries with larger reference amount to minimise rounding noise
        candidates = [entry for entry in candidates if entry.get("amount", 0) > 0]
        if not candidates:
            continue
        entry = max(candidates, key=lambda item: item.get("amount", 0))
        amount = float(entry.get("amount", 0))
        calories = float(entry.get("calories", 0))
        if amount <= 0:
            continue
        total += (ingredient.qty / amount) * calories
    return float(total)

@router.get("/", response_model=List[DishBase])
async def list_dishes(
        db: AsyncIOMotorDatabase = Depends(get_database),
        _: UserPublic = Depends(get_current_user),
) -> List[DishBase]:
    cursor = _collection(db).find({}, sort=[("_id", 1)])
    results: List[DishBase] = []
    async for doc in cursor:
        results.append(_serialize_dish(doc))
    return results

@router.post("/", response_model=DishBase, status_code=status.HTTP_201_CREATED)
async def upsert_dish(
        payload: DishCreate,
        db: AsyncIOMotorDatabase = Depends(get_database),
        current_user: UserPublic = Depends(get_current_user),
) -> DishBase:
    collection = _collection(db)
    existing = await collection.find_one({"_id": payload.id})
    to_store = payload.model_dump()
    to_store.pop("calories", None)
    # Persist created_by once at creation
    if existing and "created_by" not in existing:
        # keep as is, don't overwrite if someone added it previously
        to_store["created_by"] = existing.get("created_by")
    elif not existing:
        to_store["created_by"] = current_user.login  # store login as the author

    ingredients = _normalize_ingredients(to_store.get("ingredients", []))
    to_store["ingredients"] = [ingredient.model_dump(by_alias=False) for ingredient in ingredients]
    to_store["calories"] = await _compute_dish_calories(db, ingredients)

    result = await collection.find_one_and_update(
        {"_id": payload.id},
        {"$set": to_store},
        upsert=True,
        return_document=True,
    )
    # ensure ingredients directory has entries
    await _ensure_ingredient_entries(db, ingredients)
    return _serialize_dish(result)

@router.patch("/{dish_id}", response_model=DishBase)
async def update_dish(
        dish_id: str,
        payload: DishUpdate,
        db: AsyncIOMotorDatabase = Depends(get_database),
        _: UserPublic = Depends(get_current_user),
) -> DishBase:
    collection = _collection(db)
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if "ingredients" in update and isinstance(update["ingredients"], list):
        ingredients = _normalize_ingredients(update["ingredients"])
        update["ingredients"] = [ingredient.model_dump(by_alias=False) for ingredient in ingredients]
        update["calories"] = await _compute_dish_calories(db, ingredients)
        await _ensure_ingredient_entries(db, ingredients)
    else:
        update.pop("calories", None)
    result = await collection.find_one_and_update(
        {"_id": dish_id},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Dish not found")
    return _serialize_dish(result)

@router.delete("/{dish_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dish(
        dish_id: str,
        db: AsyncIOMotorDatabase = Depends(get_database),
        _: UserPublic = Depends(get_current_user),
):
    outcome = await _collection(db).delete_one({"_id": dish_id})
    if outcome.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dish not found")
    return None
