#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${MINIO_CONTAINER_NAME:-homepage-minio}"
ROOT_USER="${MINIO_ROOT_USER:-admin}"
ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-adminadmin}"
API_PORT="${MINIO_API_PORT:-9000}"
CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"
DATA_DIR="${MINIO_DATA_DIR:-$(pwd)/.local/minio}"
LOG_FILE="${MINIO_LOG_FILE:-${DATA_DIR}/minio.log}"

mkdir -p "$DATA_DIR"

if lsof -iTCP:"${API_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "MinIO is already running: http://localhost:${API_PORT} (console: http://localhost:${CONSOLE_PORT})"
  exit 0
fi

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
    echo "MinIO is already running: http://localhost:${API_PORT} (console: http://localhost:${CONSOLE_PORT})"
    exit 0
  fi

  if docker ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
    docker start "$CONTAINER_NAME" >/dev/null
  else
    docker run -d \
      --name "$CONTAINER_NAME" \
      -p "${API_PORT}:9000" \
      -p "${CONSOLE_PORT}:9001" \
      -e "MINIO_ROOT_USER=${ROOT_USER}" \
      -e "MINIO_ROOT_PASSWORD=${ROOT_PASSWORD}" \
      -v "${DATA_DIR}:/data" \
      quay.io/minio/minio:latest server /data --console-address ":9001" >/dev/null
  fi

  echo "MinIO started with Docker: http://localhost:${API_PORT} (console: http://localhost:${CONSOLE_PORT})"
  exit 0
fi

if command -v minio >/dev/null 2>&1; then
  nohup env \
    MINIO_ROOT_USER="${ROOT_USER}" \
    MINIO_ROOT_PASSWORD="${ROOT_PASSWORD}" \
    minio server "${DATA_DIR}" \
    --address ":${API_PORT}" \
    --console-address ":${CONSOLE_PORT}" >"${LOG_FILE}" 2>&1 &

  sleep 2
  if lsof -iTCP:"${API_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "MinIO started with local binary: http://localhost:${API_PORT} (console: http://localhost:${CONSOLE_PORT})"
    echo "Log: ${LOG_FILE}"
    exit 0
  fi

  echo "Failed to start MinIO from local binary. Check log: ${LOG_FILE}" >&2
  exit 1
fi

echo "Neither a running Docker daemon nor a local minio binary is available." >&2
exit 1
