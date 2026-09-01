/**
 * Settings management service
 * Single Responsibility: Read/write ~/.cursor/.fusengine-global/settings.json
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { HOOK_TYPES } from "../interfaces/hooks";
import { mergeHookType } from "./hook-merge";

export {
	SUPPORTED_LANGUAGES,
	DEFAULT_LANGUAGE,
	configureDefaults,
	promptLanguage,
} from "./settings-language";

export interface Settings {
	language?: string;
	attribution?: { commit: string; pr: string };
	hooks?: Record<string, unknown[]>;
	statusLine?: { type: string; command: string; padding: number };
	[key: string]: unknown;
}

/** Load existing settings */
export async function loadSettings(path: string): Promise<Settings> {
	if (!existsSync(path)) return {};
	return await Bun.file(path).json();
}

/** Save settings */
export async function saveSettings(
	path: string,
	settings: Settings,
): Promise<void> {
	mkdirSync(dirname(path), { recursive: true });
	await Bun.write(path, `${JSON.stringify(settings, null, 2)}\n`);
}

/** Create a settings backup */
export function backupSettings(path: string): void {
	if (!existsSync(path)) return;
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
	copyFileSync(path, `${path}.backup.${timestamp}`);
}

/** Absolute path of Cursor's user-scoped hooks file. */
export function userHooksPath(): string {
	const home = process.env.HOME || process.env.USERPROFILE || "";
	return join(home, ".cursor", "hooks.json");
}

/**
 * Configure fusengine hooks in Cursor's own `~/.cursor/hooks.json`.
 *
 * Cursor reads its hooks from that file (schema `{version:1, hooks:{...}}`) and
 * never from a settings.json, so the loader is wired there. For each managed
 * hook type the previous loader entry is replaced and any user-authored entry
 * is preserved in place. Idempotent: re-running yields no duplicates.
 *
 * @param loaderPath - Absolute path to hooks-loader.ts.
 * @param hooksPath - Target hooks.json; defaults to the user-scoped one.
 * @returns The number of hook events wired.
 */
export function configureHooks(
	loaderPath: string,
	hooksPath: string = userHooksPath(),
): number {
	let doc: { version?: number; hooks?: Record<string, unknown[]> } = {};
	if (existsSync(hooksPath)) {
		try {
			doc = JSON.parse(readFileSync(hooksPath, "utf8"));
		} catch {
			doc = {};
		}
	}

	const hooks = doc.hooks ?? {};
	for (const hookType of HOOK_TYPES) {
		hooks[hookType] = mergeHookType(hooks[hookType], loaderPath, hookType);
	}

	const next = { ...doc, version: 1, hooks };
	const temp = `${hooksPath}.fusengine-${process.pid}`;
	mkdirSync(dirname(hooksPath), { recursive: true });
	writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`);
	renameSync(temp, hooksPath);
	return HOOK_TYPES.length;
}

/**
 * Record the "Agent Teams" preference — Claude Code carry-over, inert on Cursor.
 *
 * @remarks `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is written into
 * `settings.env`, a field of this installer's own private store
 * (`~/.cursor/.fusengine-global/settings.json`). Cursor's CLI never reads
 * that file — its primary runtime config is `~/.cursor/cli-config.json`
 * (https://cursor.com/docs/cli/reference/configuration; the only other CLI
 * config surface, project-level `.cursor/cli.json`, carries permissions
 * only), and neither has an `env` block or an "Agent Teams" concept at all.
 * Cursor's actual multi-agent
 * feature is Subagents (parallel + background execution, on by default, no
 * flag needed — https://cursor.com/docs/subagents), so there is nothing to
 * "enable" here for Cursor. Kept per explicit "no function removal" mandate;
 * this call only records a preference in our own bookkeeping file. The
 * "Enable Agent Teams? (beta)" prompt copy that overclaims this lives in
 * `setup-runner.ts`, outside this file's scope — flagged for a follow-up fix.
 *
 * @param settings - Settings object mutated in place.
 * @returns The same settings, with the bookkeeping flag set.
 */
export function enableAgentTeams(settings: Settings): Settings {
	const env = (settings.env as Record<string, string>) || {};
	env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = "1";
	settings.env = env;
	return settings;
}

/**
 * Check whether the (inert, see {@link enableAgentTeams}) Agent Teams
 * bookkeeping flag was previously recorded.
 *
 * @param settings - Settings object to inspect.
 * @returns `true` if the flag is set in `settings.env`.
 */
export function isAgentTeamsEnabled(settings: Settings): boolean {
	const env = settings.env as Record<string, string> | undefined;
	return env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === "1";
}

/**
 * Record a command-based statusline — Claude Code carry-over, inert on Cursor.
 *
 * @remarks This writes the Claude Code `settings.json` statusLine schema
 * (`{type: "command", command, padding}`, a script Claude Code spawns and
 * reads stdout from) into this installer's own private store. Cursor has no
 * such mechanism in the IDE, and its CLI statusline is controlled purely by
 * booleans in `~/.cursor/cli-config.json`
 * (`display.showStatusIndicators`, `display.showStatusLineRunningTime` —
 * https://cursor.com/docs/cli/reference/configuration), not by spawning an
 * external command. So the object written here has no effect on Cursor.
 * Kept per explicit "no function removal" mandate and to avoid breaking the
 * existing `configureStatusLine` test contract; wiring the real Cursor
 * booleans needs a `cli-config.json` reader/writer, out of this file's
 * exclusive scope — flagged for a follow-up fix.
 *
 * @param settings - Settings object mutated in place.
 * @param statuslineDir - Directory holding the statusline script to record.
 * @returns The same settings, with `statusLine` set if it was absent.
 */
export function configureStatusLine(
	settings: Settings,
	statuslineDir: string,
): Settings {
	if (!settings.statusLine) {
		settings.statusLine = {
			type: "command",
			command: `bun ${statuslineDir}/src/index.ts`,
			padding: 0,
		};
	}
	return settings;
}
