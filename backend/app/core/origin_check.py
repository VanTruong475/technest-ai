"""Origin check middleware — CSRF mitigation for SameSite=None cookie auth.

When a request carries the session cookie and uses an unsafe method
(POST/PUT/PATCH/DELETE), Origin (or Referer fallback) must be in CORS_ORIGINS.

Bearer-only / cookieless requests skip the check so TestClient, Swagger, and
API clients keep working without Origin headers.
"""

from urllib.parse import urlparse

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
_AUTH_COOKIE = "access_token"


def _allowed_origins() -> set[str]:
    return {o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()}


def _origin_from_request(request: Request) -> str | None:
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")

    # Fallback: Referer scheme://host[:port]
    referer = request.headers.get("referer")
    if not referer:
        return None
    parsed = urlparse(referer)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


class OriginCheckMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if request.method in _UNSAFE_METHODS and request.cookies.get(_AUTH_COOKIE):
            origin = _origin_from_request(request)
            allowed = _allowed_origins()
            # Normalize allowlist entries (no trailing slash)
            allowed_norm = {o.rstrip("/") for o in allowed}
            if origin is None or origin not in allowed_norm:
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "Origin not allowed",
                        "error_code": "ORIGIN_MISMATCH",
                    },
                )
        return await call_next(request)
