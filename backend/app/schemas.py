import re
from datetime import date, datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing_extensions import Annotated

PageSlug = Literal["home", "catalog", "masterclasses", "projects", "reviews", "sales"]
PAGE_SLUGS = ["home", "catalog", "masterclasses", "projects", "reviews", "sales"]

_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_str(v: Any) -> Any:
    """Обрезает пробелы и вырезает управляющие символы."""
    if isinstance(v, str):
        return _CTRL.sub("", v).strip()
    return v


def _photo(v: Any) -> Any:
    v = clean_str(v)
    if v in (None, ""):
        return None
    if not isinstance(v, str):
        return v
    if ".." in v or any(c.isspace() for c in v):
        raise ValueError("Недопустимый путь к фото")
    if not (v.startswith("/uploads/") or v.startswith("https://")):
        raise ValueError("Фото: только /uploads/… или https://")
    if len(v) > 500:
        raise ValueError("Слишком длинная ссылка")
    return v


def _url(v: Any) -> Any:
    v = clean_str(v)
    if v is None:
        return None
    if not isinstance(v, str):
        return v
    if v == "":
        return ""
    if not re.match(r"^https?://[^\s/]+\S*$", v, re.I) or len(v) > 500:
        raise ValueError("Ссылка должна начинаться с http:// или https://")
    return v


Name = Annotated[str, Field(min_length=1, max_length=200)]
Text = Annotated[str, Field(max_length=5000)]
Short = Annotated[str, Field(max_length=200)]
Money = Annotated[int, Field(ge=0, le=100_000_000)]
SortOrder = Annotated[int, Field(ge=-1_000_000_000, le=1_000_000_000)]
RowId = Annotated[int, Field(ge=1, le=2_147_483_647)]


class Base(BaseModel):
    model_config = ConfigDict(extra="ignore")

    @field_validator("*", mode="before")
    @classmethod
    def _strip(cls, v: Any) -> Any:
        return clean_str(v)




class ProductIn(Base):
    name: Name
    description: Text = ""
    size: Short = ""
    materials: Short = ""
    lead_time: Short = ""
    price: Optional[Money] = None
    photo: Optional[str] = None
    is_published: bool = True
    sort_order: Optional[SortOrder] = None

    v_photo = field_validator("photo", mode="before")(_photo)


class ProductOut(ProductIn):
    id: int
    sort_order: int


class MasterClassIn(Base):
    title: Name
    description: Text = ""
    starts_at: Optional[datetime] = None
    duration: Optional[Short] = None
    price: Optional[Money] = None
    seats: Optional[Annotated[int, Field(ge=0, le=10_000)]] = None
    signup_url: Optional[str] = None
    photo: Optional[str] = None
    is_published: bool = True
    sort_order: Optional[SortOrder] = None

    v_photo = field_validator("photo", mode="before")(_photo)

    @field_validator("signup_url", mode="before")
    @classmethod
    def _su(cls, v: Any) -> Any:
        v = _url(v)
        return v or None


class MasterClassOut(MasterClassIn):
    id: int
    sort_order: int


class ProjectIn(Base):
    title: Name
    description: Text = ""
    photo: Optional[str] = None
    gallery: List[str] = Field(default_factory=list, max_length=50)
    is_published: bool = True
    sort_order: Optional[SortOrder] = None

    v_photo = field_validator("photo", mode="before")(_photo)

    @field_validator("gallery", mode="before")
    @classmethod
    def _g(cls, v: Any) -> Any:
        if v is None:
            return []
        if not isinstance(v, list):
            raise ValueError("gallery должен быть списком")
        out = [_photo(x) for x in v]
        if any(x is None for x in out):
            raise ValueError("Пустой путь к фото в галерее")
        return out


class ProjectOut(ProjectIn):
    id: int
    sort_order: int


class ReviewIn(Base):
    author: Name
    text: Annotated[str, Field(min_length=1, max_length=5000)]
    rating: Optional[Annotated[int, Field(ge=1, le=5)]] = None
    photo: Optional[str] = None
    is_published: bool = True
    sort_order: Optional[SortOrder] = None

    v_photo = field_validator("photo", mode="before")(_photo)


class ReviewOut(ReviewIn):
    id: int
    sort_order: int


class PromoIn(Base):
    title: Name
    description: Text = ""
    badge: Optional[Short] = None
    valid_until: Optional[date] = None
    photo: Optional[str] = None
    is_published: bool = True
    sort_order: Optional[SortOrder] = None

    v_photo = field_validator("photo", mode="before")(_photo)


class PromoOut(PromoIn):
    id: int
    sort_order: int


class ReorderIn(BaseModel):
    ids: List[RowId]


class PageContentModel(Base):
    slug: PageSlug
    title: Short = ""
    subtitle: Annotated[str, Field(max_length=1000)] = ""
    seo_title: Short = ""
    seo_description: Annotated[str, Field(max_length=500)] = ""


class PageContentIn(Base):
    title: Short = ""
    subtitle: Annotated[str, Field(max_length=1000)] = ""
    seo_title: Short = ""
    seo_description: Annotated[str, Field(max_length=500)] = ""


class MenuItem(Base):
    slug: PageSlug
    label: Name
    visible: bool = True


class Contacts(Base):
    max_url: str = ""
    telegram_url: str = ""
    vk_url: str = ""

    v_urls = field_validator("max_url", "telegram_url", "vk_url", mode="before")(_url)


class SettingsModel(Base):
    hero_title: Short
    hero_text: Annotated[str, Field(max_length=1000)]
    hero_cta: Short
    hero_photo: Optional[str] = None
    marquee: List[Short] = Field(default_factory=list, max_length=30)
    menu: List[MenuItem] = Field(max_length=20)
    contacts: Contacts
    footer_title: Short
    footer_text: Annotated[str, Field(max_length=1000)]
    copyright: Short
    site_name: Short

    v_photo = field_validator("hero_photo", mode="before")(_photo)

    @field_validator("menu")
    @classmethod
    def _menu_unique(cls, v: List["MenuItem"]) -> List["MenuItem"]:
        slugs = [m.slug for m in v]
        if len(set(slugs)) != len(slugs):
            raise ValueError("Пункты меню не должны повторяться")
        return v

    @field_validator("marquee", mode="before")
    @classmethod
    def _m(cls, v: Any) -> Any:
        if isinstance(v, list):
            return [clean_str(x) for x in v if clean_str(x) != ""]
        return v


class SiteOut(BaseModel):
    settings: SettingsModel
    pages: List[PageContentModel]


class LoginIn(BaseModel):
    username: Annotated[str, Field(min_length=1, max_length=200)]
    password: Annotated[str, Field(min_length=1, max_length=200)]


class OkOut(BaseModel):
    ok: bool = True


class MeOut(BaseModel):
    username: str


class MediaOut(BaseModel):
    url: str


class MediaItem(BaseModel):
    url: str
    size: int
    created_at: datetime


class MediaDeleteIn(BaseModel):
    url: str
