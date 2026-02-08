#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

"${ROOT_DIR}/scripts/app-java-down.sh"
"${ROOT_DIR}/scripts/app-up.sh"

echo "Rollback completed: Python backend + frontend stack is up."
