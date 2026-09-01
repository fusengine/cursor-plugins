# fuse-solid (Cursor Plugin)

SOLID principles enforcement with automatic project detection: one orchestrating subagent that
detects the project language from its config files, then routes to the matching per-language skill.

Ported from the Claude Code plugin `fuse-solid` v1.0.16 (source folder `plugins/solid/`). The
plugin name is deliberately identical across both ecosystems so cross-plugin references
(`fuse-solid:<skill>`) keep resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 8 | `skills/<name>/SKILL.md` |
| Commands | — | source has none |
| Hooks | 3 events | `hooks/hooks.json` |
| Docs | — | source has none |

Skills: `solid-detection` (the router), then `solid-csharp`, `solid-generic`, `solid-go`,
`solid-java`, `solid-python`, `solid-ruby`, `solid-rust`.

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`.

## Port notes (read before editing)

### Agent

`agents/solid-orchestrator.md`, one agent.

- **`model: sonnet` → `model: grok-4.6`** — the uniform-model doctrine: every ported agent runs on
  `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]` would be redundant).
  This agent orchestrates and delegates rather than contradicting the lead, so it stays at the
  default effort; `[effort=high]` is reserved for `challenger` and `sniper` in `fuse-ai-pilot`.
  `claude-opus-*` remains barred by policy.
- **`readonly: true` was added** (R6). The source `tools:` is `Read, Glob, Grep, Bash, Task` —
  neither `Write` nor `Edit`, and no `mcp__*` tool. It is the only agent across this batch of four
  that qualifies. In Claude Code the agent structurally could not write; `readonly` reproduces that
  constraint at runtime rather than leaving it to convention. This matters here more than
  elsewhere: the orchestrator's whole contract is *detect and delegate*, never edit.
- **`tools:` kept verbatim, plus an `## Allowed tools` block** at the top of the body (R4).
- `color: green` and `skills:` kept as-is (R7).

### Skills

All 8 satisfy `name:` == parent folder name (R9, verified on disk). `references/` and
`references/templates/` copied verbatim — `diff -rq` against the source `skills/` is clean.

Out-of-schema frontmatter keys kept verbatim (R7/R19): `user-invocable` (8), `references` (7),
`related-skills` (7), `versions` (6), `argument-hint` (1), and `version` (1 — singular, a
source-side inconsistency with the other 6 files; it is reproduced as-is rather than normalised,
because normalising it would be an edit the port is not entitled to make).

`user-invocable` was **not** translated to `disable-model-invocation` (R8).

### Commands

None in the source, so no `commands/` folder here.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11). Scope `solid` preserved
exactly on all three entries (R15).

#### R12 — events declared by *this* plugin

| Claude Code event | Cursor event | Status | Consequence |
| :-- | :-- | :-- | :-- |
| SessionStart | sessionStart | MAPPED | Cursor publicly supports env and additional_context. Source intent is to expose the detected SOLID_* project variables, but the inspected harness still writes CLAUDE_ENV_FILE/plain stdout and its lowerCamel lifecycle routing is incomplete; actual Cursor env export remains runtime-unverified. |
| `PreToolUse` | `preToolUse` | `MAPPED` | Carries `permission`. Matcher tests `tool_name`. |
| `PostToolUse` | `postToolUse` | `MAPPED` | Carries `additional_context`. Matcher tests `tool_name`. |

Three events, three rows — 100 % coverage. No `UNKNOWN`, no `NOT PORTABLE`, no
`CURSOR-NATIVE ONLY` event in this plugin.

#### R13 — matchers declared by *this* plugin

| Event | Source matcher | Cursor matcher | Status | Consequence |
| :-- | :-- | :-- | :-- | :-- |
| `sessionStart` | `""` | *omitted* | — | R14: `""` means "match everything"; omitting the field is the Cursor-correct way to say it. |
| `preToolUse` | `Write\|Edit` | `Write` | `MAPPED` | `Edit` collapses into `Write` (`tKu`). The two source names become one Cursor name. |
| `postToolUse` | `Write\|Edit` | `Write` | `MAPPED` | Same collapse. |

