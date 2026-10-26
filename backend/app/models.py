from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    size: str = ""
    materials: str = ""
    lead_time: str = ""
    price: Optional[int] = None
    photo: Optional[str] = None
    is_published: bool = True
    sort_order: int = 0


class MasterClass(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    starts_at: Optional[datetime] = None
    duration: Optional[str] = None
    price: Optional[int] = None
    seats: Optional[int] = None
    signup_url: Optional[str] = None
    photo: Optional[str] = None
    is_published: bool = True
    sort_order: int = 0


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    photo: Optional[str] = None
    gallery: List[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    is_published: bool = True
    sort_order: int = 0


class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    author: str
    text: str
    rating: Optional[int] = None
    photo: Optional[str] = None
    is_published: bool = True
    sort_order: int = 0


class Promo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str = ""
    badge: Optional[str] = None
    valid_until: Optional[date] = None
    photo: Optional[str] = None
    is_published: bool = True
    sort_order: int = 0


class PageContent(SQLModel, table=True):
    slug: str = Field(primary_key=True)
    title: str = ""
    subtitle: str = ""
    seo_title: str = ""
    seo_description: str = ""


class SiteSettings(SQLModel, table=True):
    """Единственная строка (id=1), данные настроек — JSON."""

    id: int = Field(default=1, primary_key=True)
    data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
