# fuse-tailwindcss (Cursor Plugin)

Tailwind CSS v4.1 expert: CSS-first configuration (no `tailwind.config.js`), `@theme` design
tokens, `@utility` / `@variant`, the Oxide engine, OKLCH wide-gamut colors and container queries.
One subagent, 16 skills covering the utility surface.

Ported from the Claude Code plugin `fuse-tailwindcss` v1.1.8 (source folder `plugins/tailwindcss/`).
The plugin name is deliberately identical across both ecosystems so cross-plugin references
(`fuse-tailwindcss:<skill>`, and the agent's own `fuse-ai-pilot:fuse-browser-usage`) keep resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 16 | `skills/<name>/SKILL.md` |
| Commands | — | source has none |
| Hooks | 2 events | `hooks/hooks.json` |
| Docs | — | source has none |

### Skills

Core and configuration:

| Skill | Covers |
| :-- | :-- |
| `tailwindcss-v4` | Core v4.1, `@theme`, directives, v3 → v4 migration guide |
| `tailwindcss-core` | `@theme`, `@import`, `@source`, `@utility`, `@variant`, `@apply`, `@config` |
| `tailwindcss-utilities` | Router/index only — which categorical skill covers a given class |
| `tailwindcss-utility-classes` | Layout, spacing, typography, colors, borders, effects |
| `tailwindcss-responsive` | Breakpoints `sm:`…`2xl:`, container queries |
| `tailwindcss-custom-styles` | `@utility`, `@variant`, `@apply`, custom CSS |

Layout and spacing:

| Skill | Covers |
| :-- | :-- |
| `tailwindcss-layout` | Flexbox, Grid, position, container queries (`@container`) |
| `tailwindcss-spacing` | `m-*`, `p-*`, `space-x/y-*` |
| `tailwindcss-sizing` | Width, height, `h-dvh`, min/max, aspect ratio |

Styling:

| Skill | Covers |
| :-- | :-- |
| `tailwindcss-typography` | Fonts, text, `text-shadow`, `text-wrap: balance/pretty` |
| `tailwindcss-backgrounds` | OKLCH P3 colors, radial/conic gradients, images, blend modes |
| `tailwindcss-borders` | Border, outline, ring, `divide-*` |
| `tailwindcss-effects` | `shadow-color-*`, `inset-shadow-*`, `mask-*`, filters |
| `tailwindcss-transforms` | Transform, transition, animation, `@keyframes` |
| `tailwindcss-interactivity` | Cursor, scroll-snap, `touch-action`, `accent-color` |
| `tailwindcss-accessibility` | Accessible utility patterns |

**Sixteen, not fifteen.** The source plugin's `description` and its own README both say "15
specialized skills" and the README's tables omit `tailwindcss-accessibility`, which exists on disk
and is fully formed. The count in `plugin.json` was left as the source wrote it (a manifest is
copied, not corrected); the table above lists what actually ships.

v4.1 surface the skills document: `h-dvh`, `shadow-color-*`, `inset-shadow-*`, `mask-*`,
`text-shadow-*`, `text-wrap: balance/pretty`, `bg-radial-*` / `bg-conic-*`, OKLCH wide-gamut P3.
Browser floor: Safari 16.4+, Chrome 111+, Firefox 128+.

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`.

## Port notes (read before editing)

### Agent

`agents/tailwindcss-expert.md`, one agent. It self-selects on `tailwind.config.*` or
`@import "tailwindcss"`, for CSS-only work, v3 → v4 migration, and utility-class audits.

- **`model: sonnet` → `model: grok-4.6`** — the uniform-model doctrine: every ported agent runs on
  `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]` would be redundant).
  This agent is an executant, not an organ of control, so it takes no `[effort=high]`.
  `claude-opus-*` remains barred by policy.
- **No `readonly`** (R6): the source `tools:` carries `Edit`, `Write` and 15 `mcp__*` tools.
- **`tools:` kept verbatim, plus an `## Allowed tools` block** at the top of the body (R4).
- `color: cyan` and `skills:` kept as-is (R7). One `skills:` entry uses Claude Code's
  plugin-qualified form (`fuse-ai-pilot:fuse-browser-usage`); resolution under Cursor is unverified.

### Skills

All 16 satisfy `name:` == parent folder name (R9, verified on disk). `references/` copied
verbatim — `diff -rq` against the source `skills/` is clean.

Out-of-schema frontmatter keys kept verbatim (R7/R19): `user-invocable` (16), `references` (1),
`related-skills` (1). `user-invocable` was **not** translated to `disable-model-invocation` (R8).

### Commands

