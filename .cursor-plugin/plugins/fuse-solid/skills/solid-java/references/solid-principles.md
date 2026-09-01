---
name: solid-principles
applies-to: "**/*.java, **/*.kt"
description: Quick reference for all 5 SOLID principles applied to Java 21+
when-to-use: overview of SOLID, quick reference, principle selection
keywords: SOLID, overview, Java, principles, quick reference
priority: high
related: single-responsibility.md, open-closed.md, liskov-substitution.md, interface-segregation.md, dependency-inversion.md
---

# SOLID Principles - Java Quick Reference

## Principles Overview

| Principle | Summary | Java Pattern |
|-----------|---------|--------------|
| **SRP** | One responsibility per class | Controller, Service, Repository |
| **OCP** | Open for extension, closed for modification | Interface-based extensibility |
| **LSP** | Implementations honor interface contracts | Contract consistency |
| **ISP** | Small, focused interfaces | Role-based interface splitting |
| **DIP** | Depend on interfaces, not concrete classes | Constructor injection |

---

## Architecture Rules (Modules MANDATORY)

```
src/main/java/com/app/
├── modules/
│   ├── [feature]/
│   │   ├── controllers/     # HTTP handlers
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Data access
│   │   ├── interfaces/      # Contracts ONLY
│   │   └── models/          # DTOs, records
│   └── core/                # Shared (cross-feature)
│       ├── services/
│       ├── interfaces/
│       └── models/
└── Application.java
```

**NEVER use flat package structure - always `modules/[feature]/`**

---

## Source-size ceiling

All source-file types use `FUSE_SOLID_MAX_LINES` (default 200) as the only size ceiling. Split by responsibility when cohesion drops.

---

## Interface Location (CRITICAL)

| Scope | Location |
|-------|----------|
| Feature interfaces | `modules/[feature]/interfaces/` |
| Shared interfaces | `modules/core/interfaces/` |
| **FORBIDDEN** | Interfaces in implementation files |

---

## Quick Checklist

- [ ] Source files stay within `FUSE_SOLID_MAX_LINES` (default 200)
- [ ] Interfaces in `modules/[feature]/interfaces/` or `modules/core/interfaces/`
- [ ] Services depend on interfaces (constructor injection)
- [ ] DTOs use `record` (Java 16+)
- [ ] Sealed classes for restricted hierarchies (Java 17+)
- [ ] Javadoc on every public method
- [ ] DRY: Grep before creating new code
