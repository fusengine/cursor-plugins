# Fusengine plugins for Cursor

An ecosystem of 24 Cursor plugins for supervised engineering workflows, framework guidance,
security, design, Git, SEO, and code-quality checks.

## Quick install

Install for every Cursor workspace owned by the current user:

```sh
./install.sh --dry-run
./install.sh
```

The default scope is `~/.cursor/`: 24 individual plugin roots are copied directly below
`~/.cursor/plugins/local/`, and the global rule is copied to `~/.cursor/rules/fuse-global.mdc`.

To install into only one repository, use the explicit project mode:

```sh
./install.sh --project /absolute/path/to/your-project
```

Reload Cursor after installation. Node.js is required by the installer and plugin hooks.

## How it works

```text
Global:  ~/.cursor/plugins/local/<plugin-name> → Cursor loads 24 plugin roots
Project: workspaceOpen → project-local loader → Cursor loads 24 plugin roots
Runtime: plugin hooks → @fusengine/harness
```

The harness runs hook mechanics after plugin discovery; it does not install the plugins.

## Documentation

- [Documentation index](docs/README.md)
- [Installation and scope](docs/getting-started/installation.md)
- [Global installation architecture](docs/reference/global-installation.md)
- [Project loader and hooks](docs/reference/project-loader.md)
- [Migration and compatibility notes](docs/reference/migration-compatibility.md)
- [Port audit summary](docs/reference/port-audit.md)

## License

MIT
