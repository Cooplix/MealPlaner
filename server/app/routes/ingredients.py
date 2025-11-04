from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user
from ..config import get_settings
from ..constants import MEASUREMENT_UNITS
from ..db import get_database
from ..schemas import IngredientEntry, IngredientUpsert, UserPublic

router = APIRouter(prefix="/api/ingredients", tags=["ingredients"])


def _collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.ingredients_collection]


def _calories_collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.calories_collection]


def _normalize_key(name: str, unit: str) -> str:
    return f"{name.strip().lower()}__{_sanitize_unit(unit)}"


def _sanitize_unit(value: str) -> str:
    normalized = value.strip().lower()
    for unit in MEASUREMENT_UNITS:
        if normalized == unit:
            return unit
    return MEASUREMENT_UNITS[0]


@router.get("/", response_model=list[IngredientEntry])
async def list_ingredients(
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    coll = _collection(db)
    cursor = coll.find().sort("name", 1)
    items: list[IngredientEntry] = []
    async for doc in cursor:
        db_id = doc.pop("_id", None)
        doc.setdefault("translations", {})
        unit = _sanitize_unit(doc.get("unit", ""))
        if doc.get("unit") != unit and db_id is not None:
            await coll.update_one({"_id": db_id}, {"$set": {"unit": unit}})
        doc["unit"] = unit
        doc.pop("calories_per_unit", None)
        items.append(IngredientEntry(**doc))
    return items


@router.post("/", response_model=IngredientEntry, status_code=status.HTTP_201_CREATED)
async def create_or_update_ingredient(
    payload: IngredientUpsert,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    name = payload.name.strip()
    unit = _sanitize_unit(payload.unit)
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name and unit are required")
    key = _normalize_key(name, unit)
    translations = {k: v.strip() for k, v in (payload.translations or {}).items() if v.strip()}
    coll = _collection(db)
    if await coll.find_one({"key": key}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ingredient already exists")
    doc = {
        "key": key,
        "name": name,
        "unit": unit,
        "translations": translations,
    }
    await coll.insert_one(doc)
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
    unit = _sanitize_unit(payload.unit)
    translations = {k: v.strip() for k, v in (payload.translations or {}).items() if v.strip()}
    new_key = _normalize_key(name, unit)
    coll = _collection(db)
    existing = await coll.find_one({"key": new_key})
    if existing and existing.get("key") != key:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ingredient already exists")
    update_doc = {
        "$set": {
            "name": name,
            "unit": unit,
            "translations": translations,
        }
    }
    if new_key != key:
        update_doc["$set"]["key"] = new_key
    result = await coll.find_one_and_update(
        {"key": key},
        update_doc,
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")
    result.pop("_id", None)
    calories_coll = _calories_collection(db)
    await calories_coll.update_many(
        {"ingredient_key": key},
        {"$set": {"ingredient_key": new_key, "ingredient_name": name}},
    )
    return IngredientEntry(**result)
