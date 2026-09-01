# fusengine-plugins (Cursor)

Cursor Plugin port of the Fusengine Claude Code marketplace. Multi-plugin repository: the root
manifest is `.cursor-plugin/marketplace.json`, each plugin lives in its own top-level folder with a
`.cursor-plugin/plugin.json`.

**Status: 24 of 24 plugin structures ported.** Manifests and repository checks are verified;
end-to-end hook runtime parity is still pending a corrected `@fusengine/harness` release.
`fuse-ai-pilot` is the reference implementation. The last two — the source
manifest's `core[]` entries, `core-guards` and `claude-rules` (ported as `fuse-rules`, the `name`
its own manifest declares) — are now ordinary `plugins[]` entries.

## Installation

```sh
chmod +x install.sh verify.sh   # once, after cloning
./install.sh --dry-run          # show every write without performing one
./install.sh                    # install
./verify.sh                     # prove it — exit 0 only if every check passes
```

`install.ps1` is the Windows equivalent (`-DryRun`, `-Force`, `-Uninstall`); run `verify.sh` from
Git Bash or WSL. Both installers are idempotent, never use `sudo`, never write inside this
repository, and remove nothing but the symlink and the rule file they created themselves.

**What `install.sh` does — two independent installs, neither conditioning the other.**

1. **The marketplace, by symlink.** `~/.cursor/plugins/local/fusengine` → this directory. A link,
   not a copy, so edits are live: change a file, reload the window, done. Cursor reads
   `.cursor-plugin/marketplace.json` at the linked root and resolves each entry's `source` to a
   sibling folder containing `.cursor-plugin/plugin.json`. To work on a single plugin, link that
   plugin's folder instead of the marketplace root. If the link already exists it is re-pointed; if
   a *real* directory sits at that path the script refuses and stops.
2. **The global user rule, by copy.** `fuse-rules/user-rules/fuse-global.mdc` →
   `~/.cursor/rules/fuse-global.mdc`. That directory is the one the Cursor binary builds for a
   user-scope rule (`getRuleTargetDirectory(isUser=true)` → `userHome/.cursor/rules`), and `.mdc` is
   the extension it generates. A **copy**, deliberately: a symlink is right for the plugins
   directory Cursor documents, but the rules scanner has never been observed following one, and the
   copy costs nothing. The consequence is explicit — **edit the repo file, then re-run
   `./install.sh`**, or the deployed rule goes stale (`verify.sh` fails on the difference). The
   `fuse-` prefix is a collision guard: the installer deploys nothing that lacks it, touches no
   other file in `~/.cursor/rules/`, and refuses to overwrite a deployed rule that differs from the
   repo copy unless you pass `--force` — a global rule is a file you may have edited by hand.

`--uninstall` removes exactly two things: the symlink and `fuse-global.mdc`. Nothing recursive,
nothing else in either directory.

**Two instruction channels, not one duplicated.** `~/.cursor/rules/fuse-global.mdc` is *user*
scope — it applies in every project, on every machine where you ran the installer, with no gate
conditioning it. `AGENTS.md` at the root of a repository is *project* scope — read unconditionally
too, unlike `CLAUDE.md`, whose loading depends on the third-party-instructions toggle. Personal
standing instructions belong in the first, repository-specific ones in the second.

**Distribution — team marketplace.** Import the GitHub repository as a marketplace from Cursor's
plugin settings; the repository root is the marketplace root, and the 24 entries below install
individually from there. The global rule is not part of that path — it is installed by the script.

**Prerequisites.** Cursor itself, plus Node: every hook shells out to `npx -y @fusengine/harness`,
so `node` and `npx` must be on `PATH`. `verify.sh` uses the available Node runtime to prove that
every matcher is valid JavaScript regex syntax; it does not prove equivalence with Cursor's bundled
runtime.

**What `verify.sh` proves, and what it cannot.** It asserts the 24 folders and their manifests, the
strict bijection between `plugins[]` and the folders, every `hooks.json` (parse, `"version": 1` as
an integer, no `_`-prefixed key), that **every matcher compiles as a regex** — an invalid one is not
inert, Cursor catches the error and matches *everything* — that no matcher uses the Claude Code
`mcp__` prefix, that no JSON carries an absolute path, `..`, `$HOME` or the string `claude-code`,
that no `claude-opus-*` model value survives in any frontmatter or manifest, that every skill's
`name:` equals its folder, that native Cursor paths satisfy the migration contract, that the global
rule's frontmatter carries `alwaysApply: true` as a boolean, and that both installs are actually in
place. `./verify.sh --repository-only` runs all repository checks without reading installed Cursor
state. One FAIL anywhere ⇒ exit 1. Four things it
cannot decide from a shell — the plugin list in **Customize**, runtime enforcement of an agent's
`tools:`, the rules panel, and whether the global rule loaded as *Always* — are printed at the end
as an explicit `[ ]` checklist rather than passed over in silence.

## Why `plugins[]` holds exactly 24 entries

Cursor documents the nominal resolution path for a marketplace entry — the parser looks for
`<source>/.cursor-plugin/plugin.json`, merges it with the marketplace entry, then discovers
components inside that folder. It documents **no** behaviour for the case where `<source>` does not
exist. Whether such an entry is skipped or aborts the whole marketplace load is unknown, and the
submission checklist requires that "all paths in manifest are relative and valid".

