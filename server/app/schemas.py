from datetime import date
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

MealSlot = Literal["breakfast", "lunch", "dinner", "snack"]

# --- dishes & ingredients --------------------------------------------------
class Ingredient(BaseModel):
    name: str
    unit: str = Field(..., description="Measurement unit, e.g. g, pcs, ml")
    qty: float = Field(..., ge=0, description="Quantity per serving")

class DishBase(BaseModel):
    id: str = Field(..., description="Stable identifier used by the client")
    name: str
    meal: MealSlot
    ingredients: List[Ingredient] = Field(default_factory=list)
    notes: Optional[str] = None
    # expose as createdBy for the client
    created_by: Optional[str] = Field(default=None, alias="createdBy")
    model_config = ConfigDict(populate_by_name=True)

class DishCreate(DishBase):
    pass

class DishUpdate(BaseModel):
    name: Optional[str] = None
    meal: Optional[MealSlot] = None
    ingredients: Optional[List[Ingredient]] = None
    notes: Optional[str] = None

class DishInDB(DishBase):
    # Map MongoDB _id to id
    id: str = Field(alias="_id")
    model_config = ConfigDict(populate_by_name=True)

# --- plans -----------------------------------------------------------------
class DayPlan(BaseModel):
    id: str = Field(..., description="ISO date YYYY-MM-DD")
    slots: Dict[MealSlot, Optional[str]] = Field(default_factory=dict, description="dish id per slot")

class DayPlanInDB(DayPlan):
    id: str = Field(alias="_id")
    model_config = ConfigDict(populate_by_name=True)

# --- auth & users ----------------------------------------------------------
class UserPublic(BaseModel):
    id: str
    login: str
    name: str
    is_admin: bool = Field(default=False, alias="isAdmin")

    model_config = ConfigDict(populate_by_name=True)

class UserInDB(BaseModel):
    id: str
    login: str
    name: str
    is_admin: bool = False
    hashed_password: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

class UserCreate(BaseModel):
    login: str
    name: str
    password: str
    is_admin: bool = False

class LoginRequest(BaseModel):
    login: str
    password: str

class TokenData(BaseModel):
    login: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic

# --- ingredients directory -------------------------------------------------
class IngredientUpsert(BaseModel):
    name: str
    unit: str
    translations: Optional[Dict[str, str]] = None

class IngredientEntry(BaseModel):
    key: str
    name: str
    unit: str
    translations: Dict[str, str] = Field(default_factory=dict)

# --- shopping list ---------------------------------------------------------
class ShoppingListItem(BaseModel):
    name: str
    unit: str
    qty: float
    dishes: List[str] = Field(default_factory=list)

class ShoppingListResponse(BaseModel):
    range: Dict[str, str]  # {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
    items: List[ShoppingListItem]
