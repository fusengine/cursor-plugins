---
name: hook-scripts
description: Complete hook script templates for agent validation
keywords: hooks, scripts, bash, validation, solid
---

# Hook Scripts Templates

## Usage

These scripts accompany the Claude Code compatibility templates. Do not wire them into native
Cursor hooks without converting the event input and response contract. Copy them to
`plugins/<plugin>/scripts/` and make executable with `chmod +x` only for that compatibility target.
They require `jq` and read the documented Claude Code hook payload as JSON from standard input;
the file path comes from `tool_input.file_path`, never from a positional shell argument.

---

## Proposed File Analyzer (PreToolUse helper)

### File: scripts/analyze-file-change.sh

```bash
#!/bin/bash
# Return the target path and prospective line count for Claude Code Write/Edit input.

set -e

if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required to parse Claude Code hook JSON from stdin" >&2
    exit 2
fi

HOOK_INPUT="$(cat)"

if ! FILE_PATH="$(printf '%s' "$HOOK_INPUT" | jq -er '.tool_input.file_path | select(type == "string" and length > 0)')"; then
    echo "ERROR: hook input must contain a non-empty tool_input.file_path" >&2
    exit 2
fi

if ! TOOL_NAME="$(printf '%s' "$HOOK_INPUT" | jq -er '.tool_name | select(. == "Write" or . == "Edit")')"; then
    echo "ERROR: hook input tool_name must be Write or Edit" >&2
    exit 2
fi

JQ_COMMON='def line_count:
  if length == 0 then 0
  elif endswith("\n") then (split("\n") | length) - 1
  else split("\n") | length
  end;'

case "$TOOL_NAME" in
    Write)
        if ! ANALYSIS="$(printf '%s' "$HOOK_INPUT" | jq -ce "$JQ_COMMON
          .tool_input.content as \$content
          | if (\$content | type) != \"string\" then error(\"content must be a string\") else
              {file_path: .tool_input.file_path, line_count: (\$content | line_count)}
            end")"; then
            echo "ERROR: Write input must contain string tool_input.content" >&2
            exit 2
        fi
        ;;
    Edit)
        if [ ! -f "$FILE_PATH" ]; then
            echo "ERROR: Edit target does not exist: $FILE_PATH" >&2
            exit 2
        fi
        if ! ANALYSIS="$(printf '%s' "$HOOK_INPUT" | jq -ce --rawfile current "$FILE_PATH" "$JQ_COMMON
          def replace_once(\$old; \$new):
            index(\$old) as \$at
            | if \$at == null then error(\"old_string not found\")
              else .[0:\$at] + \$new + .[(\$at + (\$old | length)):]
              end;
          .tool_input as \$input
          | (\$input.old_string | select(type == \"string\" and length > 0)) as \$old
          | (\$input.new_string | select(type == \"string\")) as \$new
          | (\$input.replace_all // false) as \$replace_all
          | if (\$replace_all | type) != \"boolean\" then
              error(\"replace_all must be a boolean\")
            else . end
          | (\$current | (split(\$old) | length) - 1) as \$matches
          | (if \$matches == 0 then
               error(\"old_string not found\")
             elif \$replace_all then
               \$current | split(\$old) | join(\$new)
             elif \$matches != 1 then
               error(\"old_string must be unique unless replace_all is true\")
             else
               \$current | replace_once(\$old; \$new)
             end) as \$content
          | {file_path: \$input.file_path, line_count: (\$content | line_count)}")"; then
            echo "ERROR: Edit input must describe a valid literal replacement" >&2
            exit 2
        fi
        ;;
esac

printf '%s\n' "$ANALYSIS"
```

---

## SOLID Validation Script (PreToolUse)

### File: scripts/validate-solid.sh

