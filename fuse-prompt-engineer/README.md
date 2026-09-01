# fuse-prompt-engineer (Cursor Plugin)

Expert prompt engineering and AI agent design: Context Engineering, Meta-Prompting, advanced
Chain-of-Thought, Few-Shot patterns, guardrails, a 50+ entry template library, and A/B testing.

Ported from the Claude Code plugin `fuse-prompt-engineer` v1.1.10. The plugin name is deliberately
identical across both ecosystems so cross-plugin references (`fuse-prompt-engineer:<skill>`) keep
resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 6 | `skills/<name>/SKILL.md` |
| Commands | 2 | `commands/*.md` |

**No `hooks/` folder.** The source plugin has no `hooks/hooks.json`, so the port has none either:
absence in the source is reproduced as absence in the port, never as an empty folder (R4–R6
preamble). This plugin therefore declares **zero hook events and zero tool matchers**, and the
per-plugin R12 / R13 tables below are empty by construction, not by omission.

The source plugin's own top-level `README.md` is **not** ported alongside this file — it occupied
exactly this path, so it is replaced by this document. Its non-redundant material is folded in
below (skill roster, `/prompt` actions, technique list). Two of its claims were stale in the source
and were corrected rather than reproduced: it listed 4 skills where the plugin ships 6, and gave
the agent's model as Opus where the frontmatter said `sonnet`. Its `.mcp.json` entry in the
"Plugin Structure" tree does not exist in the source tree either and was dropped.

## Skills

| Skill | Description |
| :-- | :-- |
| `prompt-creation` | Techniques and templates for building prompts from scratch |
| `prompt-optimization` | Improving and scoring an existing prompt |
| `agent-design` | Workflow-vs-agent patterns, orchestrator/subagent pipelines, agent templates |
| `guardrails` | Input and output guardrails (topical, jailbreak, PII, format, hallucination) |
| `prompt-library` | 50+ ready-made templates: tasks, agents, specialized roles |
| `prompt-testing` | A/B methodology, metrics, evaluation templates |

## Commands

`/prompt [action] [description]` — actions: `create`, `optimize`, `agent`, `review`.
`/prompt-history` — manage the history of created and optimized prompts.

## Configuration

No `variables` are declared; the plugin needs no secrets. The agent's declared tool surface
includes Context7, Exa and sequential-thinking MCP servers; those must be configured on the Cursor
side for the corresponding research steps to work.

## Port notes (read before editing)

### Agents

- **`model: sonnet` → `model: grok-4.6`** on `prompt-engineer`, and on the 6 agent templates under
  `skills/prompt-library/templates/agents/` — the uniform-model doctrine: every ported agent runs on
  `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]` would be redundant).
  None of them is an organ of control, so none takes `[effort=high]`. `claude-opus-*` remains barred
  by policy. The 15 non-agent templates under `templates/tasks/` and `templates/specialized/` were
  left untouched — they are not agents and fall outside the doctrine's scope (see below).
- **No `readonly:`.** R6's condition fails twice over: the source `tools:` contains both `Edit` and
  `Write`, and it declares seven `mcp__*` tools. Setting `readonly` would both contradict the
  agent's purpose (it writes prompt files) and risk silently stripping its MCP access, an
  undocumented interaction.
- **`tools:` is kept in the frontmatter, unchanged**, and a `## Allowed tools` block is emitted at
  the top of the body **in addition** (R4).
- **`color:` and `skills:` are kept as-is** (R7). `skills:` uses bare skill names here, all
  resolving inside this plugin.

### Skills

All 6 satisfy Cursor's hard rule that `name:` equals the parent folder name. `references/`,
`docs/` and `templates/` subtrees are natively supported and were copied verbatim (R9), including
`prompt-library/templates/{tasks,agents,specialized}/` (17 template files).

**One thing to know about the template library.** 21 files under `skills/` are *example agent
definitions* carrying their own `model:` frontmatter — 18 in
`skills/prompt-library/templates/{tasks,agents,specialized}/`, the other three in
`skills/prompt-library/SKILL.md`, `skills/agent-design/references/templates.md` and
`skills/prompt-creation/docs/templates.md`.

The initial port left them verbatim under R9, on the grounds that they are boilerplate a skill hands
to the model, not subagents Cursor loads. **A later pass reversed that call and rewrote all 21 to
`grok-4.6`.** The reason: these files exist to be *copied* into a real agent. A user following one
literally would have produced a Cursor subagent carrying a Claude Code model ID, and six of them
named `opus`, which conflicts with the policy barring `claude-opus-*`. R9 protects skill *content*;
it does not require reproducing a value that is invalid on the target platform. Where a file
enumerated the old choice system (`sonnet` for routine, `opus` for hard), the prose was rewritten to
teach the real one — architect at high effort, executants at the default, control organs at
`grok-4.6[effort=high]` — rather than merely swapping identifiers.

One key is preserved across all 6 skills, absent from Cursor's documented set and **not verified
against the binary**, so unknown rather than unsupported (R19): `allowed-tools`. No skill in this
plugin declares `user-invocable`, so R8's non-translation rule has nothing to act on here.

### Commands

Both commands are byte-identical to the source (R10). Neither declares `name`; Cursor derives it
from the filename, yielding `/prompt` and `/prompt-history`.

**`$ARGUMENTS` is supported — confirmed in the binary.** `qxo(e,t)` substitutes `$ARGUMENTS` with
the raw argument text and `$1`, `$2`, … positionally. `prompt.md` uses `$ARGUMENTS` and consumes
its arguments normally.

**`prompt-history.md` has no placeholder.** Its caller does
`hadPlaceholders ? content = result : (raw && content = content + "\n\n" + raw)`, so invoking
`/prompt-history list` under Cursor silently appends `list` to the end of the prompt instead of
substituting it. The command's body enumerates its own actions, so it still behaves correctly; the
mechanism just differs from Claude Code.

### Hooks

None. See the Contents note above.

| Claude Code event | Cursor event | Status |
| :-- | :-- | :-- |
| *(none declared)* | — | — |

| Source matcher | Cursor matcher | Status |
| :-- | :-- | :-- |
| *(none declared)* | — | — |

### Command path

Not applicable: with no `hooks/hooks.json`, this plugin has no
`bun $HOME/.claude/plugins/marketplaces/…/bin.mjs hook claude-code <scope>` command to rewrite
(R15). The `@fusengine/harness` binary is never invoked by this plugin.

## Runtime paths

Native Cursor APEX state uses `.cursor/apex/`, harness-owned project cache uses
`.harness/cache/`, and documented `.claude/…` compatibility inputs remain unchanged where Cursor
intentionally consumes them.

Scope here is narrow: **one** occurrence, `commands/prompt-history.md` line 32, which documents
`~/.claude/prompt-history/` as the storage root for the saved-prompt index and versioned prompt
files. Cursor documents no native replacement for that custom feature state, so its behavior is
not claimed as Cursor-native; changing it requires a separate product decision. Nothing else in
this plugin touches `.claude/`.

## Not portable

- **`/prompt-history` argument substitution** — no placeholder in the body, so Cursor appends the
  argument instead of substituting it (documented above, not a removal).
- No hook event or tool matcher is lost, because this plugin declares none.
- Claude Code's `Notification`, `PermissionRequest`, `Glob` and `MultiEdit` are `NOT PORTABLE`
  (R12 / R13); this plugin uses none of them, so nothing is lost on that front.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`. Hooks are not involved, so `npx` is
not required for this plugin.
