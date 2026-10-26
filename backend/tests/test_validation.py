import pytest


@pytest.mark.parametrize(
    "col,body",
    [
        ("products", {"name": ""}),
        ("products", {"name": "   "}),
        ("products", {}),
        ("products", {"name": "x" * 201}),
        ("products", {"name": "x", "price": -1}),
        ("products", {"name": "x", "description": "d" * 5001}),
        ("products", {"name": "x", "photo": "http://insecure/x.jpg"}),
        ("products", {"name": "x", "photo": "javascript:alert(1)"}),
        ("products", {"name": "x", "photo": "/uploads/../etc/passwd"}),
        ("reviews", {"author": "a", "text": "t", "rating": 6}),
        ("reviews", {"author": "a", "text": "t", "rating": 0}),
        ("reviews", {"author": "a", "text": ""}),
        ("masterclasses", {"title": "t", "signup_url": "ftp://x"}),
        ("masterclasses", {"title": "t", "signup_url": "javascript:alert(1)"}),
        ("masterclasses", {"title": "t", "starts_at": "not-a-date"}),
        ("promos", {"title": "t", "valid_until": "bad"}),
        ("projects", {"title": "t", "gallery": ["ftp://x"]}),
    ],
)
def test_invalid_payloads_422(admin, col, body):
    assert admin.post(f"/api/admin/{col}", json=body).status_code == 422


def test_empty_url_allowed(admin):
    r = admin.post("/api/admin/masterclasses", json={"title": "t", "signup_url": "", "photo": ""})
    assert r.status_code == 201
    assert r.json()["signup_url"] is None and r.json()["photo"] is None
