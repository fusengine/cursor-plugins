---
name: hooks
description: Pre/Post tool validation hooks for agents
when-to-use: Configuring automatic validation on tool usage
keywords: hooks, pretooluse, posttooluse, validation, scripts
priority: medium
related: frontmatter.md, architecture.md
---

# Agent Hooks (Claude Code Compatibility)

These nested `PreToolUse` / `PostToolUse` examples are retained for Claude Code compatibility
targets. They are not native Cursor hook configuration. Native Cursor plugins use a flat
`hooks/hooks.json` with lower-camel event names and relative commands such as
`./scripts/validate-solid.sh`.

## Overview

Hooks run scripts before or after tool execution to enforce rules.

---

## Hook Types

| Type | When | Purpose |
|------|------|---------|
| `PreToolUse` | Before tool runs | Validate, block if invalid |
| `PostToolUse` | After tool runs | Track, analyze, notify |

---

## Frontmatter Configuration

```yaml
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "bash __TARGET_PLUGIN_ROOT__/scripts/validate-solid.sh"
  PostToolUse:
    - matcher: "Read"
      hooks:
        - type: command
          command: "bash __TARGET_PLUGIN_ROOT__/scripts/track-reads.sh"
```

---

## Matcher Patterns

| Pattern | Matches |
|---------|---------|
| `Write` | Write tool only |
| `Write\|Edit` | Write OR Edit |
| `Read` | Read tool only |
| `Bash` | Bash tool only |

---

## Common Hooks

### SOLID Validation (PreToolUse)

```yaml
PreToolUse:
  - matcher: "Write|Edit"
    hooks:
      - type: command
        command: "bash __TARGET_PLUGIN_ROOT__/scripts/validate-solid.sh"
```

**Purpose**: Check file size, interface location before writing.

### Skill Tracking (PostToolUse)

```yaml
PostToolUse:
  - matcher: "Read"
    hooks:
      - type: command
        command: "bash __TARGET_PLUGIN_ROOT__/scripts/track-skill-read.sh"
```

**Purpose**: Track which skills are being consulted.

---

## Target Plugin Root Token

| Template token | Requirement |
|-------------|-----------|
| `__TARGET_PLUGIN_ROOT__` | Replace before use only with a root mechanism documented by the target runtime |

The token is deliberately non-executable. Current public Cursor hook documentation does not define
a plugin-root process environment variable. Native Cursor plugin hook examples use relative
`./scripts/...` commands in `hooks/hooks.json`.

---

## Script Requirements

| Requirement | Description |
|-------------|-------------|
| Executable | `chmod +x scripts/*.sh` |
| Exit codes | `0` = success; `2` = block; other non-zero values fail open unless the hook declares `failClosed: true` |
| Location | `plugins/<name>/scripts/` |

---

## Best Practices

| DO | DON'T |
|----|-------|
| Replace `__TARGET_PLUGIN_ROOT__` from target-specific documentation | Invent a plugin-root environment variable |
| Keep scripts fast | Long-running validations |
| Exit 0 on success | Swallow errors silently |
| Log issues clearly | Cryptic error messages |

→ See [templates/hook-scripts.md](templates/hook-scripts.md) for script examples
