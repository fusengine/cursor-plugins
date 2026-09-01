#!/usr/bin/env bash
# Regression contract for atomic finalization and safe owned-rule updates.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PROJECT="$TMP/project"
FAKE_HOME="$TMP/home"
mkdir -p "$PROJECT" "$FAKE_HOME"

INSTALLER="$ROOT/.cursor-plugin/scripts/src/services/project-install.ts"
# Guard the guard: a missing target would make `rg` fail the same way as "no
# match", silently turning this check into a no-op.
if [ ! -f "$INSTALLER" ]; then
  printf 'missing installer under test: %s\n' "$INSTALLER" >&2
  exit 1
fi
if rg -n 'writeFileSync\((rulePath|hooksPath)' "$INSTALLER"; then
  printf 'direct finalization writes remain\n' >&2
  exit 1
fi

HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$PROJECT" >/dev/null
cp "$ROOT/AGENTS.md" "$TMP/AGENTS.changed.md"
printf '\n## Controlled installer rule update\n' >> "$TMP/AGENTS.changed.md"
HOME="$FAKE_HOME" NODE_ENV=test FUSE_INSTALL_TEST_RULE_SOURCE="$TMP/AGENTS.changed.md" \
  "$ROOT/install.sh" --project "$PROJECT" >/dev/null
grep -q 'Controlled installer rule update' "$PROJECT/.cursor/rules/fusengine.mdc"

printf '\n# User modification\n' >> "$PROJECT/.cursor/rules/fusengine.mdc"
if HOME="$FAKE_HOME" NODE_ENV=test FUSE_INSTALL_TEST_RULE_SOURCE="$ROOT/AGENTS.md" \
  "$ROOT/install.sh" --project "$PROJECT" 2>"$TMP/modified-rule.error"; then
  printf 'expected modified owned rule overwrite refusal\n' >&2
  exit 1
fi
grep -q 'refusing to overwrite existing rule' "$TMP/modified-rule.error"
grep -q 'User modification' "$PROJECT/.cursor/rules/fusengine.mdc"
printf 'PASS atomic finalization and safe owned-rule update\n'
