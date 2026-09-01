/**
 * Global installer receipt.
 * @description SRP: read/validate the global ownership receipt, and refuse to
 * overwrite a plugin or rule the user has modified since install, only.
 */
import fs from "node:fs";
import path from "node:path";
import { hashDirectory, hashFile } from "./global-artifacts";
import { readGlobalJson } from "./global-paths";
import type { GlobalPaths, GlobalPluginSource, GlobalReceipt } from "../interfaces/global-install";

/** Content written to the control marker file that proves Fusengine owns `controlRoot`. */
export const GLOBAL_CONTROL_MARKER_CONTENT = "fusengine cursor global installation\n";

/**
 * Read and validate the global receipt, or `null` when nothing is installed yet.
 * @param paths - Resolved global installer paths.
 */
export function readGlobalReceipt(paths: GlobalPaths): GlobalReceipt | null {
	if (!fs.existsSync(paths.controlRoot)) return null;
	if (!fs.existsSync(paths.receiptPath) || !fs.existsSync(paths.controlMarker)) {
		throw new Error(`refusing unowned global control directory: ${paths.controlRoot}`);
	}
	if (fs.readFileSync(paths.controlMarker, "utf8") !== GLOBAL_CONTROL_MARKER_CONTENT) {
		throw new Error(`invalid global ownership marker: ${paths.controlMarker}`);
	}
	const receipt = readGlobalJson<GlobalReceipt>(paths.receiptPath);
	if (receipt.version !== 1 || !receipt.plugins || typeof receipt.plugins !== "object") {
		throw new Error(`invalid global receipt: ${paths.receiptPath}`);
	}
	return receipt;
}

/**
 * Refuse to install over a plugin directory or rule file the receipt does not
 * already own with a matching content hash.
 * @param paths - Resolved global installer paths.
 * @param receipt - Prior receipt, or `null` on a first install.
 * @param plugins - Marketplace plugins about to be installed.
 */
export function preflightOwned(
	paths: GlobalPaths,
	receipt: GlobalReceipt | null,
	plugins: GlobalPluginSource[],
): void {
	for (const plugin of plugins) {
		const target = path.join(paths.localRoot, plugin.name);
		if (!fs.existsSync(target)) continue;
		const priorHash = receipt?.plugins?.[plugin.name];
		if (!priorHash) throw new Error(`refusing pre-existing global plugin: ${target}`);
		if (hashDirectory(target) !== priorHash) {
			throw new Error(`refusing to overwrite modified owned plugin: ${target}`);
		}
	}
	if (fs.existsSync(paths.rulePath)) {
		if (!receipt?.ruleHash) throw new Error(`refusing pre-existing global rule: ${paths.rulePath}`);
		if (hashFile(paths.rulePath) !== receipt.ruleHash) {
			throw new Error(`refusing to overwrite modified owned rule: ${paths.rulePath}`);
		}
	}
}
