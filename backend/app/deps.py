from typing import Iterator

from fastapi import Request
from sqlmodel import Session


def get_session(request: Request) -> Iterator[Session]:
    with Session(request.app.state.engine) as s:
        yield s
