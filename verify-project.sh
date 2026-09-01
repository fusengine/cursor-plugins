#!/usr/bin/env bash
# Verify one project-local Fusengine installation without changing it.
# Usage: ./verify-project.sh <project-path>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
command -v bun >/dev/null 2>&1 || {
  printf 'error: bun is required\n' >&2
  printf '       install it with: curl -fsSL https://bun.sh/install | bash\n' >&2
  exit 1
}
exec bun "$ROOT/.cursor-plugin/scripts/verify.ts" "$@"
