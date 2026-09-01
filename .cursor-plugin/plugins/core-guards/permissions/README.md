# Permissions — Claude Code `permissions.allow` → Cursor `permissions.json`

## Read this before installing the file

`permissions.json` is a **security file**. A mistranslated entry does not fail loudly; it silently
**widens** what the agent may run without asking. Two rules governed this port, and they must
govern any edit to it:

1. **Nothing was ported that was not understood.** Every source pattern whose Cursor equivalent
   could not be established from a first-party source was left **out of the file** and recorded
   below. An absent entry costs one approval click; a wrong entry costs a silent auto-run.
2. **The result is strictly no more permissive than the source.** Where the scope of a wildcard was
   ambiguous, the restrictive reading was taken, and every such choice is listed under
   "Ambiguities resolved restrictively".

The file is **produced here, not deployed**. Copy it to `~/.cursor/permissions.json` (user scope) or
`<git-root>/.cursor/permissions.json` (project scope) yourself, after reading this page.

**Merge behaviour, before you copy it anywhere:** when a key is present, Cursor treats the file as
the source for that key and **replaces** the corresponding allowlist rather than appending to it.
Copying this file over an existing one discards whatever the previous file allowed. Diff first.

## Source

`claude-plugins/.claude/settings.local.json` → `permissions.allow`, 21 patterns.

`~/.claude/settings.json` declares **no `permissions` key at all**, so the global user settings
contributed nothing to this table. They are the source of the two definitive losses recorded at the
end (`env`, `statusLine`).

## Status vocabulary

The marketplace's existing tags (`MAPPED`, `NOT PORTABLE`, `CURSOR-NATIVE ONLY`, `UNKNOWN`) do not
cover the two cases a permission port produces, so two are added here and used nowhere else:

| Tag | Meaning |
| :-- | :-- |
| `MAPPED` | expressed in `permissions.json` without loss |
| `MOVED` | the permission family exists in Cursor but is backed by a **different file** |
| `WITHHELD` | understood, but expressible only by **widening** the grant — deliberately omitted |
| `NOT PORTABLE` | no Cursor mechanism of any kind |

## Target schema

```
{
  "mcpAllowlist":      string[],
  "terminalAllowlist": string[],
  "approvalMode":      "allowlist" | "unrestricted" | "manual",
  "autoReview":        { "allow_instructions": string[], "block_instructions": string[] }
}
```

Parsed by `v_f` @21519784 (`autoReview` is read as `e.autoReview ?? e.autoRun`), value-checked by
`f_f` @21519702. Resolved from `~/.cursor/permissions.json` and from the git root by
`_getDefaultPermissionsFilePath` @21524785 —
`joinPath(e, dataFolderName ?? ".cursor", "permissions.json")`. Every field is optional; an absent
field means "do not override", which is why this port omits `autoReview` rather than emitting an
empty object.

### Where the documentation and the shipped build disagree (R19)

Two divergences between `cursor.com/docs/reference/permissions` and the parser in the installed
build. In both cases the **build** was followed — it is what will read the file on this machine.

| Key | Docs say | Installed build does | Ported as |
| :-- | :-- | :-- | :-- |
| `approvalMode` | not a field of the IDE `permissions.json`; only of the CLI's `cli-config.json` | parsed and honoured — `f_f` @21519702 accepts `"allowlist" \| "unrestricted" \| "manual"`, and `shouldPermissionsFileConstrainUnrestrictedMode` @21534072 keys off it | **emitted**, `"allowlist"` |
| auto-review steering | the key is `autoRun` | accepts **both**: `e.autoReview ?? e.autoRun` (`v_f` @21519784) | **omitted** — no source material |

An unknown key is ignored by the parser, so emitting `approvalMode` is safe under either reading:
on a build that does not know it, the file behaves as if the key were absent.

## Translation table

