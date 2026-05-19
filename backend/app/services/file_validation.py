from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image


ALLOWED_IMAGE_CONTENT_TYPES = {
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/tiff",
  "image/bmp",
}
ALLOWED_VIDEO_CONTENT_TYPES = {
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/m4v",
}
ISOBMFF_VIDEO_CONTENT_TYPES = {
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/m4v",
}
MAX_IMAGE_SIZE = 20 * 1024 * 1024
MAX_VIDEO_SIZE = 500 * 1024 * 1024


@dataclass(frozen=True)
class ImageValidationResult:
  content_type: str
  width: int
  height: int
  size: int
  normalized_data: bytes


class FileValidationError(ValueError):
  def __init__(self, message: str, *, status_code: int = 400):
    super().__init__(message)
    self.status_code = status_code


def _normalize_content_type(content_type: str | None) -> str | None:
  if not content_type:
    return None
  return content_type.split(';', 1)[0].strip().lower() or None


def _normalize_image_content_type(content_type: str | None) -> str | None:
  normalized = _normalize_content_type(content_type)
  if normalized == 'image/jpg':
    return 'image/jpeg'
  if normalized == 'image/pjpeg':
    return 'image/jpeg'
  if normalized == 'image/jfif':
    return 'image/jpeg'
  if normalized == 'image/x-png':
    return 'image/png'
  return normalized


def normalize_video_playback_mime_type(content_type: str | None) -> str:
  normalized = _normalize_content_type(content_type)
  if normalized in ISOBMFF_VIDEO_CONTENT_TYPES:
    # Home page playback treats MOV/M4V as MP4-compatible ISOBMFF sources.
    return 'video/mp4'
  if normalized == 'video/webm':
    return 'video/webm'
  return 'video/mp4'


def validate_image_upload(data: bytes, declared_content_type: str | None = None) -> ImageValidationResult:
  size = len(data)
  if size > MAX_IMAGE_SIZE:
    raise FileValidationError('Image file exceeds 20MB limit', status_code=400)

  declared = _normalize_image_content_type(declared_content_type)

  try:
    with Image.open(io.BytesIO(data)) as img:
      img.load()
      fmt = (img.format or '').upper()
      width, height = img.size
      converted = data

      # Some camera exports or browser-selected files may be decodable by Pillow
      # but not directly web-safe for our storage/playback path. Convert them to JPEG.
      if fmt in {'MPO', 'TIFF', 'BMP', 'GIF'}:
        buffer = io.BytesIO()
        image_to_save = img.convert('RGB') if img.mode not in {'RGB', 'L'} else img
        image_to_save.save(buffer, format='JPEG', quality=95)
        converted = buffer.getvalue()
        fmt = 'JPEG'
  except Exception as exc:
    raise FileValidationError('Invalid image file', status_code=400) from exc

  detected_map = {
    'JPEG': 'image/jpeg',
    'PNG': 'image/png',
    'WEBP': 'image/webp',
    'GIF': 'image/gif',
    'TIFF': 'image/tiff',
    'BMP': 'image/bmp',
  }
  detected = detected_map.get(fmt)
  if detected is None:
    raise FileValidationError('Unsupported image format', status_code=400)

  # Some browsers may report uncommon aliases or generic MIME types.
  # We trust magic bytes as the source of truth and only enforce mismatch
  # when declared type is a known/strictly supported image MIME type.
  if declared in ALLOWED_IMAGE_CONTENT_TYPES and declared != detected:
    raise FileValidationError('Magic bytes do not match declared MIME type', status_code=422)

  return ImageValidationResult(
    content_type=detected,
    width=width,
    height=height,
    size=len(converted),
    normalized_data=converted,
  )


def validate_video_upload(head: bytes, *, size: int, declared_content_type: str | None = None) -> str:
  if size > MAX_VIDEO_SIZE:
    raise FileValidationError('Video file exceeds 500MB limit', status_code=400)

  declared = _normalize_content_type(declared_content_type)
  if declared and declared not in ALLOWED_VIDEO_CONTENT_TYPES:
    raise FileValidationError('Unsupported video format', status_code=400)

  if len(head) < 16:
    raise FileValidationError('Invalid video file', status_code=400)

  detected_family = None
  header = head[:64]
  if b'ftyp' in header:
    detected_family = 'isobmff'
  elif header.startswith(bytes.fromhex('1A45DFA3')):
    detected_family = 'video/webm'

  if detected_family is None:
    raise FileValidationError('Unsupported video format', status_code=400)

  if detected_family == 'isobmff':
    if declared and declared not in ISOBMFF_VIDEO_CONTENT_TYPES:
      raise FileValidationError('Magic bytes do not match declared MIME type', status_code=422)
    return normalize_video_playback_mime_type(declared)

  if declared and declared != detected_family:
    raise FileValidationError('Magic bytes do not match declared MIME type', status_code=422)

  return normalize_video_playback_mime_type(detected_family)
