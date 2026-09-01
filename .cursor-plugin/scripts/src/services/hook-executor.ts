/**
 * Hook execution service
 * @description SRP: execute hook commands, merge their parallel results, and
 * translate the merge into Cursor's per-event wire format.
 * @see https://cursor.com/docs/hooks — response schemas differ by event
 * (`permission`, `additional_context`, `followup_message`, `continue`).
 */
import type { ExecutableHook, HookResult } from "../interfaces/hooks";
import { parseHookCommand } from "../utils/command-parser";

/** Cursor permission verdict for blocking-capable events. */
type CursorPermission = "allow" | "ask" | "deny";

/**
 * Format-agnostic result of one (or several merged) hook invocations.
 * Populated by {@link parseHookOutcome} from either Claude Code's nested
 * `hookSpecificOutput` shape or Cursor's flat/snake_case shape, so this loader
 * keeps working whether the individual hook script has been migrated yet.
 */
interface HookOutcome {
	permission?: CursorPermission;
	/**
	 * Human-readable payload: additional context, a followup, or a deny reason.
	 * Always a string — empty when no hook emitted any, never `undefined`, so
	 * callers can test it without guarding.
	 */
	text: string;
	/** Rewritten tool input (`preToolUse` only). */
	updatedInput?: unknown;
}

/** Cursor's expected response kind per hook event. Unlisted events → no stdout. */
type EventKind = "permission" | "context" | "followup" | "continue";

/** @see https://cursor.com/docs/hooks — events without an entry emit no response body. */
const EVENT_KIND: Partial<Record<string, EventKind>> = {
	preToolUse: "permission",
	beforeShellExecution: "permission",
	beforeMCPExecution: "permission",
	beforeReadFile: "permission",
	subagentStart: "permission",
	postToolUse: "context",
	sessionStart: "context",
	beforeSubmitPrompt: "continue",
	stop: "followup",
	subagentStop: "followup",
};

/** Most restrictive permission wins when merging parallel hooks (deny > ask > allow). */
const PERMISSION_PRIORITY: Record<CursorPermission, number> = { deny: 2, ask: 1, allow: 0 };

/** Build spawn argv from a command, swapping literal "bun" for the running Bun binary. */
function toSpawnArgv(command: string): { argv: string[]; ignoreExit: boolean } {
	const { argv, ignoreExit } = parseHookCommand(command);
	if (argv[0] === "bun") argv[0] = process.execPath;
	return { argv, ignoreExit };
}

/** Execute a hook (shell-free) reproducing the previous `bash -c` semantics */
export async function executeHook(
	hook: ExecutableHook,
	input: string,
): Promise<HookResult> {
	const { argv, ignoreExit } = toSpawnArgv(hook.command);

	if (hook.isAsync) {
		try {
			await Bun.spawn(argv, { stdout: "ignore", stderr: "ignore" }).exited;
		} catch {
			// Fire-and-forget: a spawn failure (ENOENT) is ignored, as before.
		}
		return { success: true, exitCode: 0, stdout: "", stderr: "", blocked: false };
	}

	try {
		const proc = Bun.spawn(argv, {
			env: { ...process.env, CURSOR_PLUGIN_ROOT: hook.pluginPath },
			stdin: new TextEncoder().encode(input),
			stdout: "pipe",
			stderr: "pipe",
		});
		const rawExit = await proc.exited;
		// `|| true` swallows every non-zero exit (incl. 2) → effective 0, never blocked.
		const exitCode = ignoreExit ? 0 : rawExit;
		const stdout = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();
		return { success: exitCode === 0, exitCode, stdout, stderr, blocked: exitCode === 2 };
	} catch {
		// Spawn threw (ENOENT): bash would return a non-zero exit → non-blocking failure.
		// `bad-cmd || true` still yields success 0 under bash, so honour ignoreExit here too.
		return ignoreExit
			? { success: true, exitCode: 0, stdout: "", stderr: "", blocked: false }
			: { success: false, exitCode: 1, stdout: "", stderr: "", blocked: false };
	}
}

