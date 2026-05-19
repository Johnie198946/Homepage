from __future__ import annotations

import smtplib
import ssl
from dataclasses import dataclass
from datetime import UTC, datetime
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings
from app.models.business_inquiry import BusinessInquiry

DEFAULT_BUSINESS_NOTIFICATION_EMAIL = "403120057@qq.com"
DEFAULT_MAIL_FROM_EMAIL = "business@t-react.com"
INTERNAL_INBOX_DISABLED_REASON = "Internal inbox mode is enabled; email delivery is disabled."


@dataclass
class MailAttemptResult:
  status: str
  error: str | None = None
  sent_at: datetime | None = None


@dataclass
class MailDeliveryResult:
  owner: MailAttemptResult
  visitor: MailAttemptResult


def _mail_sender() -> tuple[str, str]:
  sender_name = settings.mail_from_name.strip() or settings.app_name
  sender_email = (
    settings.mail_from_email.strip() or settings.smtp_username.strip() or DEFAULT_MAIL_FROM_EMAIL
  )
  return sender_name, sender_email


def _notification_recipient() -> str:
  return settings.business_notification_email.strip() or DEFAULT_BUSINESS_NOTIFICATION_EMAIL


def _smtp_not_configured() -> str | None:
  missing = []
  if not settings.smtp_host.strip():
    missing.append("SMTP_HOST")
  if not settings.smtp_username.strip():
    missing.append("SMTP_USERNAME")
  if not settings.smtp_password.strip():
    missing.append("SMTP_PASSWORD")
  if missing:
    return f"SMTP is not configured: missing {', '.join(missing)}"
  return None


def _build_message(*, subject: str, recipient: str, body: str, reply_to: str | None = None) -> EmailMessage:
  sender_name, sender_email = _mail_sender()
  message = EmailMessage()
  message["Subject"] = subject
  message["From"] = formataddr((sender_name, sender_email))
  message["To"] = recipient
  if reply_to:
    message["Reply-To"] = reply_to
  message.set_content(body)
  return message


def _send_email(message: EmailMessage) -> MailAttemptResult:
  try:
    import certifi

    context = ssl.create_default_context(cafile=certifi.where())
  except Exception:
    context = ssl.create_default_context()
  try:
    if settings.smtp_use_ssl:
      with smtplib.SMTP_SSL(
        settings.smtp_host,
        settings.smtp_port,
        timeout=settings.smtp_timeout,
        context=context,
      ) as server:
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
    else:
      with smtplib.SMTP(
        settings.smtp_host,
        settings.smtp_port,
        timeout=settings.smtp_timeout,
      ) as server:
        if settings.smtp_use_starttls:
          server.starttls(context=context)
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)
  except Exception as exc:
    return MailAttemptResult(status="failed", error=str(exc))

  return MailAttemptResult(status="sent", sent_at=datetime.now(UTC))


def send_business_inquiry_notifications(inquiry: BusinessInquiry) -> MailDeliveryResult:
  del inquiry

  # Email delivery remains in the codebase as a legacy fallback, but the
  # current business inquiry flow is intentionally routed through the admin inbox.
  disabled = MailAttemptResult(status="disabled", error=INTERNAL_INBOX_DISABLED_REASON)
  return MailDeliveryResult(owner=disabled, visitor=disabled)