| # | Source pattern | Destination | Status |
| :-- | :-- | :-- | :-- |
| 1 | `Bash(bun run *)` | `terminalAllowlist: "bun run"` | `MAPPED` |
| 2 | `Bash(bun test *)` | `terminalAllowlist: "bun test"` | `MAPPED` |
| 3 | `Bash(gh pr *)` | `terminalAllowlist: "gh pr"` | `MAPPED` |
| 4 | `mcp__context7__resolve-library-id` | `mcpAllowlist: "context7:resolve-library-id"` | `MAPPED` |
| 5 | `mcp__context7__query-docs` | `mcpAllowlist: "context7:query-docs"` | `MAPPED` |
| 6 | `mcp__exa__web_search_exa` | `mcpAllowlist: "exa:web_search_exa"` | `MAPPED` |
| 7 | `mcp__exa__get_code_context_exa` | `mcpAllowlist: "exa:get_code_context_exa"` | `MAPPED` |
| 8 | `Read(//tmp/**)` | `sandbox.json` → `additionalReadPaths` | `MOVED` |
| 9 | `Read(//Users/…/fuse-harnes/**)` | `sandbox.json` → `additionalReadPaths` | `MOVED` |
| 10 | `Skill(fuse-commit-pro:commit)` | — | `NOT PORTABLE` |
| 11 | `Bash(echo "===EXIT $?===")` | — | `WITHHELD` |
| 12 | `Bash(echo "checks-exit:$?")` | — | `WITHHELD` |
| 13 | `Bash(echo "exit:$?")` | — | `WITHHELD` |
| 14 | `Bash(node -e "const p=require('./package.json');…")` | — | `WITHHELD` |
| 15 | `Bash(node -e "console.log(…require('./package.json').scripts…)")` | — | `WITHHELD` |
| 16 | `Bash(node -e 'process.stdout.write(require('…').version)')` | — | `WITHHELD` |
| 17 | `Bash(node -e "process.stdout.write(require('/Users/…/@fusengine/harness/package.json').version)")` | — | `WITHHELD` |
| 18 | `Bash(node dist/cli/bin.mjs changelog)` | — | `WITHHELD` |
| 19 | `Bash(npx -y @fusengine/harness@0.1.35 changelog)` | — | `WITHHELD` |
| 20 | `Bash(curl -sS -o /tmp/cl.md -w "…" -L "https://code.claude.com/docs/en/changelog.md" --max-time 10)` | — | `WITHHELD` |
| 21 | `Bash(read f *)` | — | `WITHHELD` |

21 source patterns → 7 `MAPPED`, 2 `MOVED`, 1 `NOT PORTABLE`, 11 `WITHHELD`.

## Rows 11–20 — exact-command patterns, and the widening they would cause

`terminalAllowlist` matching is **prefix semantics, case-sensitive**, not glob: `git` matches
`git status` but not `gitk`. An entry is a command prefix, and everything starting with it is
auto-approved. The build corroborates: `ggd` @21490628 derives allowlist keys from a parsed command
as either the executable name, or the name plus its first argument for the server-declared
`compositeShellCommands` — token-granular prefixes, never globs.

That is exactly what `Bash(X *)` means in Claude Code, which is why rows 1–3 translate cleanly. It
is the opposite of what `Bash(X)` means: a parenthesised pattern **without** a trailing `*` is an
*exact* command, and Cursor has no exact-match form. Two ways out, both rejected:

- **Truncate to the executable** (`echo`, `node`, `curl`, `npx`). Catastrophic for rows 14–17 and 19:
  `node -e` auto-approved as a prefix is *arbitrary code execution with no prompt*, and `curl` as a
  prefix is *arbitrary network egress*. This is the single most dangerous mistake available in this
  translation, and it is the one a mechanical port makes.
