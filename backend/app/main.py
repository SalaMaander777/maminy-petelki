import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI

from .config import Settings, get_settings
from .db import init_db, make_engine
from .routers import admin, auth, media, public
from .security import AdminAuth, LoginLimiter
from .seed import seed_defaults

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("app")


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        engine = make_engine(settings)
        init_db(engine)
        seed_defaults(engine)
        app.state.engine = engine
        if not app.state.auth.configured:
            logger.warning("Администратор не настроен (ADMIN_PASSWORD/ADMIN_PASSWORD_HASH): вход невозможен")
        yield
        engine.dispose()

    app = FastAPI(
        title="Мамины петельки API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )
    app.state.settings = settings
    app.state.auth = AdminAuth(settings)
    app.state.limiter = LoginLimiter(settings)
    app.include_router(public.router)
    app.include_router(auth.router)
    app.include_router(admin.router)
    app.include_router(media.router)
    app.include_router(media.public)
    return app


app = create_app()
