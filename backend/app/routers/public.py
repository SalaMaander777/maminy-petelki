from datetime import date
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from ..deps import get_session
from ..models import MasterClass, PageContent, Product, Project, Promo, Review
from ..schemas import (
    PAGE_SLUGS,
    MasterClassOut,
    PageContentModel,
    ProductOut,
    ProjectOut,
    PromoOut,
    ReviewOut,
    SiteOut,
)
from ..services import load_settings

router = APIRouter(prefix="/api", tags=["public"])


def _published(s: Session, model):
    stmt = select(model).where(model.is_published == True).order_by(  # noqa: E712
        model.sort_order, model.id
    )
    return s.exec(stmt).all()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/site", response_model=SiteOut)
def site(s: Session = Depends(get_session)):
    pages = {p.slug: p for p in s.exec(select(PageContent)).all()}
    ordered = [PageContentModel.model_validate(pages[k].model_dump()) for k in PAGE_SLUGS if k in pages]
    return SiteOut(settings=load_settings(s), pages=ordered)


@router.get("/products", response_model=List[ProductOut])
def products(s: Session = Depends(get_session)):
    return _published(s, Product)


@router.get("/masterclasses", response_model=List[MasterClassOut])
def masterclasses(s: Session = Depends(get_session)):
    return _published(s, MasterClass)


@router.get("/projects", response_model=List[ProjectOut])
def projects(s: Session = Depends(get_session)):
    return _published(s, Project)


@router.get("/reviews", response_model=List[ReviewOut])
def reviews(s: Session = Depends(get_session)):
    return _published(s, Review)


@router.get("/promos", response_model=List[PromoOut])
def promos(s: Session = Depends(get_session)):
    today = date.today()
    return [p for p in _published(s, Promo) if p.valid_until is None or p.valid_until >= today]
