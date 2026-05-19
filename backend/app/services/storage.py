from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import quote

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings


@dataclass(frozen=True)
class PresignedUrl:
  url: str
  expires_in: int

  @property
  def expires_at(self) -> datetime:
    return datetime.now(UTC) + timedelta(seconds=self.expires_in)


def get_s3_client():
  return boto3.client(
    's3',
    endpoint_url=settings.s3_endpoint_url,
    region_name=settings.s3_region,
    aws_access_key_id=settings.s3_access_key_id,
    aws_secret_access_key=settings.s3_secret_access_key,
    config=Config(
      signature_version='s3v4',
      s3={'addressing_style': 'path' if settings.s3_endpoint_url else 'auto'},
    ),
  )


def build_object_url(*, key: str) -> str:
  encoded_key = quote(key)
  if settings.s3_endpoint_url:
    base = settings.s3_endpoint_url.rstrip('/')
    return f'{base}/{settings.s3_bucket}/{encoded_key}'

  if settings.s3_region:
    return f'https://{settings.s3_bucket}.s3.{settings.s3_region}.amazonaws.com/{encoded_key}'

  return f'https://{settings.s3_bucket}.s3.amazonaws.com/{encoded_key}'


def ensure_bucket_exists() -> None:
  client = get_s3_client()

  try:
    client.head_bucket(Bucket=settings.s3_bucket)
    return
  except ClientError as exc:
    error = exc.response.get('Error', {})
    code = str(error.get('Code', ''))
    status_code = exc.response.get('ResponseMetadata', {}).get('HTTPStatusCode')
    minio_missing_bucket = bool(settings.s3_endpoint_url) and status_code in {403, 404}
    if not minio_missing_bucket and code not in {'404', '403', 'NoSuchBucket', 'NotFound'} and status_code not in {403, 404}:
      raise

  params: dict[str, object] = {'Bucket': settings.s3_bucket}
  region = (settings.s3_region or '').strip()
  if not settings.s3_endpoint_url and region and region != 'us-east-1':
    params['CreateBucketConfiguration'] = {'LocationConstraint': region}

  try:
    client.create_bucket(**params)
  except ClientError as exc:
    code = str(exc.response.get('Error', {}).get('Code', ''))
    if code not in {'BucketAlreadyExists', 'BucketAlreadyOwnedByYou'}:
      raise


def presign_put_object(*, key: str, content_type: str, expires_in: int = 900) -> PresignedUrl:
  client = get_s3_client()
  url = client.generate_presigned_url(
    ClientMethod='put_object',
    Params={'Bucket': settings.s3_bucket, 'Key': key, 'ContentType': content_type},
    ExpiresIn=expires_in,
  )
  return PresignedUrl(url=url, expires_in=expires_in)


def presign_get_object(*, key: str, expires_in: int = 3600) -> PresignedUrl:
  client = get_s3_client()
  url = client.generate_presigned_url(
    ClientMethod='get_object',
    Params={'Bucket': settings.s3_bucket, 'Key': key},
    ExpiresIn=expires_in,
  )
  return PresignedUrl(url=url, expires_in=expires_in)
