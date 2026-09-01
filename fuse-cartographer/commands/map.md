---
name: map
description: "Refresh and display the ecosystem map of all installed plugins, agents, skills, commands, and hooks."
argument-hint: "[--enrich]"
---

# /map — Ecosystem Map

Refresh the cartography and optionally enrich descriptions.

## Usage

```
/map          — Display current ecosystem map
/map --enrich — Enrich descriptions from source frontmatter
```

## Steps

1. **Ask the user** whether to enrich the project map, a plugin map available from current runtime context or verified discovery, or both.
2. **Read** the relevant map(s):
   - Project: `.cartographer/project/index.md`
   - Plugins: use the current plugin cartography path when actually supplied; otherwise locate an existing active `.cartographer/index.md` through verifiable current plugin-root metadata, without inferring a versioned installation path.
   - If a requested path was not injected and does not exist, report it as unavailable. Never infer an installation path.
3. **Display** the map with plugin count, agents, skills summary
4. If `--enrich` or user confirms: launch the cartographer agent to replace truncated descriptions with full frontmatter descriptions on the selected scope(s)

## Output

Source behavior refreshed maps at SessionStart through Python scripts. The Cursor port intends to preserve that lifecycle, but automatic regeneration and path delivery remain runtime-unverified; this command displays an existing map and optionally enriches it.
