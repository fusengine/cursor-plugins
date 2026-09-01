---
name: registration
description: How Cursor discovers plugin skills and when compatibility registration applies
when-to-use: After creating a skill, to make it available in the intended runtime
keywords: discovery, registration, cursor, compatibility, skills
priority: high
related: architecture.md
---

# Skill Discovery and Compatibility Registration

## Native Cursor Plugins

Cursor automatically discovers each `skills/<skill-name>/SKILL.md` directory inside a plugin when
the plugin manifest does not declare an explicit `skills` path. No agent-frontmatter entry or
marketplace-level skill list is required for that default discovery path.

If the plugin uses a non-default layout, declare a relative `skills` path in
`.cursor-plugin/plugin.json`. An explicit path replaces default `skills/` folder discovery, so it
must cover every intended skill.

### Native Rules

| Rule | Reason |
|------|--------|
| `SKILL.md` lives under `skills/<name>/` | Cursor's default plugin discovery scans that structure |
| Folder name matches `name:` | Preserves stable skill identity |
| Manifest paths stay relative | Cursor plugin paths must be portable |
| Do not add agent or marketplace registration by reflex | Those are not required by native folder discovery |

---

## Claude Compatibility Targets

Agent-frontmatter skill lists and `.claude-plugin/marketplace.json` belong to the preserved Claude
compatibility distribution. Update them only when that compatibility artifact is explicitly in
scope, following its own source schema. Do not copy those registration steps into a native Cursor
plugin.

---

## Verification

After registration, verify:

| Check | Command |
|-------|---------|
| Native path resolves | Confirm `skills/<name>/SKILL.md` exists under the plugin root |
| Explicit path resolves | If present, resolve `.cursor-plugin/plugin.json` `skills` paths |
| Skill loads | Invoke the skill in Cursor after reloading the plugin |
| References load | Check skill has access to refs |
| No errors | Check console for issues |

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Skill not found | Folder is outside native discovery or explicit manifest paths | Move it under `skills/` or correct the plugin manifest path |
| Skill not triggered | Description or scope does not match the request | Review skill metadata and invocation guidance |
| Wrong references | Mismatched name | Ensure exact match |

---

## Example Native Discovery

For a new `tanstack-query` skill in `fuse-react`, use the default plugin layout:

```text
fuse-react/
├── .cursor-plugin/
│   └── plugin.json
└── skills/
    └── tanstack-query/
        └── SKILL.md
```

The plugin manifest needs no `skills` field for this default layout. Use an explicit field only
when the source tree intentionally differs.

---

## Checklist

- [ ] Skill is under the native `skills/` discovery root or an explicit manifest path
- [ ] Name matches folder exactly
- [ ] Compatibility registration was added only if the Claude target is explicitly in scope
- [ ] Tested skill loads correctly
