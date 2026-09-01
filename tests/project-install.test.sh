#!/usr/bin/env bash
# Integration contract for the project-scoped Cursor installer.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PROJECT="$TMP/project"
FAKE_HOME="$TMP/home"
mkdir -p "$PROJECT/.cursor" "$FAKE_HOME/.cursor"

cat > "$PROJECT/.cursor/hooks.json" <<'JSON'
{
  "version": 1,
  "hooks": {
    "workspaceOpen": [{"command": "node existing-hook.mjs"}],
    "sessionStart": [{"command": "node unrelated.mjs"}]
  },
  "unrelated": true
}
JSON
printf 'keep\n' > "$PROJECT/.cursor/keep.txt"
HOME_BEFORE="$(find "$FAKE_HOME" -print | sort)"

HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$PROJECT"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$PROJECT"
cp -R "$PROJECT/.cursor/fusengine/plugins/core-guards" "$PROJECT/.cursor/fusengine/plugins/extra-plugin"
"$ROOT/verify-project.sh" "$PROJECT"

test "$HOME_BEFORE" = "$(find "$FAKE_HOME" -print | sort)"
test -f "$PROJECT/.cursor/fusengine/load-plugins.mjs"
test -f "$PROJECT/.cursor/rules/fusengine.mdc"
test -f "$PROJECT/.cursor/keep.txt"

node - "$ROOT" "$PROJECT" <<'NODE'
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const [source, project] = process.argv.slice(2);
const market = JSON.parse(fs.readFileSync(path.join(source, '.cursor-plugin/marketplace.json')));
const hooks = JSON.parse(fs.readFileSync(path.join(project, '.cursor/hooks.json')));
if (hooks.unrelated !== true || hooks.hooks.sessionStart[0].command !== 'node unrelated.mjs') throw Error('unrelated hooks changed');
const commands = hooks.hooks.workspaceOpen.map((hook) => hook.command);
if (!commands.includes('node existing-hook.mjs')) throw Error('existing workspaceOpen hook removed');
if (!commands.some((command) => /^node \.cursor\/fusengine\/load-plugins\.mjs --fusengine-owner=[a-f0-9]{16}$/.test(command))) throw Error('project-relative owned loader missing');
const output = execFileSync('node', ['.cursor/fusengine/load-plugins.mjs'], { cwd: project, encoding: 'utf8' });
const loaded = JSON.parse(output);
if (!Array.isArray(loaded.pluginPaths)) throw Error('pluginPaths missing');
if (loaded.pluginPaths.length !== market.plugins.length) throw Error('marketplace/pluginPaths count mismatch');
const physicalProject = fs.realpathSync(project);
const expected = market.plugins.map((entry) => path.resolve(physicalProject, '.cursor/fusengine/plugins', entry.name)).sort();
if (JSON.stringify([...loaded.pluginPaths].sort()) !== JSON.stringify(expected)) throw Error('plugin paths differ from marketplace');
const root = path.resolve(physicalProject, '.cursor/fusengine');
if (loaded.pluginPaths.includes(root)) throw Error('marketplace root returned as a plugin');
if (loaded.pluginPaths.some((pluginPath) => pluginPath.endsWith('/extra-plugin'))) throw Error('undeclared plugin directory loaded');
for (const pluginPath of loaded.pluginPaths) {
  if (!path.isAbsolute(pluginPath)) throw Error('plugin path is not absolute');
  if (!fs.existsSync(path.join(pluginPath, '.cursor-plugin/plugin.json'))) throw Error(`not a plugin root: ${pluginPath}`);
}
NODE
printf 'PASS loader ignores undeclared plugin directories\n'

LOADER_BEFORE="$(cd "$PROJECT" && node .cursor/fusengine/load-plugins.mjs)"
if HOME="$FAKE_HOME" NODE_ENV=test FUSE_INSTALL_TEST_FAIL_AFTER_PLUGIN=1 \
  "$ROOT/install.sh" --project "$PROJECT" 2>"$TMP/reinstall-error"; then
  printf 'expected injected mid-copy failure\n' >&2
  exit 1
