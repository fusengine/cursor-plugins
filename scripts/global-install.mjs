#!/usr/bin/env node
/** User-global Cursor plugin installer. All writes stay below the resolved user home. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashDirectory, hashFile } from "./global-artifacts.mjs";
import { commitGlobalSnapshot, recoverGlobalTransaction } from "./global-install-transaction.mjs";
import { assertNotSymlink, withProjectLock } from "./project-install-files.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = process.env.NODE_ENV === "test" && process.env.FUSE_INSTALL_TEST_SOURCE_ROOT
  ? path.resolve(process.env.FUSE_INSTALL_TEST_SOURCE_ROOT)
  : repositoryRoot;
const homeInput = process.env.HOME || process.env.USERPROFILE;
if (!homeInput || !fs.existsSync(homeInput)) throw new Error("HOME or USERPROFILE must reference an existing directory");
const homeRoot = fs.realpathSync(homeInput);
const cursorRoot = path.join(homeRoot, ".cursor");
const pluginsRoot = path.join(cursorRoot, "plugins");
const localRoot = path.join(pluginsRoot, "local");
const rulesRoot = path.join(cursorRoot, "rules");
const rulePath = path.join(rulesRoot, "fuse-global.mdc");
const controlRoot = path.join(cursorRoot, ".fusengine-global");
const receiptPath = path.join(controlRoot, "receipt.json");
const controlMarker = path.join(controlRoot, ".managed-by-fusengine");
const markerContent = "fusengine cursor global installation\n";
const options = { dryRun: false, uninstall: false };

for (const argument of process.argv.slice(2)) {
  if (argument === "--dry-run") options.dryRun = true;
  else if (argument === "--uninstall") options.uninstall = true;
  else if (argument === "--help" || argument === "-h") {
    process.stdout.write("Usage: install.sh [--dry-run] [--uninstall]\n       install.sh --project <path> [--dry-run] [--uninstall]\n");
    process.exit(0);
  } else throw new Error(`unknown global option: ${argument}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function validatePathChain(pluginNames = []) {
  for (const target of [cursorRoot, pluginsRoot, localRoot, rulesRoot, rulePath, controlRoot, receiptPath, controlMarker]) {
    assertNotSymlink(target);
  }
  for (const name of pluginNames) assertNotSymlink(path.join(localRoot, name));
}

function readReceipt() {
  if (!fs.existsSync(controlRoot)) return null;
  if (!fs.existsSync(receiptPath) || !fs.existsSync(controlMarker)) throw new Error(`refusing unowned global control directory: ${controlRoot}`);
  if (fs.readFileSync(controlMarker, "utf8") !== markerContent) throw new Error(`invalid global ownership marker: ${controlMarker}`);
  const receipt = readJson(receiptPath);
  if (receipt.version !== 1 || !receipt.plugins || typeof receipt.plugins !== "object") throw new Error(`invalid global receipt: ${receiptPath}`);
  return receipt;
}

function inventory() {
  const market = readJson(path.join(sourceRoot, ".cursor-plugin", "marketplace.json"));
  if (!Array.isArray(market.plugins) || market.plugins.length !== 24) throw new Error("global install requires exactly 24 marketplace plugins");
  return market.plugins.map((entry) => {
    if (typeof entry.source !== "string" || path.basename(entry.source) !== entry.source) throw new Error(`unsafe global plugin source: ${entry.source}`);
    const source = path.join(sourceRoot, entry.source);
    const manifest = readJson(path.join(source, ".cursor-plugin", "plugin.json"));
    if (manifest.name !== entry.name || entry.name !== entry.source) throw new Error(`global plugin identity mismatch: ${entry.source}`);
    return { name: entry.source, source };
  });
}

function preflightOwned(receipt, plugins) {
  for (const plugin of plugins) {
    const target = path.join(localRoot, plugin.name);
    if (!fs.existsSync(target)) continue;
    const priorHash = receipt?.plugins?.[plugin.name];
    if (!priorHash) throw new Error(`refusing pre-existing global plugin: ${target}`);
    if (hashDirectory(target) !== priorHash) throw new Error(`refusing to overwrite modified owned plugin: ${target}`);
  }
  if (fs.existsSync(rulePath)) {
    if (!receipt?.ruleHash) throw new Error(`refusing pre-existing global rule: ${rulePath}`);
    if (hashFile(rulePath) !== receipt.ruleHash) throw new Error(`refusing to overwrite modified owned rule: ${rulePath}`);
  }
}

function stageLocal(nonce) {
  const stage = path.join(pluginsRoot, `.fusengine-local-stage-${nonce}`);
  fs.mkdirSync(pluginsRoot, { recursive: true });
  if (fs.existsSync(localRoot)) fs.cpSync(localRoot, stage, { recursive: true });
  else fs.mkdirSync(stage);
  return stage;
}

function installGlobal() {
  recoverGlobalTransaction(cursorRoot);
  const plugins = inventory();
  validatePathChain(plugins.map((plugin) => plugin.name));
  const previous = readReceipt();
  preflightOwned(previous, plugins);
  const rule = fs.readFileSync(path.join(sourceRoot, "fuse-rules", "user-rules", "fuse-global.mdc"));
  if (options.dryRun) {
    process.stdout.write(`Would install 24 plugins under ${localRoot}\nWould write ${rulePath}\nDry run: nothing written.\n`);
    return;
  }
  const nonce = `${process.pid}-${Date.now()}`;
  const stage = stageLocal(nonce);
  try {
    const hashes = {};
    for (const plugin of plugins) {
      const target = path.join(stage, plugin.name);
      if (fs.existsSync(target)) fs.rmSync(target, { recursive: true });
      fs.cpSync(plugin.source, target, { recursive: true });
      hashes[plugin.name] = hashDirectory(target);
    }
    const receipt = Buffer.from(`${JSON.stringify({ version: 1, plugins: hashes, ruleHash: hashFile(path.join(sourceRoot, "fuse-rules", "user-rules", "fuse-global.mdc")) }, null, 2)}\n`);
    commitGlobalSnapshot({ cursorRoot, stageRoot: stage, finalFiles: [
      { path: rulePath, content: rule }, { path: receiptPath, content: receipt }, { path: controlMarker, content: markerContent },
    ] });
  } catch (error) {
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true });
    throw error;
  }
  process.stdout.write(`Installed 24 user-global plugins in ${localRoot}\nReload the Cursor window to activate them.\n`);
}

function uninstallGlobal() {
  recoverGlobalTransaction(cursorRoot);
  validatePathChain();
  const receipt = readReceipt();
  if (!receipt) throw new Error(`no managed global installation at ${controlRoot}`);
  if (options.dryRun) {
    process.stdout.write(`Would remove only intact Fusengine global plugins and rule under ${cursorRoot}\nDry run: nothing written.\n`);
    return;
  }
  const nonce = `${process.pid}-${Date.now()}`;
  const stage = stageLocal(nonce);
  try {
    for (const [name, expectedHash] of Object.entries(receipt.plugins)) {
      if (path.basename(name) !== name) throw new Error(`unsafe receipt plugin name: ${name}`);
      const active = path.join(localRoot, name);
      if (!fs.existsSync(active)) continue;
      if (hashDirectory(active) === expectedHash) fs.rmSync(path.join(stage, name), { recursive: true });
      else process.stderr.write(`warning: preserved modified global plugin ${active}\n`);
    }
    const removeRule = fs.existsSync(rulePath) && hashFile(rulePath) === receipt.ruleHash;
    if (fs.existsSync(rulePath) && !removeRule) process.stderr.write(`warning: preserved modified global rule ${rulePath}\n`);
    const finalFiles = [{ path: receiptPath, content: null }, { path: controlMarker, content: null }];
    if (removeRule) finalFiles.push({ path: rulePath, content: null });
    commitGlobalSnapshot({ cursorRoot, stageRoot: stage, finalFiles });
    try { fs.rmdirSync(controlRoot); } catch { /* preserved if non-empty */ }
  } catch (error) {
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true });
    throw error;
  }
  process.stdout.write(`Uninstalled intact user-global Fusengine artifacts from ${cursorRoot}\n`);
}

try {
  validatePathChain();
  if (options.dryRun) (options.uninstall ? uninstallGlobal : installGlobal)();
  else withProjectLock(cursorRoot, options.uninstall ? uninstallGlobal : installGlobal);
} catch (error) {
  process.stderr.write(`error: ${error.message}\n`);
  process.exit(1);
}
