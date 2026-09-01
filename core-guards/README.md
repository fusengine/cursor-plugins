# core-guards (Cursor Plugin)

Security guards and SOLID enforcement, expressed **entirely as hooks**. No agent, no skill, no
command: this plugin ships behaviour, not components. It is the largest hook surface in the
marketplace — the Claude Code source declares **15 events**; this port declares **11**.

Ported from the Claude Code plugin `core-guards` v1.1.36. The plugin name is unchanged across both
ecosystems (R1: the Cursor folder is named after the manifest's `name`).

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 0 | — |
| Skills | 0 | — |
| Commands | 0 | — |
| Rules | 0 | — |
| Hooks | 11 events | `hooks/hooks.json` |

**No `agents/`, `skills/`, `commands/` or `rules/` folder.** The source ships none, so the port
ships none: absence in the source is reproduced as absence in the port, never as an empty folder
(R4–R6 preamble). The source's `statusline/` sub-project is **not** ported — see
"Not portable → statusline" below.

The source plugin's own top-level `README.md` occupied exactly this path and is therefore replaced
by this document, with its non-redundant material folded into the behaviour table below (R20c).

## What the hooks do

Every entry shells out to the same harness binary; the harness routes on the event it receives.
The source carried this information in `_description` keys, which JSON cannot keep as comments and
which R16 requires stripping — so it is reproduced here, in full, one row per surviving entry.

| Cursor event | Matcher | Behaviour |
| :-- | :-- | :-- |
| `preToolUse` | `Write\|Shell\|WebFetch` | Source and inspected local-harness policy logic covers guards (security / bash-write / git / install / interface-separation / protected-path), the file-size gate, APEX gates (freshness / doc / solid / brainstorm), WebFetch cache lookup, and the verbosity cap. Cursor publicly supports `preToolUse` permission allow/deny, but actual execution and enforcement through the unpinned harness remain runtime-unverified without an authentic Cursor replay. The matcher is deliberately restricted to the targeted tools — `Read` / `Grep` are **not** routed here, because the source APEX gate keys off the presence of a file path and would wrongly deny plain reads if they were routed. |
| `beforeMCPExecution` | `MCP:(query-docs\|web_search_exa\|get_code_context_exa)` | The MCP half of the same guard: payload-size cap (`numResults ≤ 3` for Exa, `tokens ≤ 2000` for Context7) and the session cache lookup in `~/.claude/fusengine-cache/sessions/` (TTL 48 h). On a cache hit the hook attempts to deny the call and inject the cached content; this remains incomplete in the inspected corrected local harness until lowerCamel lifecycle routing, native per-event response rendering, and native Cursor cache-hit responses are implemented and replayed. Split out of `PreToolUse` — see "Hooks → the MCP split". |
| `postToolUse` | *(none)* | Intends to record agent / doc / reference-read activity, store MCP and WebFetch results into the cache, warn on file size, and — for write operations — accumulate session-change tracking that drives the sniper reminder plus the ESLint / Prettier report. Actual Cursor execution remains runtime-unverified until lowerCamel lifecycle routing and native per-event response rendering are completed and replayed. |
| `sessionStart` | *(none)* | Intends to inject `~/.claude/CLAUDE.md` and the dev context (git status, detected project type) into the session, and conditionally run cache/state cleanups when invoked (prunes the `~/.claude/fusengine-cache/` whitelist — `sessions/`, `webfetch/`, `doc/`, `explore/` — at 48 h / 24 h TTLs); actual lowerCamel lifecycle execution and context delivery remain runtime-unverified. |
| `beforeSubmitPrompt` | *(none)* | Intends to read `~/.claude/CLAUDE.md` (plus an APEX preamble when the prompt contains a dev verb), prepare context, detect creation intent, and set the brainstorm-required flag; actual native lifecycle execution and context delivery remain runtime-unverified (public output only `continue` / `user_message`). |
| `subagentStart` | *(none)* | Intends to prepare fresh MCP cache entries (Context7 / Exa) for each spawned sub-agent; actual lifecycle execution and context delivery remain runtime-unverified (public output only `permission` / `user_message`). |
| `subagentStop` | *(none)* | Intends to track agent completion and memory and to emit the sniper reminder when the agent changed code; the behavior remains incomplete and runtime-unverified until lowerCamel lifecycle routing and native per-event response rendering are implemented and replayed. |
| `postToolUseFailure` | *(none)* | Intends to log tool failures to `~/.claude/logs/tool-failures.log`; actual Cursor execution remains runtime-unverified until lowerCamel lifecycle routing is completed and replayed. |
| `stop` (1 of 2) | *(none)* | Configured/direct command intended to play the task-completion sound when Cursor invokes it (assets embedded in the harness; the process exits before reading stdin); authentic Cursor invocation remains runtime-unverified. |
| `stop` (2 of 2) | *(none)* | **Prompt hook** — intended to ask the model to check the APEX workflow was followed (explore/research agent before coding, file-size compliance, sniper after modifications, elicitation self-review before sniper, functional verification before "done") and answer `{"ok": false, "reason": …}` when a step was missed while code was modified. The active stop prompt now references the canonical `FUSE_SOLID_MAX_LINES` policy (default `200`); this plugin manifest was intentionally modified to carry that correction. Authentic Cursor invocation and response behavior remain runtime-unverified. |
| `preCompact` | *(none)* | Intends to back up `.cursor/apex/task.json` before compaction, keeping the 5 newest snapshots; actual Cursor execution remains runtime-unverified until lowerCamel lifecycle routing is completed and replayed. |
| `sessionEnd` | *(none)* | Intends to remove stale temp and legacy cache files; end-to-end cleanup remains runtime-unverified because lowerCamel lifecycle routing is incomplete. |

### Ralph Mode

Source behavior auto-approved safe git commands and project-level installs when `RALPH_MODE=1` was set, when `.claude/ralph/prd.json` existed in the project, or when the current branch matched `feature/*`. The inspected corrected local harness intentionally narrows activation to the explicit `RALPH_MODE=1|true` environment opt-in; the implicit file and branch triggers were dropped. Cursor publicly supports `preToolUse` permission allow, but actual execution and auto-approval through the unpinned harness remain runtime-unverified without an authentic Cursor replay.

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`.

The source README's installation section is **not** reproduced: it instructed the user to run the
marketplace's `setup.sh`, which writes a hooks loader and a `statusLine` entry into
`~/.claude/settings.json`. Neither applies here — this plugin ships its own native
`hooks/hooks.json` (which is what makes `subagentStart` and `postToolUseFailure` reachable at all,
see R12 below), and the status line has no Cursor target concept.

## Port notes (read before editing)

### Manifest

One Claude Code–only key was purged from `plugin.json` (R18b): `author.url`. `name`, `version`
(`1.1.36`), `description`, `homepage`, `repository`, `license` and the seven `keywords` are
reproduced verbatim. The description still reads "…for Claude Code": no rule authorises rewriting
manifest prose (R17 covers frontmatter, R18b covers keys), so it is left alone.

The source `core[]` entry carried `required: true`. Cursor's marketplace schema has only `plugins`,
and has no `required` flag — **nothing will force-install this plugin** (R3). For a plugin whose
entire purpose is mandatory enforcement, that is the single most consequential divergence of this
port, and it is not recoverable by any manifest key.

### Agents / Skills / Commands / Rules

None, in the source and in the port. See the Contents note.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11). Two source-only keys were
stripped (R16): `_description` (many occurrences, reproduced in the behaviour table above) and
`_author`.

**`_version` is not `version`.** The source `hooks.json` declared `"_version": "2.0.0"`, an
internal revision string of that file. Cursor's `version` is the **schema** version of the hooks
file and is the integer `1`. The port declares `"version": 1`; the source's `"2.0.0"` is discarded,
never coerced.

Every `"matcher": ""` was dropped rather than emitted empty (R14): `cYg` @19779820 treats an absent
matcher as match-everything, which is exactly what the source meant.

#### The MCP split

The source's single `PreToolUse` entry mixed native and MCP tools in one matcher:

```
Write|Edit|Bash|WebFetch|mcp__context7__query-docs|mcp__exa__web_search_exa|mcp__exa__get_code_context_exa
```

Under Cursor that cannot stay one entry. `aYg` @19779200 synthesises the `MCP:` prefix **only** on
the MCP branches; `preToolUse` receives `tool_name` **raw, unprefixed**. A matcher `MCP:query-docs`
placed on `preToolUse` would therefore never match — and it would not protest, it would go quiet.
So the entry is split in two, the same shape `fuse-security` and `fuse-changelog` already use:

| | Event | Matcher |
| :-- | :-- | :-- |
| native half | `preToolUse` | `Write\|Shell\|WebFetch` |
| MCP half | `beforeMCPExecution` | `MCP:(query-docs\|web_search_exa\|get_code_context_exa)` |

Both events carry a `permission` response field (R12), so the MCP cache's *deny + inject cached
content* behaviour is intended to survive the move; it remains incomplete in the inspected corrected local harness until lowerCamel lifecycle routing, native per-event response rendering, and native Cursor cache-hit responses are implemented and replayed.

**Structural limitation, by construction: the server segment is lost.** `JQg` @~19776502 rewrites
`mcp__<server>__<tool>` into `` `MCP:${tool}` `` — the `context7` / `exa` segment has no place in a
Cursor matcher. Two consequences, in opposite directions:

- **Wider than the source.** `MCP:query-docs` now matches a tool named `query-docs` on *any* MCP
  server, not just Context7.
- **Narrower than intended, and silently.** The tool list is an explicit enumeration of three
  names. It was already an enumeration in the source, but there it was scoped by server; here it is
  not, so it cannot be widened to "everything from these two servers" — there is no server to name.
  **Any new tool added to the Context7 or Exa server stops being watched, with no error anywhere.**
  Whoever adds one must extend this matcher by hand. `MCP:.*` is a valid regex if the intent ever
  becomes "cache and cap every MCP call", but that is a behaviour change and is not the port's call.

#### The `Stop` prompt hook is not a loss

The second `stop` entry is a `"type": "prompt"` hook (the APEX completion checklist evaluated by
the model). It ports directly to Cursor's `{type: "prompt", prompt: …, timeout: N}` shape with the
`{ok, reason?}` response contract (R18). The `timeout: 15` and checklist semantics are preserved,
except item 2 is intentionally adapted from the source's fixed 100-line threshold to the canonical
`FUSE_SOLID_MAX_LINES` policy (default `200`).

The prompt ends with `Context: $ARGUMENTS`. Cursor's public documentation establishes the static
contract: `$ARGUMENTS` is automatically substituted with the hook's JSON input. This confirms the
intended input mapping only; prompt-hook execution and response delivery remain runtime-unverified
without an authentic Cursor replay.

The source carried an explicit warning next to this entry, worth preserving: **never convert it
into a plain `hook … core` command without `--sound`** — that path also triggers
`stopCore → notify("stop")` and would double up with the sound played by the first `stop` entry.

#### R12 — the 15 events declared by this plugin

100 % of what `core-guards/hooks/hooks.json` declares. No `UNKNOWN`: the port is unblocked.

| Claude Code event | Cursor event | Status | What that means here |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | `preToolUse` + `beforeMCPExecution` | `MAPPED` | `_Ni` @19775968. Split in two, see above. Both carry `permission`, so the public schema can represent denial, but the inspected harness's Cursor MCP cache-hit response is currently incomplete and must be replayed after correction. |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni`. Carries `additional_context`. Matcher tests `tool_name`; none declared. |
| `SessionStart` | `sessionStart` | `MAPPED` | `_Ni`. The native contract carries `additional_context`; end-to-end delivery still depends on the corrected harness and a Cursor runtime replay. |
| `SessionEnd` | `sessionEnd` | `MAPPED` | `_Ni`. No output fields, observe-only — but this entry only performs a side effect (deleting stale files); lowerCamel lifecycle routing is incomplete in the inspected harness, so end-to-end cleanup remains unverified. |
| `UserPromptSubmit` | `beforeSubmitPrompt` | `MAPPED` | `_Ni`. The current public contract exposes `continue` and `user_message`, not `additional_context`; any broader binary-schema delivery is runtime-unverified. Matcher target is the constant `"UserPromptSubmit"`, irrelevant here (none declared). |
| `PreCompact` | `preCompact` | `MAPPED` | `_Ni`. Observational and unable to block or alter compaction; the documented optional output is `user_message`. Source and local-harness semantics intend this hook only to back up `.cursor/apex/task.json` on disk, so it needs no output when invoked. Actual Cursor invocation remains runtime-unverified until lowerCamel lifecycle routing is completed and replayed. |
| `Stop` | `stop` | `MAPPED` | `_Ni`. Carries `followup_message`. Both source entries port — the sound command and the prompt hook (R18). |
| `SubagentStop` | `subagentStop` | `MAPPED` | `_Ni`. Carries the public `followup_message` capability as intended partial compensation for the sniper reminder; actual reminder delivery remains runtime-unverified because lowerCamel routing and native rendering are unverified. Matcher would test `subagent_type` (R14); none declared. |
| `SubagentStart` | `subagentStart` | `CURSOR-NATIVE ONLY` | In `Wu` @19775205, **absent from `_Ni`**. The event is reachable here because this plugin ships its own native `hooks/hooks.json`; declared in a `.claude/settings.json`-shaped file it would be dropped by `nYg` @19777846 with a bare "Unknown Claude Code event, skipping" — no failure, no warning. Event reachability does not prove MCP cache context delivery to sub-agents; that remains runtime-unverified because the public contract exposes only `permission` and `user_message`. **Never move this entry into a settings-shaped file.** |
| `PostToolUseFailure` | `postToolUseFailure` | `CURSOR-NATIVE ONLY` | Same trap, more deceptive: the native event exists with a full protobuf schema (offsets 17473451 / 17474096) yet is absent from `_Ni`. Native hooks file only. Matcher tests `tool_name`; none declared. |
| `PermissionRequest` | — | `NOT PORTABLE` | `_Ni` maps it to `null`; `iKu` @19776461 lists it as ignored. **Lost behaviour:** the audible cue that fires on *every* permission dialog, system-triggered or hook-triggered, is gone. A permission prompt now waits in silence. The event carried no logic beyond the sound, so nothing else is affected. |
| `Notification` (`permission_prompt`) | — | `NOT PORTABLE` | Same two proofs. **Lost behaviour:** the `permission-need.mp3` cue on a `Bash` / `Write` / `Edit` confirmation dialog. Its matcher string has 0 occurrences in the binary — there is no notification-kind channel to re-target onto. |
| `Notification` (`idle_prompt`) | — | `NOT PORTABLE` | Same. **Lost behaviour:** the `need-human.mp3` cue after ~60 s of the agent waiting on you. In practice this is the one that costs attention: an idle session no longer announces itself, so a run left unattended stays stalled until you look at it. |
| `Notification` (`elicitation_dialog`) | — | `NOT PORTABLE` | Same. **Lost behaviour:** the `need-human.mp3` cue when an MCP tool opens an elicitation dialog asking for input. |
| `TeammateIdle` | — | `NOT PORTABLE` | **0 occurrences** in the whole binary, all casings. **Lost behaviour:** when a teammate agent modified code and then went idle, the harness suggested a sniper validation on its output. That prompt-for-validation is gone; nothing on the Cursor side observes a teammate going idle. Intended partial compensation only: `subagentStop` publicly supports `followup_message`, but the inspected harness's lowerCamel routing and native response rendering remain incomplete, so actual reminder delivery is runtime-unverified; the uncompensated gap is idle-without-stopping. |
| `TaskCompleted` | — | `NOT PORTABLE` | 15 occurrences, all inside `agent.v1.AgentHostBackgroundTaskCompleted` — an internal background-task lifecycle, not a hook event. A name match is not an event. **Lost behaviour:** the post-task re-measurement that re-read every file a task had modified and flagged the ones over the SOLID line ceiling. Source-level per-write compensation remains intended: `preToolUse` is designed to deny a qualifying oversized write, and Cursor publicly supports that denial; `postToolUse` can only warn after successful execution. Because the harness command is unpinned and no authentic Cursor replay exists, actual execution and blocking remain runtime-unverified. What definitively disappears is the end-of-task sweep that could catch files missed by the per-write path. |
| `InstructionsLoaded` | — | `NOT PORTABLE` | **0 occurrences** in the whole binary, all casings. **Lost behaviour, in this plugin:** the debug log recording which instruction files were actually loaded, used to diagnose APEX rule loading. Diagnostics only — no enforcement hangs off it here. Its role for the rules *injection* is discussed in `fuse-rules/README.md`, and is smaller than the marketplace README assumes. |

#### R13 — the tool matchers declared by this plugin

The source declares matchers on exactly one event (`PreToolUse`) plus three notification-kind
matchers on `Notification`. Every one has a row; silence is forbidden.

| Source matcher | Cursor matcher | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `Write` | `Write` | `MAPPED` | `tKu` @19776314 maps it to itself. |
| `Edit` | `Write` | `MAPPED` | `tKu` maps `Edit` → `Write`. **Collapses** with the row above. Both source tools shared one command and one guard, so there were no two distinct messages to merge by hand. |
| `Bash` | `Shell` | `MAPPED` | `tKu`. Placed on `preToolUse`, which tests `tool_name` — **not** on `beforeShellExecution`, which tests the command line itself and where `Shell` would match nothing useful (R13 trap 2). The guard inspects the command from the event payload, so the tool-level gate is the faithful placement. |
| `WebFetch` | `WebFetch` | `MAPPED` | `tKu` maps it to itself. The public docs omit it from the matcher list and an earlier revision of R13 rated it `NOT PORTABLE` on that documentary absence; R19 corrected it. Matcher/event reachability is mapped, but cache-hit denial, verbosity injection, and input mutation remain incomplete for Cursor in the inspected harness. |
| `mcp__context7__query-docs` | `MCP:query-docs` | `MAPPED` | `JQg` @~19776502 + `aYg` @19779089. Moved to `beforeMCPExecution`. Server segment lost — see "The MCP split". |
| `mcp__exa__web_search_exa` | `MCP:web_search_exa` | `MAPPED` | Same. |
| `mcp__exa__get_code_context_exa` | `MCP:get_code_context_exa` | `MAPPED` | Same. |
| `permission_prompt` (`Notification`) | — | `NOT PORTABLE` | Not a tool matcher — a notification-kind filter. 0 occurrences in the binary, and moot anyway: `Notification` is a `NOT PORTABLE` event (R12). |
| `idle_prompt` (`Notification`) | — | `NOT PORTABLE` | Same. |
| `elicitation_dialog` (`Notification`) | — | `NOT PORTABLE` | Same. |
| `""` (10 events) | *(field omitted)* | `MAPPED` | R14. An absent matcher is match-everything in `cYg` @19779820, which is what `""` meant in the source. |

Both surviving matchers were compiled with `re.compile()` before shipping. This is not ceremony:
`cYg` wraps its `new RegExp(...).test(...)` in `catch { return !0 }`, so **an invalid regex makes
the hook match everything** — one stray `(` would turn the narrow `preToolUse` guard into a global
one, denying plain reads exactly as the source's matcher comment warned against, with no error
anywhere.

| Claude Code | Cursor | Matcher before | Matcher after |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | `preToolUse` | `Write\|Edit\|Bash\|WebFetch\|mcp__…×3` | `Write\|Shell\|WebFetch` |
| `PreToolUse` | `beforeMCPExecution` | *(same entry)* | `MCP:(query-docs\|web_search_exa\|get_code_context_exa)` |
| all 10 others | *(as mapped)* | `""` | *(omitted)* |

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code`

Target: `npx -y @fusengine/harness hook cursor`

R15. The `$HOME/…` path is absolute and points into a Claude Code install tree that does not exist
for a Cursor user; `npx` removes the path dependency. This plugin passes **no scope argument** on
its enforcement entries — the harness routes on the event alone — so the target ends at `cursor`,
exactly as `fuse-ai-pilot`'s `preToolUse` entry does. The one entry that does carry arguments keeps
them verbatim: `hook cursor core --sound stop`.

The source carried no `|| true` suffix on any entry, so nothing had to be removed here. (Where
other plugins in this marketplace did carry it, it was dropped as a change of form: Cursor's hook
runner is fail-open, and appending `||`/`true` risks handing them to the spawned process as literal
argv.)

## Runtime paths

> Native Cursor APEX state uses `.cursor/apex/`, and harness-owned project cache uses
> `.harness/cache/`. Documented `.claude/…` compatibility inputs remain only where Cursor consumes
> them as third-party instructions, skills, agents, or settings.

This plugin has **no skill, agent or command bodies at all.** Its runtime-path references document deterministic layout and source/local-harness intent rather than proven Cursor effects: `.cursor/apex/task.json` (intended for backup on `preCompact`; actual invocation remains runtime-unverified), `~/.claude/CLAUDE.md` (intended for injection on `sessionStart`; re-injection on `beforeSubmitPrompt` remains runtime-unverified in the inspected corrected local harness), `~/.claude/fusengine-cache/**` (the MCP, WebFetch, doc and explore cache layout), `~/.claude/logs/tool-failures.log`, and `.claude/ralph/prd.json` (a historical source Ralph trigger intentionally dropped by the corrected local harness; current local activation is the explicit `RALPH_MODE=1|true` opt-in described above). These paths and intended roles are described in the tables above rather than in a component body. Resolving target-specific global inputs is designed to be the harness's job, but actual behavior through the unpinned Cursor harness remains runtime-unverified.

The only *install* path the source carried was the hook command's
`$HOME/.claude/plugins/marketplaces/…`, which is R15's territory and **is** rewritten (above).
The APEX and cache paths are native runtime state rather than compatibility inputs, so they use
`.cursor/apex/` and `.harness/cache/` respectively.

## Not portable

### statusline (R20b)

**Source path:** `claude-plugins/plugins/core-guards/statusline/`
**Ported:** nothing — not the sources, not its own `README.md`, not its configuration.

`statusline/` is a complete Bun/TypeScript program with its own `package.json`, `tsconfig.json`,
`biome.json`, `src/` tree, `dist/` build and 108 MB of `node_modules/`. It renders the Claude Code
terminal status line and is registered through the `statusLine` key of `~/.claude/settings.json` by
the marketplace's `setup.sh` — outside the plugin model entirely. Its segments were: Claude
version, working directory with git state (branch, dirty, staged/unstaged), model name and token
count, a context-usage progress bar, session cost, the 5 h / 7 d limits with reset time, daily
spend, Node version, and an edit counter. It was configurable per segment via
`statusline/config.json`, with a terminal and a web configurator (`bun run config:term` /
`bun run config`).

Applying R20b in order:

1. **Concept it plugs into:** Claude Code's status line, declared by the `statusLine` key of
   `settings.json`.
2. **Cursor target concept:** none found. There is no plugin-declared status line, and — decisive —
   **an executable shipped inside a plugin is not addressable**. Cursor documents
   `${CURSOR_PLUGIN_ROOT}` as a placeholder expanded in managed plugin command strings, not as a
   process environment variable available to an agent's shell tool. Nothing outside a verified
   plugin command can resolve a path into the plugin folder in order to run the program.
3. **Therefore case 4:** the subtree is **not ported and no substitute is invented** — no hook,
   command or agent that "simulates" a status line. R18c already bars shipping convincing-looking
   dead code, and R20b step 5 extends the exclusion to the sources and to the sub-project's own
   README, since a program nothing can launch is dead weight.

Its build and cache artefacts (`node_modules/`, `dist/`, `bun.lock`, `configure.ts.bak`,
`user-config.json.bkp`, `.harness/`) were excluded on sight under R20a and are **not** part of this
loss entry — an artefact carries no behaviour. The loss recorded here is the status line itself.

### Events

Five source events have no Cursor equivalent. What each one cost, in behaviour rather than in
event names:

- **`PermissionRequest` and `Notification` (3 matchers) — every audible cue disappears.** Permission
  dialogs, the ~60 s idle prompt and MCP elicitation dialogs now arrive silently. The `Stop` sound
  command remains configured and is intended to announce completion when invoked, but actual
  unpinned Cursor invocation and audible playback remain runtime-unverified; even a successful
  invocation is deliberately silent when `FUSE_HARNESS_SOUND=0`, the platform/player is unsupported
  or missing, or the asset cannot be resolved. The confirmed event losses are on the *asking for
  input* side; the audible completion contrast is intended, not yet proven in Cursor.
- **`TeammateIdle` — no sniper suggestion when a teammate goes idle after modifying code.**
  `subagentStop` is intended to be compensated by the public `followup_message` path, but actual delivery remains runtime-unverified; the idle-without-stopping case is gone.
- **`TaskCompleted` — no end-of-task SOLID sweep.** Source semantics intend `preToolUse` to deny a qualifying oversized write; `postToolUse` can only warn after successful execution. Actual Cursor execution and blocking remain runtime-unverified with the unpinned harness and no authentic replay. Regardless, files missed by the per-write path are no longer re-measured at task end.
- **`InstructionsLoaded` — no instruction-loading debug log.** Diagnostics only in this plugin. When
  rule injection misbehaves under Cursor there is now no hook-side record of what was loaded; the
  only way to check is the harness's own logging.

### Matchers

- `Glob`, `MultiEdit`, `TaskCreate`, `TaskUpdate` are `NOT PORTABLE` matchers (R13). **This plugin
  uses none of them**, so nothing was dropped on that account.
- The three notification-kind matchers are listed in the R13 table above; they are moot with the
  event.

### Enforcement is no longer mandatory

`required: true` has no Cursor counterpart (R3). In Claude Code this plugin was force-installed as
a `core[]` entry; under Cursor a user can simply not install it, and every guard above is then
absent. That is a property of the marketplace schema, not something a manifest key can restore.

## Permissions

`permissions/` holds the port of Claude Code's `permissions.allow` to Cursor's `permissions.json`
(`~/.cursor/permissions.json`, or `<git-root>/.cursor/permissions.json`). It lands in this plugin
because guards are what this plugin is: an allowlist is the declarative half of the same job the
hooks above do imperatively.

- `permissions/permissions.json` — the translated file. **Produced, not deployed**: nothing under
  `~/.cursor/` is written by this repository, and the file replaces rather than merges into an
  existing allowlist. Read `permissions/README.md` before copying it anywhere.
- `permissions/README.md` — the pattern-by-pattern translation table (21 source patterns → 7
  `MAPPED`, 2 `MOVED` to `sandbox.json`, 1 `NOT PORTABLE`, 11 `WITHHELD`), the behaviour lost in
  each case, and the evidence for the `server:tool` shape of `mcpAllowlist`.

Two settings keys are lost outright, and neither loss belongs to `permissions.json`:

- **`env` — `NOT PORTABLE`, no extension mechanism at all.** `_buildHookEnvironment` @32974355 sets
  a fixed set of variables (`CURSOR_PROJECT_DIR`, `CURSOR_VERSION`, `CLAUDE_PROJECT_DIR`, plus
  `CURSOR_CODE_REMOTE`, `CURSOR_USER_EMAIL`, `CURSOR_TRANSCRIPT_PATH` when applicable) and reads no
  user configuration whatsoever. **Lost behaviour:** the four variables declared in
  `~/.claude/settings.json` never reach a Cursor hook. There is nothing to configure and nothing to
  work around — a hook that needs one must read it from its own environment or from a file.
- **`statusLine` — `CURSOR-NATIVE ONLY`, and on the other product.** It exists on the Cursor **CLI**
  (`~/.cursor/cli-config.json`), not in the IDE, and the CLI binary is not installed here. This is
  the same loss already recorded under "Not portable → statusline (R20b)" above, reached from the
  settings side rather than from the source subtree.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as
a marketplace via its root `.cursor-plugin/marketplace.json`. Node's `npx` must be on `PATH` for
the hooks. Keep the hooks in **this file** — `hooks/hooks.json`, the plugin's own native hooks
file: `subagentStart` and `postToolUseFailure` are reachable only from here, and are dropped in
silence through any `.claude/settings.json`-shaped path.
