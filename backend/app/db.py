from pathlib import Path

from sqlalchemy.engine import Engine
from sqlmodel import SQLModel, create_engine

from . import models  # noqa: F401  (регистрация таблиц)
from .config import Settings


def make_engine(settings: Settings) -> Engine:
    url = settings.resolved_database_url
    if url.startswith("sqlite:///") and ":memory:" not in url:
        Path(url[len("sqlite:///"):]).parent.mkdir(parents=True, exist_ok=True)
    return create_engine(url, connect_args={"check_same_thread": False})


def init_db(engine: Engine) -> None:
    SQLModel.metadata.create_all(engine)
