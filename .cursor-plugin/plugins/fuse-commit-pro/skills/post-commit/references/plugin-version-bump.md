# Plugin Version Bump Detail (Step M2)

Load when: doing Step M2 and you need the full per-plugin bump procedure for a Cursor marketplace.

For each modified plugin detected in Step M1:

1. Read `{name}/.cursor-plugin/plugin.json`
2. Increment PATCH version: `X.Y.Z` → `X.Y.(Z+1)`
3. Write the new version back to `plugin.json`

Then update the matching `plugins[]` entry's `version` in `.cursor-plugin/marketplace.json`. Cursor marketplaces have no `core[]` array.
