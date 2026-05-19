from __future__ import annotations

from datetime import UTC, datetime

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import decode_token, get_token_jti
from app.db.session import SessionLocal
from app.models.admin_user import AdminUser
from app.models.jwt_blacklist import JwtBlacklist


def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


def _extract_bearer_token(authorization: str | None) -> str | None:
  if not authorization:
    return None
  prefix = "bearer "
  if authorization.lower().startswith(prefix):
    return authorization[len(prefix) :].strip()
  return None


def _unauthorized() -> HTTPException:
  return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


def get_current_admin(
  request: Request,
  db: Session = Depends(get_db),
  authorization: str | None = Header(default=None),
) -> AdminUser:
  token = _extract_bearer_token(authorization)
  if not token:
    raise _unauthorized()

  try:
    payload = decode_token(token)
  except Exception:
    raise _unauthorized()

  exp = payload.get("exp")
  if isinstance(exp, int) and datetime.now(UTC).timestamp() >= exp:
    raise _unauthorized()

  try:
    jti = get_token_jti(payload)
  except ValueError:
    raise _unauthorized()

  blacklisted = db.query(JwtBlacklist).filter(JwtBlacklist.jti == jti).first()
  if blacklisted is not None:
    raise _unauthorized()

  sub = payload.get("sub")
  if not sub:
    raise _unauthorized()

  admin = db.query(AdminUser).filter(AdminUser.username == sub).first()
  if not admin:
    raise _unauthorized()

  request.state.admin_id = admin.id
  request.state.admin_username = admin.username
  return admin
