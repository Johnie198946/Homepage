from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass


logger = logging.getLogger(__name__)

FASTSTART_COMPATIBLE_TYPES = {
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "video/m4v",
}
HOMEPAGE_COMPATIBLE_TYPES = FASTSTART_COMPATIBLE_TYPES | {"video/webm"}


@dataclass(frozen=True)
class ProcessedVideo:
  data: bytes
  content_type: str


def optimize_video_for_web(data: bytes, *, content_type: str) -> bytes:
  """Move MP4 metadata to the front so the first frame starts faster on the web."""
  normalized = (content_type or "").lower().split(";", 1)[0].strip()
  if normalized not in FASTSTART_COMPATIBLE_TYPES:
    return data

  ffmpeg_path = shutil.which("ffmpeg")
  if not ffmpeg_path:
    return data

  input_path = ""
  output_path = ""
  try:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as input_file:
      input_file.write(data)
      input_path = input_file.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as output_file:
      output_path = output_file.name

    result = subprocess.run(
      [
        ffmpeg_path,
        "-y",
        "-i",
        input_path,
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        output_path,
      ],
      capture_output=True,
      check=False,
    )
    if result.returncode != 0:
      logger.warning("ffmpeg faststart optimization failed; keeping original upload")
      return data

    with open(output_path, "rb") as optimized_file:
      optimized = optimized_file.read()
    return optimized or data
  except Exception:
    logger.exception("Unexpected error while optimizing video for web playback")
    return data
  finally:
    for path in (input_path, output_path):
      if path and os.path.exists(path):
        try:
          os.remove(path)
        except OSError:
          logger.warning("Failed to remove temporary video processing file: %s", path)


def generate_homepage_video_variant(data: bytes, *, content_type: str) -> ProcessedVideo | None:
  """
  Create a lighter homepage-friendly MP4 variant for faster background playback.

  The homepage video favors quick first-frame display over retaining original bitrate.
  """
  normalized = (content_type or "").lower().split(";", 1)[0].strip()
  if normalized not in HOMEPAGE_COMPATIBLE_TYPES:
    return None

  ffmpeg_path = shutil.which("ffmpeg")
  if not ffmpeg_path:
    return None

  input_suffix = ".webm" if normalized == "video/webm" else ".mp4"
  input_path = ""
  output_path = ""
  try:
    with tempfile.NamedTemporaryFile(delete=False, suffix=input_suffix) as input_file:
      input_file.write(data)
      input_path = input_file.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as output_file:
      output_path = output_file.name

    result = subprocess.run(
      [
        ffmpeg_path,
        "-y",
        "-i",
        input_path,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-vf",
        "scale=w='min(1280,iw)':h=-2:force_original_aspect_ratio=decrease",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-profile:v",
        "high",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-crf",
        "24",
        "-maxrate",
        "2500k",
        "-bufsize",
        "5000k",
        "-g",
        "48",
        "-keyint_min",
        "48",
        "-sc_threshold",
        "0",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ac",
        "2",
        output_path,
      ],
      capture_output=True,
      check=False,
    )
    if result.returncode != 0:
      logger.warning("ffmpeg homepage variant generation failed; keeping original video only")
      return None

    with open(output_path, "rb") as optimized_file:
      optimized = optimized_file.read()
    if not optimized:
      return None

    return ProcessedVideo(data=optimized, content_type="video/mp4")
  except Exception:
    logger.exception("Unexpected error while generating homepage video variant")
    return None
  finally:
    for path in (input_path, output_path):
      if path and os.path.exists(path):
        try:
          os.remove(path)
        except OSError:
          logger.warning("Failed to remove temporary video processing file: %s", path)
