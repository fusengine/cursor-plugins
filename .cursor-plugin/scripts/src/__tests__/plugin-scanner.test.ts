/**
 * Tests for plugin-scanner service.
 *
 * Fixtures use Cursor's FLAT entry shape (`{ command, matcher? }`), the only one a
 * plugin `hooks.json` carries. They previously used Claude Code's nested
 * `hooks: [{ type, command }]`, which kept this suite green against a shape the
 * production never produces — while extractHooks crashed on every real manifest.
 * Matcher-target cases live in plugin-scanner-matcher.test.ts (file-size split).
 * @see https://cursor.com/docs/hooks
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractHooks, scanPlugins } from "../services/plugin-scanner";

const TEST_DIR = "/tmp/fusengine-test-plugins";

describe("plugin-scanner", () => {
	beforeEach(() => {
		mkdirSync(TEST_DIR, { recursive: true });
	});

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe("scanPlugins", () => {
		test("returns empty array when no plugins exist", () => {
			const result = scanPlugins({ pluginsDir: TEST_DIR });
			expect(result).toEqual([]);
		});

		test("detects plugin with hooks.json", () => {
			const pluginDir = join(TEST_DIR, "my-plugin", "hooks");
			mkdirSync(pluginDir, { recursive: true });
			writeFileSync(
				join(pluginDir, "hooks.json"),
				JSON.stringify({ hooks: { preToolUse: [] } }),
			);

			const result = scanPlugins({ pluginsDir: TEST_DIR });

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe("my-plugin");
			expect(result[0].hasHooks).toBe(true);
			expect(result[0].config).toBeDefined();
		});

		test("marks plugin without hooks.json as hasHooks=false", () => {
			const pluginDir = join(TEST_DIR, "no-hooks-plugin");
			mkdirSync(pluginDir, { recursive: true });
			writeFileSync(join(pluginDir, "README.md"), "# Plugin");

			const result = scanPlugins({ pluginsDir: TEST_DIR });

			// Plugin is still detected, but hasHooks is false
			expect(result).toHaveLength(1);
			expect(result[0].hasHooks).toBe(false);
			expect(result[0].config).toBeUndefined();
		});

		test("scans multiple plugins", () => {
			const plugin1 = join(TEST_DIR, "plugin-a", "hooks");
			mkdirSync(plugin1, { recursive: true });
			writeFileSync(join(plugin1, "hooks.json"), JSON.stringify({ hooks: {} }));

			const plugin2 = join(TEST_DIR, "plugin-b", "hooks");
			mkdirSync(plugin2, { recursive: true });
			writeFileSync(join(plugin2, "hooks.json"), JSON.stringify({ hooks: {} }));

			const result = scanPlugins({ pluginsDir: TEST_DIR });

			expect(result).toHaveLength(2);
			expect(result.filter((p) => p.hasHooks)).toHaveLength(2);
		});

		test("handles invalid JSON gracefully", () => {
			const pluginDir = join(TEST_DIR, "bad-json", "hooks");
			mkdirSync(pluginDir, { recursive: true });
			writeFileSync(join(pluginDir, "hooks.json"), "{ invalid json }");

			const result = scanPlugins({ pluginsDir: TEST_DIR });

			expect(result).toHaveLength(1);
			expect(result[0].hasHooks).toBe(true);
			expect(result[0].config).toBeUndefined(); // Parsing failed
		});

		test("returns empty when pluginsDir does not exist", () => {
			const result = scanPlugins({ pluginsDir: "/nonexistent/path" });
			expect(result).toEqual([]);
		});
	});

	describe("extractHooks", () => {
		test("extracts hooks for matching hook type", () => {
			const plugins = [
				{
					name: "test-plugin",
					path: join(TEST_DIR, "test-plugin"),
					hasHooks: true,
					config: {
						hooks: { preToolUse: [{ matcher: "Write", command: "echo test" }] },
					},
				},
			];

			const result = extractHooks(plugins, "preToolUse", "Write", "");

			expect(result).toHaveLength(1);
			expect(result[0].command).toContain("echo test");
			expect(result[0].pluginName).toBe("test-plugin");
		});

		test("returns empty array for non-matching hook type", () => {
			const plugins = [
				{
					name: "test-plugin",
					path: TEST_DIR,
					hasHooks: true,
					config: { hooks: { preToolUse: [{ command: "echo" }] } },
				},
			];

			const result = extractHooks(plugins, "postToolUse", "", "");

			expect(result).toEqual([]);
		});

		test("replaces CURSOR_PLUGIN_ROOT in commands", () => {
			const plugins = [
				{
					name: "test-plugin",
					path: "/path/to/plugin",
					hasHooks: true,
					config: {
						hooks: {
							preToolUse: [
								// biome-ignore lint/suspicious/noTemplateCurlyInString: shell env var syntax
								{ command: "bash ${CURSOR_PLUGIN_ROOT}/scripts/test.sh" },
							],
						},
					},
				},
			];

			const result = extractHooks(plugins, "preToolUse", "", "");

			expect(result[0].command).toBe("bash /path/to/plugin/scripts/test.sh");
		});

		test("marks afplay commands as async", () => {
			const plugins = [
				{
					name: "test-plugin",
					path: TEST_DIR,
					hasHooks: true,
					config: { hooks: { stop: [{ command: "afplay /sound.wav" }] } },
				},
			];

			const result = extractHooks(plugins, "stop", "", "");

			expect(result[0].isAsync).toBe(true);
		});

		test("skips plugins without config", () => {
			const plugins = [
				{
					name: "empty-plugin",
					path: TEST_DIR,
					hasHooks: false,
					// No config
				},
			];

			const result = extractHooks(plugins, "preToolUse", "", "");

			expect(result).toEqual([]);
		});
	});
});