The invariant that follows held while the port was in progress and still holds now that it is
finished: **the JSON lists exactly the folders that exist, no more and no less.** The 24 entries and
the 24 plugin folders are in one-to-one correspondence; every `source` resolves to a sibling folder
carrying a `.cursor-plugin/plugin.json` whose `name` and `version` match the entry.

## Ported plugins (24 of 24)

Folder naming rule: the Cursor folder is named after the plugin's `name`, so `source` and `name`
are always identical. This differs from the Claude Code layout, where `fuse-laravel` lived in
`plugins/laravel-expert/`.

Component counts are what Cursor discovers in the ported folder: `agents/*.md`,
`skills/<name>/SKILL.md`, `commands/*.md`, and the number of events declared in
`hooks/hooks.json`. Versions are those of each folder's `.cursor-plugin/plugin.json`.

| # | Plugin `name` / `source` | Claude Code source | Version | Agents | Skills | Commands | Hook events |
| :-- | :-- | :-- | :-- | --: | --: | --: | --: |
| 1 | `core-guards` | `plugins/core-guards` | 1.1.36 | 0 | 0 | 0 | 11 |
| 2 | `fuse-ai-pilot` | `plugins/ai-pilot` | 1.2.39 | 8 | 17 | 12 | 5 |
| 3 | `fuse-astro` | `plugins/astro-expert` | 1.0.11 | 1 | 14 | 0 | 0 |
| 4 | `fuse-cartographer` | `plugins/cartographer` | 1.0.10 | 1 | 1 | 1 | 2 |
| 5 | `fuse-changelog` | `plugins/changelog-watcher` | 1.0.13 | 1 | 3 | 1 | 2 |
| 6 | `fuse-commit-pro` | `plugins/commit-pro` | 1.2.24 | 1 | 4 | 10 | 0 |
| 7 | `fuse-design` | `plugins/design-expert` | 2.2.7 | 1 | 9 | 5 | 4 |
| 8 | `fuse-go` | `plugins/go-expert` | 1.0.4 | 1 | 5 | 0 | 2 |
| 9 | `fuse-laravel` | `plugins/laravel-expert` | 1.2.5 | 1 | 23 | 0 | 2 |
| 10 | `fuse-lessons` | `plugins/fuse-lessons` | 1.0.5 | 1 | 0 | 2 | 5 |
| 11 | `fuse-nextjs` | `plugins/nextjs-expert` | 1.1.21 | 1 | 11 | 0 | 2 |
| 12 | `fuse-php` | `plugins/php-expert` | 1.0.4 | 1 | 6 | 0 | 2 |
| 13 | `fuse-prompt-engineer` | `plugins/prompt-engineer` | 1.1.10 | 1 | 6 | 2 | 0 |
| 14 | `fuse-react` | `plugins/react-expert` | 1.0.18 | 1 | 8 | 0 | 2 |
| 15 | `fuse-rules` | `plugins/claude-rules` | 1.0.20 | 0 | 0 | 0 | 3 |
| 16 | `fuse-rust` | `plugins/rust-expert` | 1.0.4 | 1 | 7 | 0 | 2 |
| 17 | `fuse-security` | `plugins/security-expert` | 1.0.16 | 1 | 5 | 1 | 3 |
| 18 | `fuse-seo` | `plugins/seo` | 1.0.9 | 9 | 21 | 0 | 1 |
| 19 | `fuse-shadcn-ui` | `plugins/shadcn-expert` | 1.0.15 | 1 | 5 | 0 | 2 |
| 20 | `fuse-solid` | `plugins/solid` | 1.0.16 | 1 | 8 | 0 | 3 |
| 21 | `fuse-swift-apple-expert` | `plugins/swift-apple-expert` | 1.1.17 | 1 | 11 | 0 | 2 |
| 22 | `fuse-tailwindcss` | `plugins/tailwindcss` | 1.1.8 | 1 | 16 | 0 | 2 |
| 23 | `fuse-tanstack-start` | `plugins/tanstack-start-expert` | 1.0.3 | 1 | 9 | 0 | 2 |
| 24 | `fuse-typescript` | `plugins/typescript-expert` | 1.0.4 | 1 | 7 | 0 | 2 |

Two rows carry zeroes across all three component columns and are not defective for it. `core-guards`
and `fuse-rules` are hook-only plugins: their entire payload is `hooks/hooks.json` plus, for
`fuse-rules`, the content those hooks are intended to read; actual Cursor hook execution and delivery
remain runtime-unverified. Per the R4–R6/R8–R10 preamble, absence in the source is
reproduced as absence in the port — neither folder gets an empty `agents/`, `skills/` or `commands/`.

**`fuse-rules` ships 9 rule files, not 8.** `rules/` holds `00-critical-rules.md` through
`08-subagent-conduct.md` — the `08` file exists on disk in both the source and the port. The source
marketplace's `core[]` description still reads "8 rule files (00→07)"; it is stale, and that stale
figure propagated into this port's backlog before being checked against `ls`. The count to quote is
9. Cursor's plugin reference includes `rules/` in default component discovery and accepts `.md`
candidates there. The Rules format documentation focuses on `.mdc` files with rule frontmatter, so
native activation of these source-identical plain `.md` files remains runtime-unverified. They also
remain intended hook-read content, whose execution and delivery are separately runtime-unverified;
the inventory table above has no Rules component column. `templates/CLAUDE.md.template` remains
reference content rather than a discovered rule.

