---
name: decision-guide
applies-to: "**/*.php"
description: Decision tables for pattern selection
when-to-use: Choosing between Service, Action, Repository patterns
keywords: patterns, service, action, repository, dto, decision-tree
priority: high
related: solid-principles.md, anti-patterns.md
---

# Decision Guide

## Pattern Selection

| I Need To... | Use | Location |
|--------------|-----|----------|
| Handle HTTP request | Controller | `Http/Controllers/` |
| Validate input | FormRequest | `Http/Requests/` |
| Transform API response | Resource | `Http/Resources/` |
| Execute single action | Action | `Actions/` |
| Orchestrate business logic | Service | `Services/` |
| Access database | Repository | `Repositories/` |
| Transfer data between layers | DTO | `DTOs/` |
| Define contract | Interface | `Contracts/` |
| React to domain event | Listener | `Listeners/` |
| Authorize action | Policy | `Policies/` |

---

## Principle Selection

| Symptom | Principle | Action |
|---------|-----------|--------|
| Class has multiple reasons to change | **S**RP | Split into focused classes |
| Adding feature requires modifying code | **O**CP | Extract interface, add impl |
| Subclass breaks parent behavior | **L**SP | Redesign inheritance |
| Class implements unused methods | **I**SP | Segregate interfaces |
| High-level depends on low-level | **D**IP | Inject interface |

---

## Layer Responsibilities

```
Request Flow:
┌─────────────┐
│  Controller │ ← HTTP concerns only
└──────┬──────┘
       │
┌──────▼──────┐
│  FormRequest│ ← Validation only
└──────┬──────┘
       │
┌──────▼──────┐
│   Service   │ ← Business logic
└──────┬──────┘
       │
┌──────▼──────┐
│ Repository  │ ← Data access
└──────┬──────┘
       │
┌──────▼──────┐
│    Model    │ ← Relations + Casts
└─────────────┘
```

---

## Service vs Action vs Repository

| Question | Service | Action | Repository |
|----------|---------|--------|------------|
| Multiple operations? | ✅ | ❌ | ❌ |
| Single focused task? | ❌ | ✅ | ❌ |
| Database queries? | ❌ | ❌ | ✅ |
| Business rules? | ✅ | ✅ | ❌ |
| Reusable across controllers? | ✅ | ✅ | ✅ |

---

## Interface Location

| Architecture | Interface Location |
|--------------|-------------------|
| Standard Laravel | `app/Contracts/` |
| FuseCore Modular | `app/Modules/[Feature]/Contracts/` |
| DDD | `app/Domain/[Context]/Contracts/` |

---

## When to Split a File

| Indicator | Threshold | Action |
|-----------|-----------|--------|
| Source size | Approaches `FUSE_SOLID_MAX_LINES` (default 200) | Split by responsibility |
| Public API | Mixes responsibilities | Extract cohesive collaborators |
| Dependencies | Span unrelated concerns | Split responsibilities |
| Nested conditions | Obscure the decision flow | Extract named methods or policies |

---

## Split Strategy

```
UserService.php (90+ lines)
        ↓
Split into:
├── UserService.php (orchestration)
├── UserValidator.php (validation helpers)
├── UserDTO.php (data structures)
└── UserHelper.php (utilities)
```

---

## Decision Tree: New Feature

```
New feature request?
│
├── Affects HTTP layer?
│   ├── Yes → Controller + FormRequest
│   └── No ↓
│
├── Single focused operation?
│   ├── Yes → Action class
│   └── No ↓
│
├── Complex business logic?
│   ├── Yes → Service class
│   └── No ↓
│
├── Database operation?
│   ├── Yes → Repository method
│   └── No → Utility/Helper
```

---

## Best Practices

| DO | DON'T |
|----|-------|
| Start with Action, grow to Service | Start with Service always |
| One interface per domain concept | One generic interface |
| Split by responsibility before `FUSE_SOLID_MAX_LINES` | Wait until code breaks |
| Use Repository for queries | Query in Controllers/Services |
