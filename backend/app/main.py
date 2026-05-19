from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.orm import Session
from starlette.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.http_security import RequestGuardMiddleware
from app.core.rate_limit import limiter
from app.core.security import hash_password
from app.db.session import SessionLocal, check_database_connection, warm_up_database_pool
from app.models.admin_user import AdminUser
from app.services.analytics import ensure_required_analytics_partitions, logger as analytics_logger
from app.services.audit import logger as audit_logger
from app.services.audit import purge_expired_audit_logs


def create_app() -> FastAPI:
  app = FastAPI(
    title=settings.app_name,
    docs_url='/api/docs',
    openapi_url='/api/openapi.json',
  )
  app.state.limiter = limiter

  app.add_middleware(
    RequestGuardMiddleware,
    allowed_origins=settings.cors_origins_list,
    enforce_https=settings.is_production,
  )

  if settings.cors_origins_list:
    app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.cors_origins_list,
      allow_credentials=True,
      allow_methods=['*'],
      allow_headers=['*'],
    )

  app.add_middleware(SlowAPIMiddleware)

  @app.exception_handler(RateLimitExceeded)
  async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={'detail': 'Rate limit exceeded'})

  @app.exception_handler(RequestValidationError)
  async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={'detail': exc.errors()})

  app.include_router(api_router)

  @app.on_event('startup')
  def bootstrap_admin():
    check_database_connection()
    warm_up_database_pool()

    analytics_db: Session = SessionLocal()
    try:
      ensure_required_analytics_partitions(analytics_db, months_ahead=1)
      analytics_db.commit()
    except Exception:
      analytics_db.rollback()
      analytics_logger.exception("Failed to ensure analytics partitions on startup")
    finally:
      analytics_db.close()

    audit_db: Session = SessionLocal()
    try:
      deleted_count = purge_expired_audit_logs(
        db=audit_db,
        retention_days=settings.audit_log_retention_days,
      )
      if deleted_count:
        audit_logger.info(
          "Purged %s expired audit logs older than %s days",
          deleted_count,
          settings.audit_log_retention_days,
        )
    except Exception:
      audit_logger.exception("Failed to purge expired audit logs")
    finally:
      audit_db.close()

    username = settings.bootstrap_admin_username
    password = getattr(settings, 'bootstrap_admin_password', None)
    if not username or not password:
      return
    db: Session = SessionLocal()
    try:
      exists = db.query(AdminUser).first()
      if exists:
        return
      admin = AdminUser(username=username, email=None, password_hash=hash_password(password))
      db.add(admin)
      db.commit()
    finally:
      db.close()

  return app


app = create_app()