```bash
#!/bin/bash
# SOLID Validation Script for PreToolUse hooks
# Validates file size and interface location before Write/Edit

set -e

# Configuration - adjust the interface location per stack
fuse_solid_max_lines="${FUSE_SOLID_MAX_LINES:-200}"
INTERFACE_DIR="src/interfaces"  # Or app/Contracts for Laravel

case "$fuse_solid_max_lines" in
    ''|*[!0-9]*)
        echo "ERROR: FUSE_SOLID_MAX_LINES must be a positive integer" >&2
        exit 2
        ;;
esac

if [ "$fuse_solid_max_lines" -le 0 ]; then
    echo "ERROR: FUSE_SOLID_MAX_LINES must be a positive integer" >&2
    exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
HOOK_ANALYSIS="$(bash "$SCRIPT_DIR/analyze-file-change.sh")"
FILE_PATH="$(printf '%s' "$HOOK_ANALYSIS" | jq -er '.file_path')"
PROPOSED_LINE_COUNT="$(printf '%s' "$HOOK_ANALYSIS" | jq -er '.line_count')"

# Skip non-code files
case "$FILE_PATH" in
    *.md|*.json|*.yml|*.yaml|*.txt|*.env*)
        exit 0
        ;;
esac

if [ "$PROPOSED_LINE_COUNT" -gt "$fuse_solid_max_lines" ]; then
    echo "ERROR: Proposed file exceeds $fuse_solid_max_lines lines ($PROPOSED_LINE_COUNT lines)"
    echo "Split into smaller files following SOLID principles"
    exit 2
fi

# Check interface location
if [[ "$FILE_PATH" == *"/interfaces/"* ]] || [[ "$FILE_PATH" == *"/Contracts/"* ]]; then
    # Interface file - verify correct location
    if [[ "$FILE_PATH" != *"$INTERFACE_DIR"* ]]; then
        echo "ERROR: Interfaces must be in $INTERFACE_DIR"
        exit 2
    fi
fi

exit 0
```

---

## Next.js SOLID Validation

### File: scripts/validate-nextjs-solid.sh

```bash
#!/bin/bash
# Next.js SOLID Validation
# Interfaces in modules/[feature]/src/interfaces/

set -e

fuse_solid_max_lines="${FUSE_SOLID_MAX_LINES:-200}"
INTERFACE_PATTERN="modules/*/src/interfaces/"

case "$fuse_solid_max_lines" in
    ''|*[!0-9]*)
        echo "ERROR: FUSE_SOLID_MAX_LINES must be a positive integer" >&2
        exit 2
        ;;
esac

if [ "$fuse_solid_max_lines" -le 0 ]; then
    echo "ERROR: FUSE_SOLID_MAX_LINES must be a positive integer" >&2
    exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
HOOK_ANALYSIS="$(bash "$SCRIPT_DIR/analyze-file-change.sh")"
FILE_PATH="$(printf '%s' "$HOOK_ANALYSIS" | jq -er '.file_path')"
PROPOSED_LINE_COUNT="$(printf '%s' "$HOOK_ANALYSIS" | jq -er '.line_count')"

# Skip non-code files
case "$FILE_PATH" in
    *.md|*.json|*.yml|*.yaml|*.txt|*.env*|*.css)
        exit 0
        ;;
esac

if [ "$PROPOSED_LINE_COUNT" -gt "$fuse_solid_max_lines" ]; then
    echo "ERROR: Proposed file exceeds $fuse_solid_max_lines lines ($PROPOSED_LINE_COUNT lines)"
    echo "Split: main.ts + validators.ts + types.ts + utils.ts"
    exit 2
fi

# Check interface in component
if [[ "$FILE_PATH" == *"/components/"* ]]; then
    if grep -q "^interface\|^type.*=" "$FILE_PATH" 2>/dev/null; then
        echo "ERROR: Interfaces/types in components"
        echo "Move to: $INTERFACE_PATTERN"
        exit 2
    fi
fi

exit 0
```

---

## Laravel SOLID Validation

### File: scripts/validate-php-solid.sh

```bash
#!/bin/bash
# Laravel SOLID Validation
# Interfaces in app/Contracts/

set -e

fuse_solid_max_lines="${FUSE_SOLID_MAX_LINES:-200}"

case "$fuse_solid_max_lines" in
    ''|*[!0-9]*)
        echo "ERROR: FUSE_SOLID_MAX_LINES must be a positive integer" >&2
        exit 2
        ;;
esac

if [ "$fuse_solid_max_lines" -le 0 ]; then
    echo "ERROR: FUSE_SOLID_MAX_LINES must be a positive integer" >&2
    exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
HOOK_ANALYSIS="$(bash "$SCRIPT_DIR/analyze-file-change.sh")"
FILE_PATH="$(printf '%s' "$HOOK_ANALYSIS" | jq -er '.file_path')"
PROPOSED_LINE_COUNT="$(printf '%s' "$HOOK_ANALYSIS" | jq -er '.line_count')"

# Only check PHP files
case "$FILE_PATH" in
    *.php)
        ;;
    *)
        exit 0
        ;;
esac

if [ "$PROPOSED_LINE_COUNT" -gt "$fuse_solid_max_lines" ]; then
    echo "ERROR: Proposed file exceeds $fuse_solid_max_lines lines ($PROPOSED_LINE_COUNT lines)"
    echo "Split: Service + Repository + Action + DTO"
    exit 2
fi

# Check interface location
if grep -q "^interface " "$FILE_PATH" 2>/dev/null; then
    if [[ "$FILE_PATH" != *"app/Contracts/"* ]]; then
        echo "ERROR: Interfaces must be in app/Contracts/"
        exit 2
    fi
fi

exit 0
```

