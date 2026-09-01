---
description: Report the current Cursor harness limitation and provide the harness-repository repair prompt. Package mutation is intentionally disabled.
disable-model-invocation: false
---

# Update Harness — intentionally non-executable

Do not modify an installed marketplace, package cache, lockfile, dependency spec, or harness repository from this command.

The published `@fusengine/harness@0.1.90` tarball is not a safe Cursor target: its hook normalization and response contracts are not equivalent to the newer local source. Until a corrected version is published and verified, there is no package version this command may install or pin.

1. Report that automated Cursor harness updates are disabled.
2. If `$ARGUMENTS` contains a requested version, repeat it as a request only; do not install it.
3. Give the user `docs/harness-cursor-fix-prompt.md` as the standalone prompt to run in the harness repository.
4. State explicitly that the 62 existing hook commands remain unpinned and unchanged pending a corrected release.

**Arguments**:
- `$ARGUMENTS` — optional target version (e.g. `0.1.73`). Empty → latest published.

**Example Usage**:
- `/update-harness` → report the limitation and provide the harness repair prompt
- `/update-harness 0.1.91` → record the requested version without installing it
