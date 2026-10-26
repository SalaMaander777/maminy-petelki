import pytest

SAMPLES = {
    "products": {"name": "Плед", "description": "d", "size": "1", "materials": "m", "lead_time": "7", "price": 100},
    "masterclasses": {"title": "МК", "starts_at": "2026-11-05T15:00:00", "duration": "2 часа", "price": 10, "seats": 5,
                      "signup_url": "https://example.com/x"},
    "projects": {"title": "Проект", "gallery": ["/uploads/a.webp", "https://x.ru/b.jpg"]},
    "reviews": {"author": "Анна", "text": "Супер", "rating": 5},
    "promos": {"title": "Акция", "badge": "−20%", "valid_until": "2030-01-01"},
}
UPDATED = {"products": ("name", "Новое"), "masterclasses": ("title", "Новое"), "projects": ("title", "Новое"),
           "reviews": ("author", "Новое"), "promos": ("title", "Новое")}


@pytest.mark.parametrize("col", list(SAMPLES))
def test_crud_cycle(admin, col):
    base = f"/api/admin/{col}"
    r = admin.post(base, json=SAMPLES[col])
    assert r.status_code == 201, r.text
    obj = r.json()
    for k, v in SAMPLES[col].items():
        assert obj[k] == v
    assert obj["is_published"] is True and "id" in obj
    assert admin.get(f"{base}/{obj['id']}").json() == obj
    assert admin.get(base).json() == [obj]

    field, val = UPDATED[col]
    body = dict(SAMPLES[col], **{field: val}, is_published=False)
    r = admin.put(f"{base}/{obj['id']}", json=body)
    assert r.status_code == 200 and r.json()[field] == val and r.json()["is_published"] is False

    assert admin.delete(f"{base}/{obj['id']}").status_code == 204
    assert admin.get(f"{base}/{obj['id']}").status_code == 404
    assert admin.delete(f"{base}/{obj['id']}").status_code == 404
    assert admin.put(f"{base}/999", json=SAMPLES[col]).status_code == 404


@pytest.mark.parametrize("col", list(SAMPLES))
def test_reorder(admin, col):
    base = f"/api/admin/{col}"
    key = "name" if col == "products" else "author" if col == "reviews" else "title"
    ids = []
    for i in range(3):
        body = dict(SAMPLES[col], **{key: f"n{i}"})
        ids.append(admin.post(base, json=body).json()["id"])
    new = [ids[2], ids[0], ids[1]]
    assert admin.post(f"{base}/reorder", json={"ids": new}).status_code == 204
    assert [o["id"] for o in admin.get(base).json()] == new
    assert admin.post(f"{base}/reorder", json={"ids": [9999]}).status_code == 404
    assert admin.post(f"{base}/reorder", json={"ids": [ids[0], ids[0]]}).status_code == 422


def test_auto_sort_order_appends(admin):
    a = admin.post("/api/admin/products", json={"name": "a"}).json()
    b = admin.post("/api/admin/products", json={"name": "b"}).json()
    assert b["sort_order"] == a["sort_order"] + 1


def test_strip_and_clean(admin):
    r = admin.post("/api/admin/products", json={"name": "  Плед  "})
    assert r.json()["name"] == "Плед"


def test_settings_and_pages(admin):
    s = admin.get("/api/admin/settings").json()
    s["hero_title"] = "Новый заголовок"
    s["contacts"]["telegram_url"] = "https://t.me/mamini"
    s["marquee"] = ["a", "b"]
    s["menu"][0]["visible"] = False
    assert admin.put("/api/admin/settings", json=s).status_code == 200
    got = admin.get("/api/site").json()["settings"]
    assert got["hero_title"] == "Новый заголовок" and got["marquee"] == ["a", "b"]
    assert got["menu"][0]["visible"] is False and got["contacts"]["telegram_url"] == "https://t.me/mamini"

    s["contacts"]["vk_url"] = "javascript:alert(1)"
    assert admin.put("/api/admin/settings", json=s).status_code == 422

    pages = admin.get("/api/admin/pages").json()
    assert len(pages) == 6
    body = {"title": "Каталог!", "subtitle": "s", "seo_title": "t", "seo_description": "d"}
    r = admin.put("/api/admin/pages/catalog", json=body)
    assert r.status_code == 200 and r.json() == dict(body, slug="catalog")
    assert admin.put("/api/admin/pages/nope", json=body).status_code == 422
