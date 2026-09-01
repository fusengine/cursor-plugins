---
name: solid-go
description: "Use when writing or refactoring Go code, structuring internal/modules/[feature]/ layers, or defining ports/interfaces (SOLID, FUSE_SOLID_MAX_LINES source-size ceiling)."
versions:
  go: "1.23"
user-invocable: true
references: references/solid-principles.md, references/single-responsibility.md, references/open-closed.md, references/liskov-substitution.md, references/interface-segregation.md, references/dependency-inversion.md, references/architecture-patterns.md, references/templates/module.md, references/templates/service.md, references/templates/interface.md, references/templates/handler.md, references/templates/error.md, references/templates/test.md
related-skills: solid-detection
---

<objective>
SOLID Go enforces a modular architecture for Go 1.23+: every feature lives under `internal/modules/[feature]/` (handlers, services, repositories, ports, models) with shared code in `internal/core/`, interfaces (ports) live only in `ports/` directories and stay role-focused, functions accept interfaces but return structs, and every exported function carries a godoc comment.

Before writing any new code it requires a DRY check against `internal/core/services` and `internal/core/ports`. See `solid-principles.md` for the overview, the per-principle references for SRP/OCP/LSP/ISP/DIP detail, `architecture-patterns.md` for hexagonal/modular layout, and the templates for module/service/interface/handler/error/test scaffolding.
</objective>

# SOLID Go - Modular Architecture

## Agent Workflow (MANDATORY)

Before ANY implementation, use `TeamCreate` to spawn 3 agents:

1. **fuse-ai-pilot:explore-codebase** - Analyze existing architecture
2. **fuse-ai-pilot:research-expert** - Verify Go docs via Context7
3. **fuse-ai-pilot:sniper** - Post-implementation validation

---

## DRY - Reuse Before Creating (MANDATORY)

**Before writing ANY new code:**
1. **Grep the codebase** for similar interfaces, services, or logic
2. Check shared locations: `internal/core/services/`, `internal/core/ports/`
3. If similar code exists -> extend/reuse instead of duplicate
4. If code is genuinely shared across features -> create it in `internal/core/`

---

## Architecture (Modules MANDATORY)

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Handlers | `internal/modules/[feature]/handlers/` | HTTP I/O |
| Services | `internal/modules/[feature]/services/` | Business logic |
| Repositories | `internal/modules/[feature]/repositories/` | Data access |
| Ports (interfaces) | `internal/modules/[feature]/ports/` | Contracts |
| Models | `internal/modules/[feature]/models/` | Domain data |
| Shared | `internal/core/{services,ports,models}/` | Cross-feature code |

**NEVER use flat `internal/` structure - always `internal/modules/[feature]/`**

---

## Critical Rules (MANDATORY)

| Rule | Value |
|------|-------|
| Source-size ceiling | `FUSE_SOLID_MAX_LINES` (default 200) |
| Handlers | Delegate to services; split by responsibility when cohesion drops |
| Interfaces | `ports/` directory ONLY |
| Godoc | Every exported function documented |
| Accept interfaces | Return structs |
| Small interfaces | Keep each interface role-focused (Go idiom) |

---

## Reference Guide

### Concepts

| Topic | Reference | When to consult |
|-------|-----------|-----------------|
| **SOLID Overview** | [solid-principles.md](references/solid-principles.md) | Quick reference |
| **SRP** | [single-responsibility.md](references/single-responsibility.md) | Fat structs |
| **OCP** | [open-closed.md](references/open-closed.md) | Adding providers |
| **LSP** | [liskov-substitution.md](references/liskov-substitution.md) | Contracts |
| **ISP** | [interface-segregation.md](references/interface-segregation.md) | Fat interfaces |
| **DIP** | [dependency-inversion.md](references/dependency-inversion.md) | Injection |
| **Architecture** | [architecture-patterns.md](references/architecture-patterns.md) | Hex/modular |

### Templates

| Template | When to use |
|----------|-------------|
| [module.md](references/templates/module.md) | Feature module structure |
| [service.md](references/templates/service.md) | Business logic service |
| [interface.md](references/templates/interface.md) | Port definition |
| [handler.md](references/templates/handler.md) | HTTP handler |
| [error.md](references/templates/error.md) | Custom errors |
| [test.md](references/templates/test.md) | Table-driven tests |

---

## Forbidden

| Anti-Pattern | Fix |
|--------------|-----|
| Source files exceeding `FUSE_SOLID_MAX_LINES` (default 200) | Split by responsibility |
| Interfaces in impl files | Move to `ports/` directory |
| Fat interfaces mixing client roles | Split into focused interfaces |
| Flat `internal/` structure | Use `internal/modules/[feature]/` |
| `init()` for dependency wiring | Use constructor injection |
