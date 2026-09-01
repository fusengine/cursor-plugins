# fuse-php (Cursor Plugin)

Expert **modern, framework-agnostic PHP** development — libraries, standalone Symfony components,
Slim / API-first applications, and CLI tools. Targets PHP 8.5 (8.4 still supported), with PER Coding
Style 3.0, PHPStan static analysis, PSR interoperability, and SOLID principles.

Ported from the Claude Code plugin `fuse-php` v1.0.4 (source folder `plugins/php-expert`). The
plugin name is deliberately identical across both ecosystems so cross-plugin references
(`fuse-php:<skill>`) keep resolving.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 1 | `agents/*.md` |
| Skills | 6 | `skills/<name>/SKILL.md` |
| Hooks | 2 events | `hooks/hooks.json` |

No `commands/` and no `docs/` folder: the source plugin has neither. An empty component folder
would be a divergence, not a precaution (R4–R6 / R8–R10 preamble).

## Skills

| Skill | Description |
| :-- | :-- |
| `php-language-modern` | PHP 8.5 / 8.4 language features — property hooks, asymmetric visibility, lazy objects, enums, pipe operator, `#[\NoDiscard]`, attributes |
| `php-standards` | Coding standards — PER Coding Style 3.0, PSR-1/PSR-4/PSR-12, naming, autoloading |
| `php-quality-tooling` | Quality tooling — PHPStan levels, php-cs-fixer / PHP_CodeSniffer, Rector, CI |
| `php-testing` | Testing — PHPUnit (attributes-only) or Pest, data providers, mocking, coverage |
| `php-http-psr` | HTTP and PSR interop — PSR-7/PSR-15/PSR-17/PSR-18, Slim, standalone Symfony HTTP |
| `php-ecosystem-reference` | Ecosystem — Composer, common libraries, framework boundaries, conventions |

SOLID principles come from the shared **`fuse-laravel:solid-php`** skill (`FUSE_SOLID_MAX_LINES`, default 200, as the source-size ceiling;
interfaces separated, PHPDoc mandatory) — no local duplicate. That plugin is not yet ported; until
it is, the reference does not resolve under Cursor.

## Target project layout

```
src/
├── Contract/            # interfaces (one per contract)
├── ...                  # PSR-4 namespaced source
composer.json            # PSR-4 autoload, PHP version constraint, dev tooling
phpstan.neon             # static analysis level
.php-cs-fixer.php        # PER Coding Style 3.0 ruleset
tests/                   # PHPUnit or Pest suite
```

## Activation

The agent activates for **non-Laravel PHP** projects — a `composer.json` is present but there is
**no** `artisan` file: libraries published to Packagist, standalone Symfony components, Slim and
other micro / API-first applications, and CLI tools.

**Boundary with Laravel:** a project with both `composer.json` **and** `artisan` is a Laravel
application — use `fuse-laravel` instead. `php-expert` deliberately does not cover Laravel-specific
abstractions (Eloquent, Blade, Artisan commands, service container conventions).

## Configuration

No `variables` are declared; the plugin needs no secrets. Hooks shell out to
`npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`.

## Port notes (read before editing)

### Agent

`php-expert` is the plugin's only subagent.

- **`tools:` is kept in the frontmatter, unchanged** (R4). The 5-field table in Cursor's docs is
  incomplete: `tools` is a first-class repeated field of the internal `agent.v1.CustomSubagent`
  protobuf. The `## Allowed tools` block at the top of the body is emitted **in addition**, not
  instead — nothing proves the local `.md` frontmatter parser populates the field or enforces it at
  runtime, so both cover either outcome.
- **`model: sonnet` → `model: grok-4.6`** — the uniform-model doctrine: every ported agent runs on
  `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]` would be redundant).
  This agent is an executant, not an organ of control, so it takes no `[effort=high]`.
  `claude-opus-*` remains barred by policy.
- **`readonly` is not set** (R6). The rule requires the source `tools:` to contain neither `Write`
  nor `Edit` **and** no `mcp__*` tool. `php-expert` declares `Write` and `Edit`, so it fails the
  first condition outright.
- **`color:` and `skills:` are kept as-is** (R7/R19). `skills:` uses Claude Code's
  plugin-qualified form for the cross-plugin entry (`fuse-ai-pilot:fuse-browser-usage`); Cursor
  identifies skills by bare folder name, so whether the qualified form resolves is unverified.

