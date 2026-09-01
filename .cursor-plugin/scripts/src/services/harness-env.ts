/**
 * Harness env service
 * Single Responsibility: point @fusengine/harness at every plugin's SOLID
 * reference dir — FUSE_HARNESS_REFS is a path-delimiter list of dirs (no copying,
 * no aggregation): the harness scans each one directly. Persisted to
 * ~/.cursor/.env (not settings.json — the harness loads .env directly).
 */
import { readdirSync, existsSync } from "node:fs";
import { join, delimiter } from "node:path";
import * as p from "@clack/prompts";
import { upsertEnvVar } from "./env-file";
import type { Settings } from "./settings-manager";

/** readdirSync that returns [] instead of throwing on a missing dir. */
function readEntries(dir: string): string[] {
	try {
		return readdirSync(dir);
	} catch {
		return [];
	}
}

/** Every existing plugins/<plugin>/skills/solid-<x>/references directory. */
function solidRefDirs(pluginsDir: string): string[] {
	const dirs: string[] = [];
	for (const plugin of readEntries(pluginsDir)) {
		for (const skill of readEntries(join(pluginsDir, plugin, "skills"))) {
			if (!skill.startsWith("solid-")) continue;
			const refs = join(pluginsDir, plugin, "skills", skill, "references");
			if (existsSync(refs)) dirs.push(refs);
		}
	}
	return dirs;
}

/**
 * Set FUSE_HARNESS_REFS (~/.cursor/.env) to every solid-* refs dir.
 *
 * Takes the plugins directory directly instead of deriving it: Cursor deploys
 * plugins flat under `~/.cursor/plugins/local`, so `join(marketplace,"plugins")`
 * landed one level short and silently produced an empty ref list.
 * @param settings - Passed through unchanged.
 * @param pluginsDir - Absolute directory holding the deployed plugins.
 * @returns The same settings object.
 */
export function setHarnessRefs(settings: Settings, pluginsDir: string): Settings {
	const dirs = solidRefDirs(pluginsDir);
	upsertEnvVar("FUSE_HARNESS_REFS", dirs.join(delimiter));
	p.log.success(`Harness SOLID refs set (${dirs.length} skill dirs, FUSE_HARNESS_REFS)`);
	return settings;
}