Both plugins came from the source manifest's `core` array, which has no Cursor equivalent — the
marketplace schema has only `plugins`. They are now ordinary `plugins[]` entries, and **their
`required: true` flag has no Cursor counterpart: nothing will force-install them (R3).** That is a
real loss, not a formality — under Claude Code these two were mandatory installs, and every other
plugin's behaviour assumes the guards and the rules are present. Under Cursor a user can install
`fuse-laravel` alone and get none of it. Installing `core-guards` and `fuse-rules` is now a
documented manual step, enforced by nothing.

`claude-rules` is the source folder name; the plugin's own manifest declares `name: fuse-rules`, and
R1 names the Cursor folder after `name`. Hence `plugins/claude-rules` → `fuse-rules/`.

## Transformation rules (R1–R21)

**Governing principle: the Cursor plugin must behave like its Claude Code equivalent.** When a
choice arises, take the option that reproduces the original behaviour — not the one that is most
cautious in the abstract. Where Cursor's docs are silent, keep the source value and flag it; never
invent a mapping.

Worked examples for every rule are in `fuse-ai-pilot/README.md` under "Port notes".

**Preamble to R4–R6 (and to R8–R10) — a component rule fires only if the source folder exists.**
R4–R6 apply only when the source plugin has an `agents/` folder, R8–R9 only when it has `skills/`,
R10 only when it has `commands/`. A plugin with zero agents (`claude-rules`) gets **no** `agents/`
folder on the Cursor side: never create an empty component folder by reflex, and never list an empty
component in the ported plugin's contents table. Absence in the source is reproduced as absence in
the port — an empty folder is a divergence, not a precaution.

| # | Rule |
| :-- | :-- |
| R1 | Plugin folder is named after `name` (`fuse-laravel`, not `laravel-expert`). `source` == `name`, no `./` prefix. |
| R2 | `.claude-plugin/` → `.cursor-plugin/`. |
| R3 | `marketplace.json`: no `core[]` in Cursor — fold those entries into `plugins[]`; `required` is lost. List only folders that exist; keep the rest in this README. |
| R4 | Agents: **keep `tools:` in the frontmatter, unchanged** — it is a first-class repeated field of `agent.v1.CustomSubagent`, verified in the Cursor binary. Additionally emit a `## Allowed tools` block at the top of the body as a reminder to the model, since runtime enforcement of the key is not proven. Both, not either. |
| R5 | Agents: **every agent carries `model: grok-4.6`** (**verified in the binary**) — no more `inherit`, no more `sonnet`; `claude-opus-*` stays barred by owner policy. `medium` is `grok-4.6`'s default effort (binary: `{modelId:"grok-4.6", parameters:[{id:"effort",value:"medium"},{id:"fast",value:"false"}], displayName:"Cursor Grok 4.6 Medium"}`), so the value is written bare — **never** `[effort=medium]`, which would be redundant. **Exception, the control organs only:** `challenger` and `sniper` carry `grok-4.6[effort=high]`. They are not executants but controllers: their function is to contradict the lead and to find what it missed, and a controller less capable than the designer validates by default. `sniper-faster` stays at the default — it is the fast variant, it applies already-identified fixes. The underlying doctrine: the lead is the architect (high effort — it designs and decomposes), sub-agents are executants (default effort) working from an already-detailed mandate; the reasoning is done upstream, in the brief, and paying for it twice makes no sense. The `id[param=value]` syntax is valid and attested (`cursor.com/docs/subagents`, section *Model parameters*: `claude-opus-5[effort=high]`, `composer-2.5[fast=false]`, unquoted). **Reserve:** on the Cursor **Start** plan Grok is pinned to medium effort and the effort is not configurable — `[effort=high]` is silently ignored there (Cursor falls back to a compatible model without error, cf. *When the configured model won't be used*). No crash, and no escalation either. Never invent any other ID. |
| R6 | Agents: `readonly: true` iff the source `tools:` has neither `Write` nor `Edit` **and** no `mcp__*` tool. Both conditions are about fidelity: no-write reproduces the Claude Code constraint; the MCP clause avoids an agent silently losing MCP (that interaction is undocumented). |
| R7 | Markdown frontmatter: every out-of-schema key (`color`, `skills`, `effort`, `rules`, `user-invocable`, `argument-hint`, `references`, `related-skills`, `context`, `agent`, `versions`, `keywords`) is kept verbatim, never translated. |
| R8 | Skills: `user-invocable` does **not** map to `disable-model-invocation` — they are near-opposites. Keep both as-is. |
| R9 | Skills: `references/`, `steps/` and nested folders are retained. Reconcile executable references to removed subprojects or Claude-only installation paths under R18c/R21; never leave a mandatory command that cannot run. The hard identity check is `name:` == parent folder name. |
| R10 | Commands retain their intent and content, but executable paths follow R15/R18c/R21. Cursor derives `name` from the filename — do not add one. |
| R11 | Hooks: flatten `{Event:[{matcher,hooks:[{type,command}]}]}` → `{"version":1,"hooks":{eventCamelCase:[{command,matcher}]}}`. |
| R12 | Hook events: map per the **R12 event table** below, which carries a status per event (`MAPPED` / `NOT PORTABLE` / `CURSOR-NATIVE ONLY` / `UNKNOWN`). **Every plugin ships a mapping table covering 100 % of the events ITS OWN `hooks.json` declares — never a subset inherited from the pilot.** An `UNKNOWN` event blocks the port of the plugin that uses it until its status is resolved. |
| R13 | Tool matchers: map per the **R13 matcher table** below, which carries the same status column as R12. **Every tool matcher present in the source `hooks.json` must have an explicit status in the table shipped with the ported plugin — never a silence.** A matcher that never matches does not protest, it goes quiet: an unmapped matcher is a guard that stops guarding. Two properties settled in the binary govern the whole rule: the matcher is a **regex** (an invalid one matches everything), and **what it is tested against depends on the event**, not always a tool name. |
| R14 | Hook matcher `""` → omit the field. On `subagentStart`/`subagentStop` the matcher filters *subagent type*, not tool type. |
| R15 | Hook command: `bun $HOME/.claude/…/bin.mjs hook claude-code <scope>` → `npx -y @fusengine/harness hook cursor <scope>`. |
| R16 | Strip `_description` keys from hooks JSON (not schema fields, JSON has no comments) — move the text into the plugin README. |
| R17 | Where Cursor's docs are silent, keep the source value and flag it. **Scope: markdown frontmatter only.** Manifests are exempt — see R18b. |
| R18 | A Claude Code `"type":"prompt"` hook ports directly to Cursor `{type:"prompt", prompt:"…", timeout:N}` (response `{ok, reason?}`). **This is not a loss.** Applies to `core-guards`' `Stop` hook with the APEX checklist. |
| R18b | Manifests (`plugin.json`, `marketplace.json`) are purged of Claude Code–only keys: `owner.url`, `author.url`, `strict`. They are the files most likely to face strict validation at submission. |
| R18c | A construct that cannot execute in Cursor under **any** formatting is removed and documented, not translated into convincing-looking dead code. Verify against the real schema first (R19), not just the docs. |
| **R19** | **Cursor's documentation is a subset of the real schema. A key absent from the docs is NOT an unsupported key.** Before deleting, translating or relocating anything on "out of schema" grounds, check the data model in the binary — `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`, protobuf messages `agent.v1.*` / `aiserver.v1.*`. **Default: keep.** This rule overrides any impulse to tidy. |
| R20 | Subtrees that are neither `agents/`, `skills/`, `commands/`, `hooks/` nor a manifest: build/cache/archive artefacts are **never** copied (R20a); a functional sub-project is never ported blind (R20b); source documentation **is** ported (R20c). Full decision below. |
| R21 | Classify paths by contract: native Cursor APEX state uses `.cursor/apex`; harness-owned project cache uses `.harness/cache`; documented Claude compatibility inputs such as `.claude/settings.json`, `.claude/skills`, and `.claude/agents` may remain. Executable Claude installation paths must be replaced with a verified Cursor-safe command or made explicitly non-executable. Detail below. |

