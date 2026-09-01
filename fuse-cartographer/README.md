# fuse-cartographer (Cursor Plugin)

Generates indented markdown maps of the plugin ecosystem and of the current project, so agents can
navigate `.cartographer/` trees instead of re-scanning the filesystem.

Ported from the Claude Code plugin `fuse-cartographer` v1.0.10. The plugin name is deliberately
identical across both ecosystems so cross-plugin references (`fuse-cartographer:<skill>`) keep
resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 1 | `skills/<name>/SKILL.md` |
| Commands | 1 | `commands/*.md` |
| Hooks | 2 events | `hooks/hooks.json` |

The source plugin has no `rules/` or `docs/` folder, so the port has none either: absence in the
source is reproduced as absence in the port, never as an empty folder (R4–R6 preamble).

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`. The agent declares no MCP tool.

## Port notes (read before editing)

### Agents

- **`model: sonnet` → `model: grok-4.6`** on `cartographer` — the uniform-model doctrine: every
  ported agent runs on `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]`
  would be redundant). This agent is an executant, not an organ of control, so it takes no
  `[effort=high]`. `claude-opus-*` remains barred by policy.
- **No `readonly:`.** The agent is read-only *outside* `.cartographer/`, but its source `tools:`
  contains `Write` — it rewrites truncated descriptions into `index.md` files. R6's first
  condition therefore fails, and setting `readonly` would break the enrichment path, which is half
  the plugin's purpose.
- **`tools:` is kept in the frontmatter, unchanged**, and a `## Allowed tools` block is emitted at
  the top of the body **in addition** (R4).
- **`color:` and `effort:` are kept as-is** (R7). The agent declares no `skills:` key.

### Skills

`map-ecosystem` satisfies Cursor's hard rule that `name:` equals the parent folder name. It has no
`references/` or `steps/` subtree.

Keys preserved, absent from Cursor's documented set and **not verified against the binary**, so
unknown rather than unsupported (R19): `context`, `user-invocable`.

`user-invocable` was **not** translated to `disable-model-invocation` (R8).

### Commands

`commands/map.md` is byte-identical to the source (R10). It **does** declare `name: map` — Cursor
derives the name from the filename anyway, and the declared value matches, so the two agree. R10's
instruction is "do not add a `name`", not "strip an existing one"; the byte-identical requirement
wins over cosmetic tidying.

`map.md` contains **no placeholder** (`$ARGUMENTS`, `$1`, …) despite declaring
`argument-hint: "[--enrich]"`. The caller of `qxo` does
`hadPlaceholders ? content = result : (raw && content = content + "\n\n" + raw)`, so invoking
`/map --enrich` under Cursor silently appends `--enrich` to the end of the prompt instead of
substituting it. The body handles `--enrich` by inspecting the user's request in prose, so the
behaviour is preserved; the mechanism differs from Claude Code.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11). The source `_description`
keys and `_version: "1.2.0"` were stripped (R16) — they are not schema fields and JSON has no
comments. Their content is reproduced here:

- `sessionStart`: source intent for the harness `carto` scope is to regenerate the project map
  (`.cartographer/project`) and the plugin ecosystem map (`.cartographer`), then inject navigation
  context. Cursor publicly supports `sessionStart.additional_context`, but actual execution and
  delivery remain runtime-unverified in the inspected harness. Ports `generate_project_map.py` +
  `generate_map.py`.
- `postToolUse`: source intent is for the harness to save descriptions from an edited
  `.cartographer` `index.md` into `.enriched.json`; actual Cursor execution remains
  runtime-unverified in the inspected harness. Ports `track-enrichment.py`.

**`_version` was not de-underscored into `version`.** The `"version": 1` in the ported file is a
Cursor schema constant — a **number** — written from scratch and unrelated to the source's
`"1.2.0"` string, which was an internal schema label of the Claude Code plugin.

#### R12 — events declared by this plugin