- **Copy the literal string** and let prefix matching cover it. Still widening — the prefix admits
  any suffix the source's exact match forbade — and rows 14–17 additionally require un-escaping
  Claude Code's own pattern escaping (`require\\('./package.json'\\)`, `\\\\n`, the nested `'\\''`
  quoting). Reconstructing the intended shell string from that escaping is guesswork, and guessing
  the *content* of a security entry is worse than omitting it.

Rows 11–13 (`echo …`) are inert and their loss is cosmetic; they are grouped here only because the
same truncation objection applies and no exception was carved out for them.

**Lost behaviour:** each of these commands now raises an approval prompt on every run. Nothing that
was denied becomes allowed — a previously silent step becomes a click. For the changelog flow
(rows 18–20) that is one prompt per run.

**Row 21, `Bash(read f *)`,** mechanically fits the `X *` → `X` rule and would become `read f`. It
was still withheld: the intent could not be established — `read` is a shell builtin, `f` reads as a
loop variable, and the entry looks like a by-product of a shell one-liner rather than a deliberate
grant. Rule 1 above applies. **Lost behaviour:** none identified.

## Rows 8–9 — `Read(...)` is backed by `sandbox.json`, not by this file

`permissions.json` has no read-scoping field. In the installed build, `Read(...)` permission entries
are assembled from `sandbox.json` (@32154463, and the same block again @21573818):

```
getEffectiveTerminalAllowlist().map(e => `Shell(${e})`)
getEffectiveMcpAllowlist().map(e      => `Mcp(${e})`)
webFetchDomainAllowlist.map(e         => `WebFetch(${e})`)
(getSandboxJsonReadAllowlist() ?? agentReadAllowlist).map(e => `Read(${e})`)
```

`getSandboxJsonReadAllowlist` @21536358 returns `additionalReadPaths` (repo file first, then user
file); its sibling returns `readBoundary`. That one block is the proof these four permission
families are peers — `Read` simply has a different backing file, and it is why rows 8–9 are `MOVED`
rather than `NOT PORTABLE`.

Caveat for whoever writes that file: `cursor.com/docs/reference/sandbox` documents the fields as
`additionalReadwritePaths` / `additionalReadonlyPaths` / `type`, while the installed build's parser
(`m_f` @21519437) reads `readBoundary` / `additionalReadPaths`. The two namings are irreconcilable
from the outside. `sandbox.json` is **out of this port's scope** — it has no Claude Code counterpart
and is a Cursor addition, not something to port — so it is **not produced here** and no path from
rows 8–9 is written to disk. Row 9 additionally embeds a hard-coded home directory, which must be
rewritten relative to `~` before it goes anywhere.

`.cursorignore` is the deny-side complement in the IDE; it blocks paths and cannot express an allow.

**Lost behaviour until `sandbox.json` is written:** `/tmp/**` and the `fuse-harnes` tree are no
longer pre-approved for reading; reads there prompt, or are refused by the sandbox read boundary
when sandboxing is on.

## Row 10 — `Skill(...)` has no Cursor equivalent

The four permission families the build knows are `Shell`, `Mcp`, `WebFetch`, `Read` (@32154463).
There is no `Skill(...)` token in the IDE, and none in the CLI's separate permission system either.
Skills exist in Cursor; their invocation is not gated by an allowlist entry.

**Lost behaviour:** `Skill(fuse-commit-pro:commit)` was a *pre-approval* — it let the commit skill
run without a prompt. Under Cursor the skill still runs; what disappears is the pre-approval, so
whatever confirmation Cursor attaches to skill invocation now applies. Nothing becomes newly
permitted.

## `approvalMode` — why `"allowlist"`

| Value | Effect | Verdict |
| :-- | :-- | :-- |
| `"unrestricted"` | auto-approves everything, and makes `shouldPermissionsFileConstrainUnrestrictedMode` return `false` | **rejected** — strictly more permissive than the source, which is an explicit allowlist |
| `"manual"` | pins the run mode to `ask_every_time` | rejected — safe, but it discards the allowlist entirely and so does not reproduce Claude Code |
| `"allowlist"` | approve what is listed, prompt for the rest | **chosen** |

`"allowlist"` is also a hardening, not merely parity: with it set,
`shouldPermissionsFileConstrainUnrestrictedMode` @21534072 returns `true`, which prevents the UI's
"Run Everything" / full-auto modes from taking effect while this file is installed. The file cannot
be undone by a stray click in Settings.

## `mcpAllowlist` — the server segment is **kept**

**Verdict: kept.** Cursor's MCP allowlist is `server:tool`, not a bare tool name. The hook port's
finding that Cursor collapses MCP matchers to `MCP:<tool>` is a fact about the **hook matcher**
subsystem; it does not carry over — two different matchers, two different files.

Evidence, from the installed build:

- Separator and wildcard are literals: `kQe=":", CT="*"` @21490859; the name validator rejects both
  characters inside a server or tool name, so a segment is either a full name or exactly `*`.
- The entry builder joins both segments: `hgd(server, tool)` @21489222 →
  `` `${server}:${tool}` ``.
- The matcher compares **both** segments — `jbf` @21489915:
  ```
  i = parse(entry)                                  // "a:b" → {serverId:"a", toolName:"b"}
  if (i.serverId === "*") …                         // any server
  if (serverId.toLowerCase() !== i.serverId.toLowerCase()) return false   // ← server segment
  if (i.toolName === "*") return true               // any tool of that server
  return i.toolName.toLowerCase() === toolName.toLowerCase()
  ```
- An entry with no `:` is rejected outright — `Invalid MCP allowlist entry: …` @21489977.
- The settings UI states the format verbatim @37907206: *"Format: 'server:tool', 'server:\*' for all
  tools from a server, '\*:tool' for a tool from any server, or \*:\* for all tools from all
  servers"*, with the input's element name literally `server:tool`.
- `cursor.com/docs/reference/permissions` agrees: `server:tool`, `*` wildcards, case-insensitive.

So `mcp__<server>__<tool>` maps to `<server>:<tool>` with no information loss. The mapping assumes
the MCP server is registered in Cursor under the same name (`context7`, `exa`); if `mcp.json` names
a server differently the entry silently never matches — which fails **closed**, towards more
prompts, not fewer.

## Ambiguities resolved restrictively

1. **`Bash(X *)` → `X`, not `X *`.** `*` is not documented as a wildcard *inside* a
   `terminalAllowlist` entry; the only documented arg-glob form is the distinct `base:argsGlob`
   syntax (`npm:install*`). Emitting `bun run *` would be a literal string under prefix semantics
   and match nothing. `bun run` is correct under prefix semantics and, under any stricter
   exact-match reading, only *narrower* than the source. Safe in both readings.
2. **No inner globs in `mcpAllowlist`.** The docs claim glob support inside a segment
   (`my-server:list_*`), but `jbf` does an exact case-insensitive comparison and the name validator
   rejects `*` inside a name — only the whole-segment `*` works. Full tool names are emitted, valid
   under both readings.
3. **No `*:*`, no `server:*`, no bare-executable terminal entry.** Every entry names its target
   explicitly; no catch-all was introduced to "cover" a pattern that could not be translated.
4. **`autoReview` omitted rather than emitted empty.** The source has nothing to put there, and an
   empty array is an override that would replace whatever the user already had.

## Definitive losses outside this file

- **`env` — no extension mechanism.** `_buildHookEnvironment` @32974355 sets a fixed set
  (`CURSOR_PROJECT_DIR`, `CURSOR_VERSION`, `CLAUDE_PROJECT_DIR`, plus `CURSOR_CODE_REMOTE`,
  `CURSOR_USER_EMAIL`, `CURSOR_TRANSCRIPT_PATH` when applicable) and reads **no** user
  configuration. The four variables in `~/.claude/settings.json`
  (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, `CLAUDE_CODE_FORK_SUBAGENT`,
  `CLAUDE_CODE_ATTRIBUTION_HEADER`, `_FUSENGINE_PERF_ASKED`) cannot reach a Cursor hook. There is
  nothing to port and nothing to work around; a hook needing one must read it from its own
  environment or from a file.
- **`statusLine` — the IDE has none.** It exists on the Cursor **CLI**
  (`~/.cursor/cli-config.json`), a separate product whose binary is not installed on this machine.
  See the parent README, "Not portable → statusline (R20b)".

## Verification performed

- `python3 -m json.tool` parses `permissions.json`.
- `mcpAllowlist` and `terminalAllowlist` are arrays of strings; `approvalMode` is one of the three
  literals accepted by `f_f`.
- No absolute path and no hard-coded user name anywhere in the file.
- Sources unmodified: `~/.claude/settings.json` and `claude-plugins/.claude/settings.local.json`
  mtimes identical before and after.

Offsets cite `Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`.
