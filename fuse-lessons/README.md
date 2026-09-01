# fuse-lessons (Cursor Plugin)

Project memory. Records compact **"never reproduce"** lessons in `MEMORY/LESSON.md` at the
**project root** and intends to read them back into context at session start, at every sub-agent
start, and on every prompt. End-to-end Cursor delivery remains runtime-unverified.

Ported from the Claude Code plugin `fuse-lessons` v1.0.5. The plugin name is deliberately identical
across both ecosystems so cross-plugin references keep resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Commands | 2 | `commands/*.md` |
| Hooks | 5 events | `hooks/hooks.json` |

**No `skills/` folder.** The source plugin ships zero skills, so the port ships none: absence in
the source is reproduced as absence in the port, never as an empty folder (R4–R6 preamble). The
same applies to `rules/` and `docs/`, which the source does not have either.

The source plugin's own top-level `README.md` is **not** ported alongside this file — it occupied
exactly this path, so it is replaced by this document, with its non-redundant material folded in
below (`MEMORY/` architecture, `LESSON.md` format, hook behaviour table, throttle). One claim in it
was stale in the source and was corrected rather than reproduced: it described "the 4 hooks" where
`hooks/hooks.json` declares five (it omitted `UserPromptSubmit`).

## Purpose

Most post-mortem knowledge evaporates between sessions. `fuse-lessons` makes it durable:

- On **finish**, you write a one-line lesson describing what went wrong and what to do instead.
- On **start**, the hooks attempt to return lessons to the main session, every sub-agent, and every
  prompt. Of this plugin's events, Cursor publicly documents `additional_context` for
  `sessionStart` and `postToolUse`; this plugin uses `postToolUse` for throttle reset, not lesson
  loading. Cursor does not document that output for `subagentStart` or `beforeSubmitPrompt`, and
  end-to-end lesson delivery has not been proven with a corrected harness and authentic Cursor
  runtime replay.
- `MEMORY/LESSON.md` lives at the project root and is **committed**, so the whole team inherits it.

### `MEMORY/` architecture

| File | Committed? | Role |
| :-- | :-- | :-- |
| `MEMORY/LESSON.md` | yes | The list of lessons — read at start, appended on finish. |
| `MEMORY/state.json` | no (gitignored) | Throttle counter (last-reminder / last-write timestamps), managed by the hooks. **Never edit by hand.** |

### `LESSON.md` format

A flat list, one lesson per line, newest at the bottom:

```
- [YYYY-MM-DD HH:MM] <what went wrong> → <what to do instead>
```

Keep each line short and actionable: the failure on the left of `→`, the fix on the right.

### Throttle

The `stop` reminder is intended to fire at most once every **5 minutes** by default; runtime delivery remains unverified. Override with the
`FUSE_LESSONS_THROTTLE_MIN` environment variable (minutes). Writing to `MEMORY/LESSON.md` is intended to reset the throttle via the `postToolUse` hook; actual Cursor execution remains runtime-unverified.

### Commands

`/lessons` — view the current `MEMORY/LESSON.md` and either append a new lesson or refine / merge
existing ones. `/lessons-compact` — deduplicate and merge when the file has grown, with a full
before/after preview and a confirmation prompt; idempotent on an already-compact file.

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`. The agent declares no MCP tool.

## Port notes (read before editing)

### Manifest

Two Claude Code–only keys were purged from `plugin.json` (R18b): `author.url` and `strict: true`.
`author` keeps only its `name`, since the source declared no `email` for this plugin. `category:
"development"` was **kept** — it is not on R18b's purge list, and R19's default is to keep.

### Agents

- **`model: sonnet` → `model: grok-4.6`** on `lessons-compactor` — the uniform-model doctrine: every
  ported agent runs on `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]`
  would be redundant). This agent is an executant, not an organ of control, so it takes no
  `[effort=high]`. `claude-opus-*` remains barred by policy.
- **No `readonly:`.** The agent's source `tools:` contains `Write`, so R6's first condition fails.
  Note the nuance: the agent's body states it never writes to `MEMORY/LESSON.md` itself — it
  produces a proposal someone else applies — but that is a discipline expressed in prose, not a
  tool restriction, and `Write` is genuinely in its declared surface. Setting `readonly` would have
  tightened the agent beyond its Claude Code behaviour, which the governing principle forbids.
- **`tools:` is kept in the frontmatter, unchanged**, and a `## Allowed tools` block is emitted at
  the top of the body **in addition** (R4).
