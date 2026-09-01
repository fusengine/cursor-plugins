# Harness Cursor Completion Prompt

Use this prompt in the `@fusengine/harness` source repository. Do not execute it from the Cursor plugin marketplace repository.

## Owner corrections (verbatim)

- "tu regarde comment fonctionne le harness pour adapté"
- "on est d'accord il ne touche pas au harness si il veulent faire des correction il me donne le prompt"
- "on a notre harness corriger sur l'ordinateur tu peux regarder mais pas toucher"
- "les mécaniques sont dans les hooks"

## Objective

Complete and package-prove the native Cursor adapter without changing the Cursor plugin marketplace. Start from the owner's corrected local harness and do not redo completed local P0 work unless a regression test proves it broken.

The local source and ignored local `dist` expose matching correction symbols, but this is not clean-build or package evidence. The version remains `0.1.90`, and no local tarball has been proven. Do not describe local corrections as published or safe to pin.

The current marketplace keeps all 62 `npx -y @fusengine/harness hook cursor [scope]` commands unpinned. Do not change those commands from this task. A future pin is allowed only after a corrected package has been built, packed, and verified independently.

## Hook/harness boundary

The hook manifests are trigger and configuration surfaces: they declare the event, matcher,
command, timeout, and any direct prompt hook. The mechanics executed by the 62 command entries live
in the harness: stdin normalization, gates, state, native response rendering, and blocking exit
status `2`. Preserve this boundary and do not claim runtime execution until authentic Cursor replay
proves it.

## Repository boundary

Work only in the harness source repository.

Read-only inputs:

- the Cursor plugin marketplace and its hook manifests;
- installed Cursor configuration and plugin caches;
- the published npm tarball for `0.1.90`;
- official Cursor documentation and captured authentic hook payloads.

Never edit the marketplace, installed plugins, user configuration, package caches, or secrets. Never run marketplace setup or installation scripts.

## Implemented in local source

The owner-verified local source, with matching symbols in the ignored local `dist`, already contains:

- Shell/Bash command candidates;
- Write/Edit path and content candidates;
- MCP string, root, and nested candidates;
- `beforeReadFile` input normalization;
- `afterFileEdit` fan-out and neutral `{}` output;
- seven-event `harness init` wiring.

Treat these as regressions to preserve, not as unimplemented P0 tasks. Add or retain focused source tests for each behavior. Repair one only if its test fails, and document why the owner-verified baseline did not hold. Matching ignored-dist symbols do not replace clean dist or package proof.

## Remaining implementation

Implement and test the behavior that is still open:

1. Canonicalize documented lower-camel lifecycle names for the internal dispatcher.
2. Render native, event-specific Cursor responses rather than a generic Claude envelope.
3. Preserve project `cwd` and `workspace_roots`, including multi-root selection.
4. Resolve plugin and rules roots from verified Cursor inputs with explicit precedence and diagnostics.
5. Define per-event policy for malformed JSON, empty stdin, and oversized stdin.
6. Add sanitized authentic Cursor lifecycle fixtures.
7. Implement **beforeReadFile native allow/deny permission enforcement**. The runtime currently allows it unconditionally. Keep normalization as a regression, then add native allow/deny rendering and `failClosed` tests for allow, deny, crash, timeout, and invalid output.

Unknown events must have an explicit neutral policy and must never enter another lifecycle branch accidentally.

## Required analysis

1. Read the project cartography, adapter entrypoints, CLI dispatcher, normalization layer, response renderer, lifecycle dispatcher, configuration layout, package build configuration, and their tests.
2. Inventory every Cursor event used by the marketplace and every Cursor event supported by the adapter.
3. Compare three artifacts separately:
   - current TypeScript source;
   - locally built `dist`;
   - the exact files extracted from `npm pack @fusengine/harness@0.1.90`.
4. Document every source/dist/tarball difference. Do not treat identical version strings as identical behavior.
5. Cross-check current official Cursor hook, plugin, subagent, and MCP documentation. Label any behavior inferred from tests or binary inspection rather than official documentation.

## Authentic Cursor fixtures

Add sanitized fixtures captured from real Cursor executions for every lifecycle shape used by the marketplace, including at least:

- `sessionStart` and `sessionEnd`;
- `beforeSubmitPrompt` and `preCompact`;
- `subagentStart` and `subagentStop`;
- `preToolUse`, `postToolUse`, and `postToolUseFailure`;
- `beforeShellExecution` and `afterShellExecution`;
- `beforeMCPExecution` and `afterMCPExecution`;
- `beforeReadFile` and `afterFileEdit`;
- `stop` and `workspaceOpen`.

