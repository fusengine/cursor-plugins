# Migration and compatibility notes

## Origin

The collection was adapted from the Fusengine Claude Code plugin ecosystem. That history explains
why some plugin documentation discusses compatibility inputs or migration decisions. The public
Cursor quickstart and installation contract are Cursor-native.

## Cursor-specific delivery

The original ecosystem's installation paths and hook schemas are not reused. Cursor delivery uses:

- `.cursor-plugin/marketplace.json` for the marketplace inventory;
- one `.cursor-plugin/plugin.json` inside every individual plugin root;
- native Cursor hook event names in each `hooks/hooks.json`;
- a project-level `.cursor/hooks.json` `workspaceOpen` loader;
- project-local `.cursor/rules/fusengine.mdc` rule delivery.

The project installer copies plugin roots below the target repository. It does not install into a
Claude directory, does not write to Cursor's global user directory, and does not treat a marketplace
root as a recursively loaded plugin.

## Preserved compatibility content

Some files intentionally mention Claude when they document a source mapping, a compatibility input,
or a historical limitation. Such references are evidence, not installation instructions. Executable
Cursor paths and commands must remain Cursor-native.

Detailed port rationale remains in plugin-level READMEs, the
[harness adapter analysis](harness/cursor-runtime-analysis-part-1.md), and
`docs/harness-cursor-fix-prompt.md`. The harness prompt is a proposal for its separate repository;
it is not executed or modified by the project installer.

## Runtime limits

Repository tests prove static structure and the loader contract. They do not prove that every Cursor
build delivers every lifecycle event. Confirm runtime activation in Cursor's Plugins view and logs
after reloading the window.
