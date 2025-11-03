from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user
from ..config import get_settings
from ..db import get_database
from ..schemas import DayPlan, DayPlanInDB, UserPublic

router = APIRouter(prefix="/api/plans", tags=["plans"])


def _collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.plans_collection]


@router.get("/", response_model=list[DayPlan])
async def list_plans(
    start: Optional[str] = Query(None, description="Inclusive start date YYYY-MM-DD"),
    end: Optional[str] = Query(None, description="Inclusive end date YYYY-MM-DD"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    query: dict[str, dict[str, str]] = {}
    if start:
        date.fromisoformat(start)
        query["_id"] = {"$gte": start}
    if end:
        date.fromisoformat(end)
        query.setdefault("_id", {})
        query["_id"]["$lte"] = end

    cursor = _collection(db).find(query).sort("_id", 1)
    plans: list[DayPlan] = []
    async for doc in cursor:
        plan_in_db = DayPlanInDB(**doc)
        plans.append(DayPlan(**plan_in_db.model_dump()))
    return plans


@router.put("/{dateISO}", response_model=DayPlan, status_code=status.HTTP_200_OK)
async def upsert_plan(
    dateISO: str,
    payload: DayPlan,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    if payload.dateISO != dateISO:
        raise HTTPException(status_code=400, detail="Path date and payload date mismatch")

    data = payload.model_dump()
    data["_id"] = data.pop("dateISO")
    await _collection(db).replace_one({"_id": dateISO}, data, upsert=True)
    return payload


@router.delete("/{dateISO}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    dateISO: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _: UserPublic = Depends(get_current_user),
):
    date.fromisoformat(dateISO)
    outcome = await _collection(db).delete_one({"_id": dateISO})
    if outcome.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return None
