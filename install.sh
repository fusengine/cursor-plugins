#!/usr/bin/env bash
#
# fusengine-plugins (Cursor) — installer.
#
# Two independent installs, neither one conditioning the other:
#   A. the marketplace  -> symlinked into ~/.cursor/plugins/local/
#   B. the global rule  -> COPIED to ~/.cursor/rules/fuse-global.mdc
# It never writes inside the repo, never uses sudo, and never removes anything
# but its own symlink and its own fuse-prefixed rule file.
#
# Usage:
#   ./install.sh              install (idempotent)
#   ./install.sh --dry-run    show what would happen, write nothing
#   ./install.sh --force      overwrite a global rule that was edited by hand
#   ./install.sh --uninstall  remove the symlink and the fuse-global.mdc rule
#   ./install.sh --help
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
LINK_NAME="fusengine"
LOCAL_DIR="$HOME/.cursor/plugins/local"
LINK="$LOCAL_DIR/$LINK_NAME"
MARKETPLACE="$ROOT/.cursor-plugin/marketplace.json"

# Global user rule. The path is what the Cursor binary builds for a user-scope
# rule (getRuleTargetDirectory(isUser=true) -> userHome/.cursor/rules), and .mdc
# is the extension it generates. The "fuse-" prefix is a collision guard: this
# script deploys nothing that does not carry it.
RULE_NAME="fuse-global.mdc"
RULE_SRC="$ROOT/fuse-rules/user-rules/$RULE_NAME"
RULES_DIR="$HOME/.cursor/rules"
RULE_DST="$RULES_DIR/$RULE_NAME"

DRY_RUN=0
UNINSTALL=0
FORCE=0

say()  { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
ok()   { printf '   ok    %s\n' "$*"; }
info() { printf '   info  %s\n' "$*"; }
warn() { printf '   warn  %s\n' "$*"; }
die()  { printf '   error %s\n' "$*" >&2; exit 1; }
plan() { printf '   would %s\n' "$*"; }

usage() {
  sed -n '2,16p' "${BASH_SOURCE[0]}" | sed 's/^#\{1,\} \{0,1\}//'
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --force)     FORCE=1 ;;
    -h|--help)   usage ;;
    *)           die "unknown option: $arg (see --help)" ;;
  esac
done

# --- repo identity -----------------------------------------------------------
# Refuse to act unless this really is the marketplace root.
[ -f "$MARKETPLACE" ] || die "not a Cursor marketplace root: $MARKETPLACE is missing"

# Hard collision guard: only fuse-prefixed rule files may ever be deployed.
case "$RULE_NAME" in
  fuse-*) : ;;
  *) die "refusing to deploy a rule file without the 'fuse-' prefix: $RULE_NAME" ;;
esac

# Size + mtime of a file, BSD stat first then GNU.
file_info() {
  stat -f '%z bytes, modified %Sm' -t '%Y-%m-%d %H:%M' "$1" 2>/dev/null \
    || stat -c '%s bytes, modified %y' "$1" 2>/dev/null \
    || printf '<unreadable>'
}

