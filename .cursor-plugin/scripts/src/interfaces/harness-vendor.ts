/**
 * Shared-harness vendoring interfaces.
 * @description SRP: types for the installer's `@fusengine/harness` refresh only.
 */

/** Outcome of one vendoring run. `failed` is fail-open: the installer keeps going. */
export type HarnessVendorStatus = "installed" | "updated" | "skipped" | "failed";

/** Injectable `bun` runner — returns the exit code; tests fake it (no network). */
export type BunRunFn = (cwd: string, args: string[], timeoutMs: number) => Promise<number>;

/** Inputs of {@link vendorHarness}. */
export interface HarnessVendorOptions {
	/** Absolute path of the repo manifest (`.cursor-plugin/harness/package.json`). */
	manifestSrc: string;
	/** Absolute shared install dir (`~/.cursor/.fusengine-global`). */
	controlRoot: string;
	/** Bun runner; defaults to the real `bun` binary. */
	run?: BunRunFn;
}
