import threading
import time
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlsplit

import bcrypt
from fastapi import Depends, HTTPException, Request
from itsdangerous import BadSignature, URLSafeTimedSerializer

from .config import Settings

COOKIE_NAME = "session"
_SALT = "admin-session"
# Хеш-заглушка для выравнивания времени при неверном логине.
_DUMMY_HASH = bcrypt.hashpw(b"dummy", bcrypt.gensalt(rounds=10))


def _pw_bytes(password: str) -> bytes:
    return password.encode("utf-8")[:72]  # ограничение bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt()).decode()


class AdminAuth:
    """Единственный администратор из окружения."""

    def __init__(self, settings: Settings):
        self.username = settings.admin_username
        self.configured = True
        if settings.admin_password_hash:
            self._hash = settings.admin_password_hash.encode()
        elif settings.admin_password:
            self._hash = hash_password(settings.admin_password).encode()
        else:
            self._hash = b""
            self.configured = False

    def verify(self, username: str, password: str) -> bool:
        try:
            if not self.configured:
                bcrypt.checkpw(_pw_bytes(password), _DUMMY_HASH)
                return False
            ok_pw = bcrypt.checkpw(_pw_bytes(password), self._hash)
        except ValueError:
            return False
        import hmac

        ok_user = hmac.compare_digest(username.encode(), self.username.encode())
        return ok_pw and ok_user


class LoginLimiter:
    def __init__(self, settings: Settings):
        self.max = settings.login_max_failures
        self.window = settings.login_window_seconds
        self.block = settings.login_block_seconds
        self._fails: Dict[str, List[float]] = {}
        self._blocked: Dict[str, float] = {}
        self._lock = threading.Lock()

    def retry_after(self, ip: str) -> int:
        with self._lock:
            until = self._blocked.get(ip, 0)
            now = time.time()
            if until > now:
                return int(until - now) + 1
            self._blocked.pop(ip, None)
            return 0

    def failure(self, ip: str) -> None:
        with self._lock:
            now = time.time()
            recent = [t for t in self._fails.get(ip, []) if now - t < self.window]
            recent.append(now)
            self._fails[ip] = recent
            if len(recent) >= self.max:
                self._blocked[ip] = now + self.block
                self._fails.pop(ip, None)

    def success(self, ip: str) -> None:
        with self._lock:
            self._fails.pop(ip, None)


def client_ip(request: Request) -> str:
    if request.app.state.settings.trust_proxy:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _serializer(settings: Settings) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.secret_key, salt=_SALT)


def make_session_token(settings: Settings, username: str) -> str:
    return _serializer(settings).dumps({"u": username})


def read_session_token(settings: Settings, token: str) -> Optional[str]:
    try:
        data = _serializer(settings).loads(token, max_age=settings.session_hours * 3600)
    except BadSignature:
        return None
    return data.get("u") if isinstance(data, dict) else None


def require_admin(request: Request) -> str:
    settings: Settings = request.app.state.settings
    token = request.cookies.get(COOKIE_NAME)
    user = read_session_token(settings, token) if token else None
    if not user or user != settings.admin_username:
        raise HTTPException(status_code=401, detail="Требуется авторизация")
    return user


def _netloc(value: str) -> Tuple[str, str]:
    p = urlsplit(value)
    return p.scheme, p.netloc


def check_origin(request: Request) -> None:
    """CSRF: для изменяющих запросов Origin должен совпадать с Host."""
    if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
        return
    origin = request.headers.get("origin")
    if origin is None:
        return  # не браузер; cookie SameSite=Lax не уходит с чужих сайтов на POST
    settings: Settings = request.app.state.settings
    if origin.rstrip("/") in settings.origins_list:
        return
    _, netloc = _netloc(origin)
    hosts = {request.headers.get("host", "")}
    fwd = request.headers.get("x-forwarded-host")
    if fwd:
        hosts.add(fwd.split(",")[0].strip())
    if netloc and netloc in hosts:
        return
    raise HTTPException(status_code=403, detail="Недопустимый Origin")


AdminDep = Depends(require_admin)
