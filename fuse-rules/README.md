# fuse-rules (Cursor Plugin)

The behaviour rules the whole ecosystem runs on — APEX workflow, SOLID/DRY enforcement, project
detection, agent delegation, tooling and frontend standards — held as nine markdown files and
intended for context injection at session start, at every sub-agent spawn, and on every prompt.

Ported from the Claude Code plugin whose folder is `plugins/claude-rules/` but whose manifest
`name` is **`fuse-rules`** v1.0.20. R1 names the Cursor folder after the `name`, so this folder is
`fuse-rules/`, not `claude-rules/`. `source` == `name` in the marketplace entry.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 0 | — |
| Skills | 0 | — |
| Commands | 0 | — |
| Rules | 9 | `rules/*.md` — **see the caveat below** |
| Hooks | 3 events | `hooks/hooks.json` |
| Templates | 1 | `templates/CLAUDE.md.template` (inert content, R20c) |
| User rules | 1 | `user-rules/fuse-global.mdc` — **deployed to `~/.cursor/rules/`, not discovered in place** (see "Global instructions") |

**No `agents/`, `skills/` or `commands/` folder.** The source ships none, so the port ships none —
absence in the source is reproduced as absence in the port, never as an empty folder (R4–R6
preamble).

The source plugin has **no top-level `README.md`**; this document is new, not a replacement.

## The nine rule files

| File | Subject |
| :-- | :-- |
| `00-critical-rules.md` | Response language, writing style, identity, safety rules, pre-action workflow |
| `01-project-detection.md` | Project indicator → domain agent routing table |
| `02-apex-workflow.md` | APEX auto-trigger, the six phases, gates |
| `03-agent-teams.md` | Lead-as-coordinator, exclusive file ownership, delegation anti-patterns |
| `04-solid-dry-rules.md` | SOLID skill per stack, interface placement, DRY enforcement |
| `05-frontend-rules.md` | UI workflow routing through the design expert |
| `06-tooling-rules.md` | MCP servers, git, hooks, documentation |
| `07-state-management.md` | React / Next.js state: TanStack Query, Zustand, stores |
| `08-subagent-conduct.md` | Cartography for sub-agents, hook compliance, exit contract |

All nine are **byte-identical to the source** (`diff -rq` clean). They are kept as `.md`, at the
same relative path, with no reformatting and no content edit.

> **Note on the count.** The Claude Code marketplace entry describes "8 rule files (00→07)", and the
> port backlog repeated it. The source folder actually contains **nine** files, `00-` through
> `08-`: `08-subagent-conduct.md` was added after that description was written and the description
> was never updated. All nine are ported. The stale "8" is a documentation defect in the source,
> not a scope decision.

### ⚠ Their discovery and classification under Cursor are NOT proven

This is the open question of this port, and it is deliberately left open rather than closed by
guesswork.

**What is established.** A Cursor plugin may ship a `rules/` folder, and `.md` files are accepted
there. The nine files are in the right place with the right extension.

**What is not established.** None of the nine source files carries YAML frontmatter — no `---`
block at all, verified on every file. Cursor's rule files normally declare their activation mode in
frontmatter (`alwaysApply`, `globs`, `description`). The behaviour of a rule file **with no
frontmatter** could not be settled against the binary: the loader involved is native and outside
the JavaScript bundle that R19's method inspects. The two parsers that *were* observed suggest a
default of `alwaysApply: false`, and one of them suggests a file with no `---` block may be skipped
entirely.

So the honest statement is: **it is unknown whether these nine files are always applied, applied
only on request, or not loaded at all.**

**Why no frontmatter was added.** Choosing `alwaysApply: true` versus `false`, or writing a `globs`
pattern, is not a translation — it is a decision about how the system behaves, and it belongs to
the plugin's owner, not to the port. R17 and R19 both point the same way: where the target's
behaviour is not established, keep the source value and flag it. Inventing an activation mode would
have silently rewritten the rules' scope under cover of a port.

