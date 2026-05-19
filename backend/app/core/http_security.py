from __future__ import annotations

from collections.abc import Iterable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, RedirectResponse


def normalize_origin(origin: str) -> str:
  return origin.strip().rstrip("/")


def is_origin_allowed(origin: str, allowed_origins: Iterable[str]) -> bool:
  normalized_origin = normalize_origin(origin)
  return normalized_origin in {normalize_origin(item) for item in allowed_origins}


def build_https_redirect_url(request: Request) -> str:
  forwarded_host = request.headers.get("x-forwarded-host", "").split(",")[0].strip()
  host = forwarded_host or request.headers.get("host", "") or request.url.netloc
  query = f"?{request.url.query}" if request.url.query else ""
  return f"https://{host}{request.url.path}{query}"


class RequestGuardMiddleware(BaseHTTPMiddleware):
  def __init__(
    self,
    app,
    *,
    allowed_origins: Iterable[str],
    enforce_https: bool,
  ):
    super().__init__(app)
    self.allowed_origins = tuple(normalize_origin(item) for item in allowed_origins if item.strip())
    self.enforce_https = enforce_https

  async def dispatch(self, request: Request, call_next):
    origin = request.headers.get("origin")
    if origin and self.allowed_origins and not is_origin_allowed(origin, self.allowed_origins):
      return JSONResponse(status_code=403, content={"detail": "Forbidden"})

    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
    request_scheme = (forwarded_proto or request.url.scheme).lower()
    if self.enforce_https and request_scheme == "http":
      return RedirectResponse(url=build_https_redirect_url(request), status_code=301)

    return await call_next(request)
