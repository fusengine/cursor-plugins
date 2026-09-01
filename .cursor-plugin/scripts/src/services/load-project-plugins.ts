/**
 * Project-local plugin loader
 * @description SRP: validate the loader's own CLI arguments and resolve the stdout payload
 * for the Cursor `workspaceOpen` hook loader. Ported 1:1 from load-project-plugins.mjs —
 * the printed JSON shape (`{"pluginPaths":[...]}`) is a stdout contract consumed by a Cursor
 * hook, preserve exactly.
 */
import type { ProjectLoaderResponse } from "../interfaces/marketplace";
import { assertProjectManagedRoot, resolvePluginPaths } from "./plugin-inventory";

const OWNER_FLAG = /^--fusengine-owner=[a-f0-9]{16}$/;

/** Validate the loader's own argv (only an optional `--fusengine-owner=<hex16>` flag). */
export function validateLoaderArguments(loaderArguments: string[]): void {
	const first = loaderArguments[0];
	if (loaderArguments.length > 1 || (first && !OWNER_FLAG.test(first))) {
		throw new Error("unsupported loader argument");
	}
}

/** Assert the managed root and resolve the stdout payload printed by the loader. */
export function loadProjectPlugins(managedRoot: string, projectRoot: string): ProjectLoaderResponse {
	assertProjectManagedRoot(managedRoot, projectRoot);
	return { pluginPaths: resolvePluginPaths(managedRoot) };
}
