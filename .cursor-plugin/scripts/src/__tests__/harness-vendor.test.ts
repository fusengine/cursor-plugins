/**
 * Tests for vendorHarness: the installer must always refresh the shared
 * `@fusengine/harness` to the latest release, never leave a pinned spec, and
 * never throw. The real `bun` is never invoked — every test injects a fake.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BunRunFn } from "../interfaces/harness-vendor";
import { vendorHarness } from "../services/harness-vendor";

const MANIFEST = `${JSON.stringify({
	name: "@fusengine/cursor-harness",
	private: true,
	dependencies: { "@fusengine/harness": "latest" },
})}\n`;
const BIN = "node_modules/@fusengine/harness/dist/cli/bin.mjs";

let root: string;
let manifestSrc: string;
let controlRoot: string;

/** Fake runner recording every call and answering with scripted exit codes. */
function fakeRun(codes: number[]): { run: BunRunFn; calls: string[][] } {
	const calls: string[][] = [];
	const run: BunRunFn = async (_cwd, args) => {
		calls.push(args);
		return codes[calls.length - 1] ?? 0;
	};
	return { run, calls };
}

/** Simulate an earlier install: pinned manifest, lockfile and vendored bin. */
function seedPinnedInstall(): void {
	mkdirSync(join(controlRoot, "node_modules/@fusengine/harness/dist/cli"), { recursive: true });
	writeFileSync(join(controlRoot, BIN), "// old bin");
	writeFileSync(join(controlRoot, "bun.lock"), "{}");
	writeFileSync(
		join(controlRoot, "package.json"),
		'{"dependencies":{"@fusengine/harness":"0.1.100"}}',
	);
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), "fusengine-vendor-"));
	manifestSrc = join(root, "manifest.json");
	controlRoot = join(root, ".fusengine-global");
	writeFileSync(manifestSrc, MANIFEST);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("vendorHarness", () => {
	test("fresh machine: writes the `latest` manifest and runs bun install", async () => {
		const { run, calls } = fakeRun([0]);
		expect(await vendorHarness({ manifestSrc, controlRoot, run })).toBe("installed");
		expect(readFileSync(join(controlRoot, "package.json"), "utf8")).toBe(MANIFEST);
		expect(calls).toEqual([["install", "--silent"]]);
	});

	test("pinned earlier install: manifest reset to `latest`, then bun update of the harness only", async () => {
		seedPinnedInstall();
		const { run, calls } = fakeRun([0]);
		expect(await vendorHarness({ manifestSrc, controlRoot, run })).toBe("updated");
		expect(readFileSync(join(controlRoot, "package.json"), "utf8")).toBe(MANIFEST);
		expect(calls).toEqual([["update", "@fusengine/harness", "--silent"]]);
	});

	test("update fails (package absent from the lock): falls back to bun install", async () => {
		seedPinnedInstall();
		const { run, calls } = fakeRun([1, 0]);
		expect(await vendorHarness({ manifestSrc, controlRoot, run })).toBe("installed");
		expect(calls.map((c) => c[0])).toEqual(["update", "install"]);
	});

	test("every bun run fails: reports failed, does not throw", async () => {
		seedPinnedInstall();
		const { run } = fakeRun([1, 1]);
		expect(await vendorHarness({ manifestSrc, controlRoot, run })).toBe("failed");
	});

	test("runner throws: fail-open, reports failed", async () => {
		const run: BunRunFn = async () => {
			throw new Error("spawn failed");
		};
		expect(await vendorHarness({ manifestSrc, controlRoot, run })).toBe("failed");
	});

	test("missing repo manifest: skipped, bun never called, nothing written", async () => {
		rmSync(manifestSrc);
		const { run, calls } = fakeRun([0]);
		expect(await vendorHarness({ manifestSrc, controlRoot, run })).toBe("skipped");
		expect(calls).toEqual([]);
	});
});
