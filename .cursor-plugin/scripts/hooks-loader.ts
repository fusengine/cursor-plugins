#!/usr/bin/env bun
/**
 * hooks-loader.ts - Hook dispatcher entry point
 * Delegates to services for scanning and execution.
 *
 * @description Cursor invokes this as `bun <loader> <event>` (per `~/.cursor/hooks.json`),
 * piping the event's JSON payload on stdin and reading Cursor's per-event response shape
 * back from stdout. Input/output here follow Cursor's contract, never Claude Code's.
 * @see https://cursor.com/docs/hooks
 */
import { join } from "node:path";
import type { HookInput } from "./src/interfaces/hooks";
import { getManagedDepsTargets } from "./src/services/deps-targets";
import { ensureDeps } from "./src/services/ensure-deps";
import { buildCursorResponse, executeHooks } from "./src/services/hook-executor";
import { extractHooks, scanPlugins } from "./src/services/plugin-scanner";

const HOME = process.env.HOME || process.env.USERPROFILE || "";
const PLUGINS_DIR = join(
	HOME,
	".cursor/plugins/local",
);

/**
 * Cursor-only input field, absent from the (Claude Code-shaped) `HookInput` interface.
 * Extended locally instead of editing `src/interfaces/hooks.ts`, which is out of this
 * file's exclusive ownership.
 * @see https://cursor.com/docs/hooks — `subagentStart`/`subagentStop` payloads carry
 * `subagent_type`; Claude Code's `agent_type` does not exist in Cursor's contract.
 */
type CursorHookInput = HookInput & { subagent_type?: string };

async function main(): Promise<void> {
	const hookType = process.argv[2];
	if (!hookType) process.exit(0);

	// Self-heal FIRST: a marketplace re-checkout wipes gitignored node_modules
	// (scripts/, plugins/ shared harness, plugins/core-guards/statusline).
	// Every import above is builtins/relative-source-only (verified: hook-executor
	// and plugin-scanner pull zero third-party packages), so this is safe to run
	// before any hook-scanning logic — no third-party import can crash first.
	await ensureDeps(getManagedDepsTargets(import.meta.dir, PLUGINS_DIR));

	// Read input (may be empty for sessionStart, stop, etc.)
	const rawInput = await Bun.stdin.text();

	// Parse input or use empty object
	let input: CursorHookInput = {};
	if (rawInput.trim()) {
		try {
			input = JSON.parse(rawInput);
		} catch {
			// Continue with empty input
		}
	}

	const toolName = input.tool_name ?? "";
	const agentType = input.subagent_type ?? "";

	// DEBUG: Log subagentStart/subagentStop payload
	if (hookType === "subagentStart" || hookType === "subagentStop") {
		const { mkdirSync, appendFileSync } = await import("node:fs");
		const debugDir = join(HOME, ".cursor/fusengine-cache");
		mkdirSync(debugDir, { recursive: true });
		appendFileSync(join(debugDir, "subagent-debug.log"),
			`${new Date().toISOString()} ${hookType} subagent_type="${agentType}" raw=${JSON.stringify(input)}\n`);
	}

	// Scan plugins
	const plugins = scanPlugins({ pluginsDir: PLUGINS_DIR });

	// Extract matching hooks. Cursor has no "notification" event (Claude Code-only),
	// so that matcher branch in extractHooks is unreachable here — pass "" (dead arg).
	const hooks = extractHooks(plugins, hookType, toolName, "", agentType);

	// No matching hooks → exit early
	if (hooks.length === 0) process.exit(0);

	// Execute hooks (pass rawInput or empty JSON)
	const result = await executeHooks(hooks, rawInput || "{}");

	// Hard block: exit code 2 from any hook == `permission: "deny"` in Cursor too.
	if (result.blocked) {
		console.error(result.stderr);
		process.exit(2);
	}

	// Translate to Cursor's per-event response shape (never Claude Code's
	// `hookSpecificOutput`/`systemMessage`). Empty string → print nothing, which
	// is correct for events with no documented response schema (e.g. `afterFileEdit`).
	const stdout = buildCursorResponse(hookType, result.outcome, result.stderr);
	if (stdout) console.log(stdout);
}

main().catch(() => process.exit(0));
