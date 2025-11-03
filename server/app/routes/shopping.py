from collections import defaultdict
from datetime import date
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user
from ..config import get_settings
from ..db import get_database
from ..schemas import ShoppingListItem, ShoppingListResponse, UserPublic

router = APIRouter(prefix="/api/shopping-list", tags=["shopping"])


def _plans_collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.plans_collection]


def _dishes_collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.dishes_collection]


@router.get("/", response_model=ShoppingListResponse)
async def build_shopping_list(
    start: str = Query(..., description="Inclusive start date YYYY-MM-DD"),
    end: str = Query(..., description="Inclusive end date YYYY-MM-DD"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    start_date = date.fromisoformat(start)
    end_date = date.fromisoformat(end)
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must not be before start date")

    plans_cursor = _plans_collection(db).find({"_id": {"$gte": start, "$lte": end}})
    dish_ids: set[str] = set()
    plan_slots: Dict[str, List[str]] = {}

    async for plan_doc in plans_cursor:
        slots = [dish_id for dish_id in plan_doc.get("slots", {}).values() if dish_id]
        plan_slots[plan_doc["_id"]] = slots
        dish_ids.update(slots)

    if not dish_ids:
        return ShoppingListResponse(range={"start": start, "end": end}, items=[])

    dishes_cursor = _dishes_collection(db).find({"_id": {"$in": list(dish_ids)}})
    dishes: Dict[str, dict] = {}
    async for dish in dishes_cursor:
        dishes[dish["_id"]] = dish

    totals: Dict[tuple[str, str], ShoppingListItem] = {}
    for slots in plan_slots.values():
        for dish_id in slots:
            dish = dishes.get(dish_id)
            if not dish:
                continue
            for ingredient in dish.get("ingredients", []):
                key = (ingredient["name"], ingredient["unit"])
                item = totals.setdefault(
                    key,
                    ShoppingListItem(
                        name=ingredient["name"],
                        unit=ingredient["unit"],
                        qty=0,
                        dishes=[],
                    ),
                )
                item.qty += float(ingredient["qty"])
                if dish_id not in item.dishes:
                    item.dishes.append(dish_id)

    items = sorted(totals.values(), key=lambda x: x.name)
    return ShoppingListResponse(range={"start": start, "end": end}, items=items)