# Resolve a symlink to an absolute physical path (portable, macOS bash 3.2).
resolve_link() {
  local l="$1" t
  t="$(readlink "$l")" || return 1
  case "$t" in
    /*) : ;;
    *)  t="$(dirname "$l")/$t" ;;
  esac
  ( cd "$t" >/dev/null 2>&1 && pwd -P ) || printf '%s' "$t"
}

# Read a top-level string field out of a JSON file, with whatever tool exists.
json_field() {
  local file="$1" key="$2"
  if command -v node >/dev/null 2>&1; then
    node -e 'try{var j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(j[process.argv[2]]||""))}catch(e){}' "$file" "$key"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys
try:
    sys.stdout.write(str(json.load(open(sys.argv[1])).get(sys.argv[2], "")))
except Exception:
    pass' "$file" "$key"
  elif command -v jq >/dev/null 2>&1; then
    jq -r --arg k "$key" '.[$k] // ""' "$file" 2>/dev/null || true
  fi
}

MARKET_NAME="$(json_field "$MARKETPLACE" name)"
[ -n "$MARKET_NAME" ] || MARKET_NAME="fusengine-plugins"

# --- uninstall ---------------------------------------------------------------
if [ "$UNINSTALL" -eq 1 ]; then
  step "Uninstall — $LINK"
  if [ -L "$LINK" ]; then
    target="$(resolve_link "$LINK" || true)"
    info "symlink -> ${target:-<broken>}"
    if [ "$DRY_RUN" -eq 1 ]; then
      plan "rm \"$LINK\"   (the symlink only — its target is never touched)"
    else
      rm "$LINK"
      ok "symlink removed. The repository itself was not touched."
    fi
  elif [ -e "$LINK" ]; then
    die "$LINK exists but is NOT a symlink. Refusing to delete a real file or directory."
  else
    ok "nothing to do — $LINK does not exist."
  fi

  step "Uninstall — $RULE_DST"
  if [ ! -e "$RULE_DST" ]; then
    ok "nothing to do — $RULE_DST does not exist."
  elif [ ! -f "$RULE_DST" ]; then
    die "$RULE_DST is not a regular file. Refusing to remove it."
  elif [ -f "$RULE_SRC" ] && cmp -s "$RULE_SRC" "$RULE_DST"; then
    if [ "$DRY_RUN" -eq 1 ]; then
      plan "rm \"$RULE_DST\"   (this file only — every other rule in $RULES_DIR is left alone)"
    else
      rm "$RULE_DST"
      ok "removed $RULE_DST"
    fi
  elif [ "$FORCE" -eq 1 ]; then
    if [ "$DRY_RUN" -eq 1 ]; then
      plan "rm \"$RULE_DST\"   (--force: differs from the repo copy)"
    else
      rm "$RULE_DST"
      ok "removed $RULE_DST (it differed from the repo copy; --force was given)"
    fi
  else
    warn "$RULE_DST differs from the repo copy — it may have been edited by hand. Kept."
    warn "Re-run with --uninstall --force to remove it anyway."
  fi

  say ""
  say "Restart Cursor or run 'Developer: Reload Window' for the removal to be seen."
  exit 0
fi

# --- 1. prerequisites --------------------------------------------------------
step "1/5  Prerequisites"
missing=0

if [ -d "/Applications/Cursor.app" ]; then
  ok "Cursor found at /Applications/Cursor.app"
elif [ -d "$HOME/Applications/Cursor.app" ]; then
  ok "Cursor found at $HOME/Applications/Cursor.app"
else
  warn "Cursor.app not found in /Applications or ~/Applications."
  missing=1
fi

for bin in node npx; do
  if command -v "$bin" >/dev/null 2>&1; then
    ok "$bin -> $(command -v "$bin")"
  else
    warn "$bin not on PATH — every hook runs 'npx -y @fusengine/harness hook cursor' and would fail."
    missing=1
  fi
done

if command -v jq >/dev/null 2>&1; then
  ok "jq -> $(command -v jq)"
elif command -v python3 >/dev/null 2>&1; then
  ok "python3 -> $(command -v python3) (jq absent, python3 is enough)"
else
  warn "neither jq nor python3 found — ./verify.sh needs a JSON reader."
  missing=1
fi

[ "$missing" -eq 0 ] || die "prerequisites missing (see above). Nothing was written."

# --- 2. link the marketplace -------------------------------------------------
step "2/5  Link $MARKET_NAME into $LOCAL_DIR"

if [ -d "$LOCAL_DIR" ]; then
  ok "$LOCAL_DIR exists"
else
  if [ "$DRY_RUN" -eq 1 ]; then
    plan "mkdir -p \"$LOCAL_DIR\""
  else
    mkdir -p "$LOCAL_DIR"
    ok "created $LOCAL_DIR"
  fi
fi

if [ -L "$LINK" ]; then
  current="$(resolve_link "$LINK" || true)"
  if [ "$current" = "$ROOT" ]; then
    ok "already linked to this checkout — nothing to do (idempotent)."
  else
    warn "existing symlink points elsewhere: ${current:-<broken>}"
    if [ "$DRY_RUN" -eq 1 ]; then
      plan "rm \"$LINK\" && ln -s \"$ROOT\" \"$LINK\"   (replaces a symlink, never a real directory)"
    else
      rm "$LINK"
      ln -s "$ROOT" "$LINK"
      ok "re-pointed to $ROOT"
    fi
  fi
elif [ -e "$LINK" ]; then
  die "$LINK exists and is a real file/directory, not a symlink. Refusing to touch it. Move it aside and re-run."
else
  if [ "$DRY_RUN" -eq 1 ]; then
    plan "ln -s \"$ROOT\" \"$LINK\""
  else
    ln -s "$ROOT" "$LINK"
    ok "linked $LINK -> $ROOT"
  fi
fi

# --- 3. detect a competing installation --------------------------------------
step "3/5  Other installations of $MARKET_NAME in $LOCAL_DIR"
found_other=0
if [ -d "$LOCAL_DIR" ]; then
  for entry in "$LOCAL_DIR"/*; do
    [ -e "$entry" ] || continue
    [ "$(basename "$entry")" = "$LINK_NAME" ] && continue
    other_manifest="$entry/.cursor-plugin/marketplace.json"
    [ -f "$other_manifest" ] || continue
    other_name="$(json_field "$other_manifest" name)"
    if [ "$other_name" = "$MARKET_NAME" ]; then
      found_other=1
      if [ -L "$entry" ]; then
        warn "duplicate: $(basename "$entry") -> $(resolve_link "$entry" || true)"
      else
        warn "duplicate: $(basename "$entry") (real directory — a copy, not a link)"
      fi
    fi
  done
fi
if [ "$found_other" -eq 1 ]; then
  warn "Two entries declare the marketplace '$MARKET_NAME'. Cursor may list every plugin twice or"
  warn "load the wrong one. Remove the entry you do not want — this script only ever removes '$LINK_NAME'."
else
  ok "no competing installation found."
fi

# --- 4. global user rule -----------------------------------------------------
# Deployed by COPY, not by symlink: ~/.cursor/plugins/local/ is the directory
# Cursor documents for linked marketplaces, but the rules scanner has never been
# observed following a symlink — a copy removes a risk we have no reason to take.
# Consequence: edit the repo file, re-run this script.
step "4/5  Global user rule -> $RULE_DST"

if [ ! -f "$RULE_SRC" ]; then
  warn "source not present: $RULE_SRC"
  warn "The global rule is produced separately. Skipping it — the marketplace install above"
  warn "is complete and valid on its own. Re-run this script once the file lands."
else
  if [ -d "$RULES_DIR" ]; then
    ok "$RULES_DIR exists"
  else
    if [ "$DRY_RUN" -eq 1 ]; then
      plan "mkdir -p \"$RULES_DIR\""
    else
      mkdir -p "$RULES_DIR"
      ok "created $RULES_DIR"
    fi
  fi

  if [ -e "$RULE_DST" ] && [ ! -f "$RULE_DST" ]; then
    die "$RULE_DST exists and is not a regular file. Refusing to touch it."
  elif [ -f "$RULE_DST" ] && cmp -s "$RULE_SRC" "$RULE_DST"; then
    ok "already up to date (byte-identical) — nothing to do."
  elif [ -f "$RULE_DST" ] && [ "$FORCE" -eq 0 ]; then
    warn "$RULE_DST already exists and DIFFERS from the repo copy:"
    warn "   installed: $(file_info "$RULE_DST")"
    warn "   repo:      $(file_info "$RULE_SRC")"
    warn "A global rule is a file you may have edited by hand — not overwriting it."
    warn "Re-run with --force to replace it. Nothing else in $RULES_DIR was read or changed."
  else
    if [ "$DRY_RUN" -eq 1 ]; then
      plan "cp \"$RULE_SRC\" \"$RULE_DST\"$( [ "$FORCE" -eq 1 ] && printf '   (--force: overwrite)' )"
    else
      cp "$RULE_SRC" "$RULE_DST"
      ok "copied $RULE_NAME into $RULES_DIR"
    fi
  fi
fi

# --- 5. what this script cannot do -------------------------------------------
step "5/5  Manual steps left to you"
say "   1. In Cursor: Command Palette -> 'Developer: Reload Window'."
say "   2. Cursor Settings -> Plugins (Customize): the 24 plugins of '$MARKET_NAME' must appear."
say "      Enable the ones you want — a plugin listed but disabled contributes nothing."
say "   3. Cursor Settings -> Rules: 'fuse-global' must be listed and marked Always."
say "   4. Hooks shell out to 'npx -y @fusengine/harness hook cursor'. The first run downloads the"
say "      package, so the first hook after a reload may be slow. Nothing to configure."
say ""
if [ "$DRY_RUN" -eq 1 ]; then
  say "Dry run — nothing was written."
else
  say "Installed. Run ./verify.sh to prove it."
fi
