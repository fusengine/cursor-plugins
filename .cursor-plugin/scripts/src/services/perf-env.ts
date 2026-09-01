/**
 * Legacy perf env-var bookkeeping service (Claude Code carry-over).
 *
 * @description Single Responsibility: persist a handful of `CLAUDE_CODE_*` /
 * `DISABLE_AUTOUPDATER` flags into `settings.env`, a field of THIS installer's
 * own private store (`~/.cursor/.fusengine-global/settings.json`, see
 * `settings-manager.ts`). That store is bookkeeping only: Cursor's CLI's
 * primary runtime config lives in `~/.cursor/cli-config.json`
 * (https://cursor.com/docs/cli/reference/configuration; the only other CLI
 * config surface, project-level `.cursor/cli.json`, carries permissions
 * only, and `CURSOR_CONFIG_DIR` / `XDG_CONFIG_HOME` merely relocate the
 * file) — none of those has an `env` block or any of these keys. Cursor's
 * IDE does have its own VS Code-inherited `settings.json`
 * (`~/Library/Application Support/Cursor/User/settings.json` on macOS), but
 * it holds editor preferences, not agent/hook config, so none of these keys
 * map there either. So every option below is currently INERT for
 * Cursor — writing it only records user intent in our own file, it does not
 * change any Cursor behavior. Verified against the CLI config schema and
 * https://cursor.com/docs/subagents (2026-09-01); kept per explicit "no
 * function removal" mandate rather than deleted.
 *
 * One option (`CLAUDE_CODE_ATTRIBUTION_HEADER`) DOES have a real Cursor
 * equivalent (`attribution.attributeCommitsToAgent` /
 * `attribution.attributePRsToAgent`, booleans in `cli-config.json`, default
 * `true`) — see its `hint` below. Wiring it requires a `cli-config.json`
 * reader/writer, which is a new file outside this service's exclusive scope;
 * flagged as a follow-up rather than silently left unmentioned.
 */
import * as p from "@clack/prompts";
import type { Settings } from "./settings-manager";

/**
 * Legacy perf env vars, kept for backward-compat bookkeeping only.
 * `defaultOn` entries are recorded at install time. None of these currently
 * change Cursor's runtime behavior — see the module JSDoc above.
 */
export const PERF_ENV_OPTIONS = [
	{
		value: "CLAUDE_CODE_ENABLE_TODO_TOOLS",
		label: "Task tools (TaskCreate/TaskGet/TaskList/TaskUpdate)",
		hint: "Inert on Cursor: no cli-config.json/env-var gate exists for this. Cursor's Task/subagent tooling (parallel + background subagents) runs by default — see cursor.com/docs/subagents. Kept for bookkeeping only.",
		envValue: "1",
		defaultOn: true,
	},
	{
		value: "CLAUDE_CODE_FORK_SUBAGENT",
		label: "Fork subagent prompt cache",
		hint: "Inert on Cursor: no documented cli-config.json/env-var control for subagent prompt-cache inheritance. Kept for bookkeeping only.",
		envValue: "1",
		defaultOn: false,
	},
	{
		value: "CLAUDE_CODE_ATTRIBUTION_HEADER",
		label: "Strip attribution header",
		hint: "Inert here (settings.env is never read by Cursor). Real Cursor equivalent: attribution.attributeCommitsToAgent / attribution.attributePRsToAgent (booleans, default true) in ~/.cursor/cli-config.json — not yet wired, needs a dedicated cli-config.json writer.",
		envValue: "0",
		defaultOn: false,
	},
	{
		value: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
		label: "Disable all non-essential traffic",
		hint: "Inert on Cursor: no documented cli-config.json/env-var equivalent to bulk-disable telemetry/autoupdate/feedback. Kept for bookkeeping only.",
		envValue: "1",
		defaultOn: false,
	},
	{
		value: "DISABLE_AUTOUPDATER",
		label: "Disable autoupdater only",
		hint: "Inert here: Cursor's own switch is the `--disable-auto-update` CLI launch flag, not an env var or cli-config.json field, so this stored value has no effect. Kept for bookkeeping only.",
		envValue: "1",
		defaultOn: false,
	},
] as const;