**How to settle it in 30 seconds.** Install this plugin in Cursor and open
**Settings → Rules**. If the nine files are listed, discovery works and their mode is whatever the
panel shows. If they are absent, they are not being loaded and frontmatter is required.

**If the desired behaviour is "always applied"** — which is what these rules were under Claude Code,
where they were re-injected at session start and on every prompt — then `alwaysApply: true` has to
be added to each file's frontmatter. That is a one-line change per file and an owner's decision;
this port deliberately does not make it.

**Independent of all the above, the hooks are intended to inject the rules.** The three hooks below
ask the harness to read `rules/*.md`; that path does not depend on Cursor's native rule discovery.
It is not yet end-to-end proof: plugin-root discovery, native response rendering, and lifecycle
outputs still require the corrected harness and an authentic Cursor runtime replay.

## What the hooks do

All three entries route to the harness's `rules` scope, which is intended to read `rules/*.md` from
the plugin root and render the event's native Cursor response.

| Cursor event | Behaviour |
| :-- | :-- |
| `sessionStart` | Attempts to inject all rules into the main session context at startup; the native contract supports `additional_context`. |
| `subagentStart` | Attempts to provide rules to spawned sub-agents; the public contract exposes only `permission` and `user_message`, so context delivery is runtime-unverified. |
| `beforeSubmitPrompt` | Attempts to re-inject rules on each prompt; the public contract exposes only `continue` and `user_message`, so context delivery is runtime-unverified. |

The binary schema inspected during the port accepts `additional_context` more broadly than the
current public event contracts document. That is binary-derived evidence, not end-to-end proof;
only `sessionStart` publicly documents this output among the three events above.

## Global instructions

The nine `rules/*.md` files above are **not** the owner's global instructions. Those are a separate
corpus — the ported `~/.claude/CLAUDE.md` — and they reach the model through a **different channel**
on purpose.

### Where they live

| File | Layer | Reaches the model via |
| :-- | :-- | :-- |
| `../AGENTS.md` (repo root of `cursor-plugins/`) | **Project** — this repository only | Cursor reads it natively at the workspace root |
| `user-rules/fuse-global.mdc` | **User** — every project | Deployed to `~/.cursor/rules/fuse-global.mdc`, `alwaysApply: true` |

`AGENTS.md` is the source of truth; `fuse-global.mdc` is a copy of its body with a two-key
frontmatter (`description`, `alwaysApply: true`) prepended. Their bodies are byte-identical
(`diff` from `## Identity` onward is empty) and **must stay so** — edit `AGENTS.md`, then re-copy.

### Why these two channels and not the others

- **`~/.cursor/rules/` is Cursor's own user-rules directory.** In `workbench.desktop.main.js`,
  `getRuleTargetDirectory` (offset 31681849) resolves `<userHome>/.cursor/rules` when its boolean
  selects home over workspace, and Cursor itself writes there through the `install-home` deep link
  (offset 30604650), reporting `Rule '<name>' created successfully in home rules directory`.
  `getRuleUri` gives the file its `.mdc` extension. `alwaysApply: true` is the flag `getGlobalRules`
  reads to put a rule in the globally-applied bucket, with no glob. **No feature gate guards this
  path** — `thirdPartyExtensibilityEnabled` / `enable_cc_plugin_import` gate only the literal
  workspace-root `/CLAUDE.md`.
- **`AGENTS.md` at a workspace root is read unconditionally** (offset 31677776):
  `let u = l === "/AGENTS.md"; if (!u && thirdPartyExtensibility… ) u = l === "/CLAUDE.md" || …`.
  `AGENTS.md` short-circuits before the gate; `CLAUDE.md` and `CLAUDE.local.md` need the third-party
  toggle on. For the project layer, `AGENTS.md` is therefore strictly the safer of the two.
- **User Rules typed in Settings → Rules are not a target.** They live in the UI, are not
  versionable, and no plugin can deploy them.
