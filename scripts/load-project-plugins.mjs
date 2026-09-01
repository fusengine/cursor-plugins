#!/usr/bin/env node
/** Cursor workspaceOpen loader for the project-local Fusengine plugins. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProjectManagedRoot, resolvePluginPaths } from "./project-plugin-inventory.mjs";

const loaderArguments = process.argv.slice(2);
if (loaderArguments.length > 1 || (loaderArguments[0] && !/^--fusengine-owner=[a-f0-9]{16}$/.test(loaderArguments[0]))) {
  throw new Error("unsupported loader argument");
}
const managedRoot = path.dirname(fileURLToPath(import.meta.url));
assertProjectManagedRoot(managedRoot, process.cwd());
const pluginPaths = resolvePluginPaths(managedRoot);
process.stdout.write(`${JSON.stringify({ pluginPaths })}\n`);
