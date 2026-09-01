#!/usr/bin/env bash
# Verify one project-local Fusengine installation without changing it.
# Usage: ./verify-project.sh <project-path>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
command -v node >/dev/null 2>&1 || {
  printf 'error: node is required\n' >&2
  exit 1
}
exec node "$ROOT/scripts/project-verify.mjs" "$@"
