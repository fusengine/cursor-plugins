# fuse-astro (Cursor Plugin)

Astro expert: Islands Architecture, Content Layer, Actions, View Transitions, adapters and
multi-framework integration. One orchestrating subagent, 14 skills.

Ported from the Claude Code plugin `fuse-astro` v1.0.11 (source folder `plugins/astro-expert/`).
The plugin name is deliberately identical across both ecosystems so cross-plugin references
(`fuse-astro:<skill>`, and the agent's own `fuse-ai-pilot:fuse-browser-usage`) keep resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 14 | `skills/<name>/SKILL.md` |
| Commands | — | source has none |
| Hooks | — | **source has none** — see below |
| Docs | — | source has none |

Skills: `astro-7`, `astro-actions`, `astro-assets`, `astro-content`, `astro-db`,
`astro-deployment`, `astro-i18n`, `astro-integrations`, `astro-islands`, `astro-security`,
`astro-seo`, `astro-starlight`, `astro-styling`, `solid-astro`.

## No hooks — by design, not by omission

**The source plugin has no `hooks/hooks.json`.** It is the only plugin in this batch without one.
No `hooks/` folder was created here: the R4–R6 preamble states that absence in the source is
reproduced as absence in the port, and an empty component folder is a divergence, not a precaution.

Consequence: this plugin ships **no** R12 event table and **no** R13 matcher table, because it
declares zero events and zero matchers. Those tables are obligations attached to a hook surface —
with no hook surface, an empty table would assert coverage of something that does not exist.

Nothing is lost from this plugin's own hook surface relative to Claude Code: the source had no hook
either. At source-design level, Astro enforcement is intended to come from `core-guards` / the
harness at the marketplace level. Actual Cursor hook execution and enforcement remain
runtime-unverified and are not provided by this plugin itself.

## Configuration

No `variables` are declared; the plugin needs no secrets. It shells out to nothing — with no hooks,
`npx` is not required for this plugin (unlike `fuse-solid`, `fuse-tailwindcss` and `fuse-design`).

## Port notes (read before editing)

### Agent

`agents/astro-expert.md`, one agent.

- **`model: sonnet` → `model: grok-4.6`** — the uniform-model doctrine: every ported agent runs on
  `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]` would be redundant).
  This agent is an executant, not an organ of control, so it takes no `[effort=high]`.
  `claude-opus-*` remains barred by policy.
- **No `readonly`** (R6). The source `tools:` carries `Edit` and `Write`, and 20 `mcp__*` tools —
  it fails both halves of the condition.
- **`tools:` kept verbatim in the frontmatter, plus an `## Allowed tools` block** at the top of the
  body (R4). Both, not either: `tools` is a first-class repeated field of `agent.v1.CustomSubagent`,
  but nothing proves the local-`.md` YAML parser populates it, so the body block keeps the
  constraint in the model's context either way.
- `color: cyan` and `skills:` are kept as-is (R7). `skills:` uses Claude Code's plugin-qualified
  form for one entry (`fuse-ai-pilot:fuse-browser-usage`); Cursor identifies skills by bare folder
  name and whether the qualified form resolves is unverified — unchanged from the pilot.

### Skills

All 14 satisfy Cursor's hard rule that `name:` equals the parent folder name (R9, verified on
disk). `references/` and `references/templates/` are natively supported and were copied verbatim —
`diff -rq` against the source `skills/` is clean.

Out-of-schema frontmatter keys kept verbatim on all 14 (R7/R19): `user-invocable`, `references`,
`related-skills`, `versions`. `user-invocable` was **not** translated to
`disable-model-invocation` (R8) — they are near-opposites, and mapping one onto the other would
have inverted the intent of every skill in the plugin.

### Commands

None in the source, so no `commands/` folder here.

## Runtime paths

This plugin references no `.claude/…` runtime state path — 0 occurrences across all 134 ported
files, in skill bodies, the agent body and the frontmatter alike. There is nothing for the harness
to resolve, and the R21 clause is therefore deliberately not reproduced here: on a plugin with zero
occurrences it would assert something factually false.

## Not portable

Nothing. This plugin has no hooks, no commands, no sub-projects and no build artefacts: every
source file that carries behaviour is present in the port.

For the record, the two categories that cost other plugins in this marketplace do not apply here —
no `Glob` / `MultiEdit` / `TaskCreate` / `TaskUpdate` matcher (no hooks at all), and no
`Notification` / `PermissionRequest` event.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`.
