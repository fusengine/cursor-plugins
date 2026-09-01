---
name: lessons
description: View project lessons in MEMORY/LESSON.md (project root) and append a compact "never reproduce" lesson.
---

# /lessons

Manage the project's **lessons memory** — a `MEMORY/LESSON.md` file committed at the **project root**. It records compact post-mortems so the same mistake is never reproduced twice.

## Architecture

- **`MEMORY/LESSON.md`** — the committed list of lessons. One lesson per line, newest at the bottom. This is the file you read and append to.
- **`MEMORY/state.json`** — the throttle counter (last-reminder / last-write timestamps). It is **gitignored** and managed by the hooks; **never edit it by hand**.

The fuse-lessons hooks are intended to read MEMORY/LESSON.md at session and sub-agent start. Cursor publicly supports sessionStart.additional_context, but subagentStart exposes no context output and end-to-end delivery through the inspected harness remains incomplete and runtime-unverified.

## View existing lessons

Read `MEMORY/LESSON.md` at the project root (create it if absent). Each line is one lesson, newest at the bottom.

## Add a lesson

Append one line in this exact compact format:

```
- [YYYY-MM-DD HH:MM] <what went wrong> → <what to do instead>
```

Rules:
- **One lesson per line.** Keep it short — a single actionable sentence.
- **Timestamp** uses the current local date and time in YYYY-MM-DD HH:MM. If a verified Stop reminder supplies an exact stamp, copy it verbatim; native reminder rendering and delivery remain incomplete and runtime-unverified in the inspected harness.
- Left of `→`: the concrete failure (what broke, what was wrong).
- Right of `→`: the corrective action (what to do next time).
- No paragraphs, no code blocks — just the bullet line.

### Example

```
- [2026-06-20 11:02] Added "hooks": "./hooks/hooks.json" string in marketplace entry → never set a hooks field in marketplace.json; hooks auto-load by convention from hooks/hooks.json
```

## Throttle

The intended Stop reminder is throttled to at most once every **5 minutes** by default, but native reminder delivery remains incomplete and runtime-unverified in the inspected harness. Override with the FUSE_LESSONS_THROTTLE_MIN environment variable (minutes). Writing to MEMORY/LESSON.md is intended to reset the throttle via the PostToolUse hook (it updates MEMORY/state.json); actual Cursor execution remains runtime-unverified.

After appending, mention that the lesson is intended for delivery on the next session/sub-agent start, while end-to-end Cursor delivery remains runtime-unverified, and that MEMORY/LESSON.md should be committed with the change so the whole team inherits it.
