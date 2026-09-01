/**
 * Tests for settings-manager: configureHooks, configureDefaults, configureStatusLine
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HOOK_TYPES } from "../interfaces/hooks";
import {
	configureDefaults,
	configureHooks,
	configureStatusLine,
} from "../services/settings-manager";

/** Fresh hooks.json path in a temp dir, optionally seeded. */
function tempHooks(seed?: unknown): string {
	const file = join(mkdtempSync(join(tmpdir(), "fuse-cfg-")), "hooks.json");
	if (seed !== undefined) writeFileSync(file, JSON.stringify(seed, null, 2));
	return file;
}

/** Parse the hooks map written to ~/.cursor/hooks.json. */
function readHooks(file: string): Record<string, unknown[]> {
	return JSON.parse(readFileSync(file, "utf8")).hooks;
}

describe("settings-manager / configure", () => {
	describe("configureHooks", () => {
		test("configures all hook types", () => {
			const file = tempHooks();
			configureHooks("/path/to/loader.ts", file);
			const hooks = readHooks(file);
			for (const hookType of HOOK_TYPES) {
				expect(hooks[hookType]).toBeDefined();
			}
		});

		test("sets correct command format", () => {
			const loaderPath = "/test/hooks-loader.ts";
			const file = tempHooks();
			configureHooks(loaderPath, file);
			const preToolUse = readHooks(file).preToolUse as Array<{ command: string }>;
			expect(preToolUse[0].command).toBe(`bun ${loaderPath} preToolUse`);
		});

		test("preserves user hook types not managed by fusengine", () => {
			const file = tempHooks({ version: 1, hooks: { customHook: [{ old: "config" }] } });
			configureHooks("/x/hooks-loader.ts", file);
			const hooks = readHooks(file);
			expect(hooks.customHook).toEqual([{ old: "config" }]);
			expect(hooks.preToolUse).toBeDefined();
		});
	});

	describe("configureDefaults", () => {
		test("sets language to english by default", () => {
			const result = configureDefaults({});
			expect(result.language).toBe("english");
		});

		test("uses provided language when specified", () => {
			const result = configureDefaults({}, "french");
			expect(result.language).toBe("french");
		});

		test("preserves existing language when none provided", () => {
			const result = configureDefaults({ language: "german" });
			expect(result.language).toBe("german");
		});

		test("sets empty attribution", () => {
			const result = configureDefaults({});
			expect(result.attribution).toEqual({ commit: "", pr: "" });
		});

		test("preserves existing settings", () => {
			const settings = { custom: "value", hooks: {} };
			const result = configureDefaults(settings);
			expect(result.custom).toBe("value");
			expect(result.hooks).toEqual({});
		});
	});

	describe("configureStatusLine", () => {
		test("adds statusLine if not present", () => {
			const result = configureStatusLine({}, "/path/to/statusline");
			expect(result.statusLine).toBeDefined();
			expect(result.statusLine?.type).toBe("command");
			expect(result.statusLine?.command).toContain("/path/to/statusline");
			expect(result.statusLine?.padding).toBe(0);
		});

		test("does not override existing statusLine", () => {
			const settings = {
				statusLine: { type: "custom", command: "custom-command", padding: 5 },
			};
			const result = configureStatusLine(settings, "/new/path");
			expect(result.statusLine?.type).toBe("custom");
			expect(result.statusLine?.command).toBe("custom-command");
			expect(result.statusLine?.padding).toBe(5);
		});
	});
});
