from fastapi import APIRouter, HTTPException, status

from ..auth import authenticate_user, create_access_token
from ..schemas import LoginRequest, TokenResponse, UserPublic

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest) -> TokenResponse:
    user = await authenticate_user(payload.login, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect login or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.login)
    public = UserPublic(id=user.id, login=user.login, name=user.name, is_admin=user.is_admin)
    return TokenResponse(access_token=token, user=public)
