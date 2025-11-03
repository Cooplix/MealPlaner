from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user
from ..config import get_settings
from ..db import get_database
from ..schemas import IngredientEntry, IngredientUpsert, UserPublic

router = APIRouter(prefix="/api/ingredients", tags=["ingredients"])


def _collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.ingredients_collection]


@router.get("/", response_model=list[IngredientEntry])
async def list_ingredients(
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    cursor = _collection(db).find().sort("name", 1)
    items: list[IngredientEntry] = []
    async for doc in cursor:
        doc.pop("_id", None)
        doc.setdefault("translations", {})
        items.append(IngredientEntry(**doc))
    return items


@router.post("/", response_model=IngredientEntry, status_code=status.HTTP_201_CREATED)
async def create_or_update_ingredient(
    payload: IngredientUpsert,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    name = payload.name.strip()
    unit = payload.unit.strip()
    if not name or not unit:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name and unit are required")
    key = f"{name.lower()}__{unit.lower()}"
    translations = {k: v.strip() for k, v in (payload.translations or {}).items() if v.strip()}
    update = {
        "$set": {"name": name, "unit": unit, "translations": translations},
        "$setOnInsert": {"key": key},
    }
    await _collection(db).update_one({"key": key}, update, upsert=True)
    doc = await _collection(db).find_one({"key": key})
    if not doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Ingredient upsert failed")
    doc.pop("_id", None)
    return IngredientEntry(**doc)


@router.put("/{key}", response_model=IngredientEntry)
async def update_ingredient_translations(
    key: str,
    payload: IngredientUpsert,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    name = payload.name.strip()
    unit = payload.unit.strip()
    translations = {k: v.strip() for k, v in (payload.translations or {}).items() if v.strip()}
    result = await _collection(db).find_one_and_update(
        {"key": key},
        {"$set": {"name": name, "unit": unit, "translations": translations}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")
    result.pop("_id", None)
    return IngredientEntry(**result)
