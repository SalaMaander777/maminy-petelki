# Без `from __future__ import annotations`: FastAPI читает аннотации замыканий.
from typing import List, Type

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from sqlmodel import Session, select

from ..deps import get_session
from ..models import MasterClass, PageContent, Product, Project, Promo, Review
from ..schemas import (
    MasterClassIn,
    MasterClassOut,
    PageContentIn,
    PageContentModel,
    PageSlug,
    ProductIn,
    ProductOut,
    ProjectIn,
    ProjectOut,
    PromoIn,
    PromoOut,
    ReorderIn,
    ReviewIn,
    ReviewOut,
    SettingsModel,
)
from ..security import check_origin, require_admin
from ..services import load_settings, save_settings

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(check_origin), Depends(require_admin)],
)

NOT_FOUND = "Запись не найдена"


def _ordered(s: Session, model):
    return s.exec(select(model).order_by(model.sort_order, model.id)).all()


def _next_order(s: Session, model) -> int:
    last = s.exec(select(model.sort_order).order_by(model.sort_order.desc())).first()
    return 0 if last is None else last + 1


def add_crud(name: str, db: Type, in_model: Type, out_model: Type) -> None:
    sub = APIRouter(prefix="/" + name)

    @sub.get("", response_model=List[out_model], operation_id="admin_list_" + name)
    def list_items(s: Session = Depends(get_session)):
        return _ordered(s, db)

    @sub.post("", response_model=out_model, status_code=201, operation_id="admin_create_" + name)
    def create(body: in_model, s: Session = Depends(get_session)):
        data = body.model_dump()
        if data.get("sort_order") is None:
            data["sort_order"] = _next_order(s, db)
        obj = db(**data)
        s.add(obj)
        s.commit()
        s.refresh(obj)
        return obj

    @sub.post("/reorder", status_code=204, operation_id="admin_reorder_" + name)
    def reorder(body: ReorderIn, s: Session = Depends(get_session)):
        if len(set(body.ids)) != len(body.ids):
            raise HTTPException(status_code=422, detail="Повторяющиеся id")
        items = {o.id: o for o in _ordered(s, db)}
        unknown = [i for i in body.ids if i not in items]
        if unknown:
            raise HTTPException(status_code=404, detail=NOT_FOUND)
        rest = [i for i in items if i not in set(body.ids)]
        for pos, i in enumerate(body.ids + rest):
            items[i].sort_order = pos
            s.add(items[i])
        s.commit()
        return Response(status_code=204)

    @sub.get("/{item_id}", response_model=out_model, operation_id="admin_get_" + name)
    def get_one(item_id: int = Path(ge=1, le=2_147_483_647), s: Session = Depends(get_session)):
        obj = s.get(db, item_id)
        if obj is None:
            raise HTTPException(status_code=404, detail=NOT_FOUND)
        return obj

    @sub.put("/{item_id}", response_model=out_model, operation_id="admin_update_" + name)
    def update(body: in_model, item_id: int = Path(ge=1, le=2_147_483_647), s: Session = Depends(get_session)):
        obj = s.get(db, item_id)
        if obj is None:
            raise HTTPException(status_code=404, detail=NOT_FOUND)
        data = body.model_dump()
        if data.get("sort_order") is None:
            data["sort_order"] = obj.sort_order
        for k, v in data.items():
            setattr(obj, k, v)
        s.add(obj)
        s.commit()
        s.refresh(obj)
        return obj

    @sub.delete("/{item_id}", status_code=204, operation_id="admin_delete_" + name)
    def delete(item_id: int = Path(ge=1, le=2_147_483_647), s: Session = Depends(get_session)):
        obj = s.get(db, item_id)
        if obj is None:
            raise HTTPException(status_code=404, detail=NOT_FOUND)
        s.delete(obj)
        s.commit()
        return Response(status_code=204)

    router.include_router(sub)


add_crud("products", Product, ProductIn, ProductOut)
add_crud("masterclasses", MasterClass, MasterClassIn, MasterClassOut)
add_crud("projects", Project, ProjectIn, ProjectOut)
add_crud("reviews", Review, ReviewIn, ReviewOut)
add_crud("promos", Promo, PromoIn, PromoOut)


@router.get("/settings", response_model=SettingsModel)
def get_settings_(s: Session = Depends(get_session)):
    return load_settings(s)


@router.put("/settings", response_model=SettingsModel)
def put_settings(body: SettingsModel, s: Session = Depends(get_session)):
    return save_settings(s, body)


@router.get("/pages", response_model=List[PageContentModel])
def list_pages(s: Session = Depends(get_session)):
    order = ["home", "catalog", "masterclasses", "projects", "reviews", "sales"]
    pages = {p.slug: p for p in s.exec(select(PageContent)).all()}
    return [PageContentModel.model_validate(pages[k].model_dump()) for k in order if k in pages]


@router.put("/pages/{slug}", response_model=PageContentModel)
def put_page(slug: PageSlug, body: PageContentIn, s: Session = Depends(get_session)):
    page = s.get(PageContent, slug)
    if page is None:
        page = PageContent(slug=slug)
    for k, v in body.model_dump().items():
        setattr(page, k, v)
    s.add(page)
    s.commit()
    s.refresh(page)
    return PageContentModel.model_validate(page.model_dump())
