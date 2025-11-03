import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..config import get_settings
from .steps import ensure_admin_user, ensure_indexes


async def run_migrations(db: AsyncIOMotorDatabase) -> None:
    logging.info("Running database migrations...")
    await ensure_indexes(db)
    await ensure_admin_user(db)
    logging.info("Database migrations completed")
