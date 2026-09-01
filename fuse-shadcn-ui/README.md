# fuse-shadcn-ui (Cursor Plugin)

Expert shadcn/ui with Radix UI and Base UI primitive detection, component patterns, registry
configuration, theming, and Radix ↔ Base UI migration.

Ported from the Claude Code plugin `fuse-shadcn-ui` v1.0.15. The plugin name is deliberately
identical across both ecosystems so cross-plugin references (`fuse-shadcn-ui:<skill>`) keep
resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 5 | `skills/<name>/SKILL.md` |
| Hooks | 2 events | `hooks/hooks.json` |
| Rules | 2 | `rules/*.md` — discovered candidates; plain-`.md` activation runtime-unverified |

The source plugin has no `commands/` folder, so the port has none either: absence in the source is
reproduced as absence in the port, never as an empty folder (R4–R6 preamble).

`rules/apex-workflow.md` and `rules/shadcn-rules.md` are ported verbatim at the same relative path
(R20c). Cursor's plugin reference includes `rules/` in default discovery and accepts `.md`
candidates. The Rules format documentation focuses on `.mdc` files with rule frontmatter, so
native activation of these plain source-identical `.md` files remains runtime-unverified. They are
also referenced by the agent's `rules: apex-workflow, shadcn-rules` frontmatter key, which R7 keeps
verbatim; dropping the files while keeping the key would have left a dangling reference. Resolving
that key remains a harness concern. They were **not** translated into Cursor's
`.cursor/rules/*.mdc` format because that would add different frontmatter (`description`, `globs`,
`alwaysApply`) and invent the mapping that R17 and R19 forbid.

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`. The agent's declared tool surface
includes the `shadcn`, `context7`, `exa`, `sequential-thinking` and `fuse-browser` MCP servers,
which must be configured on the Cursor side for the corresponding steps to work.

## Port notes (read before editing)

### Agents

- **`model: sonnet` → `model: grok-4.6`** on `shadcn-ui-expert` — the uniform-model doctrine: every
  ported agent runs on `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]`
  would be redundant). This agent is an executant, not an organ of control, so it takes no
  `[effort=high]`. `claude-opus-*` remains barred by policy.
- **No `readonly:`.** R6's condition fails twice: the source `tools:` contains both `Edit` and
  `Write`, and it declares 20 `mcp__*` tools. Setting `readonly` would contradict the agent's
  purpose and risk silently stripping its MCP access, an undocumented interaction.
- **`tools:` is kept in the frontmatter, unchanged**, and a `## Allowed tools` block is emitted at
  the top of the body **in addition** (R4).
- **`color:`, `skills:` and `rules:` are kept as-is** (R7). `skills:` mixes bare names with one
  plugin-qualified reference, `fuse-ai-pilot:fuse-browser-usage`; Cursor identifies skills by bare
  folder name, and whether the qualified form resolves is unverified.

### Skills

All 5 satisfy Cursor's hard rule that `name:` equals the parent folder name: `shadcn-components`,
`shadcn-detection`, `shadcn-migration`, `shadcn-registries`, `shadcn-theming`. `references/` and
the nested `references/templates/` folders are natively supported and were copied verbatim (R9).

Keys preserved across the skills, absent from Cursor's documented set and **not verified against
the binary**, so unknown rather than unsupported (R19): `versions`, `user-invocable`,
`allowed-tools`, `references`, `related-skills`.

`user-invocable` was **not** translated to `disable-model-invocation` (R8).

### Commands

None. The source plugin ships no `commands/` folder.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11).

Both source entries carried `_description` keys, and the file carried a `_version: "2.0.0"`. All
`_`-prefixed keys were stripped (R16) — they are not schema fields and JSON has no comments. Their
content is reproduced here instead:

- `preToolUse`: source intent is framework-routed SOLID / skill / DRY / file-size / interface
  enforcement before a write; actual Cursor execution and enforcement remain runtime-unverified
  with the unpinned harness and without an authentic hook replay.
- `postToolUse`: source intent is for the harness to record doc / reference / agent activity feeding
  the APEX gates; actual Cursor execution remains runtime-unverified under the same conditions.

**`_version` was not de-underscored into `version`.** The `"version": 1` in the ported file is a
Cursor schema constant — a **number** — written from scratch and unrelated to the source's
`"2.0.0"` string, which was an internal schema label of the Claude Code plugin. Turning `_version`
into `version` would have put a string into a real numeric schema field.

#### R12 — events declared by this plugin

| Claude Code event | Cursor event | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | `preToolUse` | `MAPPED` | `_Ni` @19775968. Matcher tests `tool_name` (`aYg` @19779089). Carries `permission`. |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni`. Matcher tests `tool_name`. Carries `additional_context`. |

100 % of this plugin's own events. No `UNKNOWN`, no `NOT PORTABLE`, nothing dropped.

#### R13 — tool matchers declared by this plugin

| Source matcher | Cursor matcher | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `Write` (in `Write\|Edit`) | `Write` | `MAPPED` | `tKu` @19776314 maps it to itself. |
| `Edit` (in `Write\|Edit`) | `Write` | `MAPPED` | `tKu` maps `Edit` → `Write`. It **collapses** with the entry above: `Write\|Edit` becomes the single matcher `Write`. Both source tools shared one command and one message, so nothing had to be merged by hand. |
| `""` (on `PostToolUse`) | *omitted* | `MAPPED` | R14. `cYg` @19779820 treats an empty, `"*"`, or absent matcher as match-everything; omitting the field is the Cursor-correct way to say that. |

Every matcher present in the source has a row. `Write` compiles as a regex
(`new RegExp("Write")`), verified before shipping — `PKu` @19792700 compiles the field and `cYg`
wraps the test in `catch { return !0 }`, so an invalid regex would silently match everything.

| Claude Code | Cursor | Matcher before | Matcher after |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | `preToolUse` | `Write\|Edit` | `Write` |
| `PostToolUse` | `postToolUse` | `""` | *omitted* |

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code`

Target: `npx -y @fusengine/harness hook cursor`

R15. Two things forced the change: the submission checklist requires all manifest paths to be
relative and valid (`$HOME/…` is absolute), and the path points into a Claude Code install tree
that does not exist for a Cursor user. `npx` removes the path dependency entirely.
**Both entries carry no scope argument in the source, and none was added** — the scope is preserved
exactly, including its absence.

## Runtime paths

This plugin references **no** `.claude/…` path at all — not in a skill body, not in an agent body,
not in a rules file. Nothing to resolve harness-side, and the R21 clause is deliberately not
reproduced here: it asserts that this plugin's bodies reference `.claude/…` state files, which
would be factually false.

The only install-tree path this plugin ever carried was the hook command's
`$HOME/.claude/plugins/marketplaces/…`, and that is an install path, not a state path — R15's
territory, rewritten above.

## Not portable

- Nothing. Both declared events map, both declared matchers map, and the `Write`/`Edit` collapse is
  lossless here because the two shared one command and one message.
- `Glob` and `MultiEdit` are `NOT PORTABLE` matchers (R13) and `Notification` / `PermissionRequest`
  are `NOT PORTABLE` events (R12); this plugin uses none of them.
- `rules/*.md` are default-discovery candidates, but native activation of the verbatim plain `.md`
  files remains runtime-unverified; the harness also treats them as source content.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`. Node's `npx` must be on `PATH` for
the hooks.
