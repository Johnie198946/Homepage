from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def _db_url() -> str:
    url = settings.database_url
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


engine = create_engine(
    _db_url(),
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_pool_max_overflow,
    pool_timeout=settings.database_pool_timeout,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)


def check_database_connection() -> None:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))


def warm_up_database_pool() -> None:
    size = min(settings.database_pool_warmup, settings.database_pool_size)
    for _ in range(size):
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
