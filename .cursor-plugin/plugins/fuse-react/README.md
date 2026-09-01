# fuse-react (Cursor Plugin)

Expert React 19 with hooks, TanStack Router, Zustand, TanStack Form, Testing Library, shadcn/ui and
SOLID principles. Scoped to SPA projects — React without Next.js.

Ported from the Claude Code plugin `fuse-react` v1.0.18 (source folder `plugins/react-expert`). The
plugin name is deliberately identical across both ecosystems so cross-plugin references
(`fuse-react:<skill>`, and the agent's own `fuse-ai-pilot:fuse-browser-usage`) keep resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 8 | `skills/<name>/SKILL.md` |
| Hooks | 2 events | `hooks/hooks.json` |

No `commands/` and no `docs/` folder: the source plugin has neither, and an empty component folder
is a divergence, not a precaution (R4–R10 preamble, R20c). The source plugin's own `README.md` is
replaced by this file, exactly as in the `fuse-ai-pilot` pilot — it documented a Claude Code install
command (`/plugin install fuse-react`) that does not apply under Cursor. Its `src/` architecture
diagram is not lost: the same structure is documented inside `skills/solid-react/`.

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`.

## Port notes (read before editing)

### Agent

One agent, `agents/react-expert.md` (`name: react-expert`).

- **`tools:` is kept in the frontmatter, unchanged** (29 tools). Cursor's public 5-field table is
  incomplete: `tools` is a first-class repeated field of the internal `agent.v1.CustomSubagent`
  message (R4/R19). The `## Allowed tools` block at the top of the body is emitted **in addition**,
  not instead — nothing proves the YAML parser populates the field from a local `.md`, nor that it
  is enforced at runtime, so both paths are covered.
- **`model: sonnet` → `model: grok-4.6`** — the uniform-model doctrine: every ported agent runs on
  `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]` would be redundant).
  This agent is an executant, not an organ of control, so it takes no `[effort=high]`.
  `claude-opus-*` remains barred by policy.
- **`readonly` is NOT set** (R6). The source `tools:` contains `Write`, `Edit` **and** 16 `mcp__*`
  tools (context7, exa, sequential-thinking, shadcn, gemini-design, fuse-browser) — it fails both
  halves of the condition, and `readonly: true` would additionally have severed the MCP surface the
  agent's shadcn/Gemini-Design workflow depends on.
- **`color: blue` and `skills:` are kept as-is** (R7). `color` is confirmed absent from
  `agent.v1.CustomSubagent`; `skills` was not checked against the binary. Both are harmless.
- `skills:` keeps Claude Code's plugin-qualified form for the one cross-plugin entry
  (`fuse-ai-pilot:fuse-browser-usage`). Cursor identifies skills by bare folder name; whether the
  qualified form resolves is unverified — same open point as the pilot.

### Skills

All 8 satisfy Cursor's hard rule that `name:` equals the parent folder name (R9) — verified
individually on disk. `references/` and `references/templates/` are natively supported and were
copied **verbatim**: 226 files, byte-identical to the source (`diff -rq` clean).

Frontmatter keys preserved, absent from Cursor's documented set and **not verified against the
binary**, so their status is unknown rather than unsupported (R7/R19): `user-invocable` (8),
`references` (8), `versions` (4), `version` (4), `related-skills` (4).

The `version` / `versions` split is the source's own inconsistency — four skills use the singular
key, four the plural. Both were kept exactly as written; normalising them would be a content change
disguised as a port, and R7 keeps out-of-schema keys verbatim rather than tidying them.

`user-invocable` was **not** translated to `disable-model-invocation` (R8). They are not inverses:
Cursor's `disable-model-invocation: true` means "only reachable via `/skill-name`", whereas Claude
Code's `user-invocable: false` means "the user cannot type `/skill`, but the model may still
auto-invoke". Mapping one onto the other would have inverted the intent of all 8 skills.

No skill carries an embedded `hooks:` block (the pilot's `apex-methodology` case does not recur
here), so nothing was removed from any skill body or frontmatter.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11). Both source events are
`MAPPED`; nothing was dropped. The source hooks file is structurally identical to `fuse-laravel`'s —
same two events, same two matchers, same commands — but the table below is derived from **this**
plugin's own `hooks.json`, not inherited (R12).

