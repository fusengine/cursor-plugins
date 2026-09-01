---
name: solid-csharp
description: "Use when writing or refactoring C#/.NET code, structuring Modules/[Feature]/ layers, or defining Contracts/interfaces (SOLID, FUSE_SOLID_MAX_LINES source-size ceiling)."
versions:
  csharp: "12"
  dotnet: "9"
user-invocable: true
references: references/principles.md, references/patterns.md
related-skills: solid-detection
---

<objective>
SOLID C# enforces a modular architecture for C# 12/.NET 9 projects: every feature lives under `Modules/[Feature]/` (Controllers, Services, Repositories, Contracts, Models) with shared code centralized in `Core/`, contracts are mandatory and live only in `Contracts/` directories, interfaces stay role-focused, and source files stay within `FUSE_SOLID_MAX_LINES` (default 200).

Before writing any new code it requires a DRY check -- grep the codebase and `Core/Services`/`Core/Contracts` for existing logic to reuse before creating something new. See `principles.md` for the 5 SOLID principles and `patterns.md` for directory layout, testing, and record usage.
</objective>

# SOLID C# - Modular Architecture

## Agent Workflow (MANDATORY)

Before ANY implementation, use `TeamCreate` to spawn 3 agents:

1. **fuse-ai-pilot:explore-codebase** - Analyze existing architecture
2. **fuse-ai-pilot:research-expert** - Verify .NET docs via Context7
3. **fuse-ai-pilot:sniper** - Post-implementation validation

---

## DRY - Reuse Before Creating (MANDATORY)

**Before writing ANY new code:**
1. **Grep the codebase** for similar interfaces, services, or logic
2. Check shared locations: `Core/Services/`, `Core/Contracts/`
3. If similar code exists -> extend/reuse instead of duplicate
4. If code is genuinely shared across features -> create it in `Core/`

---

## Architecture (Modules MANDATORY)

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Controllers | `Modules/[Feature]/Controllers/` | HTTP I/O |
| Services | `Modules/[Feature]/Services/` | Business logic |
| Repositories | `Modules/[Feature]/Repositories/` | Data access |
| Contracts | `Modules/[Feature]/Contracts/` | Interfaces |
| Models | `Modules/[Feature]/Models/` | Domain data |
| Shared | `Core/{Services,Contracts,Models}/` | Cross-feature code |

**NEVER use flat structure - always `Modules/[Feature]/`**

---

## Critical Rules (MANDATORY)

| Rule | Value |
|------|-------|
| Source-size ceiling | `FUSE_SOLID_MAX_LINES` (default 200) |
| Controllers | Delegate to services; split by responsibility when cohesion drops |
| Interfaces | `Contracts/` directory ONLY |
| XML docs | Every public member documented |
| DI | Use `Microsoft.Extensions.DependencyInjection` |
| Small interfaces | Keep each interface role-focused |
| Records | Prefer `record` for DTOs and value objects |

---

## Reference Guide

| Topic | Reference | When to consult |
|-------|-----------|-----------------|
| **SOLID Principles** | [principles.md](references/principles.md) | Quick reference for all 5 principles |
| **Patterns & Structure** | [patterns.md](references/patterns.md) | Directory layout, testing, records |

---

## Forbidden

| Anti-Pattern | Fix |
|--------------|-----|
| Source files exceeding `FUSE_SOLID_MAX_LINES` (default 200) | Split by responsibility |
| Interfaces in impl files | Move to `Contracts/` directory |
| Fat interfaces mixing client roles | Split into focused interfaces |
| Flat project structure | Use `Modules/[Feature]/` |
| `new` for dependencies | Use constructor injection + DI |
| Service Locator pattern | Use constructor injection |
