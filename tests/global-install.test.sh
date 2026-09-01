#!/usr/bin/env bash
# Integration contract for the default user-global Cursor installation.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
HOME_DIR="$TMP/home"
PROJECT="$TMP/project"
SOURCE="$TMP/source"
mkdir -p "$HOME_DIR" "$PROJECT" "$SOURCE/.cursor-plugin"
cp "$ROOT/.cursor-plugin/marketplace.json" "$SOURCE/.cursor-plugin/marketplace.json"
for plugin in $(node -e 'for(const p of require(process.argv[1]).plugins)console.log(p.source)' "$ROOT/.cursor-plugin/marketplace.json"); do
  cp -R "$ROOT/$plugin" "$SOURCE/$plugin"
done

global_install() {
  HOME="$HOME_DIR" NODE_ENV=test FUSE_INSTALL_TEST_SOURCE_ROOT="$SOURCE" "$ROOT/install.sh" "$@"
}

BEFORE_DRY="$(find "$HOME_DIR" -print | sort)"
(cd "$PROJECT" && global_install --dry-run)
test "$BEFORE_DRY" = "$(find "$HOME_DIR" -print | sort)"
test ! -e "$PROJECT/.cursor"

(cd "$PROJECT" && global_install)
(cd "$PROJECT" && global_install)
test ! -e "$PROJECT/.cursor"
test -f "$HOME_DIR/.cursor/.fusengine-global/receipt.json"
test -f "$HOME_DIR/.cursor/rules/fuse-global.mdc"

node - "$SOURCE/.cursor-plugin/marketplace.json" "$HOME_DIR/.cursor/plugins/local" <<'NODE'
const fs = require('fs');
const path = require('path');
const [marketFile, localRoot] = process.argv.slice(2);
const market = JSON.parse(fs.readFileSync(marketFile, 'utf8'));
if (market.plugins.length !== 24) throw Error('expected 24 source plugins');
for (const entry of market.plugins) {
  const root = path.join(localRoot, entry.source);
  if (!fs.statSync(root).isDirectory()) throw Error(`missing immediate plugin: ${entry.source}`);
  if (!fs.statSync(path.join(root, '.cursor-plugin/plugin.json')).isFile()) throw Error(`invalid plugin root: ${entry.source}`);
}
NODE

mkdir -p "$HOME_DIR/.cursor/plugins/local/foreign-plugin"
printf 'foreign\n' > "$HOME_DIR/.cursor/plugins/local/foreign-plugin/keep.txt"
printf '\nGLOBAL_SOURCE_REFRESH\n' >> "$SOURCE/core-guards/README.md"
printf '\nGLOBAL_RULE_REFRESH\n' >> "$SOURCE/fuse-rules/user-rules/fuse-global.mdc"
global_install
grep -q GLOBAL_SOURCE_REFRESH "$HOME_DIR/.cursor/plugins/local/core-guards/README.md"
grep -q GLOBAL_RULE_REFRESH "$HOME_DIR/.cursor/rules/fuse-global.mdc"
test -f "$HOME_DIR/.cursor/plugins/local/foreign-plugin/keep.txt"

RECEIPT_BEFORE="$(shasum -a 256 "$HOME_DIR/.cursor/.fusengine-global/receipt.json")"
if FUSE_GLOBAL_TEST_FAIL_POINT=after-old-move global_install 2>"$TMP/transaction.error"; then
  printf 'expected injected global transaction failure\n' >&2
  exit 1
fi
grep -q 'injected global transaction failure at after-old-move' "$TMP/transaction.error"
test "$RECEIPT_BEFORE" = "$(shasum -a 256 "$HOME_DIR/.cursor/.fusengine-global/receipt.json")"
test -f "$HOME_DIR/.cursor/plugins/local/core-guards/.cursor-plugin/plugin.json"

for point in after-old-rename-before-journal after-new-rename-before-journal; do
  if FUSE_GLOBAL_TEST_FAIL_POINT="$point" global_install 2>"$TMP/$point.error"; then
    printf 'expected injected global crash-window failure: %s\n' "$point" >&2
    exit 1
  fi
  grep -q "injected global transaction failure at $point" "$TMP/$point.error"
  test -f "$HOME_DIR/.cursor/plugins/local/foreign-plugin/keep.txt"
  test "$RECEIPT_BEFORE" = "$(shasum -a 256 "$HOME_DIR/.cursor/.fusengine-global/receipt.json")"
done

printf '\nUSER_PLUGIN_EDIT\n' >> "$HOME_DIR/.cursor/plugins/local/core-guards/README.md"
printf '\nUSER_RULE_EDIT\n' >> "$HOME_DIR/.cursor/rules/fuse-global.mdc"
if global_install 2>"$TMP/modified.error"; then
  printf 'expected modified global artifact refusal\n' >&2
  exit 1
fi
grep -q 'refusing to overwrite modified owned' "$TMP/modified.error"
global_install --uninstall
grep -q USER_PLUGIN_EDIT "$HOME_DIR/.cursor/plugins/local/core-guards/README.md"
grep -q USER_RULE_EDIT "$HOME_DIR/.cursor/rules/fuse-global.mdc"
test -f "$HOME_DIR/.cursor/plugins/local/foreign-plugin/keep.txt"
test ! -e "$HOME_DIR/.cursor/plugins/local/fuse-ai-pilot"
test ! -e "$HOME_DIR/.cursor/.fusengine-global"

COLLISION_HOME="$TMP/collision-home"
mkdir -p "$COLLISION_HOME/.cursor/plugins/local/core-guards"
printf 'foreign collision\n' > "$COLLISION_HOME/.cursor/plugins/local/core-guards/keep.txt"
if HOME="$COLLISION_HOME" NODE_ENV=test FUSE_INSTALL_TEST_SOURCE_ROOT="$SOURCE" "$ROOT/install.sh" 2>"$TMP/collision.error"; then
  printf 'expected foreign plugin collision refusal\n' >&2
  exit 1
fi
test -f "$COLLISION_HOME/.cursor/plugins/local/core-guards/keep.txt"
test ! -e "$COLLISION_HOME/.cursor/plugins/local/fuse-ai-pilot"

SYMLINK_HOME="$TMP/symlink-home"
EXTERNAL="$TMP/external-local"
mkdir -p "$SYMLINK_HOME/.cursor/plugins" "$EXTERNAL"
ln -s "$EXTERNAL" "$SYMLINK_HOME/.cursor/plugins/local"
if HOME="$SYMLINK_HOME" NODE_ENV=test FUSE_INSTALL_TEST_SOURCE_ROOT="$SOURCE" "$ROOT/install.sh" 2>"$TMP/symlink.error"; then
  printf 'expected global symlink refusal\n' >&2
  exit 1
fi
test -z "$(find "$EXTERNAL" -mindepth 1 -print -quit)"

grep -q 'scripts/install.mjs' "$ROOT/install.ps1"
grep -Fq "if (\$Project)" "$ROOT/install.ps1"
printf 'PASS default global install, refresh, rollback, refusal, and uninstall\n'
