"""Security response headers middleware.

Attaches baseline hardening headers after the response is generated so
streaming (SSE) paths are unaffected — we only mutate response.headers.

Swagger UI /docs needs relaxed CSP so CDN resources can load.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

# API serves JSON only — deny framing and default content loading.
_API_CSP = "default-src 'none'; frame-ancestors 'none'"

# Relaxed CSP for Swagger UI (/docs, /redoc, /openapi.json).
# Allows CDN scripts/styles and a favicon from FastAPI docs.
_DOCS_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "img-src 'self' https://fastapi.tiangolo.com data:; "
    "font-src 'self' data:; "
    "frame-ancestors 'none'"
)

_DOCS_PREFIXES = ("/docs", "/redoc", "/openapi.json")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault(
            "Referrer-Policy", "strict-origin-when-cross-origin"
        )
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )

        # Relax CSP for Swagger/ReDoc docs pages.
        if request.url.path.startswith(_DOCS_PREFIXES):
            response.headers.setdefault(
                "Content-Security-Policy", _DOCS_CSP
            )
        else:
            response.headers.setdefault("Content-Security-Policy", _API_CSP)

        if settings.ENVIRONMENT == "production":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )

        return response
