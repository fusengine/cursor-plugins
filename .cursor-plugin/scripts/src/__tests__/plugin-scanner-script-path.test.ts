/**
 * Tests for relative-script resolution in extractHooks.
 * Split out of plugin-scanner.test.ts (file-size limit), mirroring the existing
 * plugin-scanner-home-resolution.test.ts / plugin-scanner-matcher.test.ts convention.
 *
 * Manifests declare `./scripts/hook.sh` — the form Cursor's submission checklist
 * requires (no absolute paths). hook-executor spawns argv with no `cwd` (it only
 * passes CURSOR_PLUGIN_ROOT in the env), so an unresolved relative path is never
 * found: the hook fails and fail-open makes that silent.
 * @see https://cursor.com/docs/hooks
 */
import { describe, expect, test } from "bun:test";
import { extractHooks } from "../services/plugin-scanner";

const TEST_DIR = "/tmp/fusengine-test-plugins-path";

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

describe("extractHooks — relative script resolution", () => {
	test("resolves ./ against the plugin root", () => {
		const plugins = fixture("preToolUse", [{ command: "./scripts/hook.sh" }]);

		expect(extractHooks(plugins, "preToolUse", "", "")[0].command).toBe(
			`${TEST_DIR}/scripts/hook.sh`,
		);
	});

	test("keeps the arguments after the script untouched", () => {
		const plugins = fixture("preToolUse", [
			{ command: "./scripts/hook.sh aipilot --sound stop" },
		]);

		expect(extractHooks(plugins, "preToolUse", "", "")[0].command).toBe(
			`${TEST_DIR}/scripts/hook.sh aipilot --sound stop`,
		);
	});

	test("resolves ../ as well", () => {
		const plugins = fixture("preToolUse", [{ command: "../shared/hook.sh" }]);

		expect(extractHooks(plugins, "preToolUse", "", "")[0].command).toBe("/tmp/shared/hook.sh");
	});

	test("leaves absolute and bare commands alone", () => {
		const plugins = fixture("preToolUse", [
			{ command: "/usr/local/bin/guard.sh" },
			{ command: "bun /abs/path/x.ts hook cursor" },
			{ command: "afplay /sound.wav" },
		]);

		const result = extractHooks(plugins, "preToolUse", "", "");

		expect(result[0].command).toBe("/usr/local/bin/guard.sh");
		expect(result[1].command).toBe("bun /abs/path/x.ts hook cursor");
		expect(result[2].command).toBe("afplay /sound.wav");
	});

	test("an afplay command stays flagged async", () => {
		const plugins = fixture("stop", [{ command: "afplay /sound.wav" }]);

		expect(extractHooks(plugins, "stop", "", "")[0].isAsync).toBe(true);
	});

	test("placeholder substitution still runs before resolution", () => {
		const plugins = fixture("preToolUse", [
			// biome-ignore lint/suspicious/noTemplateCurlyInString: shell env var syntax
			{ command: "bash ${CURSOR_PLUGIN_ROOT}/scripts/x.sh" },
		]);

		// Already absolute after substitution — resolution must not touch it again.
		expect(extractHooks(plugins, "preToolUse", "", "")[0].command).toBe(
			`bash ${TEST_DIR}/scripts/x.sh`,
		);
	});
});