None in the source, so no `commands/` folder here.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11).

#### R12 — events declared by *this* plugin

| Claude Code event | Cursor event | Status | Consequence |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | `preToolUse` | `MAPPED` | Carries `permission`. Matcher tests `tool_name`. |
| `PostToolUse` | `postToolUse` | `MAPPED` | Carries `additional_context`. Matcher tests `tool_name`. |

Two events, two rows — 100 % coverage. No `UNKNOWN`, `NOT PORTABLE` or `CURSOR-NATIVE ONLY` event
in this plugin.

#### R13 — matchers declared by *this* plugin

| Event | Source matcher | Cursor matcher | Status | Consequence |
| :-- | :-- | :-- | :-- | :-- |
| `preToolUse` | `Write\|Edit` | `Write` | `MAPPED` | `Edit` collapses into `Write` (`tKu`). Lossless here — both names routed to the same command with the same scope and no per-tool message. |
| `postToolUse` | `""` | *omitted* | — | R14: `""` means "match everything"; omitting the field is the Cursor-correct way to say it. |

No `mcp__` matcher exists in this plugin, so R13's "never write `mcp__` as a Cursor matcher" never
had to fire. No matcher is `NOT PORTABLE`.

Every matcher was compiled with `re.compile()` before shipping (R13 trap 1) — the runtime tester
wraps `new RegExp(m).test(t)` in `catch { return true }`, so an invalid matcher matches
**everything**, silently.

#### Scopes differ between the two entries — preserved exactly

| Event | Command |
| :-- | :-- |
| `preToolUse` | `npx -y @fusengine/harness hook cursor` — **no scope** |
| `postToolUse` | `npx -y @fusengine/harness hook cursor tailwindcss` — scope `tailwindcss` |

That asymmetry is in the source and is deliberate there: the pre-write entry runs the generic
framework-routed SOLID / skill / DRY / file-size enforcement, while the post-write entry runs the
Tailwind-specific pass. R15 requires the scope be preserved *exactly*, which includes preserving
its absence. Adding `tailwindcss` to the first entry would have re-routed a generic guard into a
plugin-specific dispatcher.

#### Comment keys removed

The source carried `_description` on the file and on each entry, plus `_version: "2.0.0"` (R16).
All were removed — not renamed. `_version` in particular is a **trap**: Cursor's hooks config has a
real, required `version` field that must be a **number** (`"Config version must be a number"`,
and a positive integer). De-underscoring `_version: "2.0.0"` would have written a string into a
typed schema field. The `"version": 1` in this file is a constant, written by the port, unrelated
to the source's internal schema label.

The removed prose, reproduced here:

> **File** — Tailwind CSS Expert: SOLID/skill/DRY/file-size enforcement via `@fusengine/harness`
> (framework-routed by `applies-to`).
> **PreToolUse** — framework-routed SOLID/skill/DRY/file-size/interface enforcement before
> Write/Edit.
> **PostToolUse** (scope `tailwindcss`) — record doc/ref/agent activity feeding the APEX gates, plus
> Tailwind best-practice warnings on Write/Edit (deprecated `@tailwind` directives, excessive
> `@apply`, overlong `className`).

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code [tailwindcss]`

Target: `npx -y @fusengine/harness hook cursor [tailwindcss]`

`$HOME/...` is absolute and points into a Claude Code install tree that does not exist for a Cursor
user; `npx` removes the path dependency. `hook claude-code` becomes `hook cursor` on both entries
(R15), scope preserved per the table above.

## Runtime paths

This plugin references no `.claude/…` runtime state path — 0 occurrences across all 53 ported
files. The one `.claude/…` string in the *source* was the hook command's
`$HOME/.claude/plugins/marketplaces/…`, an **install** path rewritten under R15.

There is therefore nothing for the harness to resolve, and the R21 clause is deliberately not
reproduced here: on a plugin with zero state-path occurrences it would assert something factually
false.

## Not portable

Nothing. Both source hook entries survive, both matchers map, and no source subtree was excluded
except artefacts.

Excluded as artefacts, carrying no behaviour (R20a, not a documented loss): `mcp.json.bak` and
`.DS_Store` at the plugin root.

The source plugin's own top-level `README.md` is **not** carried alongside this file: it occupies
the same path, so it is replaced, and its non-redundant content (skill tables, v4.1 feature list,
browser floor) is folded into the sections above. Its install snippet was dropped rather than
folded — `claude mcp add-json … '{"type":"local","path":"plugins/tailwindcss"}'` is a Claude Code
CLI invocation against a path that does not exist here; see "Install locally" instead.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`.
