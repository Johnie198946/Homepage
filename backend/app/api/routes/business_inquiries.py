from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db
from app.models.business_inquiry import BusinessInquiry
from app.schemas.business_inquiries import (
  BusinessInquiryCreate,
  BusinessInquiryOut,
  BusinessInquiryStatusUpdate,
)
from app.services.audit import write_audit_log
from app.services.business_inquiries import MailDeliveryResult, send_business_inquiry_notifications


router = APIRouter(prefix='/business-inquiries')


def _to_out(item: BusinessInquiry) -> BusinessInquiryOut:
  return BusinessInquiryOut(
    id=item.id,
    name=item.name,
    email=item.email,
    company=item.company,
    message=item.message,
    source_page=item.source_page,
    status=item.status,
    read_status=item.read_status,
    owner_notification_status=item.owner_notification_status,
    visitor_receipt_status=item.visitor_receipt_status,
    read_at=item.read_at,
    owner_notification_error=item.owner_notification_error,
    visitor_receipt_error=item.visitor_receipt_error,
    owner_notified_at=item.owner_notified_at,
    visitor_receipt_sent_at=item.visitor_receipt_sent_at,
    created_at=item.created_at,
    updated_at=item.updated_at,
  )


def _apply_notification_result(inquiry: BusinessInquiry, result) -> None:
  inquiry.owner_notification_status = result.owner.status
  inquiry.owner_notification_error = result.owner.error
  inquiry.owner_notified_at = result.owner.sent_at
  inquiry.visitor_receipt_status = result.visitor.status
  inquiry.visitor_receipt_error = result.visitor.error
  inquiry.visitor_receipt_sent_at = result.visitor.sent_at


def _persist_notification_result(db: Session, inquiry: BusinessInquiry, result: MailDeliveryResult) -> None:
  _apply_notification_result(inquiry, result)
  db.add(inquiry)
  try:
    db.commit()
  except Exception:
    db.rollback()
    return
  db.refresh(inquiry)


@router.post('', response_model=BusinessInquiryOut, status_code=status.HTTP_201_CREATED)
def create_business_inquiry(payload: BusinessInquiryCreate, db: Session = Depends(get_db)):
  inquiry = BusinessInquiry(
    **payload.model_dump(),
    status='new',
    read_status='unread',
    owner_notification_status='disabled',
    visitor_receipt_status='disabled',
  )
  db.add(inquiry)

  try:
    db.commit()
  except Exception as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Inquiry submission failed') from exc

  db.refresh(inquiry)

  notification_result = send_business_inquiry_notifications(inquiry)
  _persist_notification_result(db, inquiry, notification_result)

  return _to_out(inquiry)


@router.get('', response_model=list[BusinessInquiryOut])
def list_business_inquiries(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
  items = db.query(BusinessInquiry).order_by(BusinessInquiry.created_at.desc(), BusinessInquiry.id.desc()).all()
  return [_to_out(item) for item in items]


@router.get('/{inquiry_id}', response_model=BusinessInquiryOut)
def get_business_inquiry(inquiry_id: int, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
  item = db.query(BusinessInquiry).filter(BusinessInquiry.id == inquiry_id).first()
  if not item:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Inquiry not found')

  if item.read_status != 'read':
    item.read_status = 'read'
    item.read_at = datetime.now(UTC)
    db.add(item)
    try:
      db.commit()
    except Exception as exc:
      db.rollback()
      raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Failed to mark inquiry as read') from exc
    db.refresh(item)

  return _to_out(item)


@router.patch('/{inquiry_id}/status', response_model=BusinessInquiryOut)
def update_business_inquiry_status(
  inquiry_id: int,
  payload: BusinessInquiryStatusUpdate,
  request: Request,
  admin=Depends(get_current_admin),
  db: Session = Depends(get_db),
):
  item = db.query(BusinessInquiry).filter(BusinessInquiry.id == inquiry_id).first()
  if not item:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Inquiry not found')

  item.status = payload.status
  db.add(item)

  try:
    db.commit()
  except Exception as exc:
    db.rollback()
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Status update failed') from exc

  db.refresh(item)
  write_audit_log(
    db=db,
    request=request,
    action='business_inquiries.status',
    target_type='business_inquiry',
    target_id=str(item.id),
    detail={'status': item.status},
  )
  return _to_out(item)
