import os
from functools import lru_cache


class Settings:
    mongodb_uri: str
    database_name: str
    dishes_collection: str = "dishes"
    plans_collection: str = "plans"
    users_collection: str = "users"
    ingredients_collection: str = "ingredients"
    calories_collection: str = "ingredient_calories"
    purchases_collection: str = "purchases"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int
    admin_login: str

    def __init__(self) -> None:
        self.mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.database_name = os.getenv("MONGODB_DB", "mealplanner")
        self.jwt_secret = os.getenv("JWT_SECRET", "change-me")
        self.jwt_exp_minutes = int(os.getenv("JWT_EXP_MINUTES", "120"))
        self.admin_login = os.getenv("ADMIN_LOGIN", "admin")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