| Claude Code event | Cursor event | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| SessionStart | sessionStart | MAPPED | Cursor publicly supports additional_context. This hook is intended to use it for navigation-map injection, but actual Cursor execution and context delivery remain runtime-unverified in the inspected harness. |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni`. Matcher tests `tool_name` (`aYg` @19779089). |

100 % of this plugin's own events. No `UNKNOWN`, no `NOT PORTABLE`, nothing dropped.

#### R13 — tool matchers declared by this plugin

| Source matcher | Cursor matcher | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `""` (on `SessionStart`) | *omitted* | `MAPPED` | R14. `cYg` @19779820 treats an empty, `"*"`, or absent matcher as match-everything; omitting the field is the Cursor-correct way to say that. `sessionStart` has no matcher target in `aYg` anyway. |
| `Edit` (in `Edit\|Write`) | `Write` | `MAPPED` | `tKu` @19776314 maps `Edit` → `Write`. **Collapses** with the entry below: `Edit\|Write` becomes the single matcher `Write`. Both source tools shared one command and one message, so nothing had to be merged by hand. |
| `Write` (in `Edit\|Write`) | `Write` | `MAPPED` | `tKu` maps it to itself. |

Every matcher present in the source has a row. `Write` compiles as a regex, verified before
shipping — `cYg` wraps its test in `catch { return !0 }`, so an invalid regex would silently match
everything.

| Claude Code | Cursor | Matcher before | Matcher after |
| :-- | :-- | :-- | :-- |
| `SessionStart` | `sessionStart` | `""` | *omitted* |
| `PostToolUse` | `postToolUse` | `Edit\|Write` | `Write` |

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code carto || true`

Target: `npx -y @fusengine/harness hook cursor carto`

R15. `$HOME/…` is absolute and points into a Claude Code install tree that does not exist for a
Cursor user; `npx` removes the path dependency. The scope argument `carto` is preserved exactly on
both entries.

**The source's trailing `|| true` was removed — this is a change of form, not of behaviour.** Both
source entries ended in `|| true`, the Claude Code idiom for forcing exit code 0 so a harness
failure never aborts a session start or a write. Under Cursor that suffix is **redundant**: the
hook runner is fail-open, and only exit codes `0` (success, JSON output consumed) and `2` (block)
carry meaning — any other code is treated as "hook failed, action proceeds". The non-blocking
guarantee `|| true` bought is therefore already provided by the platform.

A second reason makes removal the safer option regardless: Cursor documents hooks as *spawned
processes*, and treats `command` as an executable plus argv. `npx -y @fusengine/harness hook cursor
carto || true` risks handing `||` and `true` to the harness as literal arguments, which is worse
than losing the suffix — the harness would receive a polluted scope. This is **not** a "Not
portable" entry: behaviour is equivalent, only the spelling changed. The decision is marketplace-
wide, applied identically to every ported plugin whose source carried the suffix.

## Runtime paths

This plugin references **no** harness runtime state path under `.claude/…`. Its state lives in
`.cartographer/` at the project root and in the marketplace's own `.cartographer/` directory —
neither of which is under `.claude/`. The R21 clause is deliberately not reproduced here: it
asserts that this plugin's bodies reference `.claude/…` state files, which would be factually
false.

The single `.claude/` string in the ported content is an **install** path, not a state path:
`commands/map.md` line 22 asks the user, in prose, whether to also enrich
`~/.claude/plugins/.../fusengine-plugins/.cartographer/`. Two rules point in opposite directions
here and the conflict is **left unresolved rather than decided unilaterally**:

- R21 §3 says an install path in a command body *is* R15's territory and *is* rewritten.
- R10 and this port's acceptance criteria require the command files to be byte-identical to the
  source.

The file was kept byte-identical, because that is the explicit, checkable criterion, and because
there is no verified Cursor equivalent of the marketplace install root to rewrite it *to* —
inventing one is precisely what R17 forbids. The line is a question the model asks the user, not a
path any code resolves, so the practical impact is a stale directory name in one prompt. Flagged so
the next reader does not take it for an oversight; the rule conflict is reported upstream.

`commands/map.md` and `skills/map-ecosystem/SKILL.md` also reference
`${CLAUDE_PLUGIN_ROOT}/../.cartographer/index.md`. Cursor substitutes that variable only inside a
hook's `command` string and only for a `claude-plugin` source — never in markdown handed to the
model. The same limitation exists under Claude Code, so it is not a regression introduced by the
port.

## Not portable

- **Nothing is dropped**: both events map, all three matchers have a row, and the `Edit`/`Write`
  collapse is lossless here because the two shared one command and one message.
- **`/map` argument substitution** — no placeholder in the body, so Cursor appends `--enrich`
  instead of substituting it (documented above, not a removal).
- **The install path in `commands/map.md`** — kept verbatim under an unresolved R21 §3 / R10
  conflict, documented above.
- `Glob` and `MultiEdit` are `NOT PORTABLE` matchers (R13), `Notification` and `PermissionRequest`
  are `NOT PORTABLE` events (R12); this plugin uses none of them.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`. Node's `npx` must be on `PATH` for
the hooks.
