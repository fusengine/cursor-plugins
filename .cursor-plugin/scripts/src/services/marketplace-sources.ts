/**
 * Marketplace plugin source resolution
 * @description SRP: validate and resolve plugin entries declared in the repo's marketplace.json.
 * Ported 1:1 from marketplace-sources.mjs — this whole module IS the Cursor sparse-checkout fix
 * (commit c44bb82): plugins live as real per-plugin directories directly under
 * `.cursor-plugin/plugins/<name>`, and a source is only accepted once resolved to a physical,
 * non-symlink directory whose parent is that exact plugin root.
 */
import fs from "node:fs";
import path from "node:path";
import type {
	MarketplaceEntryInput,
	MarketplaceManifest,
	MarketplacePluginIdentity,
	PluginManifest,
	ResolvedMarketplacePlugin,
} from "../interfaces/marketplace";

const PLUGIN_ROOT = ".cursor-plugin/plugins";
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Validate one marketplace entry and return its flat identity and nested source. */
export function validateMarketplaceEntry(entry: unknown): MarketplacePluginIdentity {
	const record = entry as MarketplaceEntryInput | null | undefined;
	const name = record?.name;
	if (typeof name !== "string" || !SAFE_NAME.test(name) || path.basename(name) !== name) {
		throw new Error(`unsafe marketplace plugin name: ${String(name)}`);
	}
	const expectedSource = `${PLUGIN_ROOT}/${name}`;
	const source = record?.source;
	if (typeof source !== "string" || source !== expectedSource) {
		throw new Error(`unsafe marketplace plugin source: ${String(source)}`);
	}
	return { name, source: expectedSource };
}

/** Resolve declared plugin sources as real direct children of the marketplace plugin root. */
export function resolveMarketplacePlugins(
	repositoryRoot: string,
	marketplace: MarketplaceManifest | null | undefined,
): ResolvedMarketplacePlugin[] {
	const plugins = marketplace?.plugins;
	if (!Array.isArray(plugins)) throw new Error("marketplace plugins must be an array");
	const root = path.resolve(repositoryRoot);
	const physicalPluginRoot = fs.realpathSync(path.join(root, PLUGIN_ROOT));
	const seen = new Set<string>();
	return plugins.map((entry: unknown) => {
		const identity = validateMarketplaceEntry(entry);
		if (seen.has(identity.name)) throw new Error(`duplicate marketplace plugin name: ${identity.name}`);
		seen.add(identity.name);
		const source = path.join(root, identity.source);
		const sourceStat = fs.lstatSync(source);
		if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) {
			throw new Error(`invalid plugin source: ${identity.source}`);
		}
		const physicalSource = fs.realpathSync(source);
		if (path.dirname(physicalSource) !== physicalPluginRoot) {
			throw new Error(`plugin source escapes plugin root: ${identity.source}`);
		}
		const manifest = JSON.parse(
			fs.readFileSync(path.join(physicalSource, ".cursor-plugin", "plugin.json"), "utf8"),
		) as PluginManifest;
		if (manifest.name !== identity.name) throw new Error(`plugin identity mismatch: ${identity.name}`);
		return { name: identity.name, source: physicalSource };
	});
}
