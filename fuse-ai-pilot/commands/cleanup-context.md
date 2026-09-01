---
description: Report the unsupported Claude-only context cleanup workflow without executing destructive cleanup.
disable-model-invocation: false
---

# Cleanup Context — intentionally non-executable

The source command targets Claude Code's private user-state layout and performs permanent deletion. Cursor documents no equivalent cleanup contract for these files.

Do not run a Claude cleanup script, infer a Cursor replacement path, delete user data, or mutate installed configuration. Report that this command is unavailable on Cursor until a native, documented cleanup contract exists.

**Example Usage**:
- `/cleanup-context` → report the Cursor limitation; perform no cleanup
