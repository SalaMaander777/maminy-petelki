import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import Settings
from app.main import create_app

ORIGIN = {"Origin": "http://testserver"}


def make_settings(tmp_path, **kw) -> Settings:
    base = dict(
        ENVIRONMENT="development",
        SECRET_KEY="test-secret",
        ADMIN_USERNAME="admin",
        ADMIN_PASSWORD="s3cret-pass",
        DATABASE_URL="sqlite:///" + str(tmp_path / "test.db"),
        UPLOADS_DIR=str(tmp_path / "uploads"),
    )
    base.update(kw)
    return Settings(_env_file=None, **base).validate_startup()


@pytest.fixture()
def client(tmp_path):
    app = create_app(make_settings(tmp_path))
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def admin(client):
    r = client.post("/api/admin/login", json={"username": "admin", "password": "s3cret-pass"}, headers=ORIGIN)
    assert r.status_code == 200
    client.headers.update(ORIGIN)
    return client


def png_bytes(size=(100, 80), fmt="PNG") -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, (200, 100, 120)).save(buf, format=fmt)
    return buf.getvalue()
