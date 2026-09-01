# fuse-seo (Cursor Plugin)

SEO/GEO 2026 — local-first, framework-aware, zero third-party APIs. Covers technical SEO, schema
markup, E-E-A-T, AI Overviews optimization, local SEO, sitemaps, hreflang, internal linking, content
briefs, semantic clustering, and search experience optimization.

Ported from the Claude Code plugin `fuse-seo` v1.0.9 (source folder `plugins/seo`). The plugin name
is deliberately identical across both ecosystems so cross-plugin references (`fuse-seo:<skill>`)
keep resolving.

This is the only multi-agent plugin in its porting batch: **9 subagents**, each evaluated separately
under R4/R5/R6.

## Contents

| Component | Count | Cursor discovery |
| :-- | :-- | :-- |
| Agents (subagents) | 9 | `agents/*.md` |
| Skills | 21 | `skills/<name>/SKILL.md` |
| Hooks | 1 event | `hooks/hooks.json` |
| Scripts | 14 files | `scripts/*.ts` — content, not a Cursor component |
| Templates | 26 files | `templates/**` — content, not a Cursor component |
| `package.json` | 1 | dependency manifest for `scripts/` |

No `commands/` and no `docs/` folder: the source plugin has neither. An empty component folder
would be a divergence, not a precaution (R4–R6 / R8–R10 preamble).

## Agents

| Agent | Scope |
| :-- | :-- |
| `seo-expert` | Top-level: page content, keyword research, meta tags, structured data, Google Ads, AI search visibility |
| `seo-technical` | robots.txt, sitemap.xml, Core Web Vitals, mobile-first indexing, crawlability, redirect chains |
| `seo-content` | E-E-A-T scoring, cannibalization, keyword distribution, AI-content disclosure |
| `seo-schema` | Detect, validate and generate structured data (9 schema.org types) |
| `seo-geo` | LLM-readiness scoring for AI Overviews, ChatGPT, Perplexity, Claude, Gemini, Copilot |
| `seo-local` | Google Business Profile, NAP consistency, citations, reviews, Local Pack |
| `seo-sitemap` | sitemap.xml / news / image / video and robots.txt analysis and generation |
| `seo-images` | Alt text, filenames, formats, lazy loading, responsive sizing, ImageObject schema |
| `seo-cluster` | Keyword clusters from SERP overlap for pillar/cluster content architecture |

## Skills

21 skills: `seo` (top-level orchestrator) plus `seo-audit`, `seo-cluster`, `seo-content`,
`seo-content-brief`, `seo-ecommerce`, `seo-entity`, `seo-featured-snippets`, `seo-geo`,
`seo-hreflang`, `seo-images`, `seo-internal-linking`, `seo-local`, `seo-page`, `seo-plan`,
`seo-redirects`, `seo-schema`, `seo-sitemap`, `seo-sxo`, `seo-technical`, `seo-video`.

The `seo` skill is structured differently from every other skill in the marketplace: instead of a
`references/` folder it carries ten numbered topic folders (`01-seo-foundations/` …
`10-local-seo/`, 44 markdown files) named in its `references:` frontmatter key. They were copied
verbatim — R9 makes nested folders native, and the folder names are content, not a convention this
port may rewrite.

## Local scripts

`scripts/` holds 14 TypeScript files (939 lines) run with `bun`, plus `package.json` declaring their
dependencies (`cheerio`, `fast-xml-parser`, `lighthouse`, `chrome-launcher`). Four agents and eight
skills invoke them **by relative path** — `scripts/parse-meta.ts`, `scripts/validate-schema.ts`,
`scripts/check-cwv.ts`, `scripts/parse-sitemap.ts`, `scripts/parse-robots.ts`,
`scripts/parse-hreflang.ts`, `scripts/geo-score.ts`, `scripts/analyze-keywords.ts`,
`scripts/diff-seo.ts`.

They are a functional sub-project, so R20b applies: identify what they plug into, then port only if
a Cursor target concept exists. They plug into **nothing Claude-Code-specific** — they are plain Bun
CLI programs the agents launch through their shell tool, and Cursor's agents have the same shell
tool. The target concept exists and is identical, so they are ported at the same relative path. No
substitute was invented and no wrapper was added.

Two consequences worth knowing:

- **`bun.lock` was not copied** (R20a excludes every lockfile, without exception). Dependency
  versions therefore resolve at install time against the `^` ranges in `package.json` instead of
  being pinned. This is R20a applied literally; if pinning matters for `lighthouse` in particular,
  that is a decision for the rules, not for this port.
- **The scripts contain no absolute path, no `$HOME`, and no `.claude/` reference** — verified by
  grep. Nothing in them needed rewriting.

`templates/` (26 files: 11 JSON-LD templates, 7 meta HTML templates, 4 robots.txt variants, 4
sitemap XML variants) is neither artefact nor component, so it is content and is ported verbatim
(R20c). `seo-schema`, `seo-sitemap`, `seo-ecommerce` and `seo-local` reference it by relative path.

## Configuration

