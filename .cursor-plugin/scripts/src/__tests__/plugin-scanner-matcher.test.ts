/**
 * Tests for matcher filtering in extractHooks — per-event target selection.
 * Split out of plugin-scanner.test.ts (file-size limit), mirroring the existing
 * plugin-scanner-home-resolution.test.ts split convention.
 *
 * Fixtures use Cursor's FLAT entry shape (`{ command, matcher? }`), the only one a
 * plugin `hooks.json` carries. They previously used Claude Code's nested
 * `hooks: [{ type, command }]`, which kept this suite green against a shape the
 * production never produces — while extractHooks crashed on every real manifest.
 * @see https://cursor.com/docs/hooks — "Available matchers by hook"
 */
import { describe, expect, test } from "bun:test";
import { extractHooks } from "../services/plugin-scanner";

const TEST_DIR = "/tmp/fusengine-test-plugins-matcher";

/** Build a one-plugin fixture carrying a single event's entries. */
function fixture(event: string, entries: unknown[]) {
	return [
		{
			name: "test-plugin",
			path: TEST_DIR,
			hasHooks: true,
			config: { hooks: { [event]: entries } },
		},
	] as Parameters<typeof extractHooks>[0];
}

describe("extractHooks — matcher targets", () => {
	test("filters by tool name on preToolUse", () => {
		const plugins = fixture("preToolUse", [
			{ matcher: "Write|Edit", command: "echo write-edit" },
			{ matcher: "Shell", command: "echo shell" },
		]);

		expect(extractHooks(plugins, "preToolUse", "Write", "")).toHaveLength(1);
		expect(extractHooks(plugins, "preToolUse", "Edit", "")).toHaveLength(1);
		expect(extractHooks(plugins, "preToolUse", "Shell", "")).toHaveLength(1);
		expect(extractHooks(plugins, "preToolUse", "Read", "")).toHaveLength(0);
	});

	test("matches everything when no matcher is set", () => {
		const plugins = fixture("preToolUse", [{ command: "echo all" }]);

		expect(extractHooks(plugins, "preToolUse", "AnyTool", "")).toHaveLength(1);
	});

	test("beforeShellExecution matches the command line, not the tool name", () => {
		const plugins = fixture("beforeShellExecution", [
			{ matcher: "curl|wget", command: "echo net" },
		]);

		const hit = extractHooks(plugins, "beforeShellExecution", "", "", "", "curl https://x");
		const miss = extractHooks(plugins, "beforeShellExecution", "", "", "", "ls -la");

		expect(hit).toHaveLength(1);
		expect(miss).toHaveLength(0);
	});

	test("beforeMCPExecution matches the synthesised MCP:<tool> form", () => {
		const plugins = fixture("beforeMCPExecution", [
			{ matcher: "MCP:(query-docs|web_search_exa)", command: "echo mcp" },
		]);

		// The MCP: prefix never appears in the raw tool_name — it is built per event.
		expect(extractHooks(plugins, "beforeMCPExecution", "query-docs", "")).toHaveLength(1);
		expect(extractHooks(plugins, "beforeMCPExecution", "resolve-library-id", "")).toHaveLength(0);
	});

	test("subagent events match the subagent type", () => {
		const plugins = fixture("subagentStart", [
			{ matcher: "explore|shell", command: "echo sub" },
		]);

		expect(extractHooks(plugins, "subagentStart", "", "", "explore")).toHaveLength(1);
		expect(extractHooks(plugins, "subagentStart", "", "", "generalPurpose")).toHaveLength(0);
	});

	test("fixed-target events match their constant", () => {
		const stop = fixture("stop", [{ matcher: "Stop", command: "echo stop" }]);
		const submit = fixture("beforeSubmitPrompt", [
			{ matcher: "UserPromptSubmit", command: "echo submit" },
		]);

		expect(extractHooks(stop, "stop", "", "")).toHaveLength(1);
		expect(extractHooks(submit, "beforeSubmitPrompt", "", "")).toHaveLength(1);
	});

	test("skips a prompt entry — it carries no command to spawn", () => {
		const plugins = fixture("stop", [
			{ command: "echo real" },
			{ type: "prompt", prompt: "Did the agent follow the workflow?", timeout: 15 },
		]);

		const result = extractHooks(plugins, "stop", "", "");

		expect(result).toHaveLength(1);
		expect(result[0].command).toBe("echo real");
	});

	test("an invalid regex matches nothing instead of throwing", () => {
		const plugins = fixture("preToolUse", [{ matcher: "Write|(unclosed", command: "echo x" }]);

		expect(extractHooks(plugins, "preToolUse", "Write", "")).toHaveLength(0);
	});
});
