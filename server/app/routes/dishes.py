from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user
from ..config import get_settings
from ..db import get_database
from ..schemas import DishBase, DishCreate, DishInDB, DishUpdate, Ingredient
from ..schemas import UserPublic

router = APIRouter(prefix="/api/dishes", tags=["dishes"])


def _collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.dishes_collection]


async def _ensure_ingredient_entries(db: AsyncIOMotorDatabase, ingredients: list[Ingredient]) -> None:
    settings = get_settings()
    collection = db[settings.ingredients_collection]
    for ingredient in ingredients:
        name = ingredient.name.strip()
        unit = ingredient.unit.strip()
        key = f"{name.lower()}__{unit.lower()}"
        await collection.update_one(
            {"key": key},
            {
                "$set": {"name": name, "unit": unit},
                "$setOnInsert": {"translations": {}},
            },
            upsert=True,
        )


@router.get("/", response_model=list[DishBase])
async def list_dishes(
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    cursor = _collection(db).find()
    dishes: list[DishBase] = []
    async for doc in cursor:
        dishes.append(DishBase(**DishInDB(**doc).model_dump()))
    return dishes


@router.post("/", response_model=DishBase, status_code=status.HTTP_201_CREATED)
async def create_dish(
    dish: DishCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserPublic = Depends(get_current_user),
):
    data = dish.dict()
    data["_id"] = dish.id
    data["created_by"] = current_user.login
    data["created_by_name"] = current_user.name
    existing = await _collection(db).find_one({"_id": dish.id})
    if existing:
        raise HTTPException(status_code=409, detail="Dish with this id already exists")
    await _collection(db).insert_one(data)
    await _ensure_ingredient_entries(db, dish.ingredients)
    created = await _collection(db).find_one({"_id": dish.id})
    return DishBase(**DishInDB(**created).model_dump())


@router.put("/{dish_id}", response_model=DishBase)
async def update_dish(
    dish_id: str,
    updates: DishUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    payload = {k: v for k, v in updates.dict(exclude_unset=True).items()}
    payload.pop("createdBy", None)
    payload.pop("created_by", None)
    payload.pop("createdByName", None)
    payload.pop("created_by_name", None)
    if not payload:
        doc = await _collection(db).find_one({"_id": dish_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Dish not found")
        return DishBase(**DishInDB(**doc).model_dump())

    result = await _collection(db).find_one_and_update(
        {"_id": dish_id},
        {"$set": payload},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Dish not found")
    if "ingredients" in payload:
        await _ensure_ingredient_entries(db, [Ingredient(**ing) for ing in payload["ingredients"]])
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
