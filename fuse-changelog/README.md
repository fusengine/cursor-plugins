# fuse-changelog (Cursor Plugin)

Claude Code update watcher: changelog tracking, breaking-change detection against this plugin
ecosystem, plugin compatibility analysis, and community pulse via Exa.

Ported from the Claude Code plugin `fuse-changelog` v1.0.13. The plugin name is deliberately
identical across both ecosystems so cross-plugin references (`fuse-changelog:<skill>`) keep
resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 3 | `skills/<name>/SKILL.md` |
| Commands | 1 | `commands/*.md` |
| Hooks | 2 events | `hooks/hooks.json` |
| Rules | 1 | `rules/*.md` — discovered candidate; plain-`.md` activation runtime-unverified |

`rules/watcher-rules.md` is ported verbatim at the same relative path (R20c). Cursor's plugin
reference includes `rules/` in default discovery and accepts `.md` candidates. The Rules format
documentation focuses on `.mdc` files with rule frontmatter, so native activation of this plain
source-identical `.md` file remains runtime-unverified. It was **not** translated into Cursor's
`.cursor/rules/*.mdc` format: that would add different frontmatter and invent the mapping that R17
and R19 forbid.

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`. The agent's declared tool surface
includes the `exa`, `sequential-thinking` and `fuse-browser` MCP servers, which must be configured
on the Cursor side for the research and pulse steps to work.

**Scope note.** This plugin watches **Claude Code's** changelog and API surface. That target is
unchanged by the port — a Cursor user running `/watch` is tracking Claude Code releases, not Cursor
releases. Retargeting it would be a content change to the plugin, not a port transformation, and
was deliberately left out of scope.

## Port notes (read before editing)

### Agents

- **`model: sonnet` → `model: grok-4.6`** on `changelog-watcher` — the uniform-model doctrine: every
  ported agent runs on `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]`
  would be redundant). This agent is an executant, not an organ of control, so it takes no
  `[effort=high]`. `claude-opus-*` remains barred by policy.
- **No `readonly:`, despite the agent being read-only in spirit.** Its source `tools:` has neither
  `Write` nor `Edit` — the first half of R6's condition holds — but it declares 9 `mcp__*` tools,
  and the second half fails. R6 makes both conditions binding for the same reason: `readonly`×MCP
  is an undocumented interaction, and an agent that silently lost its Exa and fuse-browser access
  would stop behaving like its Claude Code counterpart. The agent's read-only discipline is still
  stated in its body ("you never modify plugin code yourself"); it is simply not enforced by the
  `readonly` flag.
- **`tools:` is kept in the frontmatter, unchanged**, and a `## Allowed tools` block is emitted at
  the top of the body **in addition** (R4).
- **`color:` and `skills:` are kept as-is** (R7). `skills:` mixes bare names with one
  plugin-qualified reference, `fuse-ai-pilot:fuse-browser-usage`; whether the qualified form
  resolves under Cursor is unverified.

### Skills

All 3 satisfy Cursor's hard rule that `name:` equals the parent folder name: `breaking-changes`,
`changelog-scan`, `community-pulse`. `references/` and the nested `references/templates/` folders
are natively supported and were copied verbatim (R9).

Keys preserved across all 3 skills, absent from Cursor's documented set and **not verified against
the binary**, so unknown rather than unsupported (R19): `argument-hint`, `user-invocable`.

`user-invocable` was **not** translated to `disable-model-invocation` (R8).

### Commands

`commands/watch.md` is byte-identical to the source (R10). It declares no `name`; Cursor derives
`/watch` from the filename. It uses `$ARGUMENTS`, which `qxo(e,t)` substitutes with the raw
argument text — confirmed in the binary — so `/watch --pulse --since 2.1.0` works as intended.
`argument-hint` is kept verbatim (R7 / R19).

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11). The source `_description`
keys were stripped (R16); their content is reproduced here:

- `postToolUse` / `afterMCPExecution`: source intent is for the harness to track Exa / WebFetch /
  WebSearch research into the `~/.claude/logs/00-changelog` state. Actual Cursor execution remains
  runtime-unverified with the unpinned harness and without an authentic hook replay. Ports
  `track-watch-research.py`.

**One source entry became two Cursor entries.** The source `PostToolUse` matcher
`mcp__.*exa|WebFetch|WebSearch` mixes an MCP regex with two plain tool names, and under Cursor
those two halves live on different events — see the R13 table below.

#### R12 — events declared by this plugin

