/**
 * Anti-regression gate for the "harness exclusif" migration.
 *
 * Cursor plugin manifests are FLAT (`{ command, matcher?, type? }`) and their paths
 * must be relative — the manifest can therefore never name the harness binary. The
 * previous version of this gate looked for `block.hooks[]` (Claude Code's nested
 * shape) and for a `bun …/@fusengine/harness/… hook cursor` command inside the
 * manifest: on flat manifests the inner loop never ran, so the whole suite produced
 * 22 assertions, none of them about a command. The invariant is checked at the two
 * layers that actually carry it:
 *   1. every command entry delegates to `./scripts/hook.sh` (relative, per Cursor's
 *      submission checklist);
 *   2. that wrapper exists and invokes the harness binary.
 * Native `type: "prompt"` hooks are allowed and left untouched.
 * @see https://cursor.com/docs/reference/plugins — Hooks format / Submitting a plugin
 */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	WRAPPER_RELATIVE_PATH,
	discoverHooksFiles,
	isHarnessWrapper,
	isWrapperCommand,
	pluginNameOf,
	pluginRootOf,
} from "./hooks-harness-exclusive.helpers";

const PLUGINS_DIR = join(__dirname, "../../../plugins");
const hooksFiles = discoverHooksFiles(PLUGINS_DIR);

describe("hooks-harness-exclusive (anti-regression gate)", () => {
	test("discovers at least one plugins/*/hooks/hooks.json", () => {
		expect(hooksFiles.length).toBeGreaterThan(0);
	});

	for (const filePath of hooksFiles) {
		const pluginName = pluginNameOf(filePath);

		describe(pluginName, () => {
			// Guarded parse: an invalid hooks.json must fail the dedicated test below,
			// not crash bun:test collection (a throw in a describe body drops later tests).
			let config: { hooks?: Record<string, unknown> } | undefined;
			let parseError: unknown;
			try {
				config = JSON.parse(readFileSync(filePath, "utf-8"));
			} catch (error) {
				parseError = error;
			}

			test("hooks.json is valid JSON", () => {
				if (parseError) throw parseError;
				expect(config).toBeDefined();
			});

			const wrapper = join(pluginRootOf(filePath), WRAPPER_RELATIVE_PATH);

			test(`${WRAPPER_RELATIVE_PATH} exists and invokes the harness binary`, () => {
				if (!existsSync(wrapper)) {
					throw new Error(`${pluginName}: missing wrapper ${WRAPPER_RELATIVE_PATH}`);
				}
				expect(isHarnessWrapper(readFileSync(wrapper, "utf-8"))).toBe(true);
			});

			for (const [eventName, rawEntries] of Object.entries(config?.hooks ?? {})) {
				// Guarded like the JSON.parse above: a manifest can carry a malformed
				// event value (not an array) or a malformed entry (null/primitive).
				// Both must fail a NAMED test, never throw here — a throw in this loop
				// runs during describe collection and voids every test already queued
				// for this plugin (verified empirically: bun:test reports 0 ran, not a
				// failure, for the whole describe scope).
				if (!Array.isArray(rawEntries)) {
					test(`${eventName}: hook entries must be an array`, () => {
						throw new Error(
							`${pluginName} / ${eventName}: expected an array of hook entries, got ${typeof rawEntries}`,
						);
					});
					continue;
				}

				for (const [idx, entry] of rawEntries.entries()) {
					const label = `${eventName}[${idx}]`;

					if (entry === null || typeof entry !== "object") {
						test(`${label}: must be an object`, () => {
							throw new Error(`${pluginName} / ${label}: expected a hook entry object, got ${entry}`);
						});
						continue;
					}

					const record = entry as Record<string, unknown>;
					if (record.type === "prompt") continue; // native LLM hook, allowed as-is

					test(`${label}: delegates to ${WRAPPER_RELATIVE_PATH}`, () => {
						if (record.type !== undefined && record.type !== "command") {
							throw new Error(
								`${pluginName} / ${label}: unexpected hook type "${record.type}" — only "command" and "prompt" are allowed`,
							);
						}
						if (typeof record.command !== "string") {
							throw new Error(`${pluginName} / ${label}: command hook carries no command`);
						}
						if (!isWrapperCommand(record.command)) {
							throw new Error(
								`${pluginName} / ${label}: does not delegate to the wrapper: "${record.command}"`,
							);
						}
						expect(isWrapperCommand(record.command)).toBe(true);
					});
				}
			}
		});
	}
});
