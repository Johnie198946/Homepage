from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import _extract_bearer_token, get_current_admin, get_db
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import (
  create_access_token,
  decode_token,
  get_token_expiry,
  get_token_jti,
  verify_password,
)
from app.models.admin_user import AdminUser
from app.models.jwt_blacklist import JwtBlacklist
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.audit import write_audit_log


router = APIRouter(prefix="/auth")


@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.login_rate_limit)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
  admin = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
  if not admin or not verify_password(payload.password, admin.password_hash):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

  admin.last_login_at = datetime.now(UTC)
  db.add(admin)
  db.commit()

  token = create_access_token(subject=admin.username)
  payload_data = decode_token(token)
  request.state.admin_id = admin.id
  write_audit_log(
    db=db, request=request, action="auth.login", target_type="admin", target_id=str(admin.id)
  )
  return TokenResponse(access_token=token, expires_at=get_token_expiry(payload_data).isoformat())


@router.post("/logout")
def logout(
  request: Request,
  admin: AdminUser = Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  token = _extract_bearer_token(request.headers.get("authorization"))
  if not token:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

  payload = decode_token(token)
  jti = get_token_jti(payload)
  expires_at = get_token_expiry(payload)

  if db.query(JwtBlacklist).filter(JwtBlacklist.jti == jti).first() is None:
    db.add(JwtBlacklist(jti=jti, expires_at=expires_at))
    db.commit()

  write_audit_log(
    db=db, request=request, action="auth.logout", target_type="admin", target_id=str(admin.id)
  )
  return {"ok": True}
