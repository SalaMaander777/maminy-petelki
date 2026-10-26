"""QA: загрузка файлов — подмена типа/расширения, SVG/HTML, traversal, лимиты, метаданные."""
import io
import os
import re
import stat

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import create_app
from tests.conftest import ORIGIN, make_settings, png_bytes
from tests.test_media import upload

NAME = re.compile(r"^/uploads/[0-9a-f]{32}\.webp$")


def up(c, data, name="a.png", ctype="image/png"):
    return upload(c, data, name, ctype)


SVG = b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>'
HTML = b"<!doctype html><script>alert(document.cookie)</script>"


@pytest.mark.parametrize(
    "data,name,ctype",
    [
        (SVG, "x.svg", "image/svg+xml"),
        (SVG, "x.png", "image/png"),  # SVG под видом PNG
        (SVG, "x.png", "image/jpeg"),
        (HTML, "x.html", "text/html"),
        (HTML, "x.png", "image/png"),
        (HTML, "x.webp", "image/webp"),
        (b"", "empty.png", "image/png"),
        (b"\x89PNG\r\n\x1a\n", "trunc.png", "image/png"),  # обрезанный заголовок
        (png_bytes()[:60], "cut.png", "image/png"),
        (b"GIF89a\x01\x00\x01\x00\x00\x00\x00;", "x.png", "image/png"),  # GIF под PNG
        (png_bytes(fmt="GIF"), "x.gif", "image/gif"),
        (png_bytes(fmt="BMP"), "x.png", "image/png"),  # BMP под PNG
        (png_bytes(fmt="TIFF"), "x.jpg", "image/jpeg"),
        (b"%PDF-1.4 ...", "x.pdf", "application/pdf"),
        (b"MZ\x90\x00", "x.exe", "application/octet-stream"),
    ],
)
def test_non_allowed_content_rejected_415(admin, tmp_path, data, name, ctype):
    assert up(admin, data, name, ctype).status_code == 415
    assert admin.get("/api/admin/media").json() == []


def test_ctype_missing_or_mixed_case(admin):
    r = admin.post("/api/admin/media", files={"file": ("a.png", png_bytes(), "")})
    assert r.status_code == 415
    assert up(admin, png_bytes(), "a.png", "IMAGE/PNG").status_code == 201


def test_wrong_extension_but_valid_image_is_reencoded(admin):
    """Расширение/имя игнорируются: PNG с именем .php сохраняется как uuid.webp."""
    r = up(admin, png_bytes(), "shell.php", "image/png")
    assert r.status_code == 201 and NAME.match(r.json()["url"])
    served = admin.get(r.json()["url"])
    assert served.headers["content-type"] == "image/webp"
    assert served.headers["x-content-type-options"] == "nosniff"
    assert Image.open(io.BytesIO(served.content)).format == "WEBP"


@pytest.mark.parametrize("name", ["../../evil.png", "..\\..\\evil.png", "/etc/passwd", "a/b/c.png", "x\x00.png", "тест.png", "a" * 400 + ".png"])  # noqa: E501
def test_hostile_filenames_never_used(admin, tmp_path, name):
    r = up(admin, png_bytes(), name, "image/png")
    assert r.status_code == 201 and NAME.match(r.json()["url"])
    files = os.listdir(tmp_path / "uploads")
    assert all(re.match(r"^[0-9a-f]{32}\.webp$", f) for f in files)
    assert not (tmp_path / "evil.png").exists()


def test_polyglot_png_with_html_tail_is_sanitised(admin):
    url = up(admin, png_bytes() + HTML).json()["url"]
    body = admin.get(url).content
    assert b"<script" not in body and body[:4] == b"RIFF"


def test_exif_and_metadata_stripped(admin):
    buf = io.BytesIO()
    img = Image.new("RGB", (50, 40), (1, 2, 3))
    exif = Image.Exif()
    exif[0x010E] = "SECRET-GPS-DESCRIPTION"
    img.save(buf, format="JPEG", exif=exif)
    assert b"SECRET-GPS" in buf.getvalue()
    url = up(admin, buf.getvalue(), "a.jpg", "image/jpeg").json()["url"]
    assert b"SECRET-GPS" not in admin.get(url).content


def test_exif_orientation_applied(admin):
    buf = io.BytesIO()
    exif = Image.Exif()
    exif[0x0112] = 6  # поворот на 90°
    Image.new("RGB", (100, 40), (9, 9, 9)).save(buf, format="JPEG", exif=exif)
    url = up(admin, buf.getvalue(), "a.jpg", "image/jpeg").json()["url"]
    assert Image.open(io.BytesIO(admin.get(url).content)).size == (40, 100)


