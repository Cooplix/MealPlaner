import logging
import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import hash_password
from ..config import get_settings
from ..constants import MEASUREMENT_UNITS


def _normalize_key(name: str, unit: str) -> str:
    return f"{name.strip().lower()}__{_sanitize_unit(unit)}"


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


SEED_INGREDIENTS: list[dict] = [
    {
        "name": "Chicken breast, skinless",
        "unit": "g",
        "translations": {"uk": "Куряче філе без шкіри", "pl": "Pierś z kurczaka bez skóry"},
        "calories": [{"amount": 100, "unit": "g", "calories": 165}],
    },
    {
        "name": "Salmon fillet",
        "unit": "g",
        "translations": {"uk": "Лосось філе", "pl": "Filet z łososia"},
        "calories": [{"amount": 100, "unit": "g", "calories": 208}],
    },
    {
        "name": "Brown rice (dry)",
        "unit": "g",
        "translations": {"uk": "Коричневий рис (сухий)", "pl": "Ryż brązowy (suchy)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 370}],
    },
    {
        "name": "Quinoa (dry)",
        "unit": "g",
        "translations": {"uk": "Кіноа (суха)", "pl": "Komosa ryżowa (sucha)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 368}],
    },
    {
        "name": "Broccoli",
        "unit": "g",
        "translations": {"uk": "Броколі", "pl": "Brokuł"},
        "calories": [{"amount": 100, "unit": "g", "calories": 34}],
    },
    {
        "name": "Carrot",
        "unit": "g",
        "translations": {"uk": "Морква", "pl": "Marchew"},
        "calories": [{"amount": 100, "unit": "g", "calories": 41}],
    },
    {
        "name": "Banana",
        "unit": "pcs",
        "translations": {"uk": "Банан", "pl": "Banan"},
        "calories": [{"amount": 1, "unit": "pcs", "calories": 105}],
    },
    {
        "name": "Egg (large)",
        "unit": "pcs",
        "translations": {"uk": "Яйце (велике)", "pl": "Jajko (duże)"},
        "calories": [{"amount": 1, "unit": "pcs", "calories": 72}],
    },
    {
        "name": "Olive oil",
        "unit": "tbsp",
        "translations": {"uk": "Оливкова олія", "pl": "Oliwa z oliwek"},
        "calories": [{"amount": 1, "unit": "tbsp", "calories": 119}],
    },
    {
        "name": "Almonds",
        "unit": "g",
        "translations": {"uk": "Мигдаль", "pl": "Migdały"},
        "calories": [{"amount": 100, "unit": "g", "calories": 579}],
    },
    {
        "name": "Greek yogurt, plain",
        "unit": "g",
        "translations": {"uk": "Грецький йогурт, натуральний", "pl": "Jogurt grecki naturalny"},
        "calories": [{"amount": 100, "unit": "g", "calories": 97}],
    },
    {
        "name": "Cow's milk (2% fat)",
        "unit": "ml",
        "translations": {"uk": "Молоко коров'яче (2% жиру)", "pl": "Mleko krowie (2% tłuszczu)"},
        "calories": [{"amount": 100, "unit": "ml", "calories": 50}],
    },
    {
        "name": "White onion",
        "unit": "g",
        "translations": {"uk": "Цибуля біла", "pl": "Cebula biała"},
        "calories": [{"amount": 100, "unit": "g", "calories": 40}],
    },
    {
        "name": "Garlic clove",
        "unit": "pcs",
        "translations": {"uk": "Зубчик часнику", "pl": "Ząbek czosnku"},
        "calories": [{"amount": 1, "unit": "pcs", "calories": 5}],
    },
    {
        "name": "Tomato",
        "unit": "g",
        "translations": {"uk": "Помідор", "pl": "Pomidor"},
        "calories": [{"amount": 100, "unit": "g", "calories": 18}],
    },
    {
        "name": "Spinach",
        "unit": "g",
        "translations": {"uk": "Шпинат", "pl": "Szpinak"},
        "calories": [{"amount": 100, "unit": "g", "calories": 23}],
    },
    {
        "name": "Avocado",
        "unit": "pcs",
        "translations": {"uk": "Авакадо", "pl": "Awokado"},
        "calories": [{"amount": 1, "unit": "pcs", "calories": 240}],
    },
    {
        "name": "Cheddar cheese",
        "unit": "g",
        "translations": {"uk": "Сир чеддер", "pl": "Ser cheddar"},
        "calories": [{"amount": 100, "unit": "g", "calories": 403}],
    },
    {
        "name": "Black beans (cooked)",
        "unit": "g",
        "translations": {"uk": "Чорна квасоля (варена)", "pl": "Fasola czarna (gotowana)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 132}],
    },
    {
        "name": "Coconut milk (canned)",
        "unit": "ml",
        "translations": {"uk": "Кокосове молоко (консервоване)", "pl": "Mleko kokosowe (z puszki)"},
        "calories": [{"amount": 100, "unit": "ml", "calories": 195}],
    },
    {
        "name": "Turkey breast, roasted",
        "unit": "g",
        "translations": {"uk": "Індиче філе запечене", "pl": "Pierś z indyka pieczona"},
        "calories": [{"amount": 100, "unit": "g", "calories": 135}],
    },
    {
        "name": "Beef sirloin (lean)",
        "unit": "g",
        "translations": {"uk": "Яловичина (вирізка, пісна)", "pl": "Polędwica wołowa (chuda)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 206}],
    },
    {
        "name": "Pork loin, roasted",
        "unit": "g",
        "translations": {"uk": "Свинина (корейка, запечена)", "pl": "Schab wieprzowy pieczony"},
        "calories": [{"amount": 100, "unit": "g", "calories": 242}],
    },
    {
        "name": "Firm tofu",
        "unit": "g",
        "translations": {"uk": "Тофу твердий", "pl": "Tofu twarde"},
        "calories": [{"amount": 100, "unit": "g", "calories": 76}],
    },
    {
        "name": "Chickpeas (cooked)",
        "unit": "g",
        "translations": {"uk": "Нут (варений)", "pl": "Ciecierzyca (gotowana)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 164}],
    },
    {
        "name": "Sweet potato (baked)",
        "unit": "g",
        "translations": {"uk": "Батат (запечений)", "pl": "Batat (pieczony)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 90}],
    },
    {
        "name": "Rolled oats (dry)",
        "unit": "g",
        "translations": {"uk": "Вівсяні пластівці (сухі)", "pl": "Płatki owsiane (suche)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 389}],
    },
    {
        "name": "Peanut butter",
        "unit": "tbsp",
        "translations": {"uk": "Арахісова паста", "pl": "Masło orzechowe"},
        "calories": [{"amount": 1, "unit": "tbsp", "calories": 94}],
    },
    {
        "name": "Honey",
        "unit": "tbsp",
        "translations": {"uk": "Мед", "pl": "Miód"},
        "calories": [{"amount": 1, "unit": "tbsp", "calories": 64}],
    },
    {
        "name": "Walnuts",
        "unit": "g",
        "translations": {"uk": "Волоські горіхи", "pl": "Orzechy włoskie"},
        "calories": [{"amount": 100, "unit": "g", "calories": 654}],
    },
    {
        "name": "Chia seeds",
        "unit": "g",
        "translations": {"uk": "Насіння чіа", "pl": "Nasiona chia"},
        "calories": [{"amount": 100, "unit": "g", "calories": 486}],
    },
    {
        "name": "Lentils (cooked)",
        "unit": "g",
        "translations": {"uk": "Сочевиця (варена)", "pl": "Soczewica (gotowana)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 116}],
    },
    {
        "name": "Blueberries",
        "unit": "g",
        "translations": {"uk": "Чорниця", "pl": "Borówka amerykańska"},
        "calories": [{"amount": 100, "unit": "g", "calories": 57}],
    },
    {
        "name": "Strawberries",
        "unit": "g",
        "translations": {"uk": "Полуниця", "pl": "Truskawki"},
        "calories": [{"amount": 100, "unit": "g", "calories": 33}],
    },
    {
        "name": "Apple (medium)",
        "unit": "pcs",
        "translations": {"uk": "Яблуко (середнє)", "pl": "Jabłko (średnie)"},
        "calories": [{"amount": 1, "unit": "pcs", "calories": 95}],
    },
    {
        "name": "Cucumber",
        "unit": "g",
        "translations": {"uk": "Огірок", "pl": "Ogórek"},
        "calories": [{"amount": 100, "unit": "g", "calories": 16}],
    },
    {
        "name": "Shrimp (cooked)",
        "unit": "g",
        "translations": {"uk": "Креветки (варені)", "pl": "Krewetki (gotowane)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 99}],
    },
    {
        "name": "Tuna (canned in water)",
        "unit": "g",
        "translations": {"uk": "Тунець консервований у власному соку", "pl": "Tuńczyk w sosie własnym"},
        "calories": [{"amount": 100, "unit": "g", "calories": 116}],
    },
    {
        "name": "Mozzarella (part-skim)",
        "unit": "g",
        "translations": {"uk": "Моцарела (знежирена)", "pl": "Mozzarella o obniżonej zawartości tłuszczu"},
        "calories": [{"amount": 100, "unit": "g", "calories": 280}],
    },
    {
        "name": "Cottage cheese (2% fat)",
        "unit": "g",
        "translations": {"uk": "Сир кисломолочний (2% жиру)", "pl": "Twaróg ziarnisty (2% tłuszczu)"},
        "calories": [{"amount": 100, "unit": "g", "calories": 81}],
    },
    {
        "name": "Ricotta cheese",
        "unit": "g",
        "translations": {"uk": "Сир рікотта", "pl": "Ser ricotta"},
        "calories": [{"amount": 100, "unit": "g", "calories": 174}],
    },
    {
        "name": "Greek yogurt, 0% fat",
        "unit": "g",
        "translations": {"uk": "Грецький йогурт 0%", "pl": "Jogurt grecki 0%"},
        "calories": [{"amount": 100, "unit": "g", "calories": 59}],
    },
    {
        "name": "Black olives",
        "unit": "g",
        "translations": {"uk": "Чорні оливки", "pl": "Oliwki czarne"},
        "calories": [{"amount": 100, "unit": "g", "calories": 115}],
    },
    {
        "name": "Sunflower seeds",
        "unit": "g",
        "translations": {"uk": "Насіння соняшнику", "pl": "Pestki słonecznika"},
        "calories": [{"amount": 100, "unit": "g", "calories": 584}],
    },
]


async def seed_base_ingredients(db: AsyncIOMotorDatabase) -> None:
    settings = get_settings()
    ingredients_collection = db[settings.ingredients_collection]
    calories_collection = db[settings.calories_collection]

    for item in SEED_INGREDIENTS:
        unit = _sanitize_unit(item["unit"])
        key = _normalize_key(item["name"], unit)
        translations = item.get("translations") or {}

        await ingredients_collection.update_one(
            {"key": key},
            {
                "$set": {
                    "name": item["name"],
                    "unit": unit,
                    "translations": translations,
                }
            },
            upsert=True,
        )

        for calorie in item.get("calories", []):
            amount = float(calorie["amount"])
            cal_unit = _sanitize_unit(calorie["unit"])
            calories_value = float(calorie["calories"])

            await calories_collection.update_one(
                {
                    "ingredient_key": key,
                    "unit": cal_unit,
                    "amount": amount,
                },
                {
                    "$set": {
                        "ingredient_key": key,
                        "ingredient_name": item["name"],
                        "unit": cal_unit,
                        "amount": amount,
                        "calories": calories_value,
                    }
                },
                upsert=True,
            )