fi
grep -q 'injected copy failure after plugin' "$TMP/reinstall-error"
test "$LOADER_BEFORE" = "$(cd "$PROJECT" && node .cursor/fusengine/load-plugins.mjs)"
"$ROOT/verify-project.sh" "$PROJECT"
test -z "$(find "$PROJECT/.cursor" -maxdepth 1 \( -name '.fusengine-stage-*' -o -name '.fusengine-backup-*' \) -print -quit)"
printf 'PASS failed reinstall preserves the prior functional installation\n'

cp "$PROJECT/.cursor/fusengine/marketplace.json" "$TMP/marketplace.json"
node - "$PROJECT" <<'NODE'
const fs = require('fs');
const path = require('path');
const file = path.join(process.argv[2], '.cursor/fusengine/marketplace.json');
const market = JSON.parse(fs.readFileSync(file, 'utf8'));
market.plugins[0].source = '../unsafe';
fs.writeFileSync(file, `${JSON.stringify(market, null, 2)}\n`);
NODE
if (cd "$PROJECT" && node .cursor/fusengine/load-plugins.mjs 2>"$TMP/unsafe-error"); then
  printf 'expected unsafe marketplace source rejection\n' >&2
  exit 1
fi
grep -q 'unsafe marketplace plugin source' "$TMP/unsafe-error"
cp "$TMP/marketplace.json" "$PROJECT/.cursor/fusengine/marketplace.json"
printf 'PASS loader rejects unsafe marketplace sources\n'

mkdir -p "$TMP/external-plugins"
cp -R "$PROJECT/.cursor/fusengine/plugins/core-guards" "$TMP/external-plugins/core-guards"
node - "$PROJECT" <<'NODE'
const fs = require('fs');
const path = require('path');
const plugin = path.join(process.argv[2], '.cursor/fusengine/plugins/core-guards');
fs.rmSync(plugin, { recursive: true });
NODE
ln -s "$TMP/external-plugins/core-guards" "$PROJECT/.cursor/fusengine/plugins/core-guards"
if (cd "$PROJECT" && node .cursor/fusengine/load-plugins.mjs 2>"$TMP/escape-error"); then
  printf 'expected external plugin symlink rejection\n' >&2
  exit 1
fi
grep -Eq 'symlink|outside' "$TMP/escape-error"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$PROJECT" >/dev/null
test -f "$TMP/external-plugins/core-guards/.cursor-plugin/plugin.json"
printf 'PASS loader rejects external plugin symlink escapes\n'

grep -q 'install.mjs' "$ROOT/install.ps1"
grep -q -- '--project' "$ROOT/install.ps1"
grep -q 'DryRun' "$ROOT/install.ps1"
grep -q 'Uninstall' "$ROOT/install.ps1"

DRY_PROJECT="$TMP/dry-project"
mkdir -p "$DRY_PROJECT"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$DRY_PROJECT" --dry-run
test -z "$(find "$DRY_PROJECT" -mindepth 1 -print -quit)"

HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$PROJECT" --uninstall
test ! -e "$PROJECT/.cursor/fusengine"
test ! -e "$PROJECT/.cursor/rules/fusengine.mdc"
test -f "$PROJECT/.cursor/keep.txt"
node - "$PROJECT" <<'NODE'
const fs = require('fs');
const path = require('path');
const project = process.argv[2];
const hooks = JSON.parse(fs.readFileSync(path.join(project, '.cursor/hooks.json')));
if (hooks.unrelated !== true || hooks.hooks.sessionStart[0].command !== 'node unrelated.mjs') throw Error('unrelated hooks changed on uninstall');
const commands = hooks.hooks.workspaceOpen.map((hook) => hook.command);
if (commands.length !== 1 || commands[0] !== 'node existing-hook.mjs') throw Error('owned hook not removed precisely');
NODE

MODIFIED_PROJECT="$TMP/modified-project"
mkdir -p "$MODIFIED_PROJECT"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$MODIFIED_PROJECT" >/dev/null
printf '\n# Local addition\n' >> "$MODIFIED_PROJECT/.cursor/rules/fusengine.mdc"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$MODIFIED_PROJECT" --uninstall 2>"$TMP/uninstall-warning"
test -f "$MODIFIED_PROJECT/.cursor/rules/fusengine.mdc"
grep -q 'preserved pre-existing or modified rule' "$TMP/uninstall-warning"

