#!/usr/bin/env bash
# Regression contract for exact hook ownership and transactional uninstall.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAKE_HOME="$TMP/home"
mkdir -p "$FAKE_HOME"

MULTI="$TMP/multiple-hooks"
mkdir -p "$MULTI/.cursor"
cat > "$MULTI/.cursor/hooks.json" <<'JSON'
{
  "version": 1,
  "hooks": {
    "workspaceOpen": [
      {"command":"node .cursor/fusengine/load-plugins.mjs"},
      {"command":"node .cursor/fusengine/load-plugins.mjs","env":{"OWNER":"foreign"}},
      {"command":"node other.mjs"},
      {"command":"node .cursor/fusengine/load-plugins.mjs"}
    ]
  }
}
JSON
BEFORE_ARRAY="$(node -e 'console.log(JSON.stringify(require(process.argv[1]).hooks.workspaceOpen))' "$MULTI/.cursor/hooks.json")"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$MULTI" >/dev/null
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$MULTI" >/dev/null
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$MULTI" --uninstall >/dev/null
AFTER_ARRAY="$(node -e 'console.log(JSON.stringify(require(process.argv[1]).hooks.workspaceOpen))' "$MULTI/.cursor/hooks.json")"
test "$BEFORE_ARRAY" = "$AFTER_ARRAY"
printf 'PASS uninstall preserves pre-existing matching hook multiplicity and content\n'

OWNED="$TMP/owned-occurrence"
mkdir -p "$OWNED"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$OWNED" >/dev/null
OWNED_ARGUMENT="$(node -e 'console.log(require(process.argv[1]).hooks.workspaceOpen[0].command.split(" ")[2])' "$OWNED/.cursor/hooks.json")"
(cd "$OWNED" && node .cursor/fusengine/load-plugins.mjs "$OWNED_ARGUMENT" >/dev/null)
if (cd "$OWNED" && node .cursor/fusengine/load-plugins.mjs --unsupported >/dev/null 2>&1); then
  printf 'expected unsupported loader argument rejection\n' >&2
  exit 1
fi
node - "$OWNED/.cursor/hooks.json" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const hooks = JSON.parse(fs.readFileSync(file, 'utf8'));
const owned = hooks.hooks.workspaceOpen[0];
hooks.hooks.workspaceOpen.push({ command: 'node owner-between.mjs' }, JSON.parse(JSON.stringify(owned)));
fs.writeFileSync(file, `${JSON.stringify(hooks, null, 2)}\n`);
NODE
OWNED_BEFORE_REINSTALL="$(node -e 'console.log(JSON.stringify(require(process.argv[1]).hooks.workspaceOpen))' "$OWNED/.cursor/hooks.json")"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$OWNED" >/dev/null
test "$OWNED_BEFORE_REINSTALL" = "$(node -e 'console.log(JSON.stringify(require(process.argv[1]).hooks.workspaceOpen))' "$OWNED/.cursor/hooks.json")"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$OWNED" --uninstall >/dev/null
node - "$OWNED/.cursor/hooks.json" <<'NODE'
const entries = require(process.argv[2]).hooks.workspaceOpen;
if (entries.length !== 2 || entries[0].command !== 'node owner-between.mjs') process.exit(1);
if (!entries[1].command.startsWith('node .cursor/fusengine/load-plugins.mjs --fusengine-owner=')) process.exit(1);
NODE
printf 'PASS uninstall removes the persisted owned occurrence and preserves appended duplicate\n'

SHIFTED="$TMP/shifted-occurrence"
mkdir -p "$SHIFTED"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$SHIFTED" >/dev/null
node - "$SHIFTED/.cursor/hooks.json" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const hooks = JSON.parse(fs.readFileSync(file, 'utf8'));
hooks.hooks.workspaceOpen.unshift({ command: 'node inserted-before.mjs' });
fs.writeFileSync(file, `${JSON.stringify(hooks, null, 2)}\n`);
NODE
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$SHIFTED" --uninstall >/dev/null
node - "$SHIFTED/.cursor/hooks.json" <<'NODE'
const entries = require(process.argv[2]).hooks.workspaceOpen;
if (entries.length !== 1 || entries[0].command !== 'node inserted-before.mjs') process.exit(1);
if (entries.some((entry) => entry.command.includes('--fusengine-owner='))) process.exit(1);
NODE
printf 'PASS uninstall relocates one unique owned token after a foreign insertion\n'

BAD_RULE="$TMP/bad-rule"
mkdir -p "$BAD_RULE"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$BAD_RULE" >/dev/null
cp "$BAD_RULE/.cursor/hooks.json" "$TMP/bad-rule-hooks.before"
mv "$BAD_RULE/.cursor/rules/fusengine.mdc" "$TMP/bad-rule.mdc"
mkdir "$BAD_RULE/.cursor/rules/fusengine.mdc"
if HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$BAD_RULE" --uninstall 2>"$TMP/bad-rule.error"; then
  printf 'expected uninstall preflight failure for directory rule target\n' >&2
  exit 1
fi
cmp "$TMP/bad-rule-hooks.before" "$BAD_RULE/.cursor/hooks.json"
test -f "$BAD_RULE/.cursor/fusengine/.managed-by-fusengine"
(cd "$BAD_RULE" && node .cursor/fusengine/load-plugins.mjs >/dev/null)
printf 'PASS uninstall type failure occurs before mutation\n'

ROLLBACK="$TMP/rollback"
mkdir -p "$ROLLBACK"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$ROLLBACK" >/dev/null
cp "$ROLLBACK/.cursor/hooks.json" "$TMP/rollback-hooks.before"
cp "$ROLLBACK/.cursor/rules/fusengine.mdc" "$TMP/rollback-rule.before"
LOADER_BEFORE="$(cd "$ROLLBACK" && node .cursor/fusengine/load-plugins.mjs)"
if HOME="$FAKE_HOME" NODE_ENV=test FUSE_INSTALL_TEST_FAIL_UNINSTALL_AFTER_HOOK=1 \
  "$ROOT/install.sh" --project "$ROLLBACK" --uninstall 2>"$TMP/rollback.error"; then
  printf 'expected injected uninstall failure\n' >&2
  exit 1
fi
grep -q 'injected uninstall failure after hook mutation' "$TMP/rollback.error"
cmp "$TMP/rollback-hooks.before" "$ROLLBACK/.cursor/hooks.json"
cmp "$TMP/rollback-rule.before" "$ROLLBACK/.cursor/rules/fusengine.mdc"
test -f "$ROLLBACK/.cursor/fusengine/.managed-by-fusengine"
test "$LOADER_BEFORE" = "$(cd "$ROLLBACK" && node .cursor/fusengine/load-plugins.mjs)"
printf 'PASS uninstall rollback restores hooks, rule, and managed installation\n'
