from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth import get_current_user, hash_password, require_admin, verify_password
from ..config import get_settings
from ..db import get_database
from ..schemas import UserCreate, UserPasswordChange, UserPublic, UserUpdateName

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


@router.patch("/me", response_model=UserPublic)
async def update_me(
        payload: UserUpdateName,
        db: AsyncIOMotorDatabase = Depends(get_database),
        current_user: UserPublic = Depends(get_current_user),
) -> UserPublic:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name cannot be empty")

    try:
        object_id = ObjectId(current_user.id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    collection = _collection(db)
    result = await collection.find_one_and_update(
        {"_id": object_id},
        {"$set": {"name": name}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    result["id"] = str(result.pop("_id"))
    return UserPublic(**result)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
        payload: UserPasswordChange,
        db: AsyncIOMotorDatabase = Depends(get_database),
        current_user: UserPublic = Depends(get_current_user),
):
    try:
        object_id = ObjectId(current_user.id)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user id") from exc

    collection = _collection(db)
    doc = await collection.find_one({"_id": object_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    hashed_password = doc.get("hashed_password")
    if not hashed_password or not verify_password(payload.current_password, hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    if payload.new_password.strip() == "":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password cannot be empty")

    await collection.update_one(
        {"_id": object_id},
        {"$set": {"hashed_password": hash_password(payload.new_password)}},
    )
    return None