### Skills

All 6 satisfy Cursor's hard rule that `name:` equals the parent folder name (R9). `references/` and
nested `references/templates/` folders are natively supported and were copied verbatim —
`diff -rq` between the source `skills/` and this one is empty.

Frontmatter keys preserved verbatim, absent from Cursor's documented skill schema and **not
verified against the binary**, so their status is unknown rather than unsupported (R7/R19):
`references` (6), `related-skills` (6), `versions` (6), `user-invocable` (6).

`user-invocable` was **not** translated to `disable-model-invocation` (R8). They are near-opposites:
Cursor's `disable-model-invocation: true` means "only reachable via `/skill-name`", whereas Claude
Code's `user-invocable: false` means "the user cannot type `/skill`, but the model may still
auto-invoke". Mapping one onto the other would invert the intent.

No skill carries an embedded `hooks:` block, so the pilot's `apex-methodology` problem does not
arise here.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11).

**R12 — every event this plugin declares (2 of 2):**

| Claude Code event | Cursor event | Status | Evidence |
| :-- | :-- | :-- | :-- |
| `PreToolUse` | `preToolUse` | `MAPPED` | `_Ni` @19775968. Matcher tests `tool_name`. |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni` @19775968. Matcher tests `tool_name`. |

**R13 — every tool matcher this plugin declares:**

| Source matcher | Event | Cursor matcher | Status | Consequence |
| :-- | :-- | :-- | :-- | :-- |
| `Write` | `PreToolUse` | `Write` | `MAPPED` | `tKu` @19776314. Unchanged. |
| `Edit` | `PreToolUse` | `Write` | `MAPPED` | `tKu`. Collapses into `Write`; the two source names become one entry. |
| `""` | `PostToolUse` | *omitted* | `R14` | Not a tool matcher — `""` meant match-everything; omitting the field is the Cursor-correct way to say that. |

Net: `preToolUse` matcher `Write|Edit` → `Write`; `postToolUse` matcher omitted. Both matchers were
compiled with `re.compile()` before shipping — R13's first trap is that the field is a regex and an
*invalid* one makes the hook match **everything**, silently (`cYg` @19779820 wraps the test in
`catch { return true }`).

The source `_description` and `_version` keys were removed (R16). They are not schema fields and
JSON has no comments; their content is reproduced in this file instead. Note the typing trap: the
source `_version` was the string `"2.0.0"`, a plugin-internal schema label. The `"version": 1` in
`hooks/hooks.json` is an **unrelated Cursor schema constant** (a number) written here from scratch —
a naive de-underscoring would have produced `"version": "2.0.0"`, a wrong-typed value in a real
field.

### Command path

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code`

Target: `npx -y @fusengine/harness hook cursor`

Two things forced the change (R15). The submission checklist requires that all manifest paths be
relative and valid — `$HOME/...` is absolute — and the path points into a Claude Code install tree
that does not exist for a Cursor user. `npx` removes the path dependency entirely. The source hook
declares **no scope argument**, and that absence is preserved exactly: nothing is appended after
`cursor`.

### Manifest

`.claude-plugin/plugin.json` → `.cursor-plugin/plugin.json` (R2). `author.url` was purged (R18b);
`strict` was absent. Every other key — including `keywords` — is unchanged.

## Runtime paths

This plugin references no `.claude/…` runtime state path in the body of any skill or agent (0
occurrences across 6 skills and 1 agent). There is nothing for the harness to resolve, so R21's
clause is deliberately not reproduced here: on a plugin with zero occurrences it would assert
something false.

## Not portable

Nothing is lost in this plugin.

- Both source hook events map cleanly (R12), and both tool matchers map cleanly (R13) once `Edit`
  collapses into `Write`.
- The source declares no `Glob`, `MultiEdit`, `TaskCreate` or `TaskUpdate` matcher, and no
  `Notification` / `PermissionRequest` / `TeammateIdle` / `TaskCompleted` / `InstructionsLoaded`
  event — the constructs that are `NOT PORTABLE` under R12/R13.
- The source `README.md` was **replaced** by this file rather than ported alongside it (R20c would
  otherwise put two different documents at the same path). Its non-redundant content — the skill
  table, the target project layout, the Laravel boundary — is folded into the sections above.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as a
marketplace via its root `.cursor-plugin/marketplace.json`.
