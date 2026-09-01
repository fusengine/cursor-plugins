import fs from "node:fs";
import path from "node:path";

const pluginRoot = ".cursor-plugin/plugins";
const safeName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Validate one marketplace entry and return its flat identity and nested source. */
export function validateMarketplaceEntry(entry) {
  const name = entry?.name;
  if (typeof name !== "string" || !safeName.test(name) || path.basename(name) !== name) {
    throw new Error(`unsafe marketplace plugin name: ${String(name)}`);
  }
  const expectedSource = `${pluginRoot}/${name}`;
  if (typeof entry.source !== "string" || entry.source !== expectedSource) {
    throw new Error(`unsafe marketplace plugin source: ${String(entry.source)}`);
  }
  return { name, source: expectedSource };
}

/** Resolve declared plugin sources as real direct children of the marketplace plugin root. */
export function resolveMarketplacePlugins(repositoryRoot, marketplace) {
  if (!Array.isArray(marketplace?.plugins)) throw new Error("marketplace plugins must be an array");
  const root = path.resolve(repositoryRoot);
  const physicalPluginRoot = fs.realpathSync(path.join(root, pluginRoot));
  const seen = new Set();
  return marketplace.plugins.map((entry) => {
    const identity = validateMarketplaceEntry(entry);
    if (seen.has(identity.name)) throw new Error(`duplicate marketplace plugin name: ${identity.name}`);
    seen.add(identity.name);
    const source = path.join(root, identity.source);
    const sourceStat = fs.lstatSync(source);
    if (sourceStat.isSymbolicLink() || !sourceStat.isDirectory()) throw new Error(`invalid plugin source: ${identity.source}`);
    const physicalSource = fs.realpathSync(source);
    if (path.dirname(physicalSource) !== physicalPluginRoot) throw new Error(`plugin source escapes plugin root: ${identity.source}`);
    const manifest = JSON.parse(fs.readFileSync(path.join(physicalSource, ".cursor-plugin", "plugin.json"), "utf8"));
    if (manifest.name !== identity.name) throw new Error(`plugin identity mismatch: ${identity.name}`);
    return { name: identity.name, source: physicalSource };
  });
}
