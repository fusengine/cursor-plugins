# fuse-nextjs (Cursor Plugin)

Expert Next.js 16 + React 19 development: App Router, Server Components, Server Actions, Prisma 7,
Better Auth, TanStack Form, TanStack Query, Zustand, shadcn/ui, i18n.

Ported from the Claude Code plugin `fuse-nextjs` v1.1.21 (source folder `plugins/nextjs-expert`).
The plugin name is deliberately identical across both ecosystems so cross-plugin references
(`fuse-nextjs:<skill>`, and the agent's own `fuse-ai-pilot:*` references) keep resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 11 | `skills/<name>/SKILL.md` |
| Hooks | 2 events | `hooks/hooks.json` |
| Docs | 1 | `skills/README.md` — content, not a Cursor component |

The source plugin declares **no commands**, so this port has no `commands/` folder. An empty
component folder would be a divergence, not a precaution.

`skills/README.md` is ported verbatim (R20c). It documents the skill-authoring conventions of this
plugin — the standalone / light-hub / full-hub size patterns, the `references/` layout, the
frontmatter contract. Cursor does not discover it (discovery is `skills/<name>/SKILL.md`, and this
is a loose file, not a skill folder); it is reference material for whoever maintains the skills.

This file replaces the source plugin's own top-level `README.md`; its architecture convention is
reproduced under "Project architecture" below so nothing is lost.

## Skills

| Skill | Description |
| :-- | :-- |
| `nextjs-stack` | Master reference for the full Next.js 16+ stack |
| `nextjs-16` | Turbopack, App Router, Cache Components, `proxy.ts`, v15 migration |
| `nextjs-server-components` | Server vs Client boundaries, direct data fetching, Suspense streaming |
| `nextjs-tanstack-query` | Client fetching, server prefetch + hydration, optimistic mutations |
| `nextjs-tanstack-form` | TanStack Form v1 with Server Actions, Zod, wizards, field arrays |
| `nextjs-zustand` | Zustand v5 stores, persist, hydration in Client Components |
| `nextjs-shadcn` | shadcn/ui components, Field patterns, theming |
| `nextjs-i18n` | next-intl or DIY dictionaries, locale routing, formatters |
| `prisma-7` | Prisma 7 (Rust-free client, TypedSQL, Omit API) + vendored Prisma docs mirror |
| `better-auth` | Better Auth 1.2 — OAuth, 2FA, magic links, SSO, Stripe billing, sessions |
| `solid-nextjs` | SOLID for Next.js — modular structure, file size limits, interfaces, JSDoc |

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`.

## Project architecture (convention the agent enforces)

```
app/
├── (auth)/
├── (dashboard)/
├── api/
└── layout.tsx
modules/
├── cores/
│   ├── shadcn/components/ui/
│   ├── lib/
│   ├── hooks/
│   └── stores/
└── [feature]/
    ├── components/
    └── src/
        ├── interfaces/
        ├── services/
        ├── hooks/
        └── stores/
```

The agent activates on Next.js projects (`next.config.*`, `app/layout.tsx`).

## Port notes (read before editing)

### Agents

One agent, `nextjs-expert`. Cursor's documented subagent frontmatter is limited to `name`,
`description`, `model`, `readonly`, `is_background`, but that 5-field table is incomplete — the
internal protobuf `agent.v1.CustomSubagent` carries `tools` as a first-class repeated field
(field 4), alongside `full_path` and `prompt`, which confirms it is the model for local `.md` files.

| Decision | Value | Why |
| :-- | :-- | :-- |
| `tools:` | **kept, unchanged** (31 entries) | R4. First-class repeated field in the binary's data model. |
| `## Allowed tools` block | **added** at the top of the body | R4. Kept *in addition*, not instead: nothing proves the YAML parser populates `tools` from a local `.md`, nor that it is enforced at runtime. Both cost a few lines and cover either outcome. |
| `model:` | `sonnet` → **`grok-4.6`** | Uniform-model doctrine: every ported agent runs on `grok-4.6`, whose default effort is `medium` — written bare, since `[effort=medium]` would be redundant. This agent is an executant, not an organ of control, so no `[effort=high]`. `claude-opus-*` remains barred by policy. |
| `readonly:` | **not set** | R6. The source `tools:` contains `Write`, `Edit` **and** 21 `mcp__*` tools — it fails both halves of the condition. Setting it would strip the agent of exactly the capability it exists for. |
| `color: magenta` | kept | R7. Absence from the docs proves nothing; `color` is the one key whose absence is *confirmed* in `agent.v1.CustomSubagent`, and it is harmless to keep. |
| `skills:` | kept verbatim | R7. Values use Claude Code's plugin-qualified form (`fuse-ai-pilot:fuse-browser-usage`). Cursor identifies skills by bare folder name; whether the qualified form resolves is unverified — this is the same open point as in the pilot. |

The body is otherwise byte-identical to the source, including its `Task`-based parallel-agent
workflow and its `fuse-ai-pilot:sniper` / `fuse-ai-pilot:explore-codebase` references.

### Skills

All 11 satisfy Cursor's hard rule that `name:` equals the parent folder name. `references/`,
nested folders, `meta.json` and the Docusaurus `_category_.json` sidecars retain their upstream
layout (R9). The `skills/` tree includes narrow local Cursor governance adaptations, including the
canonical `FUSE_SOLID_MAX_LINES` ceiling and responsibility-based splitting, so byte-for-byte
identity with the source is not claimed.

**`user-invocable: true` was not translated to `disable-model-invocation`.** All 11 skills carry it.
The two keys are near-opposites, not inverses: Cursor's `disable-model-invocation: true` means
"only reachable via `/skill-name`", whereas Claude Code's `user-invocable` governs whether the *user*
can type `/skill` and says nothing about model auto-invocation. Mapping one onto the other would
have inverted the intent of every skill in the plugin. Both keys stay as-is (R8).

Keys preserved across the skills — absent from Cursor's docs, **not verified against the binary**,
so their status is unknown rather than unsupported (R19): `user-invocable` (11), `references` (10),
`related-skills` (10), `versions` (10), `version` (1).

No skill carries an embedded `hooks:` block, so the pilot's one deletion has no counterpart here.

#### The vendored Prisma 7 documentation mirror

`skills/prisma-7/` contains, besides `SKILL.md` and `references/`, a full vendored mirror of the
Prisma 7 documentation site: `100-getting-started/` … `900-ai/`, 691 files, **148 705 lines — 76 %
of this plugin's entire markdown volume**, plus the site's images and `_category_.json` sidecars.

It is vendored skill content (R20c: source documentation is content), not a build artefact (R20a):
nothing generates it at install or build time, and the `prisma-7` SKILL.md indexes into it. The
mirror retains its upstream layout while carrying narrow local Cursor governance adaptations in
AI-editor guidance, so byte-for-byte identity with the source is not claimed. R20a's exclusion
filter was applied inside it all the same — it turned up nothing: no `.DS_Store`, no `*.bak`, no
lockfile, no `node_modules/` anywhere in `skills/`.

If this mirror is regenerated upstream, preserve and revalidate the local Cursor governance
adaptations after replacing the subtree.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11). The source declares two
events and one non-empty matcher — the tables below cover 100 % of both, per the R12/R13 clauses.

