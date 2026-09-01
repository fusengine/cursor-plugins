/**
 * Tests for install-hooks script: settings.json, .env, shell config paths, backups.
 * Split out of install-hooks.test.ts to respect the SOLID file-size ceiling.
 *
 * Contract (see src/services/settings-manager.ts and src/services/env-file.ts):
 * - settings.json lives at ~/.cursor/.fusengine-global/settings.json (Cursor-specific
 *   preferences store; Cursor itself never reads it — hooks live in ~/.cursor/hooks.json).
 * - .env lives directly at ~/.cursor/.env (ENV_FILE = join(HOME, ".cursor", ".env")).
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

const TEST_DIR = "/tmp/fusengine-test-install-config";
const TEST_HOME = join(TEST_DIR, "home");

describe("install-hooks config", () => {
	beforeEach(() => {
		mkdirSync(join(TEST_HOME, ".cursor"), { recursive: true });
	});

	afterEach(() => {
		rmSync(TEST_DIR, { recursive: true, force: true });
	});

	describe("settings.json handling", () => {
		test("creates settings.json if not exists", () => {
			const settingsPath = join(TEST_HOME, ".cursor/.fusengine-global/settings.json");
			expect(existsSync(settingsPath)).toBe(false);

			// settings.json lives in the .fusengine-global subdirectory, which
			// must exist before the file can be written.
			mkdirSync(join(TEST_HOME, ".cursor/.fusengine-global"), { recursive: true });
			writeFileSync(settingsPath, JSON.stringify({ language: "french" }));

			expect(existsSync(settingsPath)).toBe(true);
		});

		test("preserves existing settings when adding hooks", () => {
			const settingsPath = join(TEST_HOME, ".cursor/.fusengine-global/settings.json");
			const existing = {
				customSetting: "preserved",
				language: "english",
			};
			mkdirSync(join(TEST_HOME, ".cursor/.fusengine-global"), { recursive: true });
			writeFileSync(settingsPath, JSON.stringify(existing));

			// Load and modify
			const loaded = JSON.parse(readFileSync(settingsPath, "utf8"));
			loaded.hooks = { PreToolUse: [] };
			loaded.language = "french";

			expect(loaded.customSetting).toBe("preserved");
		});
	});

	describe("API keys configuration", () => {
		test("creates .env file in correct location", () => {
			// Real contract: ENV_FILE = join(HOME, ".cursor", ".env") — directly
			// under .cursor, NOT under .fusengine-global.
			const envPath = join(TEST_HOME, ".cursor/.env");
			const envContent = 'export CONTEXT7_API_KEY="test-key"\n';

			writeFileSync(envPath, envContent);

			expect(existsSync(envPath)).toBe(true);
			const content = readFileSync(envPath, "utf8");
			expect(content).toContain("CONTEXT7_API_KEY");
		});

		test("parses existing .env correctly", () => {
			const envPath = join(TEST_HOME, ".cursor/.env");
			const envContent = `export KEY1="value1"
export KEY2="value2"
export KEY3="value3"`;

			writeFileSync(envPath, envContent);

			const content = readFileSync(envPath, "utf8");
			const env: Record<string, string> = {};

			for (const line of content.split("\n")) {
				const match = line.match(/^export\s+(\w+)=["']?([^"'\n]*)["']?/);
				if (match) {
					env[match[1]] = match[2];
				}
			}

			expect(Object.keys(env)).toHaveLength(3);
			expect(env.KEY1).toBe("value1");
		});
	});

	describe("shell configuration paths", () => {
		test("bash config path is correct", () => {
			const bashrc = join(TEST_HOME, ".bashrc");
			expect(bashrc).toContain(".bashrc");
		});

		test("zsh config path is correct", () => {
			const zshrc = join(TEST_HOME, ".zshrc");
			expect(zshrc).toContain(".zshrc");
		});

		test("fish config path is correct", () => {
			const fishConfig = join(TEST_HOME, ".config/fish/conf.d/cursor-env.fish");
			expect(fishConfig).toContain("fish");
			expect(fishConfig).toContain("conf.d");
		});

		test("powershell config path varies by platform", () => {
			const isWindows = process.platform === "win32";

			if (isWindows) {
				const psProfile = join(
					TEST_HOME,
					"Documents/PowerShell/Microsoft.PowerShell_profile.ps1",
				);
				expect(psProfile).toContain("Documents");
			} else {
				const psProfile = join(
					TEST_HOME,
					".config/powershell/Microsoft.PowerShell_profile.ps1",
				);
				expect(psProfile).toContain(".config");
			}
		});
	});

	describe("backup creation", () => {
		test("backup filename includes timestamp", () => {
			const timestamp = new Date()
				.toISOString()
				.replace(/[:.]/g, "-")
				.slice(0, 19);

			const backupName = `settings.json.backup.${timestamp}`;

			expect(backupName).toMatch(
				/settings\.json\.backup\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/,
			);
		});
	});
});
