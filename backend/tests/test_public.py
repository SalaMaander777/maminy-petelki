from datetime import date, timedelta


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_site_defaults(client):
    d = client.get("/api/site").json()
    assert d["settings"]["hero_title"] == "Вязаное с душой, связанное вручную"
    assert d["settings"]["hero_cta"] == "Смотреть каталог"
    assert [m["label"] for m in d["settings"]["menu"]] == ["Каталог", "Мастер-классы", "Проекты", "Отзывы", "Акции"]
    assert [p["slug"] for p in d["pages"]] == ["home", "catalog", "masterclasses", "projects", "reviews", "sales"]


def test_public_only_published_and_ordered(admin):
    for name, order, pub in [("C", 2, True), ("A", 0, True), ("Hidden", 1, False), ("B", 1, True)]:
        r = admin.post("/api/admin/products", json={"name": name, "sort_order": order, "is_published": pub})
        assert r.status_code == 201
    admin.cookies.clear()
    names = [p["name"] for p in admin.get("/api/products").json()]
    assert names == ["A", "B", "C"]


def test_public_other_collections_hide_unpublished(admin):
    admin.post("/api/admin/reviews", json={"author": "X", "text": "t", "is_published": False})
    admin.post("/api/admin/reviews", json={"author": "Y", "text": "t", "rating": 5})
    admin.post("/api/admin/projects", json={"title": "P", "is_published": False})
    admin.post("/api/admin/masterclasses", json={"title": "M", "is_published": False})
    assert [r["author"] for r in admin.get("/api/reviews").json()] == ["Y"]
    assert admin.get("/api/projects").json() == []
    assert admin.get("/api/masterclasses").json() == []


def test_promos_expired_hidden(admin):
    today = date.today()
    admin.post("/api/admin/promos", json={"title": "old", "valid_until": str(today - timedelta(days=1))})
    admin.post("/api/admin/promos", json={"title": "today", "valid_until": str(today)})
    admin.post("/api/admin/promos", json={"title": "forever"})
    titles = [p["title"] for p in admin.get("/api/promos").json()]
    assert titles == ["today", "forever"]
    assert len(admin.get("/api/admin/promos").json()) == 3
