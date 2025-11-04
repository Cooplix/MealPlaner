import logging
import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import hash_password
from ..config import get_settings
from ..constants import MEASUREMENT_UNITS


def _normalize_key(name: str, unit: str) -> str:
    return f"{name.strip().lower()}__{unit.strip().lower()}"


def _sanitize_unit(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in MEASUREMENT_UNITS:
        return normalized
    return MEASUREMENT_UNITS[0]

async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    settings = get_settings()
    await db[settings.users_collection].create_index("login", unique=True)
    await db[settings.ingredients_collection].create_index("key", unique=True)
    await db[settings.dishes_collection].create_index("created_by", name="idx_dishes_created_by", sparse=True)

async def ensure_admin_user(db: AsyncIOMotorDatabase) -> None:
    settings = get_settings()
    admin_login = settings.admin_login
    collection = db[settings.users_collection]

    existing = await collection.find_one({"login": admin_login})
    if existing:
        logging.info("Admin user '%s' already exists", admin_login)
        return

    initial_password: Optional[str] = os.getenv("ADMIN_INITIAL_PASSWORD")
    if not initial_password:
        logging.warning(
            "ADMIN_INITIAL_PASSWORD not set; cannot create admin user '%s' automatically.",
            admin_login,
        )
        return

    doc = {
        "login": admin_login,
        "name": "Administrator",
        "hashed_password": hash_password(initial_password),
        "is_admin": True,
    }
    await collection.insert_one(doc)
    logging.info("Created initial admin user '%s'", admin_login)


async def ensure_calorie_fields(db: AsyncIOMotorDatabase) -> None:
    settings = get_settings()
    ingredients_collection = db[settings.ingredients_collection]
    dishes_collection = db[settings.dishes_collection]
    calories_collection = db[settings.calories_collection]

    await calories_collection.create_index(
        [("ingredient_key", 1), ("unit", 1), ("amount", 1)],
        unique=True,
        name="idx_calories_unique",
    )

    async for ingredient in ingredients_collection.find({}):
        name = ingredient.get("name", "").strip()
        unit = _sanitize_unit(ingredient.get("unit", ""))
        key = ingredient.get("key") or _normalize_key(name, unit)
        translations = ingredient.get("translations") or {}

        updates = {"key": key, "translations": translations}
        # migrate legacy per-unit calories into dedicated collection if possible
        raw_calories = ingredient.get("calories_per_unit") or ingredient.get("caloriesPerUnit")
        try:
            calories_value = float(raw_calories)
        except (TypeError, ValueError):
            calories_value = 0.0
        calories_value = max(calories_value, 0.0)
        if calories_value > 0 and unit in MEASUREMENT_UNITS:
            await calories_collection.update_one(
                {
                    "ingredient_key": key,
                    "unit": unit,
                    "amount": 1.0,
                },
                {
                    "$setOnInsert": {
                        "ingredient_name": name or key,
                        "calories": calories_value,
                    }
                },
                upsert=True,
            )

            await ingredients_collection.update_one(
                {"_id": ingredient["_id"]},
                {
                    "$set": {**updates, "unit": unit},
                    "$unset": {"calories_per_unit": "", "caloriesPerUnit": ""},
                },
            )

    async for dish in dishes_collection.find({"ingredients": {"$exists": True}}):
        ingredients = dish.get("ingredients") or []
        updated_ingredients = []
        modified = False
        for ingredient in ingredients:
            if "calories_per_unit" in ingredient or "caloriesPerUnit" in ingredient:
                ingredient = dict(ingredient)
                ingredient.pop("calories_per_unit", None)
                ingredient.pop("caloriesPerUnit", None)
                modified = True
            updated_ingredients.append(ingredient)

        if modified:
            await dishes_collection.update_one(
                {"_id": dish["_id"]},
                {"$set": {"ingredients": updated_ingredients}},
            )