### R12 — hook event table

Status values, and what each one obliges:

| Status | Meaning | Obligation |
| :-- | :-- | :-- |
| `MAPPED` | A Cursor event covers the same trigger **and** Cursor's own Claude Code compatibility table maps the source name onto it. | Rename per the table. Nothing to document beyond the mapping. |
| `NOT PORTABLE` | No Cursor event covers it — established **against the binary**, never on a documentary absence alone. | Remove the entry and record the lost behaviour in the plugin README under "Not portable". |
| `CURSOR-NATIVE ONLY` | The Cursor event exists, but is absent from Cursor's Claude Code compatibility table: it is reachable only from a Cursor-native hooks file (the plugin's `hooks/hooks.json`, or `.cursor/hooks.json`). | Port it under its Cursor name in a native hooks file. Never route it through a `.claude/settings.json`-shaped path — it is dropped there in silence. |
| `UNKNOWN` | Neither support nor absence is established **in the binary**. A documentary absence lands here, never in `NOT PORTABLE`: R19 governs this table as much as it governs frontmatter keys. | **Blocking.** Resolve against `workbench.desktop.main.js` (R19) before the plugin that uses it is ported. Never guess a target name, never silently drop the entry. |

**Every row below is settled against the binary** — `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`, build 24 Aug 2026. Two literals carry the whole table:

- **`Wu`** (offset 19775205, `hook-step.ts`) — the exhaustive list of Cursor's **21 native hook
  events**, corroborated by an identical literal at offset 32945356: `beforeShellExecution`,
  `beforeMCPExecution`, `afterShellExecution`, `afterMCPExecution`, `beforeReadFile`,
  `afterFileEdit`, `beforeTabFileRead`, `afterTabFileEdit`, `stop`, `beforeSubmitPrompt`,
  `afterAgentResponse`, `afterAgentThought`, `sessionStart`, `sessionEnd`, `preCompact`,
  `subagentStart`, `subagentStop`, `preToolUse`, `postToolUse`, `postToolUseFailure`,
  `workspaceOpen`.
- **`_Ni`** (offset 19775968, `claude-code-types.ts`) — the complete Claude Code → Cursor event
  table, 10 keys and no more: the 8 `MAPPED` rows below, plus `PermissionRequest → null` and
  `Notification → null`.

**The trap this table exists to prevent.** The `.claude/settings.json` parser `nYg` (offset
19777846) drops any key that is in neither `_Ni` nor the warning list, with a bare *"Unknown Claude
Code event, skipping"*. Nothing fails, nothing warns at runtime — the hook simply never fires. An
event present in `Wu` but absent from `_Ni` (`subagentStart`, `postToolUseFailure`) is therefore
live in Cursor and dead through the compatibility path. Same failure mode as `Shell` vs `Bash`: it
does not protest, it goes quiet.

