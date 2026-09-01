---
name: laravel12-structure
applies-to: "**/*.php"
description: Laravel 13 standard directory structure with SOLID principles
when-to-use: Standard Laravel projects without FuseCore modules
keywords: laravel, structure, directory, app, contracts, services
priority: high
related: fusecore-structure.md, solid-principles.md
---

# Laravel 13 Structure

## Directory Layout

```
app/
├── Http/
│   ├── Controllers/      # HTTP orchestration
│   ├── Requests/         # Form validation
│   └── Resources/        # API transformations
├── Models/               # Relations and casts
├── Services/             # Business logic
├── Contracts/            # Interfaces ONLY
├── Repositories/         # Data access
├── Actions/              # Single-purpose operations
├── DTOs/                 # Data transfer objects
├── Enums/                # PHP 8.1+ enums
├── Events/               # Domain events
├── Listeners/            # Event handlers
└── Policies/             # Authorization
```

---

## Responsibility Matrix

| Directory | Responsibility | Depends On |
|-----------|----------------|------------|
| Controllers | HTTP handling | Services |
| Requests | Validation | - |
| Resources | API transform | Models |
| Services | Business logic | Repositories |
| Repositories | Data access | Models |
| Actions | Single operation | Services/Repos |
| Models | Relations/Casts | - |
| DTOs | Data structure | - |
| Contracts | Interfaces | - |

---

## Code Placement Flowchart

```
Where does this code belong?
│
├── Handles HTTP? ──────────────→ Controllers/
├── Validates input? ───────────→ Requests/
├── Transforms for API? ────────→ Resources/
├── Single focused task? ───────→ Actions/
├── Complex business rules? ────→ Services/
├── Database queries? ──────────→ Repositories/
├── Data structure? ────────────→ DTOs/
├── Contract definition? ───────→ Contracts/
├── Reacts to event? ───────────→ Listeners/
└── Authorizes action? ─────────→ Policies/
```

---

## Layer Communication

```
Controller → Service → Repository → Model
     ↓           ↓           ↓
  Request      DTO       Eloquent
```

**Rules:**
- Controllers ONLY call Services
- Services ONLY call Repositories
- Repositories ONLY use Models
- No layer skipping

---

## Interface Locations

| Type | Location |
|------|----------|
| Repository contracts | `app/Contracts/Repositories/` |
| Service contracts | `app/Contracts/Services/` |
| External services | `app/Contracts/External/` |

---

## Source-Size Rule

Source files must not exceed `FUSE_SOLID_MAX_LINES` (default 200). Split by
responsibility using the extraction strategies described above.

---

## Best Practices

| DO | DON'T |
|----|-------|
| Keep Controllers thin | Put logic in Controllers |
| Use DTOs for data | Pass arrays |
| Define interfaces in Contracts | Mix interfaces with impl |
| One Model per table | Business logic in Models |
| Repository for queries | Query in Services |
