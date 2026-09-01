# Installation and scope

## Prerequisites

- Cursor
- Cursor CLI (`agent`)
- Git
- Node.js available to Cursor

## Marketplace registration and global installation

Run these commands from a directory where `cursor-plugins/` does not already
exist.

### macOS and Linux

```bash
agent plugin marketplace add https://github.com/fusengine/cursor-plugins.git
git clone --depth 1 https://github.com/fusengine/cursor-plugins.git
./cursor-plugins/install.sh --dry-run
./cursor-plugins/install.sh
```

### Windows PowerShell

```powershell
agent plugin marketplace add https://github.com/fusengine/cursor-plugins.git
git clone --depth 1 https://github.com/fusengine/cursor-plugins.git
.\cursor-plugins\install.ps1 -DryRun
.\cursor-plugins\install.ps1
```

Marketplace registration and bundled installation are distinct. The official
`agent plugin marketplace add` command registers `fusengine-plugins`; it does
not install the 24 plugins. The repository's installer performs the global
installation and defaults to `~/.cursor/` on macOS/Linux or
`%USERPROFILE%\.cursor\` on Windows. The cloned `cursor-plugins/` directory is
the installer source checkout, not a Cursor marketplace cache. Cursor does not
document a stable marketplace checkout path.

## Project scope

Project scope is optional and applies only to the target repository. Run the
commands below from the directory that contains the cloned `cursor-plugins/`
checkout.

### macOS and Linux project install

```sh
./cursor-plugins/install.sh --project /absolute/path/to/your-project --dry-run
./cursor-plugins/install.sh --project /absolute/path/to/your-project
```

### Windows PowerShell project install

```powershell
.\cursor-plugins\install.ps1 -Project C:\path\to\your-project -DryRun
.\cursor-plugins\install.ps1 -Project C:\path\to\your-project
```

PowerShell delegates to the same Node installer as the Bash entry point. The
Bash integration test proves the macOS/Linux path. PowerShell parity remains
runtime-unverified until executed on Windows.

## Global installation layout

```text
~/.cursor/
├── plugins/local/<plugin-name>/.cursor-plugin/plugin.json
├── rules/fuse-global.mdc
└── .fusengine-global/
    ├── .managed-by-fusengine
    └── receipt.json
```

The bundled installer copies each repository plugin as an immediate child of
`plugins/local`; the marketplace root is never installed as one plugin.
Existing foreign plugin directories are preserved. Reinstall refreshes only
intact installer-owned copies and refuses modified or colliding targets.

## Project installation layout

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

Plugin files are copied into the project instead of linked to an external
checkout. The project therefore remains self-contained and the loader never
depends on an external symlink target.

## Installer scope distinction

`<project>/.cursor/` is project scope. It applies only when Cursor opens that repository.

`~/.cursor/` on macOS/Linux and `%USERPROFILE%\.cursor\` on Windows are
user-global scope and are the default. `<project>/.cursor/` is selected only by
`--project` or `-Project`. Both modes copy plugin sources; neither depends on an
external checkout symlink.

## Verification

```sh
bash cursor-plugins/tests/global-install.test.sh
bash cursor-plugins/tests/project-install.test.sh
bash cursor-plugins/tests/project-loader-containment.test.sh
bash cursor-plugins/tests/project-install-transaction.test.sh
bash cursor-plugins/tests/project-rule-update.test.sh
bash cursor-plugins/tests/project-uninstall-regressions.test.sh
./cursor-plugins/verify-project.sh /absolute/path/to/your-project
./cursor-plugins/verify.sh --repository-only
```

All integration tests use temporary projects and fake home directories.

## Uninstall

Remove only intact installer-owned global artifacts:

```sh
./cursor-plugins/install.sh --uninstall
```

Remove one project installation:

```sh
./cursor-plugins/install.sh --project /absolute/path/to/your-project --uninstall
```

Global uninstall preserves foreign or modified plugin directories and rules.
Project uninstall removes only its owned `workspaceOpen` entry, managed
directory, and unchanged rule. Both modes validate ownership and target types
before destructive mutation.
