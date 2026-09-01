---
name: frontmatter
description: Agent YAML frontmatter configuration
when-to-use: Configuring agent metadata, tools, skills, hooks
keywords: frontmatter, yaml, config, tools, skills, hooks, model
priority: high
related: hooks.md, architecture.md
---

# Agent Frontmatter

This file documents the preserved Claude Code compatibility frontmatter used by `agent-creator`.
It is not the native Cursor agent schema; native Cursor hook automation belongs in a flat
`hooks/hooks.json` file.

## Overview

The YAML frontmatter defines agent behavior, capabilities, and validation hooks.

---

## Complete Example

```yaml
---
name: nextjs-expert
description: Expert Next.js 16 with App Router, Prisma 7, Better Auth. Use when building Next.js apps.
model: grok-4.6
color: cyan
tools: Read, Edit, Write, Bash, Grep, Glob, Task, mcp__context7__*, mcp__shadcn__*, mcp__gemini-design__*
skills: solid-nextjs, nextjs-16, prisma-7, better-auth, nextjs-shadcn
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "bash __TARGET_PLUGIN_ROOT__/scripts/validate-nextjs-solid.sh"
---
```

`__TARGET_PLUGIN_ROOT__` is a non-executable template token. Replace it only when the compatibility
target documents a root mechanism. Do not assume a same-named process environment variable.

---

## Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (kebab-case) |
| `description` | Yes | One-line for agent detection |
| `model` | Yes | `grok-4.6`, or `grok-4.6[effort=high]` for a control organ |
| `color` | No | Terminal color |
| `tools` | Yes | Comma-separated tool list |
| `skills` | Yes | Accessible skills |
| `hooks` | No | Pre/Post validation |

---

## Model Selection

| Value | When to Use |
|-------|-------------|
| `grok-4.6` | Every agent. `medium` is its default effort, so the value is written bare — `[effort=medium]` would be redundant. |
| `grok-4.6[effort=high]` | Control organs only (`challenger`, `sniper`). They exist to contradict the lead and find what it missed; a controller less capable than the designer validates by default. |

The reasoning is done upstream, in the brief: the lead is the architect (high effort — it designs
and decomposes), sub-agents are executants running at the default effort from an already-detailed
mandate. Paying for that reasoning twice makes no sense. On the Cursor **Start** plan the effort is
not configurable and `[effort=high]` is silently ignored — no crash, and no escalation either.

---

## Tools Configuration

### Core Tools

```yaml
tools: Read, Edit, Write, Bash, Grep, Glob, Task
```

### With MCP Servers

```yaml
tools: Read, Edit, Write, Bash, Grep, Glob, Task, mcp__context7__*, mcp__shadcn__*, mcp__gemini-design__*
```

| MCP Tool | Purpose |
|----------|---------|
| `mcp__context7__*` | Documentation lookup |
| `mcp__shadcn__*` | UI component registry |
| `mcp__gemini-design__*` | AI frontend generation |
| `mcp__exa__*` | Web search |

---

## Skills Reference

```yaml
skills: solid-nextjs, nextjs-16, prisma-7, better-auth
```

**Always include:**
- `solid-[stack]` - SOLID rules for the stack
- Main framework skill
- Related technology skills

---

## Description Best Practices

| Good | Bad |
|------|-----|
| "Expert Next.js 16 with App Router. Use when building Next.js apps." | "Next.js developer" |
| "Expert Laravel 12 with Eloquent, Livewire. Use when building Laravel apps." | "PHP expert" |

**Pattern**: "Expert [tech] with [features]. Use when [trigger]."

→ See [templates/agent-template.md](templates/agent-template.md) for complete example
