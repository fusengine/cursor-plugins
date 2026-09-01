/**
 * Tests for hook-merge.mergeHookType and its use by configureHooks:
 * conservative, idempotent merge that preserves user-authored hook entries.
 *
 * Cursor entries are flat (`{command, matcher?}`) and configureHooks writes
 * ~/.cursor/hooks.json, so these tests drive a temp file rather than a settings
 * object.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mergeHookType } from "../services/hook-merge";
import { configureHooks } from "../services/settings-manager";

const LOADER = "/x/hooks-loader.ts";
const loaderCmd = (t: string) => `bun ${LOADER} ${t}`;

/** Fresh hooks.json path in a temp dir, optionally seeded. */
function tempHooks(seed?: unknown): string {
	const file = join(mkdtempSync(join(tmpdir(), "fuse-hooks-")), "hooks.json");
	if (seed !== undefined) writeFileSync(file, JSON.stringify(seed, null, 2));
	return file;
}

/** Parse the hooks map written by configureHooks. */
function readHooks(file: string): Record<string, unknown[]> {
	return JSON.parse(readFileSync(file, "utf8")).hooks;
}

describe("mergeHookType", () => {
	test("adds the loader entry to an empty (undefined) list", () => {
		const result = mergeHookType(undefined, LOADER, "preToolUse");
		expect(result).toEqual([{ command: loaderCmd("preToolUse") }]);
	});

	test("keeps a foreign entry and appends the loader entry", () => {
		const foreign = { command: "my-tool" };
		const result = mergeHookType([foreign], LOADER, "postToolUse");
		expect(result[0]).toEqual(foreign);
		expect(result).toHaveLength(2);
	});

	test("replaces a stale loader entry instead of duplicating it", () => {
		const stale = mergeHookType(undefined, "/old/hooks-loader.ts", "stop");
		const result = mergeHookType(stale, LOADER, "stop");
		expect(result).toHaveLength(1);
		expect((result[0] as { command: string }).command).toBe(loaderCmd("stop"));
	});
});

describe("configureHooks / merge", () => {
	test("writes a version-1 document Cursor can read", () => {
		const file = tempHooks();
		configureHooks(LOADER, file);
		expect(JSON.parse(readFileSync(file, "utf8")).version).toBe(1);
	});

	test("preserves a foreign entry inside a managed hook type", () => {
		const foreign = { command: "my-tool" };
		const file = tempHooks({ version: 1, hooks: { preToolUse: [foreign] } });
		configureHooks(LOADER, file);
		const entries = readHooks(file).preToolUse;
		expect(entries).toContainEqual(foreign);
		expect(entries.at(-1)).toEqual({ command: loaderCmd("preToolUse") });
	});

	test("is idempotent across re-runs", () => {
		const file = tempHooks();
		configureHooks(LOADER, file);
		const first = readHooks(file);
		configureHooks(LOADER, file);
		expect(readHooks(file)).toEqual(first);
	});

	test("is byte-identical on re-run when a user entry is present", () => {
		const foreign = { command: "my-tool" };
		const file = tempHooks({ version: 1, hooks: { preToolUse: [foreign] } });
		configureHooks(LOADER, file);
		const first = readFileSync(file, "utf8");
		configureHooks(LOADER, file);
		// No duplication, no reordering: the foreign entry stays first, loader last.
		expect(readFileSync(file, "utf8")).toBe(first);
		expect(readHooks(file).preToolUse[0]).toEqual(foreign);
		expect(readHooks(file).preToolUse.length).toBe(2);
	});

	test("does not clobber a user command that merely mentions hooks-loader", () => {
		const userHook = { command: "bun my-hooks-loader-wrapper.sh" };
		const file = tempHooks({ version: 1, hooks: { stop: [userHook] } });
		configureHooks(LOADER, file);
		const entries = readHooks(file).stop;
		expect(entries[0]).toEqual(userHook);
		expect(entries.length).toBe(2);
	});
});
