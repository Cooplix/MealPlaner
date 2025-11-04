from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import get_database
from .migrations import run_migrations
from .routes import auth, calories, dishes, ingredients, plans, purchases, shopping, users

app = FastAPI(title="MealPlanner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(dishes.router)
app.include_router(plans.router)
app.include_router(shopping.router)
app.include_router(ingredients.router)
app.include_router(calories.router)
app.include_router(purchases.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def startup_event() -> None:
    db = get_database()
    await run_migrations(db)