Source `hooks/hooks.json`:

```json
{
  "_description": "Next.js Expert — SOLID/skill/DRY/modular/file-size enforcement via @fusengine/harness (framework-routed by applies-to)",
  "_version": "2.0.0",
  "hooks": {
    "PreToolUse":  [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "bun $HOME/.claude/…/bin.mjs hook claude-code" }] }],
    "PostToolUse": [{ "matcher": "",           "hooks": [{ "type": "command", "command": "bun $HOME/.claude/…/bin.mjs hook claude-code" }] }]
  }
}
```

Ported `hooks/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse":  [{ "command": "npx -y @fusengine/harness hook cursor", "matcher": "Write" }],
    "postToolUse": [{ "command": "npx -y @fusengine/harness hook cursor" }]
  }
}
```

#### R12 — events declared by this plugin

| Claude Code event | Cursor event | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | `preToolUse` | `MAPPED` | `_Ni` @19775968. Carries `permission`. Matcher tests `tool_name`. |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni` @19775968. Carries `additional_context`. Matcher tests `tool_name`. |

Two events, two `MAPPED` rows, nothing dropped. This plugin declares no `SubagentStart`,
no `PostToolUseFailure`, no `Notification`, no `PermissionRequest` — none of the traps in the
root README's table apply to it.

#### R13 — tool matchers present in this plugin

| Source matcher | Cursor matcher | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `Write` (on `PreToolUse`) | `Write` | `MAPPED` | `tKu` @19776314 maps it to itself. |
| `Edit` (on `PreToolUse`) | `Write` | `MAPPED` | `tKu` collapses `Edit` onto `Write`. Here the two source names sat in **one** entry with **one** command, so the collapse merges nothing and loses no message — unlike `core-guards`, where two distinct messages had to be merged. |
| `""` (on `PostToolUse`) | *(field omitted)* | R14, not R13 | The empty string is "match everything", not a tool name. Omitting the field is the Cursor-correct way to say that; writing `""` would be a regex matching everything by accident rather than by intent. |

Both traps were checked before shipping:

1. **The matcher is a regex.** `Write` was compiled with `re.compile` — it is valid and anchored to
   nothing, so it also matches a hypothetical `WriteFile`. That is the same latitude the source had
   (Claude Code matchers are substring-ish too), so it is fidelity, not a regression. No stray `(`,
   `[` or leading `*` anywhere, so the `catch { return !0 }` in `cYg` — which turns an invalid regex
   into a match-everything hook — is never reached.
2. **The matcher's target depends on the event.** `Write` sits on `preToolUse`, which tests the
   `tool_name` field (`aYg` @19779089). That is the right target. It was *not* routed to
   `beforeShellExecution`, where the matcher would be tested against a shell command line and
   `Write` would match nothing useful.

`_description` and `_version` were removed (R16): they are not schema fields, JSON has no comments,
and their content is reproduced in this file instead. `_version: "2.0.0"` was the source's own hook
schema tag; Cursor's `"version": 1` is a different, real field, not a downgrade of it.

One residual, non-blocking: Cursor has a native deletion tool whose `tool_name` is plausibly
`"Delete"` but unconfirmed in the binary. No source hook guarded deletion — Claude Code has no such
tool — so a like-for-like port is unaffected. It only matters if someone later *adds* a deletion
guard; confirm the literal first.

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code`

Target: `npx -y @fusengine/harness hook cursor`

`$HOME/…` is an absolute path into a Claude Code install tree that does not exist for a Cursor user,
and the submission checklist requires all manifest paths to be relative and valid. `npx` removes the
path dependency entirely. `hook claude-code` becomes `hook cursor`.

**No scope argument is appended, because the source has none** (R15). The pilot's entries carry
`aipilot` as a third token; this plugin's two entries end at `cursor`. That absence is deliberate and
must be preserved — adding a scope here would route these hooks to a harness handler the source never
selected.

## Runtime paths

Native Cursor APEX state uses `.cursor/apex/`, harness-owned project cache uses
`.harness/cache/`, and documented `.claude/…` compatibility inputs remain unchanged where Cursor
intentionally consumes them.

Scope here is small: **one** occurrence, `skills/prisma-7/references/mcp-server.md:35`, and it is
not even a harness state path — it is a code-comment filename inside a Prisma MCP configuration
example. Rewriting it would corrupt third-party compatibility documentation; it is not native
Cursor state.

The one path that *was* rewritten is the hook command's `$HOME/.claude/plugins/marketplaces/…`
install path — an install path, not a state path (R15, "Command path" above).

## Not portable

Nothing behavioural was lost in this port. For the record, against the root README's tables:

- Both declared hook events are `MAPPED`; no `NOT PORTABLE` or `CURSOR-NATIVE ONLY` event appears in
  this plugin's `hooks.json`.
- Both tool matchers are `MAPPED`; `Glob`, `MultiEdit`, `TaskCreate` and `TaskUpdate` — the four
  `NOT PORTABLE` matchers — appear in none of them. (`Glob` is in the agent's `tools:` list, which
  is a capability declaration, not a hook matcher, and R13 does not apply to it.)
- The plugin has no `"type": "prompt"` hook, no functional sub-project (R20b), and no `docs/` folder.

Excluded as artefacts, and therefore **not** losses (R20a): the source's `.DS_Store` and
`mcp.json.bak`. The `.bak` is a dated snapshot of an MCP config; it carries no behaviour and has no
live counterpart in the source plugin.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as a
marketplace via its root `.cursor-plugin/marketplace.json`.
