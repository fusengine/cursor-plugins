# Changelog

## [0.1.1] - 01-09-2026

- refactor(installer)!: installer engine ported to TypeScript/bun — no `.mjs` left under
  `.cursor-plugin/scripts/`. Single entry point `install-hooks.ts`, which spawns the deploy engine
  (`src/services/global-install.ts` or `project-install.ts`) then runs the configuration stage
- chore(installer)!: prerequisite changed from Node.js to Bun (`curl -fsSL https://bun.sh/install | bash`);
  CLI options unchanged (`--dry-run`, `--uninstall`, `--project <path>`, `--skip-env`), as are the
  transactional guarantees (rollback, per-plugin hashes in `receipt.json`, ownership preflight, symlink guard)
- fix(mcp): MCP servers are now written directly to `~/.cursor/mcp.json` (non-destructive merge,
  API keys via `${env:NAME}`) — the port previously shelled out to `claude mcp add-json`, which is
  Claude Code's CLI, not Cursor's, so it installed nothing
- fix(hooks): the loader is wired into `~/.cursor/hooks.json` with camelCase Cursor events, verified
  against the Cursor 3.18.25 bundle — it previously targeted a `settings.json` Cursor never reads
- fix(rules): global instructions ship as `~/.cursor/rules/fuse-global.mdc` (`alwaysApply: true`,
  hashed in `receipt.json`). Cursor only recognises `AGENTS.md` at the root of a workspace folder,
  so a copy under `~/.cursor/` was never read
- feat(harness): every plugin embeds `scripts/hook.sh`, invoked through a relative path as the Cursor
  submission checklist requires; it resolves the shared harness (vendored binary → self-heal
  `bun install` → pinned `npx`) and tracks the `latest` release, so the plugin also works when
  installed from the marketplace, where no installer ever runs
- fix(installer): `--project` no longer exits 1 on a fresh `$HOME`. It used to fall through to the
  global setup stage, which scans `~/.cursor/plugins/local`; on a missing directory `find` exits 1
  and Bun's `$` turns that into an uncaught throw, so the command failed even though the project
  deploy had already succeeded. Project mode now stops after its own deploy, and a missing directory
  is no longer an error for `makeScriptsExecutable`
- fix(uninstall): `--uninstall` now removes the whole `~/.cursor/.fusengine-global` control root.
  It used to leave ~50 files behind for good — the deployed hook loader and its `src/` tree, plus the
  harness `node_modules` the wrapper self-installs there: the receipt only tracks plugins and the rule,
  so nothing could reclaim them, and a non-recursive `rmdir` failed silently on the non-empty directory.
  User plugins, a modified rule, `~/.cursor/.env` and the hooks/MCP config are untouched, as before
- fix(installer): `.DS_Store` is no longer copied into the deployed loader tree
- fix(env): `FUSE_HARNESS_REFS` now scans `~/.cursor/plugins/local` — it was one level short and
  silently produced an empty list
- chore(repo): added `.gitignore` (`node_modules` ignored, `bun.lock` committed) and the missing
  `.mdc` frontmatter on 12 plugin rules that were therefore never auto-applied

## [1.39.26] - 01-09-2026

- Fixed marketplace sparse checkout installation (24 plugin versions bumped)

## [0.0.1] - 01-09-2026

- docs(install): document Cursor marketplace setup

## [0.0.1] - 01-09-2026

- fix(installer): install Cursor plugins in correct scopes
