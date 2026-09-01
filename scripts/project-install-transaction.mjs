import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolvePluginPaths } from "./project-plugin-inventory.mjs";

function validateStage(stageRoot, plugins) {
  const loader = path.join(stageRoot, "load-plugins.mjs");
  const inventory = path.join(stageRoot, "project-plugin-inventory.mjs");
  for (const script of [loader, inventory]) {
    const run = spawnSync(process.execPath, ["--check", script], { encoding: "utf8" });
    if (run.status !== 0) throw new Error(`staged loader validation failed: ${run.stderr.trim()}`);
  }
  const pluginPaths = resolvePluginPaths(stageRoot);
  const expected = plugins.map((plugin) => fs.realpathSync(path.join(stageRoot, "plugins", plugin.name)));
  if (JSON.stringify(pluginPaths) !== JSON.stringify(expected)) {
    throw new Error("staged loader paths do not match the marketplace inventory");
  }
}

function buildStage({ stageRoot, sourceRoot, plugins, receipt }) {
  fs.mkdirSync(path.join(stageRoot, "plugins"), { recursive: true });
  fs.writeFileSync(path.join(stageRoot, ".managed-by-fusengine"), "fusengine cursor project installation\n");
  const failAfter = process.env.NODE_ENV === "test"
    ? Number.parseInt(process.env.FUSE_INSTALL_TEST_FAIL_AFTER_PLUGIN ?? "0", 10)
    : 0;
  for (let index = 0; index < plugins.length; index += 1) {
    const plugin = plugins[index];
    fs.cpSync(plugin.source, path.join(stageRoot, "plugins", plugin.name), { recursive: true });
    if (failAfter === index + 1) throw new Error(`injected copy failure after plugin ${plugin.name}`);
  }
  fs.copyFileSync(path.join(sourceRoot, "scripts", "load-project-plugins.mjs"), path.join(stageRoot, "load-plugins.mjs"));
  fs.copyFileSync(path.join(sourceRoot, "scripts", "project-plugin-inventory.mjs"), path.join(stageRoot, "project-plugin-inventory.mjs"));
  fs.copyFileSync(path.join(sourceRoot, ".cursor-plugin", "marketplace.json"), path.join(stageRoot, "marketplace.json"));
  fs.writeFileSync(path.join(stageRoot, "install-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  validateStage(stageRoot, plugins);
}

function isOwnedBackup(candidate) {
  try {
    const stat = fs.lstatSync(candidate);
    const marker = path.join(candidate, ".managed-by-fusengine");
    return stat.isDirectory() && !stat.isSymbolicLink()
      && fs.lstatSync(marker).isFile()
      && fs.readFileSync(marker, "utf8") === "fusengine cursor project installation\n";
  } catch { return false; }
}

function ownedRoots(cursorRoot, pattern) {
  if (!fs.existsSync(cursorRoot)) return [];
  return fs.readdirSync(cursorRoot)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(cursorRoot, name))
    .filter(isOwnedBackup);
}

/** Restore a sole crash backup before removing stale owned recovery artifacts. */
export function recoverManagedRoot(cursorRoot, managedRoot) {
  if (!fs.existsSync(cursorRoot)) return;
  const backups = ownedRoots(cursorRoot, /^\.fusengine-backup-\d+-\d+$/);
  if (!fs.existsSync(managedRoot)) {
    if (backups.length > 1) throw new Error("multiple owned crash backups require manual recovery");
    if (backups.length === 1) fs.renameSync(backups[0], managedRoot);
  }
  if (fs.existsSync(managedRoot) && !isOwnedBackup(managedRoot)) {
    throw new Error(`managed root has no valid ownership marker: ${managedRoot}`);
  }
  for (const backup of backups) {
    if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true });
  }
  for (const stage of ownedRoots(cursorRoot, /^\.fusengine-stage-\d+-\d+$/)) {
    fs.rmSync(stage, { recursive: true });
  }
}

function injectFailure(point) {
  if (process.env.NODE_ENV === "test" && process.env.FUSE_INSTALL_TEST_FAIL_POINT === point) {
    throw new Error(`injected transaction failure at ${point}`);
  }
}

/** Build and validate a complete managed root, then replace it with rollback around finalization. */
export function replaceManagedRoot({ cursorRoot, managedRoot, sourceRoot, plugins, receipt, finalize, rollbackFinalize }) {
  fs.mkdirSync(cursorRoot, { recursive: true });
  recoverManagedRoot(cursorRoot, managedRoot);
  const nonce = `${process.pid}-${Date.now()}`;
  const stageRoot = path.join(cursorRoot, `.fusengine-stage-${nonce}`);
  const backupRoot = path.join(cursorRoot, `.fusengine-backup-${nonce}`);
  let oldMoved = false;
  let newMoved = false;
  let finalizationStarted = false;
  try {
    buildStage({ stageRoot, sourceRoot, plugins, receipt });
    injectFailure("before-old-move");
    if (fs.existsSync(managedRoot)) {
      fs.renameSync(managedRoot, backupRoot);
      oldMoved = true;
    }
    injectFailure("after-old-move");
    fs.renameSync(stageRoot, managedRoot);
    newMoved = true;
    injectFailure("after-new-move");
    finalizationStarted = true;
    finalize();
    injectFailure("after-finalize");
  } catch (error) {
    if (finalizationStarted) rollbackFinalize();
    if (newMoved && fs.existsSync(managedRoot)) fs.rmSync(managedRoot, { recursive: true });
    if (oldMoved && fs.existsSync(backupRoot)) fs.renameSync(backupRoot, managedRoot);
    throw error;
  } finally {
    if (fs.existsSync(stageRoot)) fs.rmSync(stageRoot, { recursive: true });
  }
  if (oldMoved && fs.existsSync(backupRoot)) {
    const retainForTest = process.env.NODE_ENV === "test" && process.env.FUSE_INSTALL_TEST_FAIL_BACKUP_CLEANUP === "1";
    try {
      if (retainForTest) throw new Error("injected backup cleanup failure");
      fs.rmSync(backupRoot, { recursive: true });
    } catch (error) {
      process.stderr.write(`warning: install committed; recovery backup retained at ${backupRoot}: ${error.message}\n`);
    }
  }
}
