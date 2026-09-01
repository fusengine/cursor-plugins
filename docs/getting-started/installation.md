# Installation and scope

## Prerequisites

- Cursor
- Node.js available to Cursor
- A clone of this repository

## macOS and Linux

Install globally for the current user:

```sh
./install.sh --dry-run
./install.sh
```

The no-argument command targets `~/.cursor/`, not the current repository.

Install into one repository only:

```sh
./install.sh --project /absolute/path/to/your-project --dry-run
./install.sh --project /absolute/path/to/your-project
```

## Windows PowerShell

```powershell
.\install.ps1 -DryRun
.\install.ps1
```

Use explicit project scope when needed:

```powershell
.\install.ps1 -Project C:\path\to\your-project -DryRun
.\install.ps1 -Project C:\path\to\your-project
```

PowerShell delegates to the same Node installer as the Bash entry point. The Bash integration
test proves the macOS/Linux path. PowerShell parity remains runtime-unverified until executed on
Windows.

## Global layout

```text
~/.cursor/
├── plugins/local/<plugin-name>/.cursor-plugin/plugin.json
├── rules/fuse-global.mdc
└── .fusengine-global/
    ├── .managed-by-fusengine
    └── receipt.json
```

Each marketplace plugin is copied as an immediate child of `plugins/local`; the marketplace root
is never installed as one plugin. Existing foreign plugin directories are preserved. Reinstall
refreshes only intact installer-owned copies and refuses modified or colliding targets.

## Project layout

```text
<project>/.cursor/
├── hooks.json
├── rules/fusengine.mdc
└── fusengine/
    ├── load-plugins.mjs
    ├── project-plugin-inventory.mjs
    ├── marketplace.json
    ├── install-receipt.json
    └── plugins/<plugin-name>/
```

Plugin files are copied into the project instead of linked to an external checkout. The project
therefore remains self-contained and the loader never depends on an external symlink target.

## Scope distinction

`<project>/.cursor/` is project scope. It applies only when Cursor opens that repository.

`~/.cursor/` on macOS/Linux and `%USERPROFILE%\.cursor\` on Windows are user-global scope and are
the default. `<project>/.cursor/` is selected only by `--project` or `-Project`. Both modes copy
plugin sources; neither depends on an external checkout symlink.

## Verification

```sh
bash tests/global-install.test.sh
bash tests/project-install.test.sh
bash tests/project-loader-containment.test.sh
bash tests/project-install-transaction.test.sh
bash tests/project-rule-update.test.sh
bash tests/project-uninstall-regressions.test.sh
./verify-project.sh /absolute/path/to/your-project
./verify.sh --repository-only
```

All integration tests use temporary projects and fake home directories.

## Uninstall

Remove only intact installer-owned global artifacts:

```sh
./install.sh --uninstall
```

Remove one project installation:

```sh
./install.sh --project /absolute/path/to/your-project --uninstall
```

Global uninstall preserves foreign or modified plugin directories and rules. Project uninstall
removes only its owned `workspaceOpen` entry, managed directory, and unchanged rule. Both modes
validate ownership and target types before destructive mutation.
