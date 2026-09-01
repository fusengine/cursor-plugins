# Next.js Expert Skills

Documentation and conventions for nextjs-expert plugin skills.

## Skill Structure

### Structure Patterns

| Pattern | Use when | Structure |
|---------|----------|-----------|
| **Standalone** | One focused workflow can remain clear in one file | Everything in SKILL.md |
| **Light Hub** | Supporting patterns, examples, or API details deserve separate references | SKILL.md + references/ |
| **Full Hub** | The subject has multiple independently navigable domains | SKILL.md index + topic tree |

All files use `FUSE_SOLID_MAX_LINES` (default `200`) as the single file-size ceiling. Choose a structure from semantic cohesion and navigation needs, not a separate line-count taxonomy.

### Standard Structure (Light Hub)

```
skill-name/
├── SKILL.md                    # Index + Quick Start
└── references/
    ├── patterns.md             # Code patterns
    ├── examples.md             # Advanced examples
    └── api.md                  # API reference (optional)
```

### Full Hub Structure

```
skill-name/
├── SKILL.md                    # Index only
├── getting-started/
├── concepts/
├── api-reference/
└── examples/
```

---

## Available Skills

### Standalone Skills
- `nextjs-stack` - Stack orchestrator

### Light Hub Skills
- `nextjs-shadcn` - shadcn/ui components
- `nextjs-zustand` - State management
- `nextjs-tanstack-form` - Forms with Server Actions
- `nextjs-i18n` - Internationalization
- `solid-nextjs` - SOLID architecture

### Full Hub Skills
- `better-auth` - Authentication (145 files)
- `nextjs-16` - Next.js documentation (376 files)
- `prisma-7` - Prisma ORM (415 files)

---

## Naming Convention

### Skill names
- Lowercase only
- `kebab-case` format
- Max 64 characters
- Examples: `nextjs-shadcn`, `better-auth`, `prisma-7`

### Files
- `SKILL.md` - Main file (UPPERCASE)
- `references/` - References folder (lowercase)
- Markdown files in `kebab-case.md`

---

## SKILL.md Frontmatter

```yaml
---
name: skill-name
description: Clear description for auto-invocation
version: 1.0.0
user-invocable: false
references:
  - path: references/patterns.md
    title: Code Patterns
  - path: references/examples.md
    title: Advanced Examples
---
```

### Required fields
- `name` - Unique identifier
- `description` - Description for Claude

### Recommended fields
- `version` - Semantic versioning
- `user-invocable` - `false` for knowledge-only
- `references` - List of reference files

---

## Best Practices

### SKILL.md
1. **Focused scope** - Keep one coherent workflow in the entry file
2. **Quick Start first** - Installation, basic config
3. **Essential examples** - One complete example
4. **Links to references/** - For details

### References
1. **patterns.md** - Reusable code patterns
2. **examples.md** - Advanced examples and use cases
3. **api.md** - Complete API reference (if needed)

### Large documentation
1. **Split by theme** - One file per concept
2. **Canonical ceiling** - Respect `FUSE_SOLID_MAX_LINES` (default `200`)
3. **Clear index** - Easy navigation in SKILL.md

---

## Creation Workflow

1. Identify the skill structure from semantic cohesion and navigation needs
2. Create appropriate folder structure
3. Write SKILL.md with complete frontmatter
4. Extract patterns to `references/` when they form a distinct reusable topic
5. Add references in frontmatter