- **`color:` is kept as-is** (R7). The agent declares no `skills:` or `effort:` key.

### Skills

None. See the Contents note above.

### Commands

Both commands are byte-identical to the source (R10). Both **do** declare `name:` (`lessons`,
`lessons-compact`) — Cursor derives the name from the filename anyway, and the declared values
match, so the two agree. R10's instruction is "do not add a `name`", not "strip an existing one";
the byte-identical requirement wins over cosmetic tidying.

Neither command contains a placeholder (`$ARGUMENTS`, `$1`, …), and neither declares an
`argument-hint` — they are argument-free by design. The `qxo` append behaviour
(`hadPlaceholders ? content = result : (raw && content = content + "\n\n" + raw)`) applies only if
a user passes arguments anyway, in which case they are tacked onto the end of the prompt.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11). The single source
`_description` key was stripped (R16); its content is reproduced here — all five events route to
the harness `lessons` scope:

| Cursor event | Behaviour |
| :-- | :-- |
| `sessionStart` | Reads `MEMORY/LESSON.md` and attempts to inject the lessons into the main session context; `additional_context` is publicly documented for this event, but authentic runtime replay is still pending. |
| `subagentStart` | Attempts to provide lessons to every spawned sub-agent; the public contract exposes only `permission` and `user_message`, so context delivery is runtime-unverified. |
| `beforeSubmitPrompt` | Attempts to provide lessons on every prompt, like rules / CLAUDE.md; the public contract exposes only `continue` and `user_message`, so context delivery is runtime-unverified. |
| `stop` | Intended to remind you to capture a compact lesson before finishing — throttled to once per 5 min; follow-up delivery remains incomplete in the inspected corrected local harness until lowerCamel lifecycle routing and native per-event response rendering are implemented and replayed. |
| `postToolUse` (`Write`) | Detects a write to `MEMORY/LESSON.md`; the source path is intended to reset the throttle in `MEMORY/state.json`, but actual Cursor execution remains runtime-unverified. |

#### R12 — events declared by this plugin

| Claude Code event | Cursor event | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `UserPromptSubmit` | `beforeSubmitPrompt` | `MAPPED` | `_Ni` @19775968. Its matcher target is the constant `"UserPromptSubmit"` (`aYg` @19779089), not a tool name — irrelevant here, since the source declares no matcher on it. |
| `SessionStart` | `sessionStart` | `MAPPED` | `_Ni`. The public contract carries `additional_context`; actual lesson delivery still depends on corrected-harness rendering and an authentic Cursor runtime replay. |
| `SubagentStart` | `subagentStart` | `CURSOR-NATIVE ONLY` | In `Wu` @19775205, **absent from `_Ni`**. Declared in `.claude/settings.json` it would be silently skipped by `nYg` @19777846 with a bare "Unknown Claude Code event, skipping" — no failure, no runtime warning, the hook simply never fires. The event is reachable here through the plugin's own native `hooks/hooks.json`; that does not prove lesson context delivery, which remains runtime-unverified because the public contract exposes only `permission` and `user_message`. |
| `Stop` | `stop` | `MAPPED` | `_Ni`. Carries `followup_message`, which is what the reminder uses. Its matcher target is the constant `"Stop"`. |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni`. Matcher tests `tool_name`. |

100 % of this plugin's own events — the largest hook surface in this batch. No `UNKNOWN`, no
`NOT PORTABLE` event.

#### R13 — tool matchers declared by this plugin

| Source matcher | Cursor matcher | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `Write` (in `Write\|Edit\|MultiEdit`) | `Write` | `MAPPED` | `tKu` @19776314 maps it to itself. |
| `Edit` (in `Write\|Edit\|MultiEdit`) | `Write` | `MAPPED` | `tKu` maps `Edit` → `Write`. **Collapses** with the entry above; both source tools shared one command and one message, so nothing had to be merged by hand. |
| `MultiEdit` (in `Write\|Edit\|MultiEdit`) | — | `NOT PORTABLE` | Absent from `tKu`. It does **not** fall back to `Write`: an unmapped name is simply never substituted. Removed. Consequence below. |
| *(absent on the other four events)* | *(absent)* | `MAPPED` | R14. `cYg` @19779820 treats an absent matcher as match-everything, which is what the source meant by declaring none. |

`Write` compiles as a regex, verified before shipping — `cYg` wraps its test in
`catch { return !0 }`, so an invalid regex would silently match everything.

| Claude Code | Cursor | Matcher before | Matcher after |
| :-- | :-- | :-- | :-- |
| `UserPromptSubmit` | `beforeSubmitPrompt` | *(none)* | *(none)* |
| `SessionStart` | `sessionStart` | *(none)* | *(none)* |
| `SubagentStart` | `subagentStart` | *(none)* | *(none)* |
| `Stop` | `stop` | *(none)* | *(none)* |
| `PostToolUse` | `postToolUse` | `Write\|Edit\|MultiEdit` | `Write` |

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code lessons || true`