/**
 * Parse one hook's raw stdout into a neutral outcome. Reads both Claude Code's
 * nested `hookSpecificOutput.*` and Cursor's flat/snake_case fields so a hook
 * script still not migrated to Cursor's format keeps producing a usable result.
 */
function parseHookOutcome(stdout: string): HookOutcome {
	const trimmed = stdout.trim();
	if (!trimmed) return { text: "" };
	let json: Record<string, unknown>;
	try {
		json = JSON.parse(trimmed);
	} catch {
		return { text: "" };
	}
	const nested = (json.hookSpecificOutput ?? {}) as Record<string, unknown>;
	const permission = (nested.permissionDecision ?? json.permission) as CursorPermission | undefined;
	const text =
		(nested.additionalContext as string | undefined) ??
		(json.additional_context as string | undefined) ??
		(json.additionalContext as string | undefined) ??
		(json.followup_message as string | undefined) ??
		(nested.permissionDecisionReason as string | undefined) ??
		(json.user_message as string | undefined) ??
		(json.reason as string | undefined) ??
		(json.systemMessage as string | undefined);
	const updatedInput = nested.updatedInput ?? json.updated_input;
	return { permission, text: text ?? "", updatedInput };
}

/** Merge several parallel hooks' outcomes into one (deny-wins, messages concatenated). */
function mergeOutcomes(outcomes: HookOutcome[]): HookOutcome {
	let permission: CursorPermission | undefined;
	const texts: string[] = [];
	let updatedInput: unknown;
	for (const outcome of outcomes) {
		if (
			outcome.permission &&
			(!permission || PERMISSION_PRIORITY[outcome.permission] > PERMISSION_PRIORITY[permission])
		) {
			permission = outcome.permission;
		}
		if (outcome.text) texts.push(outcome.text);
		if (updatedInput === undefined) updatedInput = outcome.updatedInput;
	}
	return { permission, text: texts.join("\n"), updatedInput };
}

/** Execute a list of hooks in PARALLEL, merging their outcomes after the run. */
export async function executeHooks(
	hooks: ExecutableHook[],
	input: string,
): Promise<{ blocked: boolean; stderr: string; outcome: HookOutcome }> {
	if (hooks.length === 0) {
		return { blocked: false, stderr: "", outcome: { text: "" } };
	}

	const results = await Promise.all(hooks.map((hook) => executeHook(hook, input)));

	// Exit code 2 == `permission: "deny"` in both Claude Code and Cursor — keep hard-blocking.
	const blockedResult = results.find((r) => r.blocked);
	if (blockedResult) {
		return { blocked: true, stderr: blockedResult.stderr, outcome: { text: "" } };
	}

	const outcome = mergeOutcomes(
		results.filter((r) => r.stdout.trim()).map((r) => parseHookOutcome(r.stdout)),
	);
	const stderr = results.map((r) => r.stderr).filter((s) => s.trim()).join("\n");

	return { blocked: false, stderr, outcome };
}

/**
 * Translate a merged, format-agnostic hook outcome into Cursor's wire JSON for
 * the given event (never Claude Code's `hookSpecificOutput`/`systemMessage`).
 * Returns "" for events with no documented response schema (e.g. `afterFileEdit`),
 * matching "no response expected" — printing nothing is the correct behaviour.
 */
export function buildCursorResponse(
	hookType: string,
	outcome: { permission?: CursorPermission; text?: string; updatedInput?: unknown },
	stderr: string,
): string {
	const message = outcome.text ?? (stderr.trim() || undefined);
	switch (EVENT_KIND[hookType]) {
		case "permission": {
			const body: Record<string, unknown> = { permission: outcome.permission ?? "allow" };
			if (message) {
				body.user_message = message;
				body.agent_message = message;
			}
			if (outcome.updatedInput !== undefined) body.updated_input = outcome.updatedInput;
			return JSON.stringify(body);
		}
		case "context":
			return message ? JSON.stringify({ additional_context: message }) : "";
		case "followup":
			return message ? JSON.stringify({ followup_message: message }) : "";
		case "continue":
			return JSON.stringify({ continue: outcome.permission !== "deny" });
		default:
			return "";
	}
}
