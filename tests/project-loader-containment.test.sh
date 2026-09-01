#!/usr/bin/env bash
# Adversarial containment contract for installed loader ancestors and inventory.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAKE_HOME="$TMP/home"
mkdir -p "$FAKE_HOME"

install_project() {
  local name="$1"
  local project="$TMP/$name"
  mkdir -p "$project"
  HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$project" >/dev/null
  printf '%s\n' "$project"
}

expect_loader_rejection() {
  local project="$1"
  local label="$2"
  shift 2
  if (cd "$project" && node .cursor/fusengine/load-plugins.mjs "$@" >"$TMP/$label.out" 2>"$TMP/$label.err"); then
    printf 'expected loader rejection for %s\n' "$label" >&2
    exit 1
  fi
  test ! -s "$TMP/$label.out"
}

MANAGED_PROJECT="$(install_project managed-root)"
mv "$MANAGED_PROJECT/.cursor/fusengine" "$TMP/external-managed"
ln -s "$TMP/external-managed" "$MANAGED_PROJECT/.cursor/fusengine"
expect_loader_rejection "$MANAGED_PROJECT" managed-root
expect_loader_rejection "$MANAGED_PROJECT" managed-root-stage-flag --validate-stage

PLUGINS_PROJECT="$(install_project plugins-root)"
mv "$PLUGINS_PROJECT/.cursor/fusengine/plugins" "$TMP/external-plugins-root"
ln -s "$TMP/external-plugins-root" "$PLUGINS_PROJECT/.cursor/fusengine/plugins"
expect_loader_rejection "$PLUGINS_PROJECT" plugins-root

MARKET_PROJECT="$(install_project marketplace)"
mv "$MARKET_PROJECT/.cursor/fusengine/marketplace.json" "$TMP/external-marketplace.json"
ln -s "$TMP/external-marketplace.json" "$MARKET_PROJECT/.cursor/fusengine/marketplace.json"
expect_loader_rejection "$MARKET_PROJECT" marketplace

printf 'PASS loader rejects managed-root, plugins-root, and inventory symlink escapes\n'