- **The `sessionStart` hook is not the channel for this content.** The schema accepts
  `additional_context` (whitelist `yNi`, offset 19789643), but its *delivery* on `sessionStart` is
  an open Cursor bug — forum.cursor.com/t/158452, v3.1.15: the context "gets dropped due to a timing
  issue", staff answer "right now there isn't a workaround". Independently of the bug, that channel
  is **already intended to carry the nine `rules/*.md`**; actual delivery is runtime-unverified.
  Adding the global corpus would duplicate that intended payload if the hook delivery works.

> **One corpus, one intended channel.** The nine rule files are routed through the harness hooks
> (`sessionStart` / `subagentStart` / `beforeSubmitPrompt`), subject to the unresolved native
> response contracts above. The global
> instructions travel by the `alwaysApply` rule and by `AGENTS.md`. **No hook was added for the
> global instructions, and none may be.** `hooks/hooks.json` is unchanged by this feature.

Note that `user-rules/` is deliberately **not** `rules/`: the nine files in `rules/` are
byte-identical to the source and carry no frontmatter (see the caveat above). `fuse-global.mdc` is a
new artefact with frontmatter, destined for a different directory, and mixing it into `rules/` would
break both properties.

### What stays manual

The plugin ships the file; it does not install it. Nothing here writes to `~/.cursor/`.

1. **Deploy the user rule**: copy (or symlink) `user-rules/fuse-global.mdc` to
   `~/.cursor/rules/fuse-global.mdc`. This is the installer's job — see the repository's
   installation script. Done by hand, it is one `cp`.
2. **Confirm it loaded**: Cursor → **Settings → Rules**; `fuse-global` must appear among the user
   rules, marked always-applied.
3. **Project layer outside this repo**: `AGENTS.md` only applies to the workspace it sits in. Other
   repositories get the global instructions from the user rule, not from this file; copy `AGENTS.md`
   into a project only if that project needs a *local* override.
4. **Keep the two in sync**: any edit to `../AGENTS.md` must be re-copied into
   `user-rules/fuse-global.mdc` and redeployed. There is no generator doing it for you.

### The size problem — stated plainly

Measured on disk:

| Corpus | Lines | Bytes |
| :-- | --: | --: |
| `~/.claude/CLAUDE.md` (source) | 92 | 10 000 |
| `AGENTS.md` (transposed) | 93 | 10 143 |
| `user-rules/fuse-global.mdc` (same body + frontmatter) | 98 | 10 294 |
| `rules/*.md` (nine files, intended for harness injection; runtime delivery unverified) | 236 | 17 930 |
| **Intended session payload, both channels** (`fuse-global.mdc` + nine rules) | **334** | **28 224 (≈ 27.6 KiB)** |
| Intended payload *inside this repo* (adds `AGENTS.md`) | 427 | 38 367 (≈ 37.5 KiB) |

That is roughly **7 000 tokens of intended session instructions before the user has typed
anything**. The planned `beforeSubmitPrompt` reinforcement would add ~4 500 tokens per turn, but
that delivery is not counted as working until corrected-harness runtime evidence proves the
binary-derived `additional_context` path beyond the public contract.

For scale: Anthropic recommends keeping an instructions file under ~200 lines — the combined 334 is
1.7× that; Codex caps all instruction layers together at 32 KiB — 28.2 KiB is 88 % of it; Windsurf
caps its global rules at 6 000 characters — the global layer alone is 1.7× that. Beyond context
cost, a long instruction block **measurably lowers adherence**: the model follows a short, sharp
list better than a long one, and rules buried at the bottom are the ones dropped first.

There is also real duplication between the two corpora: `AGENTS.md`'s *Execution Strategy* scope
ladder is the same table as the one in `rules/03-agent-teams.md`; its *Writing style* paragraph
restates `rules/00-critical-rules.md` § Writing Style; its *SOLID Rules* list restates
`rules/04-solid-dry-rules.md`; and its *Fusengine Plugins* section is an index of the nine files
that are themselves intended for hook delivery next to it; that delivery remains runtime-unverified.

