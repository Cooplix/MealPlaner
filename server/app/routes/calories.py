from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user
from ..config import get_settings
from ..constants import MEASUREMENT_UNITS
from ..db import get_database
from ..schemas import CalorieCreate, CalorieEntry, CalorieUpdate, UserPublic

router = APIRouter(prefix="/api/calories", tags=["calories"])


def _collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.calories_collection]


def _ingredients_collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.ingredients_collection]


@router.get("/", response_model=list[CalorieEntry])
async def list_calorie_entries(
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    cursor = _collection(db).find().sort([("ingredient_name", 1), ("unit", 1), ("amount", 1)])
    items: list[CalorieEntry] = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        items.append(CalorieEntry(**doc))
    return items


@router.post("/", response_model=CalorieEntry, status_code=status.HTTP_201_CREATED)
async def create_calorie_entry(
    payload: CalorieCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    unit = payload.unit.strip()
    if unit not in MEASUREMENT_UNITS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported unit")

    ingredient_key = payload.ingredient_key.strip()
    ingredient = await _ingredients_collection(db).find_one({"key": ingredient_key})
    if not ingredient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")

    calories_coll = _collection(db)
    duplicate = await calories_coll.find_one(
        {
            "ingredient_key": ingredient_key,
            "unit": unit,
            "amount": float(payload.amount),
        }
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Calorie entry already exists")

    doc = {
        "ingredient_key": ingredient_key,
        "ingredient_name": ingredient.get("name", ingredient_key).strip() if ingredient.get("name") else ingredient_key,
        "amount": float(payload.amount),
        "unit": unit,
        "calories": float(payload.calories),
    }
    result = await calories_coll.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return CalorieEntry(**doc)


@router.patch("/{entry_id}", response_model=CalorieEntry)
async def update_calorie_entry(
    entry_id: str,
    payload: CalorieUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    try:
        object_id = ObjectId(entry_id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid entry id") from exc

    calories_coll = _collection(db)
    existing = await calories_coll.find_one({"_id": object_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calorie entry not found")

    update_data: dict[str, object] = {}

    ingredient_key = payload.ingredient_key.strip() if payload.ingredient_key else existing.get("ingredient_key")
    if payload.ingredient_key:
        ingredient = await _ingredients_collection(db).find_one({"key": ingredient_key})
        if not ingredient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")
        update_data["ingredient_key"] = ingredient_key
        update_data["ingredient_name"] = (
            ingredient.get("name", ingredient_key).strip()
            if ingredient.get("name")
            else ingredient_key
        )
    else:
        ingredient = None

    if payload.unit:
        unit = payload.unit.strip()
        if unit not in MEASUREMENT_UNITS:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported unit")
        update_data["unit"] = unit

    if payload.amount is not None:
        update_data["amount"] = float(payload.amount)

    if payload.calories is not None:
        update_data["calories"] = float(payload.calories)

    candidate_unit = update_data.get("unit", existing.get("unit"))
    candidate_amount = update_data.get("amount", existing.get("amount"))
    try:
        candidate_amount = float(candidate_amount)
    except (TypeError, ValueError):
        candidate_amount = existing.get("amount")

    duplicate_filter = {
        "ingredient_key": ingredient_key,
        "unit": candidate_unit,
        "amount": candidate_amount,
        "_id": {"$ne": object_id},
    }
    duplicate = await calories_coll.find_one(duplicate_filter)
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Calorie entry already exists")

    if not update_data:
        existing["id"] = entry_id
        return CalorieEntry(**existing)

    result = await calories_coll.find_one_and_update(
        {"_id": object_id},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calorie entry not found")
    result["id"] = entry_id
    return CalorieEntry(**result)
