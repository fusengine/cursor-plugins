---
name: file-size-rules
description: File size limits, LoC calculation, and split strategies for code quality
when-to-use: Checking file sizes, splitting large files
keywords: file size, LoC, lines of code, split, refactor
priority: high
related: solid-validation.md, architecture-patterns.md
---

# File Size Rules

## Limit

`FUSE_SOLID_MAX_LINES` is the only file-size ceiling. It must be a positive integer and defaults to `200`. Count total physical lines; split any file whose total exceeds the resolved ceiling.

## LoC Calculation

```
LoC = Total lines - Comment lines - Blank lines

Comment patterns:
- JS/TS: //, /* */, /** */
- Python: #, """ """, ''' '''
- Go: //, /* */
- PHP: //, #, /* */
- Rust: //, /* */, ///
```

## Illustrative Split Strategy

```
component.tsx → SPLIT INTO:
├── Component.tsx (40 lines) - orchestrator
├── ComponentHeader.tsx (30 lines)
├── ComponentContent.tsx (35 lines)
├── useComponentLogic.ts (45 lines) - hook
└── index.ts (5 lines) - barrel export
```