No `variables` are declared; the plugin needs no secrets — it is local-first with zero third-party
SEO APIs. Hooks shell out to `npx -y @fusengine/harness`, so Node's `npx` must be on `PATH`.
Running the `scripts/` requires `bun` and an install of `package.json`'s dependencies.

## Port notes (read before editing)

### Agents

All 9 were evaluated individually. None of the four transformations below has an exception in this
plugin.

- **`tools:` is kept in the frontmatter, unchanged** on all 9 (R4), with the `## Allowed tools` block
  emitted **in addition** at the top of each body. `tools` is a first-class repeated field of the
  internal `agent.v1.CustomSubagent` protobuf, but nothing proves the local `.md` frontmatter parser
  populates it or enforces it at runtime; keeping both covers either outcome.
- **`model: sonnet` → `model: grok-4.6` on all 9** — the uniform-model doctrine: every ported agent
  runs on `grok-4.6`, whose default effort is `medium`, written bare (`[effort=medium]` would be
  redundant). None of the 9 is an organ of control (that role belongs to `challenger` and `sniper`
  in `fuse-ai-pilot`), so none carries `[effort=high]`. `claude-opus-*` is barred by policy and
  absent.
- **`readonly` is set on none of the 9** (R6) — including the ones that are auditors by nature.
  This is the rule's second condition doing its work, and it is worth spelling out because the
  opposite is the intuitive expectation:

  | Agent | Has `Write`/`Edit` | Has `mcp__*` | `readonly` | Why |
  | :-- | :-- | :-- | :-- | :-- |
  | `seo-expert` | yes | yes | no | fails condition 1 |
  | `seo-schema` | yes | yes | no | fails condition 1 |
  | `seo-sitemap` | yes | yes | no | fails condition 1 |
  | `seo-technical` | **no** | yes | no | read-only by nature, but fails condition 2 |
  | `seo-content` | **no** | yes | no | read-only by nature, but fails condition 2 |
  | `seo-geo` | **no** | yes | no | read-only by nature, but fails condition 2 |
  | `seo-local` | **no** | yes | no | read-only by nature, but fails condition 2 |
  | `seo-images` | **no** | yes | no | read-only by nature, but fails condition 2 |
  | `seo-cluster` | **no** | yes | no | read-only by nature, but fails condition 2 |

  Six of the nine cannot write a file and would look like obvious `readonly: true` candidates. Each
  one carries `mcp__fuse-browser__*` and/or `mcp__exa__*` tools, and R6's MCP clause is not caution
  for its own sake: the `readonly` × MCP interaction is undocumented, and an agent that silently
  lost MCP access would stop behaving like its Claude Code counterpart — `seo-technical` without
  `browser_crawl` and `browser_metrics` cannot audit Core Web Vitals at all. Fidelity wins over the
  tighter permission.

- **`color:` and `skills:` are kept as-is** (R7/R19) on all 9. Every agent's `skills:` list ends with
  the plugin-qualified `fuse-ai-pilot:fuse-browser-usage`; Cursor identifies skills by bare folder
  name, so whether the qualified form resolves is unverified.

### Skills

All 21 satisfy Cursor's hard rule that `name:` equals the parent folder name (R9). Nested folders —
`references/` in other plugins, the ten numbered topic folders in `seo/` here — are natively
supported and were copied verbatim. `diff -rq` between the source `skills/` and this one is empty.

Frontmatter keys preserved verbatim, absent from Cursor's documented skill schema and **not
verified against the binary**, so their status is unknown rather than unsupported (R7/R19):
`user-invocable` (21), `related-skills` (21), `references` (1), `argument-hint` (1). Unlike the six
language plugins in this batch, no `seo` skill carries `version` or `versions`.

`user-invocable` was **not** translated to `disable-model-invocation` (R8). They are near-opposites:
Cursor's `disable-model-invocation: true` means "only reachable via `/skill-name`", whereas Claude
Code's `user-invocable: false` means "the user cannot type `/skill`, but the model may still
auto-invoke". Mapping one onto the other would invert the intent of all 21.

No skill carries an embedded `hooks:` block, so the pilot's `apex-methodology` problem does not
arise here.

### Hooks

Rewritten from Claude Code's nested shape to Cursor's flat shape (R11). This plugin's hook surface
is the smallest in the batch: a single event, and it is **not** the same one the six language
plugins use — `fuse-seo` has no `PreToolUse` guard at all.

**R12 — every event this plugin declares (1 of 1):**

| Claude Code event | Cursor event | Status | Evidence |
| :-- | :-- | :-- | :-- |
| `PostToolUse` | `postToolUse` | `MAPPED` | `_Ni` @19775968. Carries `additional_context`. Matcher tests `tool_name`. |

**R13 — every tool matcher this plugin declares (3 of 3):**

| Source matcher | Cursor matcher | Status | Consequence |
| :-- | :-- | :-- | :-- |
| `Write` | `Write` | `MAPPED` | `tKu` @19776314. Unchanged. |
| `Edit` | `Write` | `MAPPED` | `tKu`. Collapses into `Write` — two source names become one entry. |
| `MultiEdit` | — | `NOT PORTABLE` | **Absent from `tKu`.** It does *not* fall back to `Write`: an unmapped name is simply never substituted. Removed. |

