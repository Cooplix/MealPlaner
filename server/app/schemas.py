from datetime import date, datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

MealSlot = Literal["breakfast", "lunch", "dinner", "snack"]
MeasurementUnit = Literal[
    "g", "kg", "mg", "lb", "oz", "ml", "l", "pcs", "tbsp", "tsp", "cup"
]

# --- dishes & ingredients --------------------------------------------------
class Ingredient(BaseModel):
    name: str
    unit: str
    qty: float = Field(..., ge=0, description="Quantity per serving")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

class DishBase(BaseModel):
    id: str = Field(..., description="Stable identifier used by the client")
    name: str
    meal: MealSlot
    ingredients: List[Ingredient] = Field(default_factory=list)
    notes: Optional[str] = None
    # expose as createdBy for the client
    created_by: Optional[str] = Field(default=None, alias="createdBy")
    calories: float = Field(default=0, ge=0, description="Total calories (kcal)")
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
    dateISO: str = Field(..., description="ISO date YYYY-MM-DD")
    slots: Dict[MealSlot, Optional[str]] = Field(default_factory=dict, description="dish id per slot")

class DayPlanInDB(DayPlan):
    dateISO: str = Field(alias="_id")
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


class UserUpdateName(BaseModel):
    name: str


class UserPasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1, alias="currentPassword")
    new_password: str = Field(..., min_length=6, alias="newPassword")

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
    unit: MeasurementUnit
    translations: Optional[Dict[str, str]] = None

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

class IngredientEntry(BaseModel):
    key: str
    name: str
    unit: MeasurementUnit
    translations: Dict[str, str] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

# --- calorie presets -------------------------------------------------------
class CalorieCreate(BaseModel):
    ingredient_key: str = Field(..., alias="ingredientKey")
    amount: float = Field(..., gt=0)
    unit: MeasurementUnit
    calories: float = Field(..., ge=0)

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class CalorieUpdate(BaseModel):
    ingredient_key: Optional[str] = Field(None, alias="ingredientKey")
    amount: Optional[float] = Field(None, gt=0)
    unit: Optional[MeasurementUnit] = None
    calories: Optional[float] = Field(None, ge=0)

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class CalorieEntry(BaseModel):
    id: str = Field(alias="id")
    ingredient_key: str = Field(alias="ingredientKey")
    ingredient_name: str = Field(alias="ingredientName")
    amount: float
    unit: MeasurementUnit
    calories: float = Field(ge=0)

    model_config = ConfigDict(populate_by_name=True)

# --- shopping list ---------------------------------------------------------
class ShoppingListItem(BaseModel):
    name: str
    unit: str
    qty: float
    dishes: List[str] = Field(default_factory=list)

class ShoppingListResponse(BaseModel):
    range: Dict[str, str]  # {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
    items: List[ShoppingListItem]

# --- purchase tracking -----------------------------------------------------
class PurchaseCreate(BaseModel):
    ingredient_key: str = Field(..., alias="ingredientKey")
    amount: float = Field(..., gt=0)
    unit: MeasurementUnit
    price: float = Field(..., ge=0)
    purchased_at: datetime = Field(..., alias="purchasedAt")

    model_config = ConfigDict(populate_by_name=True)


class PurchaseEntry(BaseModel):
    id: str
    ingredient_key: str = Field(..., alias="ingredientKey")
    ingredient_name: str = Field(..., alias="ingredientName")
    amount: float
    unit: MeasurementUnit
    price: float = Field(..., ge=0)
    purchased_at: datetime = Field(..., alias="purchasedAt")

    model_config = ConfigDict(populate_by_name=True)