### Proposed split — **not executed**, owner's call

Per-section measurements of `AGENTS.md`:

| Section | Bytes | Lines | Proposal |
| :-- | --: | --: | :-- |
| Identity | 727 | 6 | **Stay global** — posture and writing style must be in context from turn 1 |
| Non-Negotiables | 2 626 | 8 | **Stay global** — the six are the spine |
| Critical Rules (ZERO TOLERANCE) | 1 619 | 10 | **Stay global** |
| Before ANY Action + Execution Strategy | 2 559 | 33 | **Move** → `rules/03-agent-teams.md` (already holds the same ladder); keep a 2-line pointer |
| Directives — Consult Your Skills | 1 040 | 9 | **Halve** — keep APEX routing + "never hand-roll a commit"; the rest becomes skill triggers |
| SOLID Rules | 275 | 7 | **Drop** — fully covered by `rules/04-solid-dry-rules.md` |
| Fusengine Plugins — Detailed Rules | 998 | 14 | **Drop** — an index of files intended for harness injection; runtime delivery unverified |

Result: a global layer of **≈ 5.5 KiB / ~30 lines instead of 10.1 KiB / 93 lines (−46 %)**, and a
combined per-session load of **≈ 23 KiB** instead of 28.2 KiB. Deleting nothing — the moved content
lands in the path-scoped rule that already owns the subject.

A second, larger lever exists and is *not* proposed here because it changes behaviour rather than
layout: making the nine `rules/*.md` glob-scoped (`globs:` frontmatter) instead of session-wide
injection would cut the per-turn cost far more, at the price of the intended "always applied" behavior.
That is a policy decision, not a size decision.

## `InstructionsLoaded` — what actually happens to it

The port backlog lists this plugin as blocked because "its rules injection hangs off
`InstructionsLoaded`". **That is not what the source declares.** `claude-rules/hooks/hooks.json`
declares exactly three events — `SessionStart`, `SubagentStart`, `UserPromptSubmit` — and no
`InstructionsLoaded`. All three map (see R12 below), so the source mapping drops no trigger;
actual injection remains runtime-unverified and never needed a re-planned trigger.

`InstructionsLoaded` is declared by **`core-guards`**, once, and only to *log* which instruction
files were loaded (`validate-rules-loaded.py`). It is `NOT PORTABLE` — 0 occurrences in the binary,
all casings — and what it costs is a **diagnostic**, not an injection: when rule loading misbehaves
under Cursor there is no longer a hook-side record of what was actually read.

**Which Cursor event takes over the role, if one ever wants it back:** `sessionStart`. It is the
only surviving event that fires once per session before work begins and carries
`additional_context`. The behavioural difference is worth stating plainly, because it is not a
rename:

| | Claude Code `InstructionsLoaded` | Cursor `sessionStart` |
| :-- | :-- | :-- |
| Fires | every time the instruction set is (re)loaded, including mid-session reloads | once, at session start |
| Sees | which instruction files were actually loaded | that a session began |
| Suits | verifying a reload took effect | seeding a session |

So the honest re-plan is: **an intended one-shot injection at session start instead of a reload-tracking
trigger**. `sessionStart` is declared and publicly supports `additional_context`; actual delivery
still requires corrected-harness and authentic Cursor replay evidence, while the intended
per-prompt reinforcement on `beforeSubmitPrompt` remains runtime-unverified because its public
output contract does not expose that field. In `core-guards` the mapping still costs the debug log,
and there is no way to recover the "which files were loaded" signal from `sessionStart` — a
different event answering a different question.

## Plugin root resolution

The source hook description states the harness "reads `CLAUDE_PLUGIN_ROOT`" to locate
`${CLAUDE_PLUGIN_ROOT}/rules/*.md`. This is a **harness-side** dependency, not something the port
can satisfy from a manifest, and it is the single runtime risk of this plugin.

