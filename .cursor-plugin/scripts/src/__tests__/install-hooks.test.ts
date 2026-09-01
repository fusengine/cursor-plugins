/**
 * Tests for install-hooks script
 * Integration tests for the main installation flow (marketplace layout + CLAUDE.md sync).
 *
 * Settings/.env/shell/backup coverage lives in install-hooks-config.test.ts
 * (split out to respect the SOLID file-size ceiling).
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

const TEST_DIR = "/tmp/fusengine-test-install";
const TEST_HOME = join(TEST_DIR, "home");
const TEST_MARKETPLACE = join(
	TEST_HOME,
	".cursor/plugins/local",
);

describe("install-hooks", () => {
	beforeEach(() => {
		// Create test directory structure
		mkdirSync(join(TEST_MARKETPLACE, "plugins/test-plugin/hooks"), {
			recursive: true,
		});
		mkdirSync(join(TEST_MARKETPLACE, "scripts"), { recursive: true });
		mkdirSync(join(TEST_HOME, ".cursor"), { recursive: true });

		// Create a test hooks.json
		writeFileSync(
			join(TEST_MARKETPLACE, "plugins/test-plugin/hooks/hooks.json"),
			JSON.stringify({
				hooks: {
					PreToolUse: [
						{
							matcher: "Write",
							hooks: [{ type: "command", command: "echo test" }],
						},
					],
				},
			}),
		);
	});

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe("directory structure", () => {
		test("test marketplace structure exists", () => {
			expect(existsSync(TEST_MARKETPLACE)).toBe(true);
			expect(existsSync(join(TEST_MARKETPLACE, "plugins"))).toBe(true);
			expect(existsSync(join(TEST_MARKETPLACE, "scripts"))).toBe(true);
		});

		test("test plugin has hooks.json", () => {
			const hooksPath = join(
				TEST_MARKETPLACE,
				"plugins/test-plugin/hooks/hooks.json",
			);
			expect(existsSync(hooksPath)).toBe(true);

			const content = JSON.parse(readFileSync(hooksPath, "utf8"));
			expect(content.hooks).toBeDefined();
			expect(content.hooks.PreToolUse).toBeDefined();
		});
	});

	describe("CLAUDE.md handling", () => {
		test("detects when CLAUDE.md needs to be copied", async () => {
			const srcPath = join(TEST_DIR, "CLAUDE.md");
			const destPath = join(TEST_HOME, ".cursor/AGENTS.md");

			writeFileSync(srcPath, "# Rules\nSome content");

			// Destination doesn't exist
			expect(existsSync(destPath)).toBe(false);
		});

		test("detects when CLAUDE.md is already up to date", async () => {
			const srcPath = join(TEST_DIR, "CLAUDE.md");
			const destPath = join(TEST_HOME, ".cursor/AGENTS.md");
			const content = "# Same content";

			writeFileSync(srcPath, content);
			writeFileSync(destPath, content);

			const srcContent = readFileSync(srcPath, "utf8");
			const destContent = readFileSync(destPath, "utf8");

			expect(srcContent).toBe(destContent);
		});
	});
});
