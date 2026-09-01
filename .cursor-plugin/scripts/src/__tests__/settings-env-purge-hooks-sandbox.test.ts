/**
 * E2E sandbox test for the installer's settings.json side, exercising the
 * REAL exported functions (no mocks) against a temp HOME:
 *   - purgeFuseEnvVars strips residual FUSE_* from settings.env, keeps
 *     CLAUDE_CODE_* and _FUSENGINE_PERF_ASKED.
 *   - configureHooks never wires a PostCompact dispatcher (removed from
 *     HOOK_TYPES) but still wires PreCompact/SessionStart/Stop/etc.
 *   - Both are idempotent on re-run (no residual FUSE_* or duplicate hooks).
 * The real ~/.cursor is never touched: settings.json lives under a
 * mkdtemp() sandbox removed in afterEach. See env-file-writer-sandbox.test.ts
 * for the companion ~/.cursor/.fusengine-global/.env writer coverage.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { HOOK_TYPES } from "../interfaces/hooks";
import { configureHooks, loadSettings, saveSettings } from "../services/settings-manager";
import { purgeFuseEnvVars } from "../services/settings-env-purge";

const FAKE_LOADER = "/fake/hooks-loader.ts";

let tmpHome: string;
let settingsPath: string;

beforeEach(() => {
	tmpHome = mkdtempSync(join(tmpdir(), "fusengine-settings-sandbox-"));
	settingsPath = join(tmpHome, ".cursor", "settings.json");
});

afterEach(() => {
	rmSync(tmpHome, { recursive: true, force: true });
});

describe("installer sandbox: FUSE_* purge + hooks wiring (real code, temp HOME)", () => {
	test("purge strips FUSE_* from settings.env, keeps CLAUDE_CODE_* and _FUSENGINE_PERF_ASKED", async () => {
		await saveSettings(settingsPath, {
			env: {
				FUSE_SOLID_MAX_LINES: "999",
				CLAUDE_CODE_FORK_SUBAGENT: "1",
				_FUSENGINE_PERF_ASKED: "1",
			},
		});

		let settings = await loadSettings(settingsPath);
		settings = purgeFuseEnvVars(settings);

		const env = settings.env as Record<string, string>;
		expect(Object.keys(env).some((k) => k.startsWith("FUSE_"))).toBe(false);
		expect(env.CLAUDE_CODE_FORK_SUBAGENT).toBe("1");
		expect(env._FUSENGINE_PERF_ASKED).toBe("1");
	});

	test("configureHooks wires no postCompact but wires preCompact/sessionStart/stop/postToolUse", () => {
		const hooksPath = join(dirname(settingsPath), "hooks.json");
		configureHooks(FAKE_LOADER, hooksPath);
		const hookKeys = Object.keys(JSON.parse(readFileSync(hooksPath, "utf8")).hooks);

		expect(hookKeys).not.toContain("postCompact");
		for (const type of ["preCompact", "sessionStart", "stop", "postToolUse"]) {
			expect(hookKeys).toContain(type);
		}
		expect(hookKeys.sort()).toEqual([...HOOK_TYPES].sort());
	});

	test("idempotence: purge + configureHooks re-run twice yields byte-identical files", async () => {
		const hooksPath = join(dirname(settingsPath), "hooks.json");
		await saveSettings(settingsPath, {
			env: {
				FUSE_SOLID_MAX_LINES: "999",
				CLAUDE_CODE_FORK_SUBAGENT: "1",
				_FUSENGINE_PERF_ASKED: "1",
			},
		});

		let settings = await loadSettings(settingsPath);
		settings = purgeFuseEnvVars(settings);
		configureHooks(FAKE_LOADER, hooksPath);
		await saveSettings(settingsPath, settings);
		const firstSettings = readFileSync(settingsPath, "utf8");
		const firstHooks = readFileSync(hooksPath, "utf8");

		let second = await loadSettings(settingsPath);
		second = purgeFuseEnvVars(second);
		configureHooks(FAKE_LOADER, hooksPath);
		await saveSettings(settingsPath, second);

		expect(readFileSync(settingsPath, "utf8")).toBe(firstSettings);
		expect(readFileSync(hooksPath, "utf8")).toBe(firstHooks);
		expect(Object.keys(JSON.parse(firstHooks).hooks)).not.toContain("postCompact");
	});
});
