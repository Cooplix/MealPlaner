from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user
from ..config import get_settings
from ..db import get_database
from ..schemas import DishBase, DishCreate, DishInDB, DishUpdate, Ingredient, UserPublic

router = APIRouter(prefix="/api/dishes", tags=["dishes"])

def _collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.dishes_collection]

def _ingredients_collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.ingredients_collection]

def _to_key(name: str) -> str:
    return "".join(ch.lower() for ch in name.strip() if ch.isalnum() or ch.isspace()).replace(" ", "-")

async def _ensure_ingredient_entries(db: AsyncIOMotorDatabase, ingredients: List[Ingredient]) -> None:
    coll = _ingredients_collection(db)
    for ing in ingredients:
        key = _to_key(ing.name)
        await coll.update_one(
            {"key": key},
            {"$setOnInsert": {"key": key, "name": ing.name.strip(), "unit": ing.unit.strip(), "translations": {}}},
            upsert=True,
        )

@router.get("/", response_model=List[DishBase])
async def list_dishes(
        db: AsyncIOMotorDatabase = Depends(get_database),
        _: UserPublic = Depends(get_current_user),
) -> List[DishBase]:
    cursor = _collection(db).find({}, sort=[("_id", 1)])
    results: List[DishBase] = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(DishBase(**DishInDB(**doc).model_dump()))
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
    # Persist created_by once at creation
    if existing and "created_by" not in existing:
        # keep as is, don't overwrite if someone added it previously
        to_store["created_by"] = existing.get("created_by")
    elif not existing:
        to_store["created_by"] = current_user.login  # store login as the author

    result = await collection.find_one_and_update(
        {"_id": payload.id},
        {"$set": to_store},
        upsert=True,
        return_document=True,
    )
    # ensure ingredients directory has entries
    await _ensure_ingredient_entries(db, [Ingredient(**ing) for ing in result.get("ingredients", [])])
    result["_id"] = str(result["_id"])
    return DishBase(**DishInDB(**result).model_dump())

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
        await _ensure_ingredient_entries(db, [Ingredient(**ing) for ing in update["ingredients"]])
    result = await collection.find_one_and_update(
        {"_id": dish_id},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Dish not found")
    result["_id"] = str(result["_id"])
    return DishBase(**DishInDB(**result).model_dump())

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
