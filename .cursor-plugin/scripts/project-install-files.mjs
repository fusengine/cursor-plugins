import fs from "node:fs";
import path from "node:path";

/** Reject existing or dangling symlinks before a write-capable operation. */
export function assertNotSymlink(file) {
  let stat;
  try { stat = fs.lstatSync(file); }
  catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`refusing to write through symlink: ${file}`);
}

/** Replace one file atomically on its current filesystem. */
export function writeFileAtomic(file, content) {
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
export function restoreFile(file, content) {
  if (content === null) {
    if (fs.existsSync(file)) fs.rmSync(file);
    return;
  }
  writeFileAtomic(file, content);
}

/** Serialize writes to one project's managed Cursor installation. */
export function withProjectLock(cursorRoot, action) {
  fs.mkdirSync(cursorRoot, { recursive: true });
  const lock = path.join(cursorRoot, ".fusengine-install.lock");
  try { fs.mkdirSync(lock); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error(`another Fusengine install is active: ${lock}`);
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