---

## Swift SOLID Validation

### File: scripts/validate-swift-solid.sh

```bash
#!/bin/bash
# Swift SOLID Validation
# Protocols in Sources/Interfaces/

set -e

fuse_solid_max_lines="${FUSE_SOLID_MAX_LINES:-200}"

case "$fuse_solid_max_lines" in
    ''|*[!0-9]*)
        echo "ERROR: FUSE_SOLID_MAX_LINES must be a positive integer" >&2
        exit 2
        ;;
esac

if [ "$fuse_solid_max_lines" -le 0 ]; then
    echo "ERROR: FUSE_SOLID_MAX_LINES must be a positive integer" >&2
    exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
HOOK_ANALYSIS="$(bash "$SCRIPT_DIR/analyze-file-change.sh")"
FILE_PATH="$(printf '%s' "$HOOK_ANALYSIS" | jq -er '.file_path')"
PROPOSED_LINE_COUNT="$(printf '%s' "$HOOK_ANALYSIS" | jq -er '.line_count')"

# Only check Swift files
case "$FILE_PATH" in
    *.swift)
        ;;
    *)
        exit 0
        ;;
esac

if [ "$PROPOSED_LINE_COUNT" -gt "$fuse_solid_max_lines" ]; then
    echo "ERROR: Proposed file exceeds $fuse_solid_max_lines lines ($PROPOSED_LINE_COUNT lines)"
    echo "Split: ViewModel + View + Service"
    exit 2
fi

# Check protocol location
if grep -q "^protocol " "$FILE_PATH" 2>/dev/null; then
    if [[ "$FILE_PATH" != *"Sources/Interfaces/"* ]] && [[ "$FILE_PATH" != *"Protocols/"* ]]; then
        echo "ERROR: Protocols must be in Sources/Interfaces/"
        exit 2
    fi
fi

exit 0
```

---

## Skill Read Tracker (PostToolUse)

### File: scripts/track-skill-read.sh

```bash
#!/bin/bash
# Track skill usage for analytics
# PostToolUse on Read

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
LOG_FILE="$SCRIPT_DIR/skill-reads.log"

if ! command -v jq >/dev/null 2>&1; then
    echo "ERROR: jq is required to parse Claude Code hook JSON from stdin" >&2
    exit 2
fi

if ! FILE_PATH="$(jq -er '.tool_input.file_path | select(type == "string" and length > 0)')"; then
    echo "ERROR: hook input must contain a non-empty tool_input.file_path" >&2
    exit 2
fi

# Only track skill reads
if [[ "$FILE_PATH" == *"/skills/"* ]]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') READ: $FILE_PATH" >> "$LOG_FILE"
fi

exit 0
```

---

## Installation

```bash
# Copy scripts to plugin
cp scripts/*.sh plugins/<plugin>/scripts/

# Make executable
chmod +x plugins/<plugin>/scripts/*.sh

# Verify
ls -la plugins/<plugin>/scripts/
```

---

## Notes

- Always `exit 0` for success
- Exit `2` blocks the tool in Cursor; other non-zero exits fail open by default. A native Cursor
  hook definition can opt into failure blocking with `failClosed: true`
- Claude Code compatibility scripts require `jq` and consume the hook JSON from stdin. Do not pass
  a file path as `$1`; use the documented `tool_input.file_path` field
- Pre-write validators require `analyze-file-change.sh`; it evaluates the proposed `Write` content
  or literal `Edit` result rather than measuring only the pre-existing file
- `FUSE_SOLID_MAX_LINES` is the only file-size ceiling; it must be a positive integer and defaults
  to `200`
- Replace `__TARGET_PLUGIN_ROOT__` only from target-specific documentation; never invent a
  plugin-root process environment variable
- Reference a skill's own scripts as `scripts/<name>` relative to the skill root
- Keep scripts fast (<1s execution)
