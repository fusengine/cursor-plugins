#!/usr/bin/env bash
# Install the Fusengine plugin suite for Cursor.
#
# install-hooks.ts is the single entry point: it spawns the matching deployment
# engine (global by default, project-local with --project) and then runs the
# configuration stage — hooks.json, .env, mcp.json, AGENTS.md, shell loaders,
# vendored harness.
#
# Usage: ./install.sh [--dry-run] [--uninstall] [--project <path>] [--skip-env]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

command -v bun >/dev/null 2>&1 || {
  printf 'error: bun is required to run the installer\n' >&2
  printf '       install it with: curl -fsSL https://bun.sh/install | bash\n' >&2
  exit 1
}

exec bun "$ROOT/.cursor-plugin/scripts/install-hooks.ts" "$@"
