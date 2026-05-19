from __future__ import annotations

import io

from PIL import Image


PREVIEW_MAX_WIDTH = 1600
PREVIEW_JPEG_QUALITY = 92


def generate_thumbnail_1600w(data: bytes) -> bytes:
  with Image.open(io.BytesIO(data)) as img:
    img.load()
    img = img.convert("RGB")
    width, height = img.size
    if width <= PREVIEW_MAX_WIDTH:
      output = io.BytesIO()
      img.save(output, format="JPEG", quality=PREVIEW_JPEG_QUALITY, optimize=True)
      return output.getvalue()
    new_width = PREVIEW_MAX_WIDTH
    new_height = int(height * (new_width / width))
    img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    img.save(output, format="JPEG", quality=PREVIEW_JPEG_QUALITY, optimize=True)
    return output.getvalue()
