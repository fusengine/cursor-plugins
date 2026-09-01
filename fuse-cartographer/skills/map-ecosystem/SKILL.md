---
name: map-ecosystem
description: "Use when cartography index descriptions are truncated, a new plugin/skill was just added, or after the map has actually been regenerated."
context: fork
user-invocable: true
---

<objective>
Enriches the auto-generated `.cartographer/` index.md files with complete descriptions extracted from source file frontmatter — restores the full skill/agent `description` text that auto-generation truncates at 60 characters. Read-only against everything outside `.cartographer/*.md`: it never modifies source files, never deletes or restructures the tree, and never assumes a description — it always reads the actual frontmatter first.
</objective>

# Map Ecosystem — Enrich Descriptions

Enrich the auto-generated `.cartographer/` index.md files with complete descriptions extracted from source file frontmatter.

## When to Use

- After the cartography structure has actually been generated; Cursor SessionStart generation remains runtime-unverified.
- When descriptions appear truncated in index.md files
- When a new plugin/skill was added and needs full descriptions

## When NOT to Use

- Code generation or debugging
- Direct file editing outside .cartographer/

## Steps

1. **Read** the ecosystem index from a current runtime-provided plugin cartography path when present. Otherwise locate an existing active `.cartographer/index.md` through verifiable current plugin-root metadata; never infer or hardcode a versioned installation path, and report it as unavailable if none can be verified.
2. **For each plugin** listed, read its `.cartographer/index.md`
3. **For each linked file** (agents/*.md, skills/*/SKILL.md):
   - Read the source file
   - Extract the full `description` from YAML frontmatter
   - Replace the truncated description in the index.md line
4. **Write** the updated index.md with complete descriptions

## Example

Before (auto-generated, truncated at 60 chars):
```
├── [laravel-eloquent](./skills/laravel-eloquent/index.md) — Complete Eloquent ORM - models, relatio
```

After (enriched by agent):
```
├── [laravel-eloquent](./skills/laravel-eloquent/index.md) — Complete Eloquent ORM - models, relationships, queries, casts, observers, factories. Use when working with database models.
```

## Forbidden

- Do not modify source files (only .cartographer/*.md)
- Do not delete or restructure the tree
- Do not assume — always read actual frontmatter
