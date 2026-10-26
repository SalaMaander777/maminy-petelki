"""QA: валидация, граничные значения, reorder, публикация/скрытие, акции, настройки, сидирование."""
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.main import create_app
from app.models import PageContent, Product, SiteSettings
from app.seed import seed_defaults, seed_demo
from tests.conftest import make_settings

OK = {
    "products": {"name": "Плед"},
    "masterclasses": {"title": "МК"},
    "projects": {"title": "Проект"},
    "reviews": {"author": "Анна", "text": "Класс"},
    "promos": {"title": "Акция"},
}
TITLE = {"products": "name", "masterclasses": "title", "projects": "title", "reviews": "author", "promos": "title"}


def create(c, col, **kw):
    r = c.post(f"/api/admin/{col}", json={**OK[col], **kw})
    assert r.status_code == 201, r.text
    return r.json()


# ---------- валидация ----------
@pytest.mark.parametrize(
    "col,body",
    [
        ("products", {"name": ""}),
        ("products", {"name": "x" * 201}),
        ("products", {}),
        ("products", {"name": "x", "description": "d" * 5001}),
        ("products", {"name": "x", "size": "s" * 201}),
        ("products", {"name": "x", "price": -1}),
        ("products", {"name": "x", "price": 100_000_001}),
        ("products", {"name": "x", "price": "много"}),
        ("products", {"name": "x", "photo": "http://insecure/x.jpg"}),
        ("products", {"name": "x", "photo": "javascript:alert(1)"}),
        ("products", {"name": "x", "photo": "data:image/png;base64,AAAA"}),
        ("products", {"name": "x", "photo": "//evil.com/x.png"}),
        ("products", {"name": "x", "photo": "/uploads/../../etc/passwd"}),
        ("products", {"name": "x", "photo": "/uploads/a b.webp"}),
        ("products", {"name": "x", "photo": "/other/x.webp"}),
        ("products", {"name": "x", "photo": "https://" + "a" * 500}),
        ("products", {"name": "x", "sort_order": 10**30}),
        ("products", {"name": "x", "sort_order": "первый"}),
        ("products", {"name": "x", "is_published": "maybe"}),
        ("masterclasses", {"title": "x", "seats": -1}),
        ("masterclasses", {"title": "x", "seats": 10_001}),
        ("masterclasses", {"title": "x", "starts_at": "вчера"}),
        ("masterclasses", {"title": "x", "signup_url": "javascript:alert(1)"}),
        ("masterclasses", {"title": "x", "signup_url": "ftp://x.ru"}),
        ("masterclasses", {"title": "x", "signup_url": "https://"}),
        ("projects", {"title": "x", "gallery": "not-a-list"}),
        ("projects", {"title": "x", "gallery": ["http://x/a.png"]}),
        ("projects", {"title": "x", "gallery": [""]}),
        ("projects", {"title": "x", "gallery": ["/uploads/a.webp"] * 51}),
        ("reviews", {"author": "a", "text": ""}),
        ("reviews", {"author": "a", "text": "t" * 5001}),
        ("reviews", {"author": "a", "text": "t", "rating": 0}),
        ("reviews", {"author": "a", "text": "t", "rating": 6}),
        ("reviews", {"author": "a", "text": "t", "rating": 3.5}),
        ("promos", {"title": "x", "valid_until": "2026-13-45"}),
        ("promos", {"title": "x", "badge": "b" * 201}),
    ],
)
def test_invalid_payload_422(admin, col, body):
    r = admin.post(f"/api/admin/{col}", json=body)
    assert r.status_code == 422, r.text
    assert admin.get(f"/api/admin/{col}").json() == []


@pytest.mark.parametrize(
    "col,body",
    [
        ("products", {"name": "x" * 200, "description": "d" * 5000, "price": 0}),
        ("products", {"name": "x", "price": 100_000_000, "photo": "https://cdn.example.com/a.jpg"}),
        ("products", {"name": "я", "photo": "/uploads/" + "a" * 32 + ".webp"}),
        ("masterclasses", {"title": "x", "seats": 0, "starts_at": "2026-11-05T15:00:00"}),
        ("masterclasses", {"title": "x", "signup_url": "https://t.me/mamini"}),
        ("reviews", {"author": "a", "text": "t", "rating": 1}),
        ("reviews", {"author": "a", "text": "t", "rating": 5}),
        ("projects", {"title": "x", "gallery": ["/uploads/a.webp"] * 50}),
        ("promos", {"title": "x", "valid_until": "2030-01-01"}),
    ],
)
def test_boundary_values_accepted(admin, col, body):
    assert admin.post(f"/api/admin/{col}", json=body).status_code == 201


