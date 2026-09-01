/**
 * Marketplace and managed-plugin type definitions
 * @description SRP: shared shapes for marketplace.json, plugin.json, and the project-local
 * loader's I/O. Consumed by marketplace-sources.ts, plugin-inventory.ts, and
 * load-project-plugins.ts.
 */

/** Marketplace manifest shape (`marketplace.json`), as read from disk — untrusted until validated. */
export interface MarketplaceManifest {
	plugins?: unknown;
}

/** Raw marketplace plugin entry, as read from JSON — untrusted until validated. */
export interface MarketplaceEntryInput {
	name?: unknown;
	source?: unknown;
}

/** Validated identity of a marketplace plugin: a safe name and its declared relative source. */
export interface MarketplacePluginIdentity {
	name: string;
	source: string;
}

/** A marketplace plugin resolved to its physical, verified source directory. */
export interface ResolvedMarketplacePlugin {
	name: string;
	source: string;
}

/** Plugin manifest shape (`.cursor-plugin/plugin.json`), as read from disk — untrusted until validated. */
export interface PluginManifest {
	name?: unknown;
}

/** stdout contract printed by the project-local loader (consumed by a Cursor `workspaceOpen` hook). */
export interface ProjectLoaderResponse {
	pluginPaths: string[];
}
