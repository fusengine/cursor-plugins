---
description: APEX workflow auto-trigger — when to use the full APEX methodology vs skip it
alwaysApply: true
---

## APEX Auto-Trigger

**FULL APEX MANDATORY** — 6 phases: Analyze → Plan → Execute → **eLicit** (auto-review) → **Verify** (functional check) → **eXamine** (sniper). Gate: **eLicit + Verify BEFORE sniper — NEVER skip**. The `challenger` runs at every eLicit and Verify gate (00-critical-rules #6).
Task = create/build/feature/refactor/debug/multi-file → **consult APEX skills first**: `fuse-ai-pilot:apex` / `fuse-ai-pilot:apex-methodology` (+ `apex-quick` for trivial). The full methodology lives there, not inline here.

**USE APEX:** create, implement, add, build, refactor, migrate, new component, multi-file, architecture changes
**SKIP APEX:** questions, trivial fix (1-3 lines), read-only, simple git — the edit is still made by one delegated agent, never by the lead
**Debug/Investigation:** "why", "not working", "bug", "crash", "doesn't load" → ALWAYS use Analyze (explore-codebase + research-expert + domain-expert) — always go through Analyze, never straight to a fix

**Shortcuts:** `/apex-quick` command (single-expert fast path — skips Brainstorm+Analyze+team split, linter-only verify) | `--skip-elicit` (skip eLicit, straight to eXamine) — eXamine/sniper itself is NEVER skippable (00-critical-rules)

## Full APEX Flow

```
Brainstorm → Analyze → Plan → Execute (TDD) → eLicit → Verify → eXamine
```

| Phase | Skill | When |
|-------|-------|------|
| **Brainstorm** | `brainstorming` | New features, major changes. Skip for trivial fixes, bug fixes with clear repro |
| **Analyze** | explore-codebase + research-expert | Always (parallel agents) |
| **Plan** | Written mandate per task — one agent per task (the task, the files it owns, expected output, criteria) | Always. Split by task; two tasks that must edit the same file are merged into one task or sequenced; file size is governed by the hook's `FUSE_SOLID_MAX_LINES`, never by a self-set cap |
| **Execute** | Domain expert + `tdd` | Write test FIRST (RED), then code (GREEN), then refactor |
| **eLicit** | Elicitation techniques | Expert self-review |
| **Verify** | `verification` | Run the actual build/tests — a Verify without execution is a guess |
| **eXamine** | sniper | Code quality validation (ZERO errors) |

## sniper 7 Phases (aligned with `ai-pilot/agents/sniper.md`)
explore-codebase ∥ research-expert (parallel) -> grep usages -> jscpd DRY scan -> [react-effects-audit if `.tsx`/`.jsx`] -> run linters -> apply fixes -> re-run ALL checks = **ZERO errors**

## eLicit Modes
- `--auto`: Auto-detect code type -> select elicitation techniques
- `--manual`: Expert proposes 5 techniques, user chooses
