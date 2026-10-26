from app.config import Settings
from tests.conftest import ORIGIN, make_settings

CREDS = {"username": "admin", "password": "s3cret-pass"}


def test_401_without_session(client):
    for path in ["/api/admin/me", "/api/admin/products", "/api/admin/settings", "/api/admin/pages", "/api/admin/media"]:
        assert client.get(path).status_code == 401
    assert client.post("/api/admin/products", json={"name": "x"}, headers=ORIGIN).status_code == 401


def test_login_me_logout(client):
    r = client.post("/api/admin/login", json=CREDS, headers=ORIGIN)
    assert r.status_code == 200 and r.json() == {"ok": True}
    sc = r.headers["set-cookie"].lower()
    assert "httponly" in sc and "samesite=lax" in sc and "secure" not in sc
    assert client.get("/api/admin/me").json() == {"username": "admin"}
    assert client.post("/api/admin/logout", headers=ORIGIN).status_code == 200
    client.cookies.clear()
    assert client.get("/api/admin/me").status_code == 401


def test_wrong_credentials(client):
    assert client.post("/api/admin/login", json={"username": "admin", "password": "bad"}).status_code == 401
    assert client.post("/api/admin/login", json={"username": "x", "password": "s3cret-pass"}).status_code == 401


def test_forged_cookie_rejected(client):
    client.cookies.set("session", "forged.token.value")
    assert client.get("/api/admin/me").status_code == 401


def test_lockout_after_5_failures(client):
    for _ in range(5):
        assert client.post("/api/admin/login", json={"username": "admin", "password": "bad"}).status_code == 401
    r = client.post("/api/admin/login", json=CREDS)
    assert r.status_code == 429
    assert "Retry-After" in r.headers


def test_cookie_secure_flag(tmp_path):
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app(make_settings(tmp_path, COOKIE_SECURE="true"))) as c:
        r = c.post("/api/admin/login", json=CREDS)
        assert "secure" in r.headers["set-cookie"].lower()


def test_csrf_origin_check(admin):
    r = admin.post("/api/admin/products", json={"name": "x"}, headers={"Origin": "http://evil.example"})
    assert r.status_code == 403
    r = admin.post("/api/admin/products", json={"name": "x"}, headers={"Origin": "http://testserver"})
    assert r.status_code == 201
    assert admin.delete("/api/admin/products/1", headers={"Origin": "http://evil.example"}).status_code == 403
    # GET не проверяется
    assert admin.get("/api/admin/products", headers={"Origin": "http://evil.example"}).status_code == 200


def test_csrf_login_foreign_origin(client):
    r = client.post("/api/admin/login", json=CREDS, headers={"Origin": "http://evil.example"})
    assert r.status_code == 403


def test_csrf_forwarded_host_and_allowed_origins(tmp_path):
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app(make_settings(tmp_path, ALLOWED_ORIGINS="https://site.ru"))) as c:
        h = {"Origin": "https://site.ru"}
        assert c.post("/api/admin/login", json=CREDS, headers=h).status_code == 200
        h2 = {"Origin": "https://other.ru", "X-Forwarded-Host": "other.ru"}
        assert c.post("/api/admin/logout", headers=h2).status_code == 200


def test_production_requires_secret_key(tmp_path):
    import pytest

    with pytest.raises(RuntimeError):
        Settings(_env_file=None, ENVIRONMENT="production", ADMIN_PASSWORD="x").validate_startup()


def test_password_hash_login(tmp_path):
    from fastapi.testclient import TestClient

    from app.main import create_app
    from app.security import hash_password

    s = make_settings(tmp_path, ADMIN_PASSWORD="", ADMIN_PASSWORD_HASH=hash_password("hashed-pw"))
    with TestClient(create_app(s)) as c:
        ok = c.post("/api/admin/login", json={"username": "admin", "password": "hashed-pw"})
        assert ok.status_code == 200
