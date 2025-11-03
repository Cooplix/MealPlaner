import logging
import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import hash_password
from ..config import get_settings


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
