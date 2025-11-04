from datetime import datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user
from ..config import get_settings
from ..db import get_database
from ..schemas import PurchaseCreate, PurchaseEntry, UserPublic

router = APIRouter(prefix="/api/purchases", tags=["purchases"])


def _collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.purchases_collection]


def _ingredients_collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.ingredients_collection]


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_range_value(value: str, *, end_of_day: bool = False) -> datetime:
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        try:
            date_part = datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError as exc2:  # pragma: no cover - defensive
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date range value") from exc2
        if end_of_day:
            parsed = datetime.combine(date_part, time(23, 59, 59, 999000))
        else:
            parsed = datetime.combine(date_part, time.min)
    return _normalize_datetime(parsed)


@router.get("/", response_model=list[PurchaseEntry])
async def list_purchases(
    start: str | None = Query(default=None, description="Inclusive start datetime ISO string"),
    end: str | None = Query(default=None, description="Inclusive end datetime ISO string"),
    ingredient_key: str | None = Query(default=None, alias="ingredientKey"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
) -> list[PurchaseEntry]:
    collection = _collection(db)
    filters: dict[str, object] = {}

    if start or end:
        range_filter: dict[str, datetime] = {}
        if start:
            range_filter["$gte"] = _parse_range_value(start)
        if end:
            range_filter["$lte"] = _parse_range_value(end, end_of_day=True)
        filters["purchased_at"] = range_filter

    if ingredient_key:
        filters["ingredient_key"] = ingredient_key.strip()

    cursor = collection.find(filters).sort("purchased_at", -1)
    results: list[PurchaseEntry] = []
    async for doc in cursor:
        doc_id = doc.get("_id")
        purchased_at = doc.get("purchased_at")
        entry = {
            "id": str(doc_id),
            "ingredientKey": doc.get("ingredient_key"),
            "ingredientName": doc.get("ingredient_name"),
            "amount": float(doc.get("amount", 0)),
            "unit": doc.get("unit"),
            "price": float(doc.get("price", 0)),
            "purchasedAt": purchased_at.isoformat() if isinstance(purchased_at, datetime) else purchased_at,
        }
        results.append(PurchaseEntry(**entry))
    return results


@router.post("/", response_model=PurchaseEntry, status_code=status.HTTP_201_CREATED)
async def create_purchase(
    payload: PurchaseCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
) -> PurchaseEntry:
    ingredient_key = payload.ingredient_key.strip()
    if not ingredient_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ingredient key is required")

    ingredients_coll = _ingredients_collection(db)
    ingredient = await ingredients_coll.find_one({"key": ingredient_key})
    if not ingredient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ingredient not found")

    normalized_unit = payload.unit.strip().lower()
    purchase_doc = {
        "ingredient_key": ingredient_key,
        "ingredient_name": ingredient.get("name") or ingredient_key,
        "amount": float(payload.amount),
        "unit": normalized_unit,
        "price": float(payload.price),
        "purchased_at": _normalize_datetime(payload.purchased_at),
    }

    collection = _collection(db)
    result = await collection.insert_one(purchase_doc)

    saved = await collection.find_one({"_id": result.inserted_id})
    if not saved:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to persist purchase")

    purchased_at = saved.get("purchased_at")
    entry = {
        "id": str(saved["_id"]),
        "ingredientKey": saved.get("ingredient_key"),
        "ingredientName": saved.get("ingredient_name"),
        "amount": float(saved.get("amount", 0)),
        "unit": saved.get("unit"),
        "price": float(saved.get("price", 0)),
        "purchasedAt": purchased_at.isoformat() if isinstance(purchased_at, datetime) else purchased_at,
    }
    return PurchaseEntry(**entry)