**R12 — event table for this plugin (100 % of the events it declares)**

| Claude Code event | Cursor event | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | `preToolUse` | `MAPPED` | `_Ni` @19775968. Matcher tests `tool_name`. |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni` @19775968. Matcher tests `tool_name`; with the matcher omitted, every successful Agent tool use is statically eligible. Actual hook execution remains runtime-unverified. |

The plugin declares no other event — no `SubagentStart`, no `Notification`, no `PermissionRequest` —
so none of the `NOT PORTABLE` / `CURSOR-NATIVE ONLY` rows of the root R12 table apply.

**R13 — matcher table for this plugin (100 % of the matchers it declares)**

| Source matcher | Event | Cursor matcher | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- | :-- |
| `Write\|Edit` | `PreToolUse` → `preToolUse` | `Write` | `MAPPED` | `tKu` @19776314 maps `Write→Write` and `Edit→Write`. The two collapse into one; the source carried a single `_description` for both, so no message had to be merged. |
| `""` | `PostToolUse` → `postToolUse` | *omitted* | `MAPPED` | R14: `""` becomes an absent field, the Cursor-correct way to say "match everything". Emitting `""` literally would compile as a regex matching every string — same effect, but relying on regex semantics instead of the documented default. |

Both matchers were compiled with `re.compile()` before shipping (R13 trap 1): an invalid regex would
have made the hook match **everything**, silently, because `cYg` @19779820 wraps the test in
`catch { return !0 }`.

`Write` sits on `preToolUse`, which tests `tool_name` — correct target (R13 trap 2). It would have
been meaningless on `beforeShellExecution`, which tests the command line instead.

No `mcp__*` matcher appears in this plugin's hooks, so the `MCP:<tool>` rewrite (server segment
lost) never comes into play here — despite the agent declaring 16 MCP tools, none of them is
guarded. No `Glob`, `MultiEdit`, `TaskCreate` or `TaskUpdate` matcher either.

The `_description` and `_version` keys of the source hooks file were stripped (R16). They are not
schema fields and JSON has no comments; their content is reproduced here:

- file-level: *"React Expert — SOLID/skill/DRY/file-size/interface enforcement via @fusengine/harness
  (framework-routed by applies-to)"*, source `_version` `2.0.0`;
- `PreToolUse`: *"Harness: framework-routed SOLID/skill/DRY/file-size/interface enforcement before
  Write/Edit"*;
- `PostToolUse`: *"Harness: record doc/ref/agent activity feeding the APEX gates"*.

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code`

Target: `npx -y @fusengine/harness hook cursor`

**No scope argument, on either entry — and that absence is preserved** (R15). Unlike `fuse-ai-pilot`,
which passes `aipilot`, this plugin's source hooks pass nothing after `hook claude-code`; inventing a
`react` scope would change harness routing behaviour.

The rewrite is forced twice over: the submission checklist requires manifest paths to be relative and
valid (`$HOME/…` is absolute), and the path points into a Claude Code install tree that does not
exist for a Cursor user. `npx` removes the path dependency entirely.

## Runtime paths

Native Cursor APEX state belongs under `.cursor/apex/`, harness-owned project cache under
`.harness/cache/`, and documented `.claude/…` compatibility inputs remain valid when intentionally
used. This plugin currently contains none of those paths in its component bodies.

## Not portable

Nothing. Every source event and every source matcher maps to a live Cursor target:

- No `Notification` or `PermissionRequest` hook — both are `NOT PORTABLE` (mapped to `null` in the
  binary), and this plugin declares neither.
- No `Glob`, `MultiEdit`, `TaskCreate` or `TaskUpdate` matcher — the four `NOT PORTABLE` matcher
  rows are unused here.
- No `"type": "prompt"` hook. Those would not have been a loss anyway: Cursor supports them
  natively as `{type: "prompt", prompt: "…", timeout: N}`.
- `mcp.json.bak` and `.DS_Store` were not copied. They are R20a artefacts, which carry no behaviour
  and therefore are not documented losses.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as a
marketplace via its root `.cursor-plugin/marketplace.json`.
