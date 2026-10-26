import io
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, ImageOps, UnidentifiedImageError

from ..schemas import MediaDeleteIn, MediaItem, MediaOut
from ..security import check_origin, require_admin

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_WIDTH = 1920
NAME_RE = re.compile(r"^[0-9a-f]{32}\.webp$")

Image.MAX_IMAGE_PIXELS = 60_000_000

router = APIRouter(
    prefix="/api/admin/media",
    tags=["media"],
    dependencies=[Depends(check_origin), Depends(require_admin)],
)
public = APIRouter(tags=["media"])


def _dir(request: Request) -> Path:
    return request.app.state.settings.uploads_path


def _process(raw: bytes) -> bytes:
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            fmt = probe.format
            probe.verify()
        if fmt not in ALLOWED_FORMATS:
            raise ValueError("format")
        img = Image.open(io.BytesIO(raw))
        img.load()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError):
        raise HTTPException(status_code=415, detail="Файл не является допустимым изображением") from None
    img = ImageOps.exif_transpose(img)
    if img.width > MAX_WIDTH:
        h = max(1, round(img.height * MAX_WIDTH / img.width))
        img = img.resize((MAX_WIDTH, h), Image.LANCZOS)
    img = img.convert("RGBA" if "A" in img.getbands() or img.mode == "P" else "RGB")
    out = io.BytesIO()
    img.save(out, format="WEBP", quality=85, method=4)  # без EXIF/метаданных
    return out.getvalue()


@router.post("", response_model=MediaOut, status_code=201)
async def upload(request: Request, file: UploadFile = File(...)):
    if (file.content_type or "").lower() not in ALLOWED_TYPES:
        raise HTTPException(status_code=415, detail="Допустимы только JPEG, PNG и WebP")
    limit = request.app.state.settings.max_upload_bytes
    raw = await file.read(limit + 1)
    if len(raw) > limit:
        raise HTTPException(status_code=413, detail="Файл больше 8 МБ")
    data = _process(raw)
    d = _dir(request)
    d.mkdir(parents=True, exist_ok=True)
    name = uuid.uuid4().hex + ".webp"
    (d / name).write_bytes(data)
    return MediaOut(url="/uploads/" + name)


@router.get("", response_model=List[MediaItem])
def list_media(request: Request):
    d = _dir(request)
    items = []
    if d.exists():
        for p in d.iterdir():
            if NAME_RE.match(p.name):
                st = p.stat()
                items.append(
                    MediaItem(url="/uploads/" + p.name, size=st.st_size,
                              created_at=datetime.fromtimestamp(st.st_mtime))
                )
    items.sort(key=lambda i: i.created_at, reverse=True)
    return items


@router.delete("", status_code=204)
def delete_media(body: MediaDeleteIn, request: Request):
    m = re.match(r"^/uploads/([0-9a-f]{32}\.webp)$", body.url.strip())
    path = _dir(request) / m.group(1) if m else None
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден")
    path.unlink()
    return Response(status_code=204)


@public.get("/uploads/{name}", include_in_schema=False)
def serve(name: str, request: Request):
    if not NAME_RE.match(name):
        raise HTTPException(status_code=404, detail="Файл не найден")
    path = _dir(request) / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(
        path,
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"},
    )