def test_unicode_xss_and_whitespace_roundtrip(admin):
    payload = "<script>alert(1)</script> \"'&"
    p = create(admin, "products", name="  " + payload + "\t\n", description="a\x00b\x07c")
    assert p["name"] == payload  # строка хранится как данные, обрезаны пробелы
    assert p["description"] == "abc"  # управляющие символы вырезаны
    assert admin.get("/api/products").json()[0]["name"] == payload  # экранирует фронтенд (React)


def test_empty_signup_url_normalised_to_null(admin):
    assert create(admin, "masterclasses", signup_url="  ")["signup_url"] is None


def test_naive_datetime_kept_local(admin):
    r = create(admin, "masterclasses", starts_at="2026-11-05T15:00:00")
    assert r["starts_at"] == "2026-11-05T15:00:00"


def test_extra_and_readonly_fields_ignored(admin):
    r = create(admin, "products", id=999, hacker="x")
    assert r["id"] != 999 and "hacker" not in r


def test_put_replaces_fields_and_keeps_sort_order(admin):
    p = create(admin, "products", description="старое", price=100, sort_order=7)
    r = admin.put(f"/api/admin/products/{p['id']}", json={"name": "Новое"})
    assert r.status_code == 200
    j = r.json()
    assert j["name"] == "Новое" and j["description"] == "" and j["price"] is None and j["sort_order"] == 7


def test_put_invalid_does_not_modify(admin):
    p = create(admin, "products")
    assert admin.put(f"/api/admin/products/{p['id']}", json={"name": ""}).status_code == 422
    assert admin.get(f"/api/admin/products/{p['id']}").json()["name"] == "Плед"


def test_malformed_json_body_422(admin):
    r = admin.post("/api/admin/products", content=b"{oops", headers={"content-type": "application/json"})
    assert r.status_code == 422


# ---------- reorder ----------
@pytest.mark.parametrize("col", list(OK))
def test_reorder_all_collections_and_public_order(admin, col):
    ids = [create(admin, col, **{TITLE[col]: f"n{i}"})["id"] for i in range(3)]
    assert admin.post(f"/api/admin/{col}/reorder", json={"ids": ids[::-1]}).status_code == 204
    assert [x["id"] for x in admin.get(f"/api/admin/{col}").json()] == ids[::-1]
    assert [x["id"] for x in admin.get(f"/api/{col}").json()] == ids[::-1]


def test_reorder_partial_keeps_rest_after(admin):
    ids = [create(admin, "products", name=f"n{i}")["id"] for i in range(4)]
    admin.post("/api/admin/products/reorder", json={"ids": [ids[3]]})
    assert [x["id"] for x in admin.get("/api/admin/products").json()] == [ids[3], ids[0], ids[1], ids[2]]


def test_reorder_unknown_duplicate_and_garbage(admin):
    a = create(admin, "products")["id"]
    assert admin.post("/api/admin/products/reorder", json={"ids": [a, 9999]}).status_code == 404
    assert admin.post("/api/admin/products/reorder", json={"ids": [a, a]}).status_code == 422
    assert admin.post("/api/admin/products/reorder", json={"ids": ["x"]}).status_code == 422
    assert admin.post("/api/admin/products/reorder", json={"ids": [10**30]}).status_code == 422
    assert admin.post("/api/admin/products/reorder", json={}).status_code == 422
    assert admin.post("/api/admin/products/reorder", json={"ids": []}).status_code == 204


def test_reorder_is_atomic_on_error(admin):
    ids = [create(admin, "products", name=f"n{i}")["id"] for i in range(3)]
    admin.post("/api/admin/products/reorder", json={"ids": [ids[2], 9999]})
    assert [x["id"] for x in admin.get("/api/admin/products").json()] == ids


def test_delete_then_gone_everywhere(admin):
    p = create(admin, "products")
    assert admin.delete(f"/api/admin/products/{p['id']}").status_code == 204
    assert admin.delete(f"/api/admin/products/{p['id']}").status_code == 404
    assert admin.get("/api/products").json() == [] and admin.get("/api/admin/products").json() == []