def test_small_image_not_upscaled_and_exact_1920_kept(admin):
    for size in [(10, 10), (1920, 100)]:
        url = up(admin, png_bytes(size)).json()["url"]
        assert Image.open(io.BytesIO(admin.get(url).content)).size == size


def test_png_with_alpha_and_palette(admin):
    buf = io.BytesIO()
    Image.new("RGBA", (20, 20), (255, 0, 0, 0)).save(buf, format="PNG")
    assert up(admin, buf.getvalue()).status_code == 201
    buf = io.BytesIO()
    Image.new("P", (20, 20)).save(buf, format="PNG")
    assert up(admin, buf.getvalue()).status_code == 201


def test_decompression_bomb_rejected(admin):
    """PNG 12000x12000 (144 Мпикс) мал по размеру, но не должен декодироваться."""
    buf = io.BytesIO()
    Image.new("1", (12000, 12000)).save(buf, format="PNG")
    assert len(buf.getvalue()) < 8 * 1024 * 1024
    assert up(admin, buf.getvalue()).status_code == 415


def test_size_limit_boundary(tmp_path):
    data = png_bytes()
    with TestClient(create_app(make_settings(tmp_path, MAX_UPLOAD_BYTES=str(len(data))))) as c:
        c.post("/api/admin/login", json={"username": "admin", "password": "s3cret-pass"})
        c.headers.update(ORIGIN)
        assert up(c, data).status_code == 201  # ровно лимит
        assert up(c, data + b"\0").status_code == 413  # лимит + 1 байт


def test_413_checked_before_content_and_not_stored(admin, tmp_path):
    big = b"\0" * (8 * 1024 * 1024 + 1)
    assert up(admin, big).status_code == 413
    assert admin.get("/api/admin/media").json() == []


def test_missing_file_field_422(admin):
    assert admin.post("/api/admin/media", data={"x": "y"}).status_code == 422
    assert admin.post("/api/admin/media").status_code == 422


def test_uploaded_file_not_executable(admin, tmp_path):
    up(admin, png_bytes())
    for f in (tmp_path / "uploads").iterdir():
        mode = stat.S_IMODE(f.stat().st_mode)
        assert not mode & 0o111 and not mode & 0o002, oct(mode)  # без x и без записи для всех


def test_media_list_ignores_foreign_files_and_orders_newest_first(admin, tmp_path):
    first = up(admin, png_bytes()).json()["url"]
    d = tmp_path / "uploads"
    (d / "shell.php").write_text("<?php ?>")
    (d / ".htaccess").write_text("x")
    second = up(admin, png_bytes()).json()["url"]
    os.utime(d / first.split("/")[-1], (1, 1))
    urls = [i["url"] for i in admin.get("/api/admin/media").json()]
    assert urls == [second, first]
    assert admin.get("/uploads/shell.php").status_code == 404
    assert admin.get("/uploads/.htaccess").status_code == 404


@pytest.mark.parametrize(
    "url",
    [
        "/uploads/../test.db",
        "/uploads/..%2ftest.db",
        "/uploads/" + "a" * 32 + ".png",
        "/uploads/" + "A" * 32 + ".webp",
        "/uploads/" + "a" * 32 + ".webp/",
        "/uploads/" + "a" * 32 + ".webp\n",
        "/uploads//" + "a" * 32 + ".webp",
        "uploads/" + "a" * 32 + ".webp",
        "https://evil.com/uploads/" + "a" * 32 + ".webp",
        "/etc/passwd",
        "",
        "/uploads/",
        "../" * 5 + "etc/passwd",
    ],
)
def test_delete_media_rejects_bad_urls(admin, tmp_path, url):
    keep = tmp_path / "test.db"
    keep.write_text("x")
    assert admin.request("DELETE", "/api/admin/media", json={"url": url}).status_code == 404
    assert keep.exists()


def test_delete_media_bad_body_422(admin):
    assert admin.request("DELETE", "/api/admin/media", json={}).status_code == 422
    assert admin.request("DELETE", "/api/admin/media", json={"url": 5}).status_code == 422


@pytest.mark.parametrize("path", ["/uploads/..%2f..%2fapp.db", "/uploads/%2e%2e/test.db", "/uploads/....//x", "/uploads/%00", "/uploads/a.webp", "/uploads/"])  # noqa: E501
def test_serve_traversal_and_unknown_404(client, path):
    assert client.get(path).status_code == 404


def test_uploaded_media_is_publicly_readable_without_session(admin):
    url = up(admin, png_bytes()).json()["url"]
    admin.cookies.clear()
    r = admin.get(url)
    assert r.status_code == 200 and "immutable" in r.headers["cache-control"]


def test_photo_url_from_upload_accepted_by_content(admin):
    url = up(admin, png_bytes()).json()["url"]
    assert admin.post("/api/admin/products", json={"name": "x", "photo": url}).status_code == 201
