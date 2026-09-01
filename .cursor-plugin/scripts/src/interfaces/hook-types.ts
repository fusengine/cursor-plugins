/**
 * Hook Types - Supported Cursor hook event types
 *
 * @description SRP: Hook type definitions and registry only
 * @see https://cursor.com/docs/hooks
 */

/** Cursor hook events (camelCase, unlike Claude Code's PascalCase). */
export type HookType =
	| "sessionStart"
	| "sessionEnd"
	| "beforeSubmitPrompt"
	| "preToolUse"
	| "postToolUse"
	| "postToolUseFailure"
	| "subagentStart"
	| "subagentStop"
	| "beforeShellExecution"
	| "afterShellExecution"
	| "beforeMCPExecution"
	| "afterMCPExecution"
	| "beforeReadFile"
	| "afterFileEdit"
	| "preCompact"
	| "stop"
	| "afterAgentResponse"
	| "afterAgentThought";

/**
 * Registry of the hook types the installer wires to the loader.
 *
 * Tab events (`beforeTabFileRead`, `afterTabFileEdit`) and `workspaceOpen` are
 * deliberately absent: they fire outside an agent session, where the loader has
 * no conversation context to act on.
 */
export const HOOK_TYPES: HookType[] = [
	"sessionStart",
	"sessionEnd",
	"beforeSubmitPrompt",
	"preToolUse",
	"postToolUse",
	"postToolUseFailure",
	"subagentStart",
	"subagentStop",
	"beforeShellExecution",
	"afterShellExecution",
	"beforeMCPExecution",
	"afterMCPExecution",
	"beforeReadFile",
	"afterFileEdit",
	"preCompact",
	"stop",
	"afterAgentResponse",
	"afterAgentThought",
];
