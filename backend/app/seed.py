"""Сидирование. Демо-данные: `python -m app.seed --demo` (не запускать в production)."""
import argparse
import sys
from datetime import date, datetime, timedelta

from sqlalchemy.engine import Engine
from sqlmodel import Session, select

from .config import get_settings
from .db import init_db, make_engine
from .defaults import DEFAULT_PAGES, DEFAULT_SETTINGS
from .models import MasterClass, PageContent, Product, Project, Promo, Review, SiteSettings


def seed_defaults(engine: Engine) -> None:
    with Session(engine) as s:
        if s.get(SiteSettings, 1) is None:
            s.add(SiteSettings(id=1, data=DEFAULT_SETTINGS))
        for page in DEFAULT_PAGES:
            if s.get(PageContent, page["slug"]) is None:
                s.add(PageContent(**page))
        s.commit()


def _empty(s: Session, model) -> bool:
    return s.exec(select(model)).first() is None


def seed_demo(engine: Engine) -> None:
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    products = [
        ("Плед «Облако»", "Мягкий плед крупной вязки из толстой пряжи. Пример описания.", "150 × 200 см", "Меринос, акрил", "от 14 дней", 7500),
        ("Шапка «Зимняя сказка»", "Тёплая шапка с отворотом и помпоном. Пример описания.", "Обхват головы 52–58 см", "Шерсть, акрил", "от 5 дней", 1800),
        ("Свитер «Уютный»", "Свитер свободного кроя с косами. Пример описания.", "S–XL, по меркам", "Шерсть мериноса", "от 21 дня", 9800),
        ("Носки «Тёплые»", "Шерстяные носки с узором. Пример описания.", "36–45", "Шерсть, нейлон", "от 4 дней", 900),
        ("Игрушка «Зайка»", "Мягкая вязаная игрушка, безопасна для детей. Пример описания.", "Высота 25 см", "Хлопок, холлофайбер", "от 7 дней", 2200),
        ("Шарф «Снежинка»", "Длинный шарф с ажурным узором. Пример описания.", "180 × 25 см", "Шерсть, шёлк", "от 7 дней", 2400),
    ]
    with Session(engine) as s:
        if _empty(s, Product):
            for i, (name, desc, size, mat, lead, price) in enumerate(products):
                s.add(Product(name=name, description=desc, size=size, materials=mat,
                              lead_time=lead, price=price, sort_order=i))
        if _empty(s, MasterClass):
            s.add(MasterClass(title="Вязание шапки за вечер", description="Пример: для новичков, пряжа включена.",
                              starts_at=now + timedelta(days=14), duration="2 часа", price=1500, seats=8,
                              signup_url="https://example.com/signup", sort_order=0))
            s.add(MasterClass(title="Амигуруми: вяжем зайку", description="Пример: вяжем игрушку крючком.",
                              starts_at=now + timedelta(days=28), duration="3 часа", price=2000, seats=6,
                              sort_order=1))
        if _empty(s, Project):
            s.add(Project(title="Пледы для роддома", description="Пример проекта.", sort_order=0))
            s.add(Project(title="Семейная коллекция свитеров", description="Пример проекта.", sort_order=1))
        if _empty(s, Review):
            s.add(Review(author="Анна", text="Плед просто чудо — мягкий и тёплый. Пример отзыва.", rating=5, sort_order=0))
            s.add(Review(author="Мария", text="Заказывала шапку, всё село идеально. Пример отзыва.", rating=5, sort_order=1))
        if _empty(s, Promo):
            s.add(Promo(title="Скидка на первый заказ", description="Пример акции.", badge="−10%",
                        valid_until=date.today() + timedelta(days=60), sort_order=0))
            s.add(Promo(title="Набор из шапки и шарфа", description="Пример акции.", badge="−20%", sort_order=1))
        s.commit()


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Сидирование БД")
    p.add_argument("--demo", action="store_true", help="добавить демо-контент (не для production)")
    args = p.parse_args(argv)
    settings = get_settings()
    if args.demo and settings.is_production:
        print("Демо-данные в production запрещены", file=sys.stderr)
        return 1
    engine = make_engine(settings)
    init_db(engine)
    seed_defaults(engine)
    if args.demo:
        seed_demo(engine)
        print("Демо-данные добавлены")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