# ---------- публикация / скрытие ----------
@pytest.mark.parametrize("col", list(OK))
def test_publish_toggle_affects_public(admin, col):
    item = create(admin, col, is_published=False)
    assert admin.get(f"/api/{col}").json() == []
    assert len(admin.get(f"/api/admin/{col}").json()) == 1
    body = {**OK[col], "is_published": True}
    assert admin.put(f"/api/admin/{col}/{item['id']}", json=body).status_code == 200
    assert [x["id"] for x in admin.get(f"/api/{col}").json()] == [item["id"]]
    admin.put(f"/api/admin/{col}/{item['id']}", json={**body, "is_published": False})
    assert admin.get(f"/api/{col}").json() == []


def test_public_endpoints_need_no_session_and_do_not_leak_admin_data(client):
    for path in ["/api/site", "/api/products", "/api/masterclasses", "/api/projects", "/api/reviews", "/api/promos"]:
        assert client.get(path).status_code == 200
    text = client.get("/api/site").text
    assert "password" not in text.lower() and "secret" not in text.lower()


def test_empty_public_collections_are_empty_lists(client):
    for c in OK:
        assert client.get(f"/api/{c}").json() == []


# ---------- акции ----------
def test_promo_expiry_boundaries(admin):
    today = date.today()
    cases = {
        "вчера": (today - timedelta(days=1)).isoformat(),
        "сегодня": today.isoformat(),
        "завтра": (today + timedelta(days=1)).isoformat(),
        "бессрочная": None,
    }
    for title, until in cases.items():
        create(admin, "promos", title=title, valid_until=until)
    titles = [p["title"] for p in admin.get("/api/promos").json()]
    assert "вчера" not in titles
    assert titles == ["сегодня", "завтра", "бессрочная"]
    assert len(admin.get("/api/admin/promos").json()) == 4  # в админке видны все


def test_expired_and_hidden_promo_both_filtered(admin):
    create(admin, "promos", is_published=False, valid_until=(date.today() + timedelta(days=5)).isoformat())
    assert admin.get("/api/promos").json() == []


# ---------- настройки и страницы ----------
def full_settings(admin, **kw):
    s = admin.get("/api/admin/settings").json()
    s.update(kw)
    return s


@pytest.mark.parametrize(
    "patch",
    [
        {"menu": [{"slug": "nonexistent", "label": "x", "visible": True}]},
        {"menu": [{"slug": "catalog", "label": "", "visible": True}]},
        {"menu": [{"slug": "catalog", "label": "x" * 201, "visible": True}]},
        {"menu": [{"slug": "catalog", "label": "a", "visible": True}] * 2},
        {"menu": [{"slug": "catalog", "label": "a", "visible": True}] * 21},
        {"menu": "каталог"},
        {"contacts": {"max_url": "javascript:alert(1)"}},
        {"contacts": {"telegram_url": "t.me/x"}},
        {"contacts": {"vk_url": "ftp://vk.com/x"}},
        {"contacts": {"vk_url": "http://"}},
        {"contacts": {"vk_url": "https://vk.com/ a"}},
        {"contacts": None},
        {"hero_photo": "javascript:1"},
        {"hero_title": "x" * 201},
        {"hero_text": "x" * 1001},
        {"marquee": ["x"] * 31},
        {"marquee": ["x" * 201]},
        {"marquee": "строка"},
    ],
)
def test_settings_invalid_422_and_unchanged(admin, patch):
    before = admin.get("/api/admin/settings").json()
    assert admin.put("/api/admin/settings", json=full_settings(admin, **patch)).status_code == 422
    assert admin.get("/api/admin/settings").json() == before


def test_settings_missing_required_fields_422(admin):
    assert admin.put("/api/admin/settings", json={}).status_code == 422
    s = full_settings(admin)
    del s["contacts"]
    assert admin.put("/api/admin/settings", json=s).status_code == 422


def test_settings_save_visible_publicly(admin):
    s = full_settings(
        admin,
        hero_title="  Новый заголовок  ",
        marquee=["Раз", "  ", "Два"],
        contacts={"max_url": "", "telegram_url": "https://t.me/mamini", "vk_url": "HTTPS://vk.com/mamini"},
        menu=[{"slug": "sales", "label": "Скидки", "visible": True}, {"slug": "catalog", "label": "К", "visible": False}],  # noqa: E501
    )
    assert admin.put("/api/admin/settings", json=s).status_code == 200
    pub = admin.get("/api/site").json()["settings"]
    assert pub["hero_title"] == "Новый заголовок"
    assert pub["marquee"] == ["Раз", "Два"]
    assert pub["contacts"]["max_url"] == "" and pub["contacts"]["telegram_url"] == "https://t.me/mamini"
    assert [m["slug"] for m in pub["menu"]] == ["sales", "catalog"] and pub["menu"][1]["visible"] is False