The 15 events below are those actually declared by `core-guards/hooks/hooks.json`, the largest hook
surface in the marketplace. A plugin that declares fewer covers fewer; a plugin that declares an
event absent from this table adds a row before porting.

| Claude Code event | Cursor event | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | `preToolUse` | `MAPPED` | `_Ni` @19775968. Carries `permission`. Matcher tests `tool_name` (R13). |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni`. Carries `additional_context`. Matcher tests `tool_name`; source-side effects such as the lessons throttle reset remain runtime-unverified with the unpinned harness. |
| `SessionStart` | `sessionStart` | `MAPPED` | `_Ni`. Carries `additional_context`. |
| `SessionEnd` | `sessionEnd` | `MAPPED` | `_Ni`. No output fields — observe-only. |
| `UserPromptSubmit` | `beforeSubmitPrompt` | `MAPPED` | `_Ni`. Matcher tests the constant `"UserPromptSubmit"`, not a tool name (R13). |
| `PreCompact` | `preCompact` | `MAPPED` | `_Ni`. Observational and unable to block or alter compaction; the documented optional output is `user_message`. |
| `Stop` | `stop` | `MAPPED` | `_Ni`. Carries `followup_message`. Matcher tests the constant `"Stop"`. |
| `SubagentStop` | `subagentStop` | `MAPPED` | `_Ni`. Carries `followup_message`. Matcher tests `subagent_type` (R14). |
| `SubagentStart` | `subagentStart` | `CURSOR-NATIVE ONLY` | In `Wu` @19775205, **absent from `_Ni`**. Declared in `.claude/settings.json` it is silently skipped by `nYg` @19777846. Native hooks file only. Matcher tests `subagent_type`. |
| `PostToolUseFailure` | `postToolUseFailure` | `CURSOR-NATIVE ONLY` | Same trap as `SubagentStart`, and the more deceptive of the two: the native event exists (`Wu.postToolUseFailure`, full protobuf schema at offsets 17473451 / 17474096) yet is **absent from `_Ni`**, so the compatibility path drops it without a word. Native hooks file only. Matcher tests `tool_name`. |
| `PermissionRequest` | — | `NOT PORTABLE` | `_Ni` maps it explicitly to `null`, and `iKu` @19776461 = `["Notification","PermissionRequest"]` is the warning list for events "not supported in Cursor and will be ignored". Binary proof, not a documentary absence. The guard intent must be re-expressed as a `permission` response field on `preToolUse` / `beforeShellExecution` / `beforeMCPExecution`. |
| `Notification` | — | `NOT PORTABLE` | Same two proofs (`_Ni → null`, `iKu` @19776461). Its three source matchers `permission_prompt`, `idle_prompt`, `elicitation_dialog` have **0 occurrences** in the binary — there is nothing to re-target. Pure loss: document it. |
| `TeammateIdle` | — | `NOT PORTABLE` | **0 occurrences** in the whole binary, all casings. |
| `TaskCompleted` | — | `NOT PORTABLE` | 15 occurrences, **all** of them inside the message `agent.v1.AgentHostBackgroundTaskCompleted` — an internal background-task lifecycle unrelated to hooks. A name match is not an event. |
| `InstructionsLoaded` | — | `NOT PORTABLE` | **0 occurrences** in the whole binary, all casings. What is lost is a **diagnostic signal, not an injection**: the only declarer is `core-guards`, whose handler logs *which* instruction files were loaded (source `_description`: "log loaded instruction files for APEX debugging"). No Cursor event reports that. `sessionStart` is not a substitute — it says a session started, never which files were read. Record the loss; do not re-target it. `claude-rules/hooks/hooks.json` still declares `SessionStart`, `SubagentStart` and `UserPromptSubmit`, and their Cursor mappings preserve reachability of all three triggers. That proves event reachability only; actual rules context delivery remains runtime-unverified pending corrected-harness and authentic Cursor replay evidence — see "Verification status" below. |

### R13 — tool matcher table

Status vocabulary as in R12, plus one value specific to this table: `TO CONFIRM IN THE BINARY` — the
matcher is described but its exact runtime value is not settled. **Blocking, unless the row states
otherwise and says why.**

**Clause, symmetrical to R12's:** every tool matcher appearing in the source `hooks.json` must have
an explicit status in the table shipped with the ported plugin. Silence is forbidden — a matcher
dropped without a row is indistinguishable from a matcher that was never noticed, and the failure is
silent at runtime: a guard whose matcher never fires raises nothing, it simply stops guarding. This
is the same failure mode as the `Shell` vs `Bash` bug already found harness-side.

#### Two traps, before the table

**1. The matcher is a regex, not a pipe-list.** The validator `PKu` (offset 19792700) compiles it
with `new RegExp(e.matcher)`; the runtime tester `cYg` (offset 19779820) evaluates
`new RegExp(e.matcher).test(t)`. Claude Code's `A|B|C` keeps working because it happens to be valid
alternation — by luck, not by design. The trap is the failure mode: `cYg` wraps the test in
`catch { return !0 }`, so **an invalid regex makes the hook match everything**. One stray `(`, `[`
or leading `*` turns a narrow guard into a global one, with no error anywhere. Compile every ported
matcher once before shipping it.

**2. What the matcher is tested against depends on the event.** R13 used to assume a single target
("the tool name") — that is wrong. `aYg` (offset 19779089), exhaustive:

| Cursor event | What the matcher is tested against |
| :-- | :-- |
| `beforeShellExecution`, `afterShellExecution` | **the shell command itself**, not a tool name |
| `beforeMCPExecution`, `afterMCPExecution` | the string `` `MCP:${tool_name}` `` |
| `preToolUse`, `postToolUse`, `postToolUseFailure` | the `tool_name` field |
| `beforeReadFile` | the constant `"Read"` |
| `afterFileEdit` | the constant `"Write"` |
| `beforeSubmitPrompt` | the constant `"UserPromptSubmit"` |
| `stop` | the constant `"Stop"` |
| `subagentStart`, `subagentStop` | `subagent_type` |
| `beforeTabFileRead` / `afterTabFileEdit` | `"TabRead"` / `"TabWrite"` |
| `afterAgentResponse` / `afterAgentThought` | `"AgentResponse"` / `"AgentThought"` |

A matcher is therefore only meaningful next to its event. `Shell` belongs on `preToolUse`, which
tests `tool_name`; on `beforeShellExecution` it matches nothing useful, because that event tests the
command line — there the guard must match the command itself (`^rm `, `git push --force`).

#### Tool name mapping

`tKu` (offset 19776314) is the complete substitution table Cursor's compatibility layer applies to a
Claude Code matcher — 9 keys, no more.

| Source matcher | Cursor matcher | Status | Evidence / consequence |
| :-- | :-- | :-- | :-- |
| `Bash` | `Shell` | `MAPPED` | `tKu` @19776314. |
| `Read` | `Read` | `MAPPED` | `tKu`. |
| `Write` | `Write` | `MAPPED` | `tKu`. |
| `Edit` | `Write` | `MAPPED` | `tKu`. Collapses with `Write`: two source matchers become one, so two distinct messages must be merged into one (R14 context). |
| `Grep` | `Grep` | `MAPPED` | `tKu`. |
| `Task` | `Task` | `MAPPED` | `tKu`. |
| `WebFetch` | `WebFetch` | `MAPPED` | `tKu` maps it to itself. **The public docs were wrong** — they omit it from the matcher list, and this table rated it `NOT PORTABLE` on that documentary absence. R19 in action. Matcher/event reachability is mapped, but cache-hit denial, verbosity injection, and input mutation remain incomplete for Cursor in the inspected harness. |
| `WebSearch` | `WebSearch` | `MAPPED` | `tKu` maps it to itself. Same correction as `WebFetch`. |
| `mcp__<server>__<tool>`, and regex forms (`mcp__.*exa`, `mcp__.*context7`) | `MCP:<tool>` | `MAPPED` | Settled on two independent sites: `aYg` @19779089 gives `` `MCP:${tool_name}` `` as the matcher target of the MCP events, and the compatibility matcher builder `JQg` @~19776502 **rewrites** `mcp__<server>__<tool>` into `` `MCP:${tool}` ``. Two consequences: the **server segment is lost** (`MCP:query-docs` then matches that tool on any server), and because the field is a regex, `MCP:.*` and `MCP:(a\|b)` are valid. **Never write `mcp__` as a Cursor matcher.** |
| `Glob` | — | `NOT PORTABLE` | `tKu` maps it explicitly to `null` — the only genuinely null entry of the nine. |
| `MultiEdit` | — | `NOT PORTABLE` | Absent from `tKu`. It does **not** fall back to `Write`: an unmapped name is simply never substituted. Remove and document. |
| `TaskCreate` | — | `NOT PORTABLE` | Absent from `tKu`. Confirms the pilot's decision; the harness's `syncTaskTracking` trigger stays lost. |
| `TaskUpdate` | — | `NOT PORTABLE` | Absent from `tKu`. |
| *(none — Claude Code has no `Delete` tool)* | `Delete` | `TO CONFIRM IN THE BINARY — non-blocking` | Absent from `tKu`, which is consistent: there is no source name to map onto it. `tool_name` is a free scalar with no enum, so the runtime value Cursor emits for a native deletion could not be observed. Circumstantial only: a UI discriminant separates `deleteToolCall` (label `"Delete"`) from `editToolCall` / `shellToolCall`, which makes `"Delete"` plausible without proving it. **Non-blocking for a like-for-like port** — no source hook targets a tool that does not exist in Claude Code. It matters only when someone *adds* a deletion guard: confirm the value first. |

Worked example, `core-guards`' `PreToolUse` matcher:

```
Write|Edit|Bash|WebFetch|mcp__context7__query-docs|mcp__exa__web_search_exa|mcp__exa__get_code_context_exa
→  Write|Shell|WebFetch|MCP:query-docs|MCP:web_search_exa|MCP:get_code_context_exa
```

`Write` and `Edit` merge, `Bash` becomes `Shell`, `WebFetch` survives, and the three MCP entries lose
their server segment. One routing question the offsets above do not settle: whether `preToolUse`'s
`tool_name` ever carries the `MCP:` form. `aYg` shows `MCP:<tool_name>` is the target of
`beforeMCPExecution` / `afterMCPExecution`, and `JQg` builds exactly that string on the
compatibility path — so route MCP-scoped guards to `beforeMCPExecution` unless a later check shows
`preToolUse` sees them too.

Non-tool matchers stay out of R13: `subagentStart` / `subagentStop` filter `subagent_type` (R14),
and the source's `Notification` matchers filter notification kinds — moot now that `Notification` is
`NOT PORTABLE` (R12).

### R20 — subtrees that are neither components nor manifest

R20 is evaluated **before** any other rule, on the whole source tree. No later rule resurrects a
path R20a excluded.

**R20a — build, cache and archive artefacts: never copied.** Excluded on sight, without inspection,
wherever they appear:

`node_modules/`, `dist/`, `build/`, `.harness/`, `.impeccable/`, `_archive/`, `.git/`, `.DS_Store`,
`*.bak`, `*.bkp`, `*.orig`, and every lockfile (`bun.lock`, `bun.lockb`, `package-lock.json`,
`pnpm-lock.yaml`, `yarn.lock`). The list is extended, never narrowed: anything that is a generated
output, a cache, or a dated snapshot of a file that still exists elsewhere in the tree is an
artefact too.

Real cases in the backlog: `core-guards/statusline/node_modules/` (108 MB),
`core-guards/statusline/dist/`, `core-guards/statusline/bun.lock`,
`core-guards/statusline/configure.ts.bak`, `core-guards/statusline/user-config.json.bkp`,
`claude-rules/.harness/cache/*.md`, `claude-rules/_archive/2026-07-03/`,
`claude-rules/_archive/2026-07-15/`, `ai-pilot/mcp.json.bak`, `.impeccable/hook.cache.json`, and
every `.DS_Store`.

An excluded artefact is **not** a documented loss: it carries no behaviour, so it does not belong in
the plugin README's "Not portable" section. Only R20b losses are documented.

**R20b — functional sub-project: never ported blind.** A subtree that is a real program with its own
`package.json` and sources (`core-guards/statusline/`) is neither an artefact nor a component. In
order:

1. Identify the Claude Code concept it plugs into (`statusline/` implements Claude Code's status line).
2. Check whether Cursor has a target concept for it, against the real schema (R19), not only the docs.
3. Target concept found → port to it, and document the mapping in the plugin README.
4. No target concept → **do not port the subtree and do not invent a substitute.** No hook, command
   or agent that "simulates" it. Record the loss in the plugin README under "Not portable", naming
   the source path, what the sub-project did, and the fact that no Cursor concept was found.
5. In case 4 the sub-project's *sources* are left out too, not just its artefacts: a program nothing
   can launch is dead weight, and R18c already bars shipping convincing-looking dead code. Its own
   `README.md` goes with it — R20c covers the documentation *of the plugin*, not the documentation
   of a subtree that is not ported. Anything worth keeping from it is quoted into the "Not portable"
   entry.

**R20c — source documentation is content, not an artefact.** `docs/`, annexe `README.md` files,
`CHANGELOG.md` and any other prose file of the source plugin are ported verbatim, at the same
relative path, and listed in the ported plugin's README. R20a's list is the only exclusion filter:
whatever is not an artefact and not a component is content, and content is ported. When in doubt,
port — that is R19's default applied to files instead of keys.

Precedent: `plugins/ai-pilot/docs/cache-formats.md` was missed on the first pilot pass and is now at
`fuse-ai-pilot/docs/cache-formats.md`, referenced from that plugin's README.

### R21 — distinguish native state from compatibility inputs

Paths are changed only when their owning runtime contract is known:

1. Native Cursor APEX instructions read and write `.cursor/apex/`.
2. Harness-owned project cache documentation uses `.harness/cache/`, the layout defined by the
   harness configuration source.
3. Cursor officially supports `.claude/skills/` and `.claude/agents/` as compatibility inputs;
   `.claude/settings.json` may also be consumed by Cursor's documented Claude compatibility layer.
   These paths are not harness state and must not be globally replaced.
4. Executable Claude marketplace paths and arbitrary `$CLAUDE_PLUGIN_ROOT` references are invalid
   unless Cursor documents that exact execution context. Replace them only with a verified
   standalone harness CLI verb; otherwise keep the feature non-executable and state the limitation.

This classification avoids both errors: retaining stale native state paths and destroying valid
third-party compatibility guidance with a global search-and-replace.

## Known divergences from the Claude Code marketplace

- The published `@fusengine/harness@0.1.90` tarball does not canonicalize native lower-camel Cursor
  lifecycle names to the internal dispatcher and still emits Claude-style lifecycle envelopes.
  The newer local source differs while carrying the same version. Therefore the 62 hook commands
  remain unpinned and unchanged; the required harness-only work is in
  `docs/harness-cursor-fix-prompt.md`.
- `metadata.description` now reads "Professional Cursor plugins…"; the capability list is unchanged
  word for word.
- The `core` array is gone; `core-guards` and `claude-rules` (as `fuse-rules`) are ordinary
  `plugins[]` entries and lose `required: true` — nothing will force-install them. Both were
  mandatory installs under Claude Code; under Cursor their presence is a convention the marketplace
  cannot enforce.
- Those two entries are the only ones whose `category` has no source. `core[]` carried no
  `version`, `author` or `category`, and neither manifest declares one; the values used —
  `security` for `core-guards` (its own `keywords` lead with it), `productivity` for `fuse-rules`
  (aligning it with `fuse-solid`, the other standards-enforcement plugin) — are editorial choices,
  not copies. `version` and `author` do come from each folder's `plugin.json`, as for the other 22.
- `fuse-rules` is the one entry without `keywords`: its `plugin.json` declares none, and inventing
  a set would put metadata in the marketplace that no manifest backs.
- `challenger` runs on `grok-4.6` instead of `opus`. The ID is verified in the Cursor binary
  (`modelId:"grok-4.6"`, `displayName:"Cursor Grok 4.6 Medium"`).
- Each `plugins[]` entry mirrors its folder's `.cursor-plugin/plugin.json` (name, version,
  description, keywords, author, homepage, repository, license), not the source marketplace entry —
  the two diverge for most plugins, and the ported manifest is the one Cursor merges with. The
  `category` value, which has no place in `plugin.json`, comes from the source marketplace and is
  kept (R19).
- `fuse-seo`'s marketplace `description` drops the words "for Claude Code" that its `plugin.json`
  still carries. The manifest prose itself is untouched: no rule authorises rewriting it (R17 covers
  frontmatter, R18b covers keys). `fuse-changelog`'s description keeps "Claude Code" on purpose —
  there it names the product the plugin watches, not the host editor.
- Same treatment for the two newcomers: `core-guards`' entry drops the trailing "for Claude Code"
  and `fuse-rules`' drops "Claude Code" from "for all Claude Code sessions". Words removed, nothing
  substituted, and both `plugin.json` files keep their original prose untouched.

## Verification status

The port rests on evidence, not on the documentation alone (R19). This section separates what is
settled from what is merely not yet observed — the second list is short, and none of its items block
a plugin.

### Established — against the Cursor binary, or the official docs

- **The 21 native hook events** (`Wu` @19775205, corroborated @32945356) and **the 10 Claude Code →
  Cursor compatibility mappings** (`_Ni` @19775968), plus the silent-drop behaviour of the
  `.claude/settings.json` parser `nYg` @19777846. The whole R12 table derives from these.
- **The matcher table and what each event tests the matcher against** (R13): the matcher is a regex,
  and its target varies by event — `tool_name` on `preToolUse`/`postToolUse`/`postToolUseFailure`,
  `subagent_type` on `subagentStart`/`subagentStop`, a fixed constant on `beforeSubmitPrompt` and
  `stop`.
- **The `MCP:<tool>` matcher syntax**: `aYg` shows it is the target form of `beforeMCPExecution` /
  `afterMCPExecution`, and `JQg` builds exactly that string on the compatibility path.
- **The binary `additional_context` whitelist** (`yNi` @19789643). This is schema evidence, not
  end-to-end proof: current public docs expose `additional_context` for `sessionStart` and
  `postToolUse`, but document only `continue` / `user_message` for `beforeSubmitPrompt` and
  `permission` / `user_message` for `subagentStart`. Any broader delivery remains binary-derived
  and runtime-unverified.
- **The `tools` field of `agent.v1.CustomSubagent`** (@16734859): field 4, repeated, read literally
  in the binary. The public docs list 5 of the message's 14 fields; the field's absence from them was
  a documentation gap, exactly the situation R19 exists for. Hence R4 keeps `tools:` verbatim.
- **`$ARGUMENTS` substitution**, on both paths: in commands via the binary (function `qxo`), and in
  `type: "prompt"` hooks via Cursor's own hooks documentation ("Prompt-Based Hooks": the
  `$ARGUMENTS` placeholder is auto-replaced with the hook input JSON, and when absent the hook input
  is appended anyway). The hooks case is in fact the only officially documented use of `$ARGUMENTS`.
  This proves the static substitution contract for the `Context: $ARGUMENTS` line closing
  `core-guards`' `Stop` prompt hook; actual hook execution and delivery remain runtime-unverified.
- **`grok-4.6`** as a valid model ID (`modelId:"grok-4.6"`, `displayName:"Cursor Grok 4.6 Medium"`),
  and the **absence of any `allowed-tools` mechanism** anywhere in the bundle.

**Native rules discovery and harness injection are separate paths.** `fuse-rules` intends to read
`rules/*.md` through its three hooks, but end-to-end injection is not proven: plugin-root discovery,
native response rendering, and the two lifecycle outputs not documented with `additional_context`
remain harness/runtime work. The 9 source-identical files therefore remain plain `.md` without an
invented activation mode; whether native frontmatter should be added is still an owner decision,
not a duplicate-injection conclusion.

### Not yet observed

Four points remain unobserved. Each is a bounded gap, not an unknown:

- **Enforcement of an agent's `tools:` as a hard restriction.** The field exists and is read (above);
  what has not been observed is the runtime *denying* a tool outside the list. R4's belt-and-braces —
  the frontmatter key plus an `## Allowed tools` block at the top of the body — covers either
  outcome.
- **Where `permission_mode` `READONLY` / `AGENT_ONLY` is applied to MCP tools.** The enforcement
  logic is server-side, outside the JS bundle, so the bundle cannot settle it.
- **The exact `tool_name` a native delete presents.** This is why `Delete` carries a non-blocking
  `TO CONFIRM` status in R13 rather than a mapping.
- **Lifecycle context delivery outside `sessionStart`.** The binary schema accepts more than the
  public event contracts expose, but `beforeSubmitPrompt` and `subagentStart` context injection has
  not been replayed with a corrected harness and authentic Cursor payloads.
