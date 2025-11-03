from datetime import date
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

MealSlot = Literal["breakfast", "lunch", "dinner", "snack"]


class Ingredient(BaseModel):
    name: str
    unit: str = Field(..., description="Measurement unit, e.g. g, pcs, ml")
    qty: float = Field(..., ge=0, description="Quantity per serving")


class DishBase(BaseModel):
    id: str = Field(..., description="Stable identifier used by the client")
    name: str
    meal: MealSlot
    ingredients: List[Ingredient]
    notes: Optional[str] = None
    createdBy: Optional[str] = Field(default=None, description="Author login")
    createdByName: Optional[str] = Field(default=None, description="Author display name")


class DishCreate(DishBase):
    pass


class DishUpdate(BaseModel):
    name: Optional[str] = None
    meal: Optional[MealSlot] = None
    ingredients: Optional[List[Ingredient]] = None
    notes: Optional[str] = None


class DishInDB(DishBase):
    id: str = Field(..., alias="_id")
    createdBy: Optional[str] = Field(default=None, alias="created_by")
    createdByName: Optional[str] = Field(default=None, alias="created_by_name")

    model_config = ConfigDict(populate_by_name=True)


class DayPlan(BaseModel):
    dateISO: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    slots: Dict[MealSlot, Optional[str]]

    @field_validator("slots")
    @classmethod
    def ensure_valid_slots(cls, value: Dict[MealSlot, Optional[str]]):
        return {slot: val for slot, val in value.items() if val is not None}


class DayPlanInDB(DayPlan):
    dateISO: str = Field(..., alias="_id")

    model_config = ConfigDict(populate_by_name=True)


class ShoppingListItem(BaseModel):
    name: str
    unit: str
    qty: float
    dishes: List[str] = Field(default_factory=list, description="Dish IDs contributing to the total")


class ShoppingListResponse(BaseModel):
    range: Dict[str, str]
    items: List[ShoppingListItem]


def coerce_date(value: str) -> date:
    return date.fromisoformat(value)


class UserBase(BaseModel):
    id: str = Field(..., alias="_id")
    login: str
    name: str
    is_admin: bool = False

    model_config = ConfigDict(populate_by_name=True)


class UserCreate(BaseModel):
    login: str
    name: str
    password: str
    is_admin: bool = False


class UserInDB(UserBase):
    hashed_password: str


class UserPublic(BaseModel):
    id: str
    login: str
    name: str
    is_admin: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class TokenData(BaseModel):
    login: str


class LoginRequest(BaseModel):
    login: str
    password: str


class IngredientUpsert(BaseModel):
    name: str
    unit: str
    translations: Optional[Dict[str, str]] = None


class IngredientEntry(BaseModel):
    key: str
    name: str
    unit: str
    translations: Dict[str, str] = Field(default_factory=dict)