EMPTY_PROJECT="$TMP/empty-project"
mkdir -p "$EMPTY_PROJECT"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$EMPTY_PROJECT" >/dev/null
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$EMPTY_PROJECT" >/dev/null
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$EMPTY_PROJECT" --uninstall >/dev/null
test ! -e "$EMPTY_PROJECT/.cursor/hooks.json"

SYMLINK_PROJECT="$TMP/symlink-project"
mkdir -p "$SYMLINK_PROJECT" "$TMP/external-cursor"
ln -s "$TMP/external-cursor" "$SYMLINK_PROJECT/.cursor"
if HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$SYMLINK_PROJECT" --dry-run 2>"$TMP/symlink-error"; then
  printf 'expected symlinked .cursor rejection\n' >&2
  exit 1
fi
grep -q 'refusing to write through symlink' "$TMP/symlink-error"
test -z "$(find "$TMP/external-cursor" -mindepth 1 -print -quit)"

DANGLING_PROJECT="$TMP/dangling-project"
mkdir -p "$DANGLING_PROJECT/.cursor"
ln -s "$TMP/external-hooks.json" "$DANGLING_PROJECT/.cursor/hooks.json"
if HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$DANGLING_PROJECT" 2>"$TMP/dangling-error"; then
  printf 'expected dangling hooks symlink rejection\n' >&2
  exit 1
fi
grep -q 'refusing to write through symlink' "$TMP/dangling-error"
test ! -e "$TMP/external-hooks.json"
printf 'PASS dangling write-target symlink is rejected\n'

PREHOOK_PROJECT="$TMP/prehook-project"
mkdir -p "$PREHOOK_PROJECT/.cursor"
cat > "$PREHOOK_PROJECT/.cursor/hooks.json" <<'JSON'
{"version":1,"hooks":{"workspaceOpen":[{"command":"node .cursor/fusengine/load-plugins.mjs"},{"command":"node owner.mjs"}]}}
JSON
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$PREHOOK_PROJECT" >/dev/null
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$PREHOOK_PROJECT" >/dev/null
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$PREHOOK_PROJECT" --uninstall >/dev/null
node -e 'const h=require(process.argv[1]);const c=h.hooks.workspaceOpen.map(x=>x.command);if(c.filter(x=>x==="node .cursor/fusengine/load-plugins.mjs").length!==1||!c.includes("node owner.mjs"))process.exit(1)' "$PREHOOK_PROJECT/.cursor/hooks.json"
printf 'PASS pre-existing identical loader hook survives uninstall\n'

BACKUP_PROJECT="$TMP/backup-project"
mkdir -p "$BACKUP_PROJECT"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$BACKUP_PROJECT" >/dev/null
HOME="$FAKE_HOME" NODE_ENV=test FUSE_INSTALL_TEST_FAIL_BACKUP_CLEANUP=1 \
  "$ROOT/install.sh" --project "$BACKUP_PROJECT" 2>"$TMP/backup-warning"
grep -q 'recovery backup retained' "$TMP/backup-warning"
test -n "$(find "$BACKUP_PROJECT/.cursor" -maxdepth 1 -name '.fusengine-backup-*' -print -quit)"
mkdir "$BACKUP_PROJECT/.cursor/.fusengine-backup-999-999"
printf 'keep\n' > "$BACKUP_PROJECT/.cursor/.fusengine-backup-999-999/keep"
HOME="$FAKE_HOME" "$ROOT/install.sh" --project "$BACKUP_PROJECT" >/dev/null
test -f "$BACKUP_PROJECT/.cursor/.fusengine-backup-999-999/keep"
test -z "$(find "$BACKUP_PROJECT/.cursor" -maxdepth 1 -name '.fusengine-backup-*' ! -name '.fusengine-backup-999-999' -print -quit)"
"$ROOT/verify-project.sh" "$BACKUP_PROJECT" >/dev/null
printf 'PASS committed install survives backup cleanup failure and recovers owned backup next run\n'

printf 'PASS project-scoped install, dry-run, loader, and uninstall\n'