/** Env vars enabled out of the box; the prompt lets the user opt OUT of them. */
export const DEFAULT_ON_PERF_ENV: readonly string[] = PERF_ENV_OPTIONS.filter(
	(o) => o.defaultOn,
).map((o) => o.value);

const PERF_ASKED_MARKER = "_FUSENGINE_PERF_ASKED";
const PERF_DEFAULTS_MARKER = "_FUSENGINE_PERF_DEFAULTS";

/**
 * Turn ON every `defaultOn` option, once per install.
 *
 * Runs BEFORE the "already asked" short-circuit so existing installs (which
 * already carry PERF_ASKED_MARKER) still receive newly-added defaults. The
 * dedicated marker makes it one-shot: a user who later unticks the option in
 * the prompt keeps it off instead of having it re-imposed on every re-run.
 *
 * @param settings - Settings object mutated in place
 * @returns The same settings, with defaults applied and the marker set
 */
export function applyDefaultPerfEnv(settings: Settings): Settings {
	const env = (settings.env as Record<string, string>) || {};
	if (env[PERF_DEFAULTS_MARKER] === "1") return settings;
	for (const opt of PERF_ENV_OPTIONS) {
		if (opt.defaultOn && env[opt.value] === undefined) {
			env[opt.value] = opt.envValue;
		}
	}
	env[PERF_DEFAULTS_MARKER] = "1";
	settings.env = env;
	return settings;
}

/** Read currently-enabled perf env vars from settings */
export function getEnabledPerfEnv(settings: Settings): string[] {
	const env = (settings.env as Record<string, string>) || {};
	return PERF_ENV_OPTIONS.filter((o) => env[o.value] === o.envValue).map(
		(o) => o.value,
	);
}

/** True if the perf env prompt has already been answered */
export function isPerfEnvAsked(settings: Settings): boolean {
	const env = settings.env as Record<string, string> | undefined;
	return env?.[PERF_ASKED_MARKER] === "1";
}

/** Apply selected perf env vars; remove unselected ones; mark as asked */
export function configurePerfEnv(
	settings: Settings,
	selectedKeys: readonly string[],
): Settings {
	const env = (settings.env as Record<string, string>) || {};
	for (const opt of PERF_ENV_OPTIONS) {
		if (selectedKeys.includes(opt.value)) env[opt.value] = opt.envValue;
		else delete env[opt.value];
	}
	env[PERF_ASKED_MARKER] = "1";
	settings.env = env;
	return settings;
}

/**
 * Interactive prompt: ask user which legacy perf flags to record.
 *
 * @remarks The prompt copy is deliberately honest: none of these flags are
 * read by Cursor today (see module JSDoc) — this only stores a preference.
 */
export async function promptPerfEnv(settings: Settings): Promise<Settings> {
	settings = applyDefaultPerfEnv(settings);
	if (isPerfEnvAsked(settings)) {
		p.log.info("Perf flags already recorded (skipping prompt)");
		return settings;
	}
	const wants = await p.confirm({
		message:
			"Record legacy perf flags? (bookkeeping only - not read by Cursor today)",
		initialValue: true,
	});
	if (p.isCancel(wants) || !wants) return settings;

	const choices = await p.multiselect({
		message: "Select legacy perf flags to record (see hints for Cursor status):",
		options: PERF_ENV_OPTIONS.map((o) => ({
			value: o.value,
			label: o.label,
			hint: o.hint,
		})),
		initialValues: getEnabledPerfEnv(settings),
		required: false,
	});
	if (p.isCancel(choices)) return settings;

	const keys = choices as string[];
	const updated = configurePerfEnv(settings, keys);
	p.log.success(`Perf flags recorded (${keys.length} selected)`);
	return updated;
}
