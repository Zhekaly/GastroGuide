# Главная точка входа backend-приложения GastroGuide.
# Здесь создаётся экземпляр FastAPI, подключаются роутеры,
# настраивается CORS и собирается итоговая конфигурация API.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import Base, engine
from app.models import Restaurant
from app.api.restaurants import router as restaurants_router
from app.api.offers import router as offers_router
from app.api.ai import router as ai_router
from app.api.routes import router as routes_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.favorites import router as favorites_router
from app.api.profile import router as profile_router
from app.api.ai_history import router as ai_history_router
from app.api.reviews import router as reviews_router
from app.api.categories import router as categories_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


app.include_router(restaurants_router)
app.include_router(offers_router)
app.include_router(ai_router)
app.include_router(routes_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(favorites_router)
app.include_router(profile_router)
app.include_router(ai_history_router)
app.include_router(reviews_router)
app.include_router(categories_router)


@app.get("/")
async def root():
    return {"message": "GastroGuide Backend is running"}


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "database_configured": bool(settings.database_url)
    }


@app.get("/db-check")
async def db_check():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {"database": "connected", "result": result.scalar()}