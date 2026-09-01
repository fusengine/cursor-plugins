---
description: React/Next.js state management rules — TanStack Query and Zustand placement
alwaysApply: true
---

## State Management (React / Next.js)

| State Type | Solution | Location |
|------------|----------|----------|
| Server (API) | TanStack Query | `modules/[feature]/src/hooks/` |
| Global UI | Zustand store | `modules/cores/stores/` |
| Feature shared | Zustand store | `modules/[feature]/src/stores/` |
| URL state | TanStack Router | Route validators |
| Form state | TanStack Form | `modules/[feature]/src/hooks/` |
| Local only | `useState` | Inside component |

## Zustand Rules
- Feature store: `modules/[feature]/src/stores/` | Global: `modules/cores/stores/`
- Stores follow the single `FUSE_SOLID_MAX_LINES` file ceiling (default `200`); always use selectors and keep actions inside the store

## FORBIDDEN
Prop drilling (3+ levels), `useContext` for global, `useEffect` for fetching, `useState` for shared, store in component file, subscribing to entire store
