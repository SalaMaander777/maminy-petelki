import io

from PIL import Image

from tests.conftest import png_bytes


def upload(c, data, name="a.png", ctype="image/png"):
    return c.post("/api/admin/media", files={"file": (name, data, ctype)})


def test_upload_list_serve_delete(admin, tmp_path):
    r = upload(admin, png_bytes())
    assert r.status_code == 201
    url = r.json()["url"]
    assert url.startswith("/uploads/") and url.endswith(".webp") and "a.png" not in url
    served = admin.get(url)
    assert served.status_code == 200 and served.headers["content-type"] == "image/webp"
    assert Image.open(io.BytesIO(served.content)).format == "WEBP"
    items = admin.get("/api/admin/media").json()
    assert [i["url"] for i in items] == [url] and items[0]["size"] > 0
    assert admin.request("DELETE", "/api/admin/media", json={"url": url}).status_code == 204
    assert admin.get(url).status_code == 404
    assert admin.request("DELETE", "/api/admin/media", json={"url": url}).status_code == 404


def test_resize_large(admin):
    url = upload(admin, png_bytes((3000, 1500))).json()["url"]
    img = Image.open(io.BytesIO(admin.get(url).content))
    assert img.size == (1920, 960)


def test_jpeg_accepted(admin):
    assert upload(admin, png_bytes(fmt="JPEG"), "a.jpg", "image/jpeg").status_code == 201


def test_non_image_415(admin):
    assert upload(admin, b"hello", "a.txt", "text/plain").status_code == 415
    assert upload(admin, b"<?php echo 1;", "a.png", "image/png").status_code == 415  # врёт content-type
    assert upload(admin, png_bytes(fmt="GIF"), "a.gif", "image/gif").status_code == 415


def test_too_large_413(admin):
    data = png_bytes() + b"\0" * (8 * 1024 * 1024)
    assert upload(admin, data).status_code == 413


def test_upload_requires_auth(client):
    assert upload(client, png_bytes()).status_code == 401


def test_delete_path_traversal(admin):
    r = admin.request("DELETE", "/api/admin/media", json={"url": "/uploads/../test.db"})
    assert r.status_code == 404
    assert admin.get("/uploads/..%2Ftest.db").status_code == 404
