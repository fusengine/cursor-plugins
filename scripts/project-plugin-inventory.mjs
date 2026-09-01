import fs from "node:fs";
import path from "node:path";

function requireRealPath(target, kind) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || (kind === "directory" ? !stat.isDirectory() : !stat.isFile())) {
    throw new Error(`${target} must be a real ${kind}, not a symlink`);
  }
}

/** Require the loader to be the physical managed root below the current project. */
export function assertProjectManagedRoot(managedRoot, projectRoot) {
  const cursorRoot = path.resolve(projectRoot, ".cursor");
  const projectManagedRoot = path.join(cursorRoot, "fusengine");
  requireRealPath(cursorRoot, "directory");
  requireRealPath(projectManagedRoot, "directory");
  if (fs.realpathSync(projectManagedRoot) !== fs.realpathSync(managedRoot)) {
    throw new Error("loader must run from its physical project-local managed root");
  }
}

/** Resolve exactly the safe physical plugin roots declared by an installed marketplace. */
export function resolvePluginPaths(managedRoot) {
  const pluginsRoot = path.join(managedRoot, "plugins");
  const marketplacePath = path.join(managedRoot, "marketplace.json");
  requireRealPath(managedRoot, "directory");
  requireRealPath(pluginsRoot, "directory");
  requireRealPath(marketplacePath, "file");
  const pluginsRootPhysical = fs.realpathSync(pluginsRoot);
  const marketplace = JSON.parse(fs.readFileSync(marketplacePath, "utf8"));
  if (!Array.isArray(marketplace.plugins)) throw new Error("installed marketplace plugins must be an array");

  const seen = new Set();
  return marketplace.plugins.map((entry) => {
    const source = entry?.source;
    if (typeof source !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(source) || path.basename(source) !== source) {
      throw new Error(`unsafe marketplace plugin source: ${String(source)}`);
    }
    if (seen.has(source)) throw new Error(`duplicate marketplace plugin source: ${source}`);
    seen.add(source);
    const pluginPath = path.join(pluginsRoot, source);
    requireRealPath(pluginPath, "directory");
    const pluginPhysical = fs.realpathSync(pluginPath);
    if (path.dirname(pluginPhysical) !== pluginsRootPhysical) throw new Error(`plugin root resolves outside managed plugins: ${source}`);
    const metadataPath = path.join(pluginPath, ".cursor-plugin");
    requireRealPath(metadataPath, "directory");
    const manifestPath = path.join(metadataPath, "plugin.json");
    requireRealPath(manifestPath, "file");
    const plugin = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (plugin.name !== entry.name || entry.name !== source) throw new Error(`plugin identity mismatch: ${source}`);
    return pluginPhysical;
  });
}