No matcher in this plugin is `NOT PORTABLE`; no `mcp__` matcher exists here, so R13's "never write
`mcp__` as a Cursor matcher" never had to fire.

**The `Edit`→`Write` collapse is lossless here, unlike in `core-guards`.** Both source entries
routed to the *same* command with the *same* scope and carried no per-tool message, so merging two
matcher names into one changes nothing observable. The collapse only costs something when two
distinct messages hang off the two names.

Every matcher was compiled with `re.compile()` before shipping (R13 trap 1). `Write` is a trivial
regex, but the check is not skippable by size: the runtime tester wraps `new RegExp(m).test(t)` in
`catch { return true }`, so an invalid matcher makes the hook match **everything**, silently.

#### `timeout` is preserved — verified, not assumed

The source carries `timeout: 5` on `SessionStart` and `timeout: 10` on both tool events. Cursor's
hook-script validator accepts `timeout` on **command** hooks, not only on `prompt` hooks:

> `e.timeout !== void 0 && (typeof e.timeout != "number" ? … "Hook script timeout must be a number
> (seconds)" : e.timeout <= 0 ? … "must be a positive number" : e.timeout > 3600 && console.warn(…))`

(`PKu`, the shared per-script validator, applied after the command/prompt branch.) The unit is
seconds, matching Claude Code. The values were carried over unchanged. Cursor's own Claude Code
compatibility layer does the same (`eYg`: `e.timeout !== void 0 && (n.timeout = e.timeout)`).

#### Comment keys removed

The source `hooks.json` carried a top-level `"description"` key holding the rationale for all three
entries. It is not a schema field and JSON has no comments, so it was removed (R16) and its content
is reproduced here instead:

> SessionStart: project detection (`SOLID_*` exports via `CLAUDE_ENV_FILE`). PreToolUse: Go/Python
> interface-location deny (`validate-solid`, keyed on `SOLID_PROJECT_TYPE` — not covered by
> `core-guards`). PostToolUse: adaptive `SOLID_FILE_LIMIT` warn (`check-file-size` — per-project
> limit, unlike `core-guards`' fixed ceiling).

Note the spelling: this plugin used `description`, **not** the `_description` that R16 names. It was
treated identically — same thing, a comment in a file that has no comments — but the rule as written
covers only the underscored form. Two safeguards applied, and they point in the same direction: the
key is not in Cursor's hooks-config schema (`version`, `hooks`, and per-script `command` / `type` /
`prompt` / `model` / `matcher` / `timeout` / `loop_limit` / `failClosed`), and it is not
`_`-prefixed, so there is no risk of the R16 typing trap where de-underscoring `_version: "2.0.0"`
would forge a string into the numeric `version` field. `"version": 1` is written here as a
constant, never derived from a source key.

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code solid`

Target: `npx -y @fusengine/harness hook cursor solid`

`$HOME/...` is absolute (the submission checklist requires relative, valid manifest paths) and
points into a Claude Code install tree that does not exist for a Cursor user. The scope argument
`solid` is preserved exactly; `hook claude-code` becomes `hook cursor` (R15).

## Runtime paths

This plugin references no `.claude/…` runtime state path — 0 occurrences across all 83 ported
files. The one `.claude/…` string in the *source* was the hook command's
`$HOME/.claude/plugins/marketplaces/…`, which is an **install** path, not a state path, and was
rewritten under R15 (see "Command path" above).

There is therefore nothing for the harness to resolve, and the R21 clause is deliberately not
reproduced here: on a plugin with zero state-path occurrences it would assert something factually
false.

## Not portable

Nothing. All three source hook entries survive the port, both tool matchers map, and no source
subtree was excluded except artefacts (see below).

Excluded as artefacts, carrying no behaviour (R20a, not a documented loss): `mcp.json.bak` and
`.DS_Store` at the plugin root.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`.
