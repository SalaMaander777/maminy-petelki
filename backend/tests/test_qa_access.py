"""QA: доступ к админ-эндпоинтам без сессии, CSRF, лимиты, устойчивость к мусорным id."""
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import ORIGIN, make_settings

COLLECTIONS = ["products", "masterclasses", "projects", "reviews", "promos"]

PROTECTED = []
for c in COLLECTIONS:
    PROTECTED += [
        ("GET", f"/api/admin/{c}", None),
        ("POST", f"/api/admin/{c}", {"name": "x", "title": "x", "author": "x", "text": "x"}),
        ("POST", f"/api/admin/{c}/reorder", {"ids": [1]}),
        ("GET", f"/api/admin/{c}/1", None),
        ("PUT", f"/api/admin/{c}/1", {"name": "x", "title": "x", "author": "x", "text": "x"}),
        ("DELETE", f"/api/admin/{c}/1", None),
    ]
PROTECTED += [
    ("GET", "/api/admin/me", None),
    ("GET", "/api/admin/settings", None),
    ("PUT", "/api/admin/settings", {}),
    ("GET", "/api/admin/pages", None),
    ("PUT", "/api/admin/pages/home", {}),
    ("GET", "/api/admin/media", None),
    ("DELETE", "/api/admin/media", {"url": "/uploads/" + "a" * 32 + ".webp"}),
]


@pytest.mark.parametrize("method,path,body", PROTECTED)
def test_admin_endpoint_requires_session(client, method, path, body):
    r = client.request(method, path, json=body, headers=ORIGIN)
    assert r.status_code == 401, (method, path, r.status_code)


def test_media_upload_requires_session(client):
    r = client.post("/api/admin/media", files={"file": ("a.png", b"x", "image/png")}, headers=ORIGIN)
    assert r.status_code == 401


def test_every_admin_route_is_covered_by_auth_test(client):
    """Все маршруты /api/admin/* (кроме login/logout) присутствуют в списке PROTECTED."""
    covered = {(m, p.replace("/1", "/{item_id}")) for m, p, _ in PROTECTED}
    for route in client.app.routes:
        path = getattr(route, "path", "")
        if not path.startswith("/api/admin") or path.endswith(("/login", "/logout")):
            continue
        for m in route.methods - {"HEAD", "OPTIONS"}:
            norm = path.replace("{slug}", "home")
            assert (m, norm) in covered or path == "/api/admin/media" and m == "POST", (m, path)


def test_tampered_and_expired_session(client, tmp_path):
    from app.security import make_session_token

    s = client.app.state.settings
    good = make_session_token(s, "admin")
    client.cookies.set("session", good[:-2] + "xx")
    assert client.get("/api/admin/me").status_code == 401
    # токен, подписанный другим ключом
    other = make_settings(tmp_path, SECRET_KEY="another-key")
    client.cookies.set("session", make_session_token(other, "admin"))
    assert client.get("/api/admin/me").status_code == 401
    # токен для другого пользователя
    client.cookies.set("session", make_session_token(s, "root"))
    assert client.get("/api/admin/me").status_code == 401


def test_expired_session_rejected(tmp_path):
    from app.security import make_session_token

    st = make_settings(tmp_path)
    st.session_hours = 0  # max_age=0 -> любой токен старше 0 с считается истёкшим
    with TestClient(create_app(st)) as c:
        import time

        token = make_session_token(st, "admin")
        time.sleep(1.1)
        c.cookies.set("session", token)
        assert c.get("/api/admin/me").status_code == 401


def test_csrf_null_and_malformed_origin(admin):
    for origin in ["null", "http://", "evil", "http://testserver.evil.com", "http://evil.com/testserver"]:
        r = admin.post("/api/admin/products", json={"name": "x"}, headers={"Origin": origin})
        assert r.status_code == 403, origin


def test_csrf_applies_to_put_delete_reorder_media_settings(admin):
    bad = {"Origin": "http://evil.example"}
    pid = admin.post("/api/admin/products", json={"name": "x"}).json()["id"]
    assert admin.put(f"/api/admin/products/{pid}", json={"name": "y"}, headers=bad).status_code == 403
    assert admin.post("/api/admin/products/reorder", json={"ids": [pid]}, headers=bad).status_code == 403
    assert admin.put("/api/admin/settings", json=admin.get("/api/admin/settings").json(), headers=bad).status_code == 403  # noqa: E501
    assert admin.put("/api/admin/pages/home", json={}, headers=bad).status_code == 403
    assert admin.request("DELETE", "/api/admin/media", json={"url": "/uploads/x"}, headers=bad).status_code == 403
    files = {"file": ("a.png", b"x", "image/png")}
    assert admin.post("/api/admin/media", files=files, headers=bad).status_code == 403
    # запись не изменилась
    assert admin.get(f"/api/admin/products/{pid}").json()["name"] == "x"


