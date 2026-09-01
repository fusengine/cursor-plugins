#!/bin/bash
# Cursor - Load API keys from ~/.cursor/.env
# Add to ~/.bashrc: source /path/to/cursor-env.bash
#
# Parsed line by line instead of `source`d: FUSE_* keys are per-harness
# (FUSE_HARNESS_REFS points at ONE harness' rules tree) and must never be
# exported globally, or a Codex/Kimi run inherits Claude's SOLID rules.

if [ -f "$HOME/.cursor/.env" ]; then
    while IFS= read -r __fuse_line || [ -n "$__fuse_line" ]; do
        __fuse_line="${__fuse_line#"${__fuse_line%%[! 	]*}"}"
        case "$__fuse_line" in ''|'#'*) continue ;; esac
        case "$__fuse_line" in 'export '*) __fuse_line="${__fuse_line#export }" ;; esac
        case "$__fuse_line" in *=*) ;; *) continue ;; esac
        __fuse_key="${__fuse_line%%=*}"
        __fuse_val="${__fuse_line#*=}"
        case "$__fuse_key" in
            FUSE_*) continue ;;
            [!A-Za-z_]*|*[!A-Za-z0-9_]*) continue ;;
        esac
        case "$__fuse_val" in
            '"'*) __fuse_val="${__fuse_val#\"}"; __fuse_val="${__fuse_val%%\"*}" ;;
            "'"*) __fuse_val="${__fuse_val#\'}"; __fuse_val="${__fuse_val%%\'*}" ;;
            *)
                __fuse_val="${__fuse_val%% #*}"
                __fuse_val="${__fuse_val%%	#*}"
                __fuse_val="${__fuse_val%"${__fuse_val##*[! 	]}"}"
                ;;
        esac
        export "$__fuse_key=$__fuse_val"
    done < "$HOME/.cursor/.env"
    unset __fuse_line __fuse_key __fuse_val
fi
