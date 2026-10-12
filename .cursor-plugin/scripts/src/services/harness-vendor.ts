/**
 * Shared-harness vendoring: keep `~/.cursor/.fusengine-global/node_modules`
 * on the latest published `@fusengine/harness` on every installer run.
 * @description SRP: sync the repo manifest into the control root, then move the
 * install to the newest release. The spec is always the manifest's dist-tag
 * (`latest`), never a pinned version; `bun update` keeps a dist-tag as written
 * and only advances `bun.lock` (https://bun.sh/docs/pm/cli/update).
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
	HarnessVendorOptions,
	HarnessVendorStatus,
} from "../interfaces/harness-vendor";
import { runBun } from "../utils/bun-install-runner";

const HARNESS_PACKAGE = "@fusengine/harness";
const HARNESS_BIN = `node_modules/${HARNESS_PACKAGE}/dist/cli/bin.mjs`;
const VENDOR_TIMEOUT_MS = 120_000;

/**
 * Write the repo manifest to the control root and refresh the harness to the
 * latest release. Fail-open: never throws, a failure only returns `"failed"`
 * so the rest of the install proceeds (the hook wrappers self-heal).
 *
 * - lockfile + vendored bin present → `bun update @fusengine/harness`
 *   (a pinned lock from an earlier installer moves to the newest release);
 *   if that errors (package absent from the lock) it falls back to a full install
 * - otherwise → `bun install`
 *
 * @param options - Manifest source, control root and optional bun runner
 * @returns `installed`, `updated`, `skipped` (no manifest) or `failed`
 */
export async function vendorHarness(options: HarnessVendorOptions): Promise<HarnessVendorStatus> {
	const { manifestSrc, controlRoot, run = runBun } = options;
	if (!existsSync(manifestSrc)) return "skipped";
	try {
		mkdirSync(controlRoot, { recursive: true });
		copyFileSync(manifestSrc, join(controlRoot, "package.json"));
		const vendored =
			existsSync(join(controlRoot, "bun.lock")) && existsSync(join(controlRoot, HARNESS_BIN));
		if (vendored) {
			const updateArgs = ["update", HARNESS_PACKAGE, "--silent"];
			if ((await run(controlRoot, updateArgs, VENDOR_TIMEOUT_MS)) === 0) return "updated";
		}
		const code = await run(controlRoot, ["install", "--silent"], VENDOR_TIMEOUT_MS);
		return code === 0 ? "installed" : "failed";
	} catch {
		return "failed";
	}
}
