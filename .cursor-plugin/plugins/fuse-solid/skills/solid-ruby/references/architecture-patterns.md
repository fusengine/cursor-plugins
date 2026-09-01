---
name: architecture-patterns
applies-to: "**/*.rb"
description: Modular Rails - app/modules/[feature]/ MANDATORY structure
when-to-use: Project setup, file organization, layer responsibilities
keywords: architecture, modular, app/modules, layers
priority: critical
related: single-responsibility.md, dependency-inversion.md
---

# Architecture Patterns

## MANDATORY Structure

```
app/modules/[feature]/
├── controllers/      # HTTP orchestration
├── services/         # Business logic
├── queries/          # Query objects
├── repositories/     # Data access
├── models/           # Domain data
├── contracts/        # Contracts
└── concerns/         # Shared behavior

app/modules/core/
├── contracts/       # Shared interfaces
├── services/        # Logic genuinely shared across features
├── concerns/        # Shared mixins
└── models/
```

**NEVER use flat `app/` structure**

---

## Layer Responsibilities

| Layer | Responsibility | Max |
|-------|---|---|
| Controller | HTTP, authorize, delegate | 50 |
| Service | Business logic | 100 |
| Query | Data retrieval | 100 |
| Repository | Persistence | 100 |
| Model | Associations, validations, scopes | 50 |
| Contract | Duck type interface | 30 |

---

## Layer Flow

```
Controller (50)
    ↓ delegates to
Service (100)
    ↓ uses
Repository/Query (100) ← only layer touching DB
    ↓
Database
```

NO direct Controller→DB. NO business logic in Models.

---

## Feature Module Example

```
app/modules/users/
├── controllers/users_controller.rb
├── services/
│   ├── create_user_service.rb
│   └── reset_password_service.rb
├── queries/active_users_query.rb
├── repositories/user_repository.rb
├── models/user.rb
├── contracts/user_creator_contract.rb
└── concerns/user_timestamps_concern.rb
```

---

## DRY: Shared Code Location

- **Feature contracts** → `[feature]/contracts/`
- **Shared contracts** → `core/contracts/` (genuinely shared across features)
- **Shared services** → `core/services/` (genuinely shared across features)
- **Shared concerns** → `core/concerns/` (mixins)

---

## Import Rules

Within feature:
```ruby
require_relative '../services/create_user_service'
```

Cross-feature:
```ruby
require_relative '../../core/contracts/repository_contract'
```

---

## Source-Size Rule

- Use `FUSE_SOLID_MAX_LINES` (default 200) as the only source-size ceiling.
- Split controllers and models by responsibility when cohesion drops.

Enforce: `find app/modules -name "*.rb" -exec wc -l {} \; | awk -v max="${FUSE_SOLID_MAX_LINES:-200}" '$1 > max'`
