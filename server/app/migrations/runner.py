import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..config import get_settings
from .steps import (
    ensure_admin_user,
    ensure_calorie_fields,
    ensure_indexes,
    seed_base_ingredients,
    seed_sample_purchases,
)


async def run_migrations(db: AsyncIOMotorDatabase) -> None:
    logging.info("Running database migrations...")
    await ensure_indexes(db)
    await ensure_admin_user(db)
    await ensure_calorie_fields(db)
    await seed_base_ingredients(db)
    await seed_sample_purchases(db)
    logging.info("Database migrations completed")