Cursor documents `${CURSOR_PLUGIN_ROOT}` as a placeholder expanded inside managed plugin command
strings. Its hook environment table does **not** document either `CURSOR_PLUGIN_ROOT` or
`CLAUDE_PLUGIN_ROOT` as a process environment variable. These hook commands do not pass an explicit
plugin root, so the harness cannot treat either name as guaranteed. The corrected harness must use
verified inputs and diagnostics; the Settings → Rules check above does not cover this path.

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`.

## Port notes (read before editing)

### Manifest

One Claude Code–only key was purged from `plugin.json` (R18b): `author.url`. That leaves `author`
with only its `name`, since the source declared no `email` for this plugin. `name` (`fuse-rules`),
`version` (`1.0.20`), `description`, `homepage`, `repository` and `license` are reproduced verbatim.
The source declared no `keywords` and no `category`, so none were invented.

The description still reads "for all Claude Code sessions": no rule authorises rewriting manifest
prose (R17 covers frontmatter, R18b covers keys), so it is left alone.

The source `core[]` entry carried `required: true`. Cursor's marketplace schema has no such flag —
**nothing will force-install this plugin** (R3). Combined with the discovery caveat above, that is
the honest summary of this port's fragility: mandatory rules become opt-in rules whose loading path
is partly unverified.

### Rules

Nine `.md` files, byte-identical, **no frontmatter added**. Full rationale in the caveat section
above — it is the most important thing in this README.

### Templates

`templates/CLAUDE.md.template` (12.7 KB) is ported verbatim at the same relative path under R20c:
it is a prose file of the source plugin, neither a component nor an artefact, and R20c's default is
to port. It is the reference `CLAUDE.md` handed to a project, and it is **inert** — nothing in
`rules/`, `hooks/` or the manifest references it (grepped), and Cursor discovers no component from a
`templates/` folder. It ships as content, exactly as the source carried it.

Its sibling artefacts were excluded on sight under R20a: `templates/.harness/cache/` (14 files) and
`templates/.DS_Store`.

### Agents / Skills / Commands

None, in the source and in the port. See the Contents note.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11). Two levels of
`_description` keys were stripped (R16), one per event and one per hook entry; their content is
reproduced in the behaviour table above. The source's `"_version": "1.0.0"` is an internal revision
string of that file, **not** Cursor's `version`, which is the schema version and is the integer `1`
— the port declares `"version": 1` and discards the source string rather than coercing it.

Every `"matcher": ""` was dropped rather than emitted empty (R14).

One source note remains a minimum prerequisite: routing the `rules` scope on `SubagentStart`
requires `@fusengine/harness >= 0.1.63`. It is not sufficient proof of Cursor compatibility. The
current commands are intentionally unpinned until a corrected version above `0.1.90` passes clean
source/dist/packed-tarball parity.

#### R12 — the 3 events declared by this plugin

100 % of what `claude-rules/hooks/hooks.json` declares. No `UNKNOWN`, no `NOT PORTABLE`.

| Claude Code event | Cursor event | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `SessionStart` | `sessionStart` | `MAPPED` | `_Ni` @19775968. The native public contract carries `additional_context`; actual rules delivery still depends on corrected harness root discovery and response rendering. |
| `SubagentStart` | `subagentStart` | `CURSOR-NATIVE ONLY` | In `Wu` @19775205, **absent from `_Ni`**. It is statically declared in this plugin's native `hooks/hooks.json`, preserving native-schema reachability; declared in a `.claude/settings.json`-shaped file, `nYg` @19777846 drops it. Actual event and rule delivery remain runtime-unverified, and the public output contract exposes `permission` and `user_message`, not `additional_context`. **Never move this entry into a settings-shaped file.** |
| `UserPromptSubmit` | `beforeSubmitPrompt` | `MAPPED` | `_Ni`. Its public output contract exposes `continue` and `user_message`, not `additional_context`; broader binary-schema delivery is runtime-unverified. Its matcher target is the constant `"UserPromptSubmit"` (`aYg` @19779089), not a tool name — irrelevant here, since none is declared. |

#### R13 — the tool matchers declared by this plugin

| Source matcher | Cursor matcher | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `""` (all three events) | *(field omitted)* | `MAPPED` | R14. `cYg` @19779820 treats an absent matcher as match-everything, which is what `""` meant in the source. No regex is emitted, so the "invalid regex matches everything" trap cannot apply here. |

No tool matcher of any kind is declared by this plugin: it guards nothing; it is intended to inject rules,
subject to runtime verification. The
`NOT PORTABLE` matchers of R13 (`Glob`, `MultiEdit`, `TaskCreate`, `TaskUpdate`) are therefore all
unused, and nothing was dropped on that account.

| Claude Code | Cursor | Matcher before | Matcher after |
| :-- | :-- | :-- | :-- |
| `SessionStart` | `sessionStart` | `""` | *(omitted)* |
| `SubagentStart` | `subagentStart` | `""` | *(omitted)* |
| `UserPromptSubmit` | `beforeSubmitPrompt` | `""` | *(omitted)* |

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code rules`

