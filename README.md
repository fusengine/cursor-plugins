# Fusengine Cursor Plugins

![version](https://img.shields.io/badge/version-0.0.1-blue?style=flat-square)
![plugins](https://img.shields.io/badge/plugins-24-brightgreen?style=flat-square)
![runtime](https://img.shields.io/badge/runtime-Cursor%20CLI-black?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

> **Cursor plugin marketplace.** 24 expert plugins for APEX workflows, SOLID/DRY
> enforcement, framework guidance, security, design, Git, SEO, and code quality.

## Quick install

```bash
# Register the marketplace
agent plugin marketplace add https://github.com/fusengine/cursor-plugins.git

# Clone the sources and run the bundled global installer
git clone --depth 1 https://github.com/fusengine/cursor-plugins.git
./cursor-plugins/install.sh --dry-run
./cursor-plugins/install.sh
```

Windows PowerShell:

```powershell
agent plugin marketplace add https://github.com/fusengine/cursor-plugins.git
git clone --depth 1 https://github.com/fusengine/cursor-plugins.git
.\cursor-plugins\install.ps1 -DryRun
.\cursor-plugins\install.ps1
```

These are two distinct steps: `agent plugin marketplace add` registers
`fusengine-plugins`; it does not install the plugins. The bundled installer then
installs them globally for the current user. Its default target is `~/.cursor/`
on macOS/Linux or `%USERPROFILE%\.cursor\` on Windows. The cloned
`cursor-plugins/` directory is the source checkout, not Cursor's marketplace
cache.

**Prerequisites:** Cursor CLI, Git, and Node.js available to Cursor. For project
scope, detailed installation, and filesystem layouts, see
[Installation and scope](docs/getting-started/installation.md).

## Documentation

- [Documentation index](docs/README.md)
- [Installation and scope](docs/getting-started/installation.md)
- [Global installation architecture](docs/reference/global-installation.md)
- [Project loader and hooks](docs/reference/project-loader.md)
- [Migration and compatibility notes](docs/reference/migration-compatibility.md)
- [Port audit summary](docs/reference/port-audit.md)

## License

MIT
