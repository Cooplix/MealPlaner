from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user, hash_password, require_admin
from ..config import get_settings
from ..db import get_database
from ..schemas import UserCreate, UserPublic

router = APIRouter(prefix="/api/users", tags=["users"])

def _collection(db: AsyncIOMotorDatabase):
    settings = get_settings()
    return db[settings.users_collection]

@router.post("/", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def create_user(
        payload: UserCreate,
        db: AsyncIOMotorDatabase = Depends(get_database),
        _: UserPublic = Depends(require_admin),
) -> UserPublic:
    collection = _collection(db)
    if await collection.find_one({"login": payload.login}):
        raise HTTPException(status_code=409, detail="User with this login already exists")
    doc = {
        "login": payload.login,
        "name": payload.name,
        "hashed_password": hash_password(payload.password),
        "is_admin": payload.is_admin,
    }
    result = await collection.insert_one(doc)
    return UserPublic(id=str(result.inserted_id), login=payload.login, name=payload.name, is_admin=payload.is_admin)

@router.get("/me", response_model=UserPublic)
async def read_me(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return current_user