| Claude Code event | Cursor event | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni` @19775968. Matcher tests `tool_name` (`aYg` @19779089). Carries `additional_context`. |
| `PostToolUse` (MCP half) | `afterMCPExecution` | `CURSOR-NATIVE ONLY` | In `Wu` @19775205, **absent from `_Ni`**. Declared in `.claude/settings.json` it would be silently skipped by `nYg` @19777846; here it is statically declared in the plugin's native `hooks/hooks.json`, which preserves native-schema reachability, while actual event delivery remains runtime-unverified. It is the only "after" event whose matcher is tested against `` `MCP:${tool_name}` `` (`aYg`), which is why the MCP half of the source matcher had to move onto it. |

100 % of this plugin's own events — the source declares exactly one. No `UNKNOWN`, no
`NOT PORTABLE`, nothing dropped.

#### R13 — tool matchers declared by this plugin

| Source matcher | Cursor matcher | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `WebFetch` | `WebFetch` | `MAPPED` | `tKu` @19776314 maps it to itself. **The public docs were wrong** — they omit `WebFetch` from the matcher list, and an earlier reading of R13 rated it `NOT PORTABLE` on that documentary absence. R19 in action: it survives the port intact. |
| `WebSearch` | `WebSearch` | `MAPPED` | `tKu` maps it to itself. Same correction as `WebFetch`. |
| `mcp__.*exa` | `MCP:(web_search_exa\|get_code_context_exa\|deep_researcher_start\|deep_researcher_check)` | `MAPPED` | `tKu` / `JQg` @~19776502 rewrite `mcp__<server>__<tool>` into `` `MCP:${tool}` ``, and `aYg` confirms `` `MCP:${tool_name}` `` is the matcher target of the MCP events. **The server segment is lost**, so a matcher written against the *server* (`exa`) cannot survive as-is: it was re-expressed by enumerating the four exa tools this plugin's agent actually declares. See the caveat below. |

**Caveat on the MCP row — read before editing the matcher.** R13 rates the regex form `mcp__.*exa`
as `MAPPED` onto `MCP:<tool>`, but the mapping is not information-preserving in this direction: the
source matcher selects on the **server** name, and the server segment does not exist on the Cursor
side. A literal `MCP:.*exa` would happen to match `web_search_exa` and `get_code_context_exa` by
coincidence of naming, and would silently **miss** `deep_researcher_start` and
`deep_researcher_check` — neither contains "exa". A matcher that never fires raises nothing, so the
miss would be invisible. Enumerating the tools is the closest faithful expression, and it is **not
exhaustive**: if the exa server gains a tool, or the agent's `tools:` list grows, the matcher must
be extended by hand or the new tool stops being tracked. The final regex compiles
(`new RegExp("MCP:(web_search_exa|…)")`), verified before shipping — `cYg` @19779820 wraps its test
in `catch { return !0 }`, so an invalid regex would silently match everything.

**Never write `mcp__` as a Cursor matcher.** Neither ported matcher contains it.

| Claude Code | Cursor | Matcher before | Matcher after |
| :-- | :-- | :-- | :-- |
| `PostToolUse` | `postToolUse` | `mcp__.*exa\|WebFetch\|WebSearch` | `WebFetch\|WebSearch` |
| `PostToolUse` | `afterMCPExecution` | *(MCP half of the same matcher)* | `MCP:(web_search_exa\|get_code_context_exa\|deep_researcher_start\|deep_researcher_check)` |

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code changelog`

Target: `npx -y @fusengine/harness hook cursor changelog`

R15. `$HOME/…` is absolute and points into a Claude Code install tree that does not exist for a
Cursor user; `npx` removes the path dependency. The scope argument `changelog` is preserved exactly
on both entries.

## Runtime paths

Native Cursor APEX state uses `.cursor/apex/`, harness-owned project cache uses
`.harness/cache/`, and documented `.claude/…` compatibility inputs remain unchanged where Cursor
intentionally consumes them.

Scope here: **4** occurrences, all naming the same state root
`~/.claude/logs/00-changelog/` — three in `skills/changelog-scan/SKILL.md` (the
`<date>-state.json` file holding the last known Claude Code version) and one in
`rules/watcher-rules.md`. That file is written and re-read by the standalone harness `changelog`
CLI. It is legacy Claude-product changelog state, not Cursor APEX or project cache; changing its
location requires a harness decision and is therefore not invented in this plugin.

## Not portable

- **Nothing is dropped**: both events map, all three matchers have a row, and `WebFetch` /
  `WebSearch` survive intact against what the public docs claimed.
- **Degraded, not lost — the MCP matcher.** Its server segment is gone, so the ported matcher is an
  enumeration that must be maintained by hand (see the caveat above). An exa tool added later stops
  being tracked without any error.
- `Glob` and `MultiEdit` are `NOT PORTABLE` matchers (R13), `Notification` and `PermissionRequest`
  are `NOT PORTABLE` events (R12); this plugin uses none of them.
- `rules/watcher-rules.md` is a default-discovery candidate, but native activation of the verbatim
  plain `.md` file remains runtime-unverified; the harness also treats it as source content.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`. Node's `npx` must be on `PATH` for
the hooks.