Net: `Write|Edit|MultiEdit` → `Write`. The matcher was compiled with `re.compile()` before shipping
— R13's first trap is that the field is a regex and an *invalid* one makes the hook match
**everything**, silently (`cYg` @19779820 wraps the test in `catch { return true }`).

The dropped `MultiEdit` is the plugin's one behavioural loss; see "Not portable" below.

The source `_description` keys were removed (R16). They are not schema fields and JSON has no
comments; their content is reproduced in this file instead. This plugin's source `hooks.json`
carried no `_version` key, so the typing trap that affects the six language plugins does not apply —
the `"version": 1` here is the Cursor schema constant, written from scratch.

### Command path — and the dropped `|| true`

Source: `bun $HOME/.claude/plugins/marketplaces/fusengine-plugins/plugins/node_modules/@fusengine/harness/dist/cli/bin.mjs hook claude-code seo || true`

Target: `npx -y @fusengine/harness hook cursor seo`

Two things forced the base change (R15). The submission checklist requires that all manifest paths
be relative and valid — `$HOME/...` is absolute — and the path points into a Claude Code install
tree that does not exist for a Cursor user. `npx` removes the path dependency entirely. The scope
argument `seo` is preserved exactly.

**The trailing `|| true` was removed, and this is a deliberate behavioural divergence.** In Claude
Code the hook command runs through a shell, so `|| true` swallowed a non-zero exit and guaranteed
the hook never failed the tool call. Cursor's documentation describes hooks as *spawned processes*,
and every documented `command` example is a bare executable plus arguments with no shell
metacharacters; the one real-world case found had to wrap itself in `/bin/bash -c '… || true'`
explicitly to make `||` work. If Cursor argv-splits, emitting `… hook cursor seo || true` would pass
`||` and `true` to the harness as literal arguments — actively worse than dropping them. Writing
`/bin/bash -c '…'` instead would be inventing a form R15 does not define.

So R15 is applied literally and the suffix is dropped. The consequence: if the harness exits
non-zero, Cursor sees a failing `postToolUse` hook where Claude Code saw a successful one. **This is
an R15 gap, not a settled decision** — R15 gives a command template but says nothing about shell
suffixes present in a source command. It is flagged here so it is resolved once, in the rules,
rather than guessed at per plugin.

### Manifest

`.claude-plugin/plugin.json` → `.cursor-plugin/plugin.json` (R2). Purged per R18b: `author.url` and
`strict: true` — `fuse-seo` is the only plugin in this batch that carried `strict`. `category:
"development"` was **kept**: it is undocumented in Cursor's plugin.json field table, but R19's
default is keep, and the already-shipped `.cursor-plugin/marketplace.json` entry for the pilot
carries the same key.

**One flagged divergence.** The `description` value still reads *"SEO/GEO 2026 plugin for Claude
Code…"*. No rule authorises rewriting manifest prose — R17 keeps source values and flags them, and
R18b only lists keys to purge — so it was left verbatim. It will read oddly to a Cursor user, and it
is the kind of one-line fix that belongs in a rule (or in the source), not in an unrecorded
port-time edit.

## Runtime paths

This plugin references no `.claude/…` runtime state path in the body of any skill or agent (0
occurrences across 21 skills and 9 agents). There is nothing for the harness to resolve, so R21's
clause is deliberately not reproduced here: on a plugin with zero occurrences it would assert
something false.

The source tree did contain one `.claude/` path — `seo/.claude/apex/docs/task-1-generic.md`. That is
harness-generated APEX task state that leaked into the repository, i.e. a generated output, so it was
excluded under R20a and carries no behaviour.

## Not portable

- **`MultiEdit` as a hook matcher.** Absent from `tKu`, the complete 9-key substitution table, and
  it does not fall back to `Write`. The source `PostToolUse` hook fired after a `MultiEdit`; the
  ported hook does not. Every multi-edit in Cursor that does not also go through `Write` therefore
  escapes the harness's post-write recording. Nothing warns — an unmapped matcher never fires and
  never protests.
- **The `|| true` failure-swallow** on the hook command, for the reason detailed above.
- The source declares no `Glob`, `TaskCreate` or `TaskUpdate` matcher, and no `Notification` /
  `PermissionRequest` / `TeammateIdle` / `TaskCompleted` / `InstructionsLoaded` event — the other
  constructs that are `NOT PORTABLE` under R12/R13. `WebFetch` and `WebSearch` appear in agent
  `tools:` lists, not in hook matchers, and both are `MAPPED` anyway.

Excluded as artefacts under R20a, carrying no behaviour and therefore not losses: `.DS_Store`,
`bun.lock`, `node_modules/` (a full third-party dependency tree of some 16,000 files), and
`.claude/apex/docs/task-1-generic.md`.

The source plugin had **no `README.md`** — this file is new rather than a replacement, so unlike the
other six plugins in this batch nothing had to be folded in from a prior document.

## Install locally

Clone the repository and point Cursor at this plugin directory, or install the whole repository as a
marketplace via its root `.cursor-plugin/marketplace.json`.
