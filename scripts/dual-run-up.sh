#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.dual.yml"
ENV_FILE="$ROOT_DIR/docker/app.env"

if [[ -f "$ENV_FILE" ]]; then
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
else
  docker compose -f "$COMPOSE_FILE" up -d --build
fi
