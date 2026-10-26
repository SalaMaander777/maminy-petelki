from fastapi import APIRouter, Depends, HTTPException, Request, Response

from ..schemas import LoginIn, MeOut, OkOut
from ..security import (
    COOKIE_NAME,
    check_origin,
    client_ip,
    make_session_token,
    require_admin,
)

router = APIRouter(prefix="/api/admin", tags=["auth"], dependencies=[Depends(check_origin)])


@router.post("/login", response_model=OkOut)
def login(body: LoginIn, request: Request, response: Response):
    st = request.app.state
    ip = client_ip(request)
    wait = st.limiter.retry_after(ip)
    if wait:
        raise HTTPException(
            status_code=429,
            detail="Слишком много попыток входа. Попробуйте позже.",
            headers={"Retry-After": str(wait)},
        )
    if not st.auth.verify(body.username, body.password):
        st.limiter.failure(ip)
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    st.limiter.success(ip)
    settings = st.settings
    response.set_cookie(
        COOKIE_NAME,
        make_session_token(settings, settings.admin_username),
        max_age=settings.session_hours * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )
    return OkOut()


@router.post("/logout", response_model=OkOut)
def logout(request: Request, response: Response):
    response.delete_cookie(
        COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
        secure=request.app.state.settings.cookie_secure,
    )
    return OkOut()


@router.get("/me", response_model=MeOut)
def me(user: str = Depends(require_admin)):
    return MeOut(username=user)
