---
name: quick-analysis-commands
description: One-liner commands for full-stack assessment, file counts, and large-file detection
---

# Quick Analysis Commands

## Full Stack Assessment

```bash
# One-liner for quick assessment
echo "=== Package Manager ===" && ls package.json pyproject.toml go.mod Cargo.toml composer.json 2>/dev/null && echo "=== Framework ===" && head -20 package.json 2>/dev/null | grep -E "next|react|vue|express" && echo "=== Structure ===" && ls -la src/ app/ lib/ 2>/dev/null
```

## File Count by Type

```bash
# Count files by extension
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l
find . -type f -name "*.py" 2>/dev/null | wc -l
find . -type f -name "*.go" 2>/dev/null | wc -l
```

## Large Files Detection

```bash
# Find files that exceed FUSE_SOLID_MAX_LINES (default 200)
fuse_solid_max_lines="${FUSE_SOLID_MAX_LINES:-200}"
case "$fuse_solid_max_lines" in ''|*[!0-9]*|0) echo "FUSE_SOLID_MAX_LINES must be a positive integer" >&2; exit 2;; esac
find . \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" \) -type f 2>/dev/null \
  | xargs wc -l 2>/dev/null \
  | awk -v max="$fuse_solid_max_lines" '$1 > max && $2 != "total" { print }' \
  | sort -rn | head -20
```
