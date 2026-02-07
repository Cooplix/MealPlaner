#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker/docker-compose.app.yml"
ENV_FILE="${ROOT_DIR}/docker/app.env"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose not found. Install docker compose plugin or docker-compose." >&2
  exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

ENV_ARGS=()
if [ -f "${ENV_FILE}" ]; then
  ENV_ARGS=(--env-file "${ENV_FILE}")
fi

"${COMPOSE_CMD[@]}" -f "${COMPOSE_FILE}" "${ENV_ARGS[@]}" up -d --build
