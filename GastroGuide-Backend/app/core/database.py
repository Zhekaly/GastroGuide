# Настройка подключения к базе данных PostgreSQL.
# Здесь создаются engine, session factory, базовый класс моделей
# и dependency get_db для работы с БД в endpoint'ах.

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings


engine = create_engine(settings.database_url, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()