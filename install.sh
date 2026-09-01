#!/usr/bin/env bash
# Install globally by default, or into one explicit Cursor project.
# Usage: ./install.sh [--dry-run] [--uninstall] [--project <path>]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
command -v node >/dev/null 2>&1 || {
  printf 'error: node is required because Cursor hooks and the installer use it\n' >&2
  exit 1
}
exec node "$ROOT/scripts/install.mjs" "$@"