Target: `npx -y @fusengine/harness hook cursor rules`

R15. The `$HOME/…` path is absolute and points into a Claude Code install tree that does not exist
for a Cursor user; `npx` removes the path dependency. The scope argument `rules` is preserved
exactly on all three entries — it is what selects the rules-reading branch in the harness.

The source carried no `|| true` suffix on any entry, so nothing had to be removed here.

## Runtime paths

> Native Cursor APEX state uses `.cursor/apex/`, and harness-owned project cache uses
> `.harness/cache/`. Documented `.claude/…` compatibility inputs remain only where Cursor consumes
> them as third-party instructions, skills, agents, or settings.

This plugin has **no skill, agent or command bodies**. The `.claude/…` strings it does carry live
in the bodies of the
nine `rules/*.md` files and in `templates/CLAUDE.md.template` — `.claude/ralph/prd.json`,
`~/.claude/agents/*.md`, and similar — and they were kept verbatim for exactly the reason the clause
gives. Native APEX and harness-cache instructions use `.cursor/apex/` and `.harness/cache/`;
compatibility inputs such as `.claude/agents/` remain valid and are not globally rewritten.

The only *install* path the source carried was the hook command's
`$HOME/.claude/plugins/marketplaces/…`, R15's territory, rewritten above.

## Not portable

All three event declarations map, but native response parity and rules delivery remain unverified.

- **Events:** all three port. `SessionStart` and `UserPromptSubmit` are `MAPPED`; `SubagentStart` is
  `CURSOR-NATIVE ONLY` and is statically reachable from this native hooks file, while runtime event
  delivery remains unverified.
- **Matchers:** none declared.
- **`InstructionsLoaded`** is `NOT PORTABLE` but **is not declared by this plugin** — see the
  dedicated section above. Its loss lands on `core-guards`, and it costs a diagnostic log rather
  than an injection.
- **`required: true`** has no Cursor counterpart (R3): mandatory becomes opt-in. Not a hook loss,
  but the practical consequence is the same as losing the plugin — an uninstalled rule set enforces
  nothing.

Open items are documented above rather than relabeled as proven losses: frontmatter-less native
rule discovery, plugin-root resolution, and lifecycle response delivery through the corrected
harness.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`. Node's `npx` must be on `PATH` for
the hooks. Keep the hooks in **this file** — `hooks/hooks.json`, the plugin's own native hooks
file: `subagentStart` is reachable only from here and is dropped in silence through any
`.claude/settings.json`-shaped path. That establishes event reachability only; sub-agent rule
delivery remains runtime-unverified.

After installing, do the 30-second check: **Settings → Rules**, and confirm the nine files appear.