def test_settings_empty_menu_and_marquee_allowed(admin):
    assert admin.put("/api/admin/settings", json=full_settings(admin, menu=[], marquee=[])).status_code == 200


def test_pages_all_six_and_update(admin):
    pages = admin.get("/api/admin/pages").json()
    assert [p["slug"] for p in pages] == ["home", "catalog", "masterclasses", "projects", "reviews", "sales"]
    r = admin.put("/api/admin/pages/catalog", json={"title": "Наши работы", "subtitle": "s", "seo_title": "SEO", "seo_description": "D"})  # noqa: E501
    assert r.status_code == 200 and r.json()["slug"] == "catalog"
    site = {p["slug"]: p for p in admin.get("/api/site").json()["pages"]}
    assert site["catalog"]["title"] == "Наши работы" and site["catalog"]["seo_title"] == "SEO"


@pytest.mark.parametrize(
    "slug,body",
    [
        ("nope", {}),
        ("home", {"title": "x" * 201}),
        ("home", {"subtitle": "x" * 1001}),
        ("home", {"seo_title": "x" * 201}),
        ("home", {"seo_description": "x" * 501}),
        ("home", {"title": ["a"]}),
    ],
)
def test_pages_invalid(admin, slug, body):
    assert admin.put(f"/api/admin/pages/{slug}", json=body).status_code == 422


def test_pages_slug_in_body_cannot_override_path(admin):
    admin.put("/api/admin/pages/home", json={"slug": "catalog", "title": "HOME"})
    pages = {p["slug"]: p for p in admin.get("/api/admin/pages").json()}
    assert pages["home"]["title"] == "HOME" and pages["catalog"]["title"] != "HOME"


# ---------- сидирование ----------
def test_seed_defaults_idempotent_and_keeps_edits(client):
    engine = client.app.state.engine
    client.post("/api/admin/login", json={"username": "admin", "password": "s3cret-pass"})
    client.headers.update({"Origin": "http://testserver"})
    client.put("/api/admin/pages/home", json={"title": "Мой заголовок"})
    s = client.get("/api/admin/settings").json()
    s["hero_title"] = "Мой герой"
    client.put("/api/admin/settings", json=s)
    for _ in range(3):
        seed_defaults(engine)
    with Session(engine) as db:
        assert len(db.exec(select(PageContent)).all()) == 6
        assert len(db.exec(select(SiteSettings)).all()) == 1
    assert client.get("/api/site").json()["pages"][0]["title"] == "Мой заголовок"
    assert client.get("/api/site").json()["settings"]["hero_title"] == "Мой герой"


def test_restart_does_not_duplicate_or_reset(tmp_path):
    st = make_settings(tmp_path)
    for _ in range(2):
        with TestClient(create_app(st)) as c:
            assert len(c.get("/api/site").json()["pages"]) == 6


def test_no_demo_content_by_default(client):
    assert client.get("/api/products").json() == []


def test_seed_demo_idempotent(client):
    engine = client.app.state.engine
    seed_demo(engine)
    seed_demo(engine)
    with Session(engine) as db:
        assert len(db.exec(select(Product)).all()) == 6
    assert len(client.get("/api/products").json()) == 6
    assert len(client.get("/api/promos").json()) == 2


def test_seed_demo_refused_in_production(monkeypatch, capsys):
    from app import seed

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "k")
    monkeypatch.setenv("ADMIN_PASSWORD", "p")
    assert seed.main(["--demo"]) == 1


def test_default_site_has_five_menu_items_and_no_contact_links(client):
    s = client.get("/api/site").json()["settings"]
    assert [m["slug"] for m in s["menu"]] == ["catalog", "masterclasses", "projects", "reviews", "sales"]
    assert all(m["visible"] for m in s["menu"])
    assert s["contacts"] == {"max_url": "", "telegram_url": "", "vk_url": ""}


def test_corrupt_settings_row_falls_back_to_defaults_merge(client):
    """Неполные данные в БД не должны ронять публичный /api/site."""
    with Session(client.app.state.engine) as db:
        row = db.get(SiteSettings, 1)
        row.data = {"hero_title": "Только заголовок"}
        db.add(row)
        db.commit()
    r = client.get("/api/site")
    assert r.status_code == 200 and r.json()["settings"]["hero_title"] == "Только заголовок"
