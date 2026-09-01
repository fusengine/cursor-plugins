/**
 * Global installer path resolution.
 * @description SRP: resolve every filesystem path the global installer reads
 * or writes, and the tiny shared JSON-read helper, only.
 */
import fs from "node:fs";
import path from "node:path";
import type { GlobalPaths } from "../interfaces/global-install";

/**
 * Resolve every path the global installer operates on, rooted at the real
 * user home directory (or the test-injected source root override).
 * @param scriptDir - Directory of the calling module (`import.meta.dir`),
 * four levels below the repository root (`scripts/src/services`).
 */
export function resolveGlobalPaths(scriptDir: string): GlobalPaths {
	const repositoryRoot = path.resolve(scriptDir, "../../../..");
	const sourceRoot =
		process.env.NODE_ENV === "test" && process.env.FUSE_INSTALL_TEST_SOURCE_ROOT
			? path.resolve(process.env.FUSE_INSTALL_TEST_SOURCE_ROOT)
			: repositoryRoot;
	const homeInput = process.env.HOME || process.env.USERPROFILE;
	if (!homeInput || !fs.existsSync(homeInput)) {
		throw new Error("HOME or USERPROFILE must reference an existing directory");
	}
	const homeRoot = fs.realpathSync(homeInput);
	const cursorRoot = path.join(homeRoot, ".cursor");
	const pluginsRoot = path.join(cursorRoot, "plugins");
	const localRoot = path.join(pluginsRoot, "local");
	const rulesRoot = path.join(cursorRoot, "rules");
	const controlRoot = path.join(cursorRoot, ".fusengine-global");
	return {
		sourceRoot,
		homeRoot,
		cursorRoot,
		pluginsRoot,
		localRoot,
		rulesRoot,
		rulePath: path.join(rulesRoot, "fuse-global.mdc"),
		controlRoot,
		receiptPath: path.join(controlRoot, "receipt.json"),
		controlMarker: path.join(controlRoot, ".managed-by-fusengine"),
	};
}

/**
 * Read and parse one JSON file.
 * @param file - Absolute path to the JSON file.
 */
export function readGlobalJson<T>(file: string): T {
	return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}