def test_lockout_is_per_ip_and_resets_after_success(client):
    creds_bad = {"username": "admin", "password": "bad"}
    for _ in range(4):
        assert client.post("/api/admin/login", json=creds_bad).status_code == 401
    ok = client.post("/api/admin/login", json={"username": "admin", "password": "s3cret-pass"})
    assert ok.status_code == 200  # 4 неудачи < порога, успех сбрасывает счётчик
    for _ in range(4):
        assert client.post("/api/admin/login", json=creds_bad).status_code == 401


def test_lockout_blocks_even_correct_password_and_retry_after(client):
    for _ in range(5):
        client.post("/api/admin/login", json={"username": "admin", "password": "bad"})
    r = client.post("/api/admin/login", json={"username": "admin", "password": "s3cret-pass"})
    assert r.status_code == 429 and int(r.headers["Retry-After"]) > 0


def test_xff_ignored_without_trust_proxy(client):
    for i in range(5):
        client.post("/api/admin/login", json={"username": "admin", "password": "bad"},
                    headers={"X-Forwarded-For": f"10.0.0.{i}"})
    r = client.post("/api/admin/login", json={"username": "admin", "password": "s3cret-pass"},
                    headers={"X-Forwarded-For": "10.9.9.9"})
    assert r.status_code == 429


def test_xff_used_with_trust_proxy(tmp_path):
    with TestClient(create_app(make_settings(tmp_path, TRUST_PROXY="true"))) as c:
        for _ in range(5):
            c.post("/api/admin/login", json={"username": "admin", "password": "bad"},
                   headers={"X-Forwarded-For": "1.1.1.1"})
        blocked = c.post("/api/admin/login", json={"username": "admin", "password": "s3cret-pass"},
                         headers={"X-Forwarded-For": "1.1.1.1"})
        other = c.post("/api/admin/login", json={"username": "admin", "password": "s3cret-pass"},
                       headers={"X-Forwarded-For": "2.2.2.2"})
        assert blocked.status_code == 429 and other.status_code == 200


def test_login_without_configured_admin_always_fails(tmp_path):
    with TestClient(create_app(make_settings(tmp_path, ADMIN_PASSWORD=""))) as c:
        assert c.post("/api/admin/login", json={"username": "admin", "password": ""}).status_code == 422
        assert c.post("/api/admin/login", json={"username": "admin", "password": "x"}).status_code == 401


def test_production_requires_admin_password(tmp_path):
    from app.config import Settings

    with pytest.raises(RuntimeError):
        Settings(_env_file=None, ENVIRONMENT="production", SECRET_KEY="k").validate_startup()


def test_production_hides_docs(tmp_path):
    st = make_settings(tmp_path, ENVIRONMENT="production", SECRET_KEY="k")
    with TestClient(create_app(st)) as c:
        assert c.get("/docs").status_code == 404
        assert c.get("/openapi.json").status_code == 404


def test_logout_clears_cookie(admin):
    r = admin.post("/api/admin/logout")
    assert "session=" in r.headers["set-cookie"] and "max-age=0" in r.headers["set-cookie"].lower()


@pytest.mark.parametrize("col", COLLECTIONS)
@pytest.mark.parametrize("bad_id", ["0", "-1", "abc", "99999999999999999999", "2147483648"])
def test_garbage_ids_never_500(admin, col, bad_id):
    """Регрессия: огромный id в пути давал 500 (OverflowError в SQLite)."""
    body = {"name": "x", "title": "x", "author": "x", "text": "x"}
    for r in (
        admin.get(f"/api/admin/{col}/{bad_id}"),
        admin.put(f"/api/admin/{col}/{bad_id}", json=body),
        admin.delete(f"/api/admin/{col}/{bad_id}"),
    ):
        assert r.status_code in (404, 422), (col, bad_id, r.status_code)


@pytest.mark.parametrize("col", COLLECTIONS)
def test_missing_id_404(admin, col):
    body = {"name": "x", "title": "x", "author": "x", "text": "x"}
    assert admin.get(f"/api/admin/{col}/12345").status_code == 404
    assert admin.put(f"/api/admin/{col}/12345", json=body).status_code == 404
    assert admin.delete(f"/api/admin/{col}/12345").status_code == 404
    assert admin.get(f"/api/admin/{col}/12345").json()["detail"]