Fixtures must preserve real field names and nesting while removing project paths, prompts, credentials, and personal data. Do not synthesize payloads from Claude schemas.

Cover multi-root workspaces, root-level and nested commands, stringified tool input where Cursor emits it, edit arrays, missing optional fields, malformed JSON, empty stdin, and oversized stdin.

## Canonicalization requirements

Create one explicit Cursor event-name canonicalization table. Normalize lower-camel Cursor names to the internal lifecycle identifiers actually consumed by the dispatcher. Do not route by Claude event aliases unless Cursor's documented compatibility layer produced that alias.

For every event, prove:

- pre/post phase;
- canonical lifecycle name;
- tool name and matcher subject;
- command candidates;
- file path, edit content, and old content;
- session and subagent identity;
- project cwd and workspace roots.

Unknown events must have a documented neutral behavior. They must not accidentally enter a different lifecycle branch.

## Native response requirements

Render a native response per Cursor event contract. Do not reuse a generic Claude envelope.

Prove separately:

- permission events return only Cursor-supported permission fields and exact casing;
- context-injection events return Cursor-supported context fields;
- observation-only post events return the documented neutral response;
- `stop` and other lifecycle events use their own documented response shapes;
- malformed or oversized input follows an explicit, tested fail-open or fail-closed policy appropriate to that event.

No response may claim support based only on TypeScript types. Assert the serialized stdout bytes in tests.

## Plugin root and cwd discovery

Do not assume `CLAUDE_PLUGIN_ROOT`, `CURSOR_PLUGIN_ROOT`, or `process.cwd()` is the plugin root.

Implement explicit discovery from verified Cursor inputs and the hook execution environment. Define precedence and diagnostics for:

1. an authenticated plugin-root value provided by Cursor;
2. a validated hook-command location or package location;
3. marketplace metadata supplied by the runtime;
4. a safe failure when no plugin root can be proven.

Use the payload's project `cwd` for project state and project detection. Preserve `workspace_roots` for multi-root selection. Never silently replace payload cwd with the harness process cwd.

Test plugin-root discovery for local plugins, marketplace plugins, symlinks, npm execution, spaces in paths, missing environment variables, and a process launched outside the project root.

## State layout

Use the existing stores according to their actual responsibilities:

- Session tracks live under `~/.fuse-harness/state/<project-hash>/` as `track-*.json`.
- `.harness/track/solid-notice.json` remains an existing project sidecar reader/writer; it is not the session tracking root. Preserve it until a separate migration is implemented and proven against every reader and writer.
- `.harness/cache` remains the harness-neutral project cache.
- `.harness/memory` remains harness-owned project memory where existing readers require it.

Do not introduce `.claude/apex` or `.claude/cache` as native Cursor state. Cursor APEX artifacts are `.cursor/apex`. Treat `.claude/settings.json`, `.claude/skills`, and `.claude/agents` only as documented compatibility inputs, not harness-owned state.

## TDD and build proof

Use RED-GREEN-REFACTOR for each contract:

1. Add a failing fixture test that exposes the current defect.
2. Run it and record the expected failure reason.
3. Apply the smallest source correction.
4. Run unit, adapter, lifecycle, integration, and simulation tests.
5. Build `dist` from a clean output directory.
6. Run the same fixtures against source and built `dist`.
7. Create a local npm tarball with `npm pack` or the repository's pack command.
8. Install that tarball only into an isolated temporary test directory.
9. Run the same fixtures through the packed CLI and assert stdout, stderr, and exit status.
10. Compare the packed file list with `package.json#files` and prove the corrected adapter and CLI code are included.

Include regression tests for the `0.1.90` tarball defects so a source-only fix cannot pass. Require **source + clean dist + local packed-tarball parity**; an ignored-dist symbol match is insufficient.

Require **version >0.1.90 before publishing or pinning**. Select the minimum valid next version only after packed parity is proven. This task must not publish or pin it.

## Verification report

Report:

- exact changed harness files;
- RED and GREEN commands with results;
- fixture provenance and sanitization method;
- lifecycle canonicalization table;
- native response table;
- plugin-root and cwd precedence;
- source versus dist versus packed-tarball evidence;
- remaining undocumented Cursor behavior;
- the minimum corrected version that could safely be published later.

## Forbidden actions

Do not commit, push, create or switch a branch, open or merge a pull request, tag, publish, release, install into real Cursor state, alter marketplace hook commands, or modify user configuration. Stop after producing verified source changes and an isolated local tarball report.
