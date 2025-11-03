from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings
from .db import get_database
from .schemas import TokenData, UserInDB, UserPublic

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


async def authenticate_user(login: str, password: str) -> UserInDB | None:
    db = get_database()
    settings = get_settings()
    doc = await db[settings.users_collection].find_one({"login": login})
    if not doc:
        return None
    doc["_id"] = str(doc["_id"])
    user = UserInDB(**doc)
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    settings = get_settings()
    expires_delta = timedelta(minutes=expires_minutes or settings.jwt_exp_minutes)
    to_encode = {
        "sub": subject,
        "exp": datetime.now(timezone.utc) + expires_delta,
    }
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
) -> UserPublic:
    settings = get_settings()
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        login: str | None = payload.get("sub")
        if login is None:
            raise credentials_exception
        token_data = TokenData(login=login)
    except JWTError:
        raise credentials_exception

    db = get_database()
    doc = await db[settings.users_collection].find_one({"login": token_data.login})
    if not doc:
        raise credentials_exception
    doc["_id"] = str(doc["_id"])
    user = UserInDB(**doc)
    return UserPublic(id=user.id, login=user.login, name=user.name, is_admin=user.is_admin)


async def require_admin(user: Annotated[UserPublic, Depends(get_current_user)]) -> UserPublic:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user
