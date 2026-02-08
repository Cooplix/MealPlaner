#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

"${ROOT_DIR}/scripts/dual-run-down.sh"
"${ROOT_DIR}/scripts/app-java-up.sh"

echo "Cutover started: Java backend + frontend stack is up."
