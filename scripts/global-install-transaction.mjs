import fs from "node:fs";
import path from "node:path";
import { restoreFile, writeFileAtomic } from "./project-install-files.mjs";

const journalName = ".fusengine-global-transaction.json";
const snapshotFiles = ["rules/fuse-global.mdc", ".fusengine-global/receipt.json", ".fusengine-global/.managed-by-fusengine"];

function transactionPaths(cursorRoot, nonce) {
  const pluginsRoot = path.join(cursorRoot, "plugins");
  return {
    backup: path.join(pluginsRoot, `.fusengine-local-backup-${nonce}`),
    local: path.join(pluginsRoot, "local"),
    stage: path.join(pluginsRoot, `.fusengine-local-stage-${nonce}`),
  };
}

function snapshot(cursorRoot) {
  return Object.fromEntries(snapshotFiles.map((relative) => {
    const file = path.join(cursorRoot, relative);
    return [relative, fs.existsSync(file) ? fs.readFileSync(file).toString("base64") : null];
  }));
}

function restoreSnapshot(cursorRoot, values) {
  for (const relative of snapshotFiles) {
    const encoded = values[relative];
    restoreFile(path.join(cursorRoot, relative), encoded === null ? null : Buffer.from(encoded, "base64"));
  }
}

function journalFile(cursorRoot) {
  return path.join(cursorRoot, journalName);
}

function writeJournal(cursorRoot, journal) {
  writeFileAtomic(journalFile(cursorRoot), `${JSON.stringify(journal, null, 2)}\n`);
}

function removeTree(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true });
}

/** Recover an interrupted shared global-local swap before any new staging work. */
export function recoverGlobalTransaction(cursorRoot) {
  const file = journalFile(cursorRoot);
  if (!fs.existsSync(file)) return;
  const journal = JSON.parse(fs.readFileSync(file, "utf8"));
  if (journal.version !== 1 || !/^\d+-\d+$/.test(journal.nonce) || !snapshotFiles.every((name) => Object.hasOwn(journal.snapshot, name))) {
    throw new Error(`invalid global transaction journal: ${file}`);
  }
  const roots = transactionPaths(cursorRoot, journal.nonce);
  if (journal.phase === "prepared") {
    if (journal.hadLocal && !fs.existsSync(roots.local) && fs.existsSync(roots.backup)) {
      fs.renameSync(roots.backup, roots.local);
    } else if (journal.hadLocal && fs.existsSync(roots.local) && fs.existsSync(roots.backup) && !fs.existsSync(roots.stage)) {
      removeTree(roots.local);
      fs.renameSync(roots.backup, roots.local);
      restoreSnapshot(cursorRoot, journal.snapshot);
    }
    removeTree(roots.stage);
  }
  else if (journal.phase === "old-moved") {
    if (journal.hadLocal && fs.existsSync(roots.local) && fs.existsSync(roots.backup)) {
      removeTree(roots.local);
      fs.renameSync(roots.backup, roots.local);
      restoreSnapshot(cursorRoot, journal.snapshot);
    } else if (journal.hadLocal && !fs.existsSync(roots.local) && fs.existsSync(roots.backup)) {
      fs.renameSync(roots.backup, roots.local);
    } else if (!journal.hadLocal && fs.existsSync(roots.local) && !fs.existsSync(roots.stage)) {
      removeTree(roots.local);
      restoreSnapshot(cursorRoot, journal.snapshot);
    }
    removeTree(roots.stage);
  } else if (journal.phase === "new-moved") {
    removeTree(roots.local);
    if (journal.hadLocal && fs.existsSync(roots.backup)) fs.renameSync(roots.backup, roots.local);
    restoreSnapshot(cursorRoot, journal.snapshot);
  } else if (journal.phase !== "finalized") throw new Error(`invalid global transaction phase: ${journal.phase}`);
  removeTree(roots.backup);
  removeTree(roots.stage);
  fs.rmSync(file);
}

function inject(point) {
  if (process.env.NODE_ENV === "test" && process.env.FUSE_GLOBAL_TEST_FAIL_POINT === point) {
    throw new Error(`injected global transaction failure at ${point}`);
  }
}

/** Atomically swap the shared local-plugin snapshot and finalize global files with crash recovery. */
export function commitGlobalSnapshot({ cursorRoot, stageRoot, finalFiles }) {
  recoverGlobalTransaction(cursorRoot);
  const match = path.basename(stageRoot).match(/^\.fusengine-local-stage-(\d+-\d+)$/);
  if (!match) throw new Error(`invalid global stage path: ${stageRoot}`);
  const nonce = match[1];
  const roots = transactionPaths(cursorRoot, nonce);
  const journal = { version: 1, nonce, phase: "prepared", hadLocal: fs.existsSync(roots.local), snapshot: snapshot(cursorRoot) };
  writeJournal(cursorRoot, journal);
  try {
    inject("prepared");
    if (journal.hadLocal) fs.renameSync(roots.local, roots.backup);
    inject("after-old-rename-before-journal");
    journal.phase = "old-moved";
    writeJournal(cursorRoot, journal);
    inject("after-old-move");
    fs.renameSync(stageRoot, roots.local);
    inject("after-new-rename-before-journal");
    journal.phase = "new-moved";
    writeJournal(cursorRoot, journal);
    inject("after-new-move");
    for (const item of finalFiles) {
      if (item.content === null) restoreFile(item.path, null);
      else writeFileAtomic(item.path, item.content);
    }
    journal.phase = "finalized";
    writeJournal(cursorRoot, journal);
    inject("after-finalize");
  } catch (error) {
    recoverGlobalTransaction(cursorRoot);
    throw error;
  }
  recoverGlobalTransaction(cursorRoot);
}