Target: `npx -y @fusengine/harness hook cursor lessons`

R15. `$HOME/…` is absolute and points into a Claude Code install tree that does not exist for a
Cursor user; `npx` removes the path dependency. The scope argument `lessons` is preserved exactly
on all five entries.

**The source's trailing `|| true` was removed intentionally, and no behavioural equivalence is
claimed.** Cursor treats `command` as a shell command string, so `|| true` is shell syntax rather
than literal harness arguments. Keeping it would force the aggregate command to exit `0`, including
when the harness deliberately returns `2`; that would neutralize Cursor's blocking signal.

Without the suffix, Cursor remains fail-open for ordinary non-zero hook failures, while exit `2`
retains its documented blocking meaning. The Claude source explicitly forced every result to
success, so removing `|| true` changes that policy boundary to preserve Cursor's native semantics.
Actual hook execution remains runtime-unverified with the unpinned harness.

## Runtime paths

This plugin references **no** `.claude/…` path in the body of any agent or command. Its entire
state convention lives at the project root — `MEMORY/LESSON.md` (committed) and `MEMORY/state.json`
(gitignored) — deliberately outside `.claude/`, as the source README states, so that it travels
with the repository. Nothing to resolve harness-side, and the R21 clause is deliberately not
reproduced here: it asserts that this plugin's bodies reference `.claude/…` state files, which
would be factually false.

The only install-tree path this plugin carried was the hook command's
`$HOME/.claude/plugins/marketplaces/…`, an install path rather than a state path — R15's territory,
rewritten above.

## Not portable

- **`MultiEdit` as a `postToolUse` matcher.** Absent from `tKu`, and it does not fall back to
  `Write`. Removed. Practical consequence: a lesson written into `MEMORY/LESSON.md` through a
  multi-edit operation no longer resets the `stop` throttle, so the reminder may fire again within
  the 5-minute window even though you just wrote a lesson. Cursor has no multi-edit tool name to
  re-target it onto, so this is a genuine loss, not a rewrite.
- **`SubagentStart` is unreachable through the `.claude/settings.json` compatibility path.** The
  event is reachable here only because this plugin ships its own native `hooks/hooks.json`; moving
  it into a settings-shaped file drops the event silently. Lesson context delivery through the
  reachable native event remains runtime-unverified.
- `Glob` is a `NOT PORTABLE` matcher and `Notification` / `PermissionRequest` are `NOT PORTABLE`
  events (R12 / R13); this plugin uses none of them.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`. Node's `npx` must be on `PATH` for
the hooks.
