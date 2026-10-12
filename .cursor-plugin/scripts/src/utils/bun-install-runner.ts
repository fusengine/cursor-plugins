/**
 * Fail-open `bun install` runner — built-ins/Bun-global only (no `import "bun"`,
 * no node_modules import), so it works even when node_modules is entirely gone.
 */
import type { InstallFn } from "../interfaces/ensure-deps";
import type { BunRunFn } from "../interfaces/harness-vendor";

/**
 * Run the current `bun` binary with `args` in `cwd`, hard-killing it after
 * `timeoutMs`. Never throws on timeout/non-zero exit: the exit code is returned.
 *
 * @param cwd - Directory the command runs in
 * @param args - Arguments passed to bun (e.g. `["install", "--silent"]`)
 * @param timeoutMs - Hard kill timeout in milliseconds
 * @returns The process exit code (non-zero when killed)
 */
export const runBun: BunRunFn = async (cwd, args, timeoutMs) => {
	const proc = Bun.spawn([process.execPath, ...args], {
		cwd,
		stdout: "ignore",
		stderr: "ignore",
		timeout: timeoutMs,
		killSignal: "SIGKILL",
	});
	return proc.exited;
};

/**
 * Run `bun install --silent` in `cwd`, hard-killing it after `timeoutMs`.
 * Never throws on timeout/non-zero exit: a failed or slow install just leaves
 * the caller's presence marker missing, and the next hook invocation retries.
 *
 * @param cwd - Directory holding the package.json to install
 * @param timeoutMs - Hard kill timeout in milliseconds
 */
export const runBunInstall: InstallFn = async (cwd, timeoutMs) => {
	await runBun(cwd, ["install", "--silent"], timeoutMs);
};
