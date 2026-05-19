from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import bcrypt
import jwt

from app.core.config import settings


_BCRYPT_SHA256_PREFIX = "bcrypt_sha256$"


def _password_bytes(password: str) -> bytes:
  return password.encode("utf-8")


def _normalize_password_for_storage(password: str) -> bytes:
  # Pre-hash before bcrypt so passwords longer than 72 bytes remain supported.
  return hashlib.sha256(_password_bytes(password)).hexdigest().encode("ascii")


def hash_password(password: str) -> str:
  hashed = bcrypt.hashpw(_normalize_password_for_storage(password), bcrypt.gensalt())
  return f"{_BCRYPT_SHA256_PREFIX}{hashed.decode('utf-8')}"


def verify_password(password: str, password_hash: str) -> bool:
  try:
    if password_hash.startswith(_BCRYPT_SHA256_PREFIX):
      stored_hash = password_hash[len(_BCRYPT_SHA256_PREFIX) :].encode("utf-8")
      candidate = _normalize_password_for_storage(password)
    else:
      stored_hash = password_hash.encode("utf-8")
      candidate = _password_bytes(password)
    return bcrypt.checkpw(candidate, stored_hash)
  except (TypeError, ValueError):
    return False


def create_access_token(*, subject: str) -> str:
  now = datetime.now(UTC)
  exp = now + timedelta(hours=settings.jwt_exp_hours)
  payload = {
    "sub": subject,
    "jti": uuid4().hex,
    "type": "access",
    "iat": int(now.timestamp()),
    "exp": int(exp.timestamp()),
  }
  return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
  return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def get_token_expiry(payload: dict) -> datetime:
  exp = payload.get("exp")
  if not isinstance(exp, int):
    raise ValueError("Token expiry is missing")
  return datetime.fromtimestamp(exp, tz=UTC)


def get_token_jti(payload: dict) -> str:
  jti = payload.get("jti")
  if not isinstance(jti, str) or not jti:
    raise ValueError("Token jti is missing")
  return jti
