/**
 * Project installer file primitives.
 * @description SRP: symlink guard, atomic write/restore, and the per-project
 * install lock — no installer policy, just safe low-level file operations.
 */
import fs from "node:fs";
import path from "node:path";

/** Reject existing or dangling symlinks before a write-capable operation. */
export function assertNotSymlink(file: string): void {
	let stat: fs.Stats;
	try {
		stat = fs.lstatSync(file);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
		throw error;
	}
	if (stat.isSymbolicLink()) throw new Error(`refusing to write through symlink: ${file}`);
}

/** Replace one file atomically on its current filesystem. */
export function writeFileAtomic(file: string, content: string | Buffer): void {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	const temporary = `${file}.fusengine-${process.pid}-${process.hrtime.bigint()}`;
	try {
		fs.writeFileSync(temporary, content, { flag: "wx" });
		fs.renameSync(temporary, file);
	} finally {
		if (fs.existsSync(temporary)) fs.rmSync(temporary);
	}
}

/** Restore an earlier file snapshot atomically, or remove a newly created file. */
export function restoreFile(file: string, content: Buffer | null): void {
	if (content === null) {
		if (fs.existsSync(file)) fs.rmSync(file);
		return;
	}
	writeFileAtomic(file, content);
}

/**
 * Serialize writes to one project's managed Cursor installation.
 *
 * SYNCHRONOUS by design: the lock is released in a `finally` wrapped directly
 * around `action()`, not around an awaited settlement. Passing an async
 * `action` (or making this function itself `async`) would release the lock
 * before the action's real work finishes — preserve this contract exactly.
 * @param cursorRoot - The project's `.cursor` directory; the lock lives here.
 * @param action - Synchronous work to run while holding the lock.
 * @returns Whatever `action` returns.
 */
export function withProjectLock<T>(cursorRoot: string, action: () => T): T {
	fs.mkdirSync(cursorRoot, { recursive: true });
	const lock = path.join(cursorRoot, ".fusengine-install.lock");
	try {
		fs.mkdirSync(lock);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "EEXIST") {
			throw new Error(`another Fusengine install is active: ${lock}`);
		}
		throw error;
	}
	try {
		if (process.env.NODE_ENV === "test") {
			const holdMs = Number.parseInt(process.env.FUSE_INSTALL_TEST_HOLD_LOCK_MS ?? "0", 10);
			if (holdMs > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, holdMs);
		}
		return action();
	} finally {
		fs.rmSync(lock, { recursive: true });
	}
}

/** Render a caught value as a message — `catch` bindings are `unknown` under strict mode. */
export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
