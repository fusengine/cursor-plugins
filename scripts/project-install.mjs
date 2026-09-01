#!/usr/bin/env node
/** Project-local Cursor installer. All writes stay below the explicit target. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertNotSymlink, restoreFile, withProjectLock, writeFileAtomic } from "./project-install-files.mjs";
import { mergeLoaderHook } from "./project-hooks.mjs";
import { recoverManagedRoot, replaceManagedRoot } from "./project-install-transaction.mjs";
import { uninstallProject } from "./project-uninstall.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markerName = ".managed-by-fusengine";
const args = process.argv.slice(2);
const options = { dryRun: false, uninstall: false, project: "" };

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function usage() {
  process.stdout.write("Usage: install.sh --project <path> [--dry-run] [--uninstall]\n");
  process.exit(0);
}

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--project") options.project = args[++index] ?? "";
  else if (arg === "--dry-run") options.dryRun = true;
  else if (arg === "--uninstall") options.uninstall = true;
  else if (arg === "--help" || arg === "-h") usage();
  else fail(`unknown option: ${arg}`);
}
if (!options.project) fail("--project <path> is required; no global scope is implied");

const requestedProject = path.resolve(options.project);
if (!fs.existsSync(requestedProject) || !fs.statSync(requestedProject).isDirectory()) fail(`project directory does not exist: ${requestedProject}`);
const projectRoot = fs.realpathSync(requestedProject);
const cursorRoot = path.join(projectRoot, ".cursor");
const managedRoot = path.join(cursorRoot, "fusengine");
const markerPath = path.join(managedRoot, markerName);
const hooksPath = path.join(cursorRoot, "hooks.json");
const rulePath = path.join(cursorRoot, "rules", "fusengine.mdc");
const receiptPath = path.join(managedRoot, "install-receipt.json");

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail(`${file} is not valid JSON: ${error.message}`); }
}

function writeJson(file, value) {
  writeFileAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hookDocument() {
  const existed = fs.existsSync(hooksPath);
  const document = existed ? readJson(hooksPath) : { version: 1, hooks: {} };
  if (!document || Array.isArray(document) || typeof document !== "object") fail(`${hooksPath} must contain an object`);
  if (document.version !== undefined && document.version !== 1) fail(`${hooksPath} must use Cursor hooks version 1`);
  if (document.hooks !== undefined && (Array.isArray(document.hooks) || typeof document.hooks !== "object")) fail(`${hooksPath}.hooks must be an object`);
  document.version = 1;
  document.hooks ??= {};
  document.hooks.workspaceOpen ??= [];
  if (!Array.isArray(document.hooks.workspaceOpen)) fail(`${hooksPath}.hooks.workspaceOpen must be an array`);
  return { document, existed };
}

function buildRule() {
  const defaultSource = path.join(sourceRoot, "AGENTS.md");
  const ruleSource = process.env.NODE_ENV === "test" && process.env.FUSE_INSTALL_TEST_RULE_SOURCE
    ? process.env.FUSE_INSTALL_TEST_RULE_SOURCE
    : defaultSource;
  const agents = fs.readFileSync(ruleSource, "utf8")
    .replace(/\n<!-- Source of truth[\s\S]*?-->\n/, "\n");
  return `---\ndescription: Fusengine project engineering rules.\nalwaysApply: true\n---\n\n${agents}`;
}

function validatePlugins(market) {
  return market.plugins.map((entry) => {
    if (typeof entry.source !== "string" || path.basename(entry.source) !== entry.source) fail(`unsafe plugin source: ${entry.source}`);
    const source = path.join(sourceRoot, entry.source);
    if (!fs.existsSync(path.join(source, ".cursor-plugin", "plugin.json"))) fail(`invalid plugin source: ${entry.source}`);
    return { name: entry.source, source };
  });
}

function install() {
  assertNotSymlink(cursorRoot);
  assertNotSymlink(managedRoot);
  assertNotSymlink(hooksPath);
  assertNotSymlink(path.dirname(rulePath));
  assertNotSymlink(rulePath);
  recoverManagedRoot(cursorRoot, managedRoot);
  assertNotSymlink(managedRoot);
  const market = readJson(path.join(sourceRoot, ".cursor-plugin", "marketplace.json"));
  if (!Array.isArray(market.plugins) || market.plugins.length === 0) fail("marketplace has no plugins");
  const plugins = validatePlugins(market);
  const previousReceipt = fs.existsSync(receiptPath) ? readJson(receiptPath) : {};
  const originalHooks = fs.existsSync(hooksPath) ? fs.readFileSync(hooksPath) : null;
  const originalRule = fs.existsSync(rulePath) ? fs.readFileSync(rulePath) : null;
  const ruleExisted = typeof previousReceipt.ruleFileExisted === "boolean"
    ? previousReceipt.ruleFileExisted
    : fs.existsSync(rulePath);
  const { document, existed } = hookDocument();
  const candidateToken = crypto.randomBytes(8).toString("hex");
  const hookPlan = mergeLoaderHook(document, previousReceipt, candidateToken);
  const { document: clean, hookAdded, hookCommand, hookIndex, hookToken } = hookPlan;
  const rule = buildRule();
  if (options.dryRun) {
    process.stdout.write(`Would install ${market.plugins.length} plugins under ${managedRoot}\n`);
    process.stdout.write(`Would merge ${hookCommand} into ${hooksPath}\nWould write ${rulePath}\nDry run: nothing written.\n`);
    return;
  }
  if (fs.existsSync(managedRoot) && !fs.existsSync(markerPath)) fail(`refusing to replace unowned directory: ${managedRoot}`);
  const currentRule = fs.existsSync(rulePath) ? fs.readFileSync(rulePath) : null;
  const ownedRuleIntact = currentRule !== null
    && previousReceipt.ruleFileExisted === false
    && sha256(currentRule) === previousReceipt.ruleSha256;
  if (currentRule !== null && currentRule.toString("utf8") !== rule && !ownedRuleIntact) {
    fail(`refusing to overwrite existing rule: ${rulePath}`);
  }
  const receipt = {
    hooksFileExisted: typeof previousReceipt.hooksFileExisted === "boolean" ? previousReceipt.hooksFileExisted : existed,
    ruleFileExisted: ruleExisted,
    hookAdded,
    hookIndex,
    hookToken,
    ruleSha256: sha256(rule),
  };
  const finalize = () => {
    writeFileAtomic(rulePath, rule);
    writeJson(hooksPath, clean);
  };
  const rollbackFinalize = () => {
    restoreFile(rulePath, originalRule);
    restoreFile(hooksPath, originalHooks);
  };
  replaceManagedRoot({ cursorRoot, managedRoot, sourceRoot, plugins, receipt, finalize, rollbackFinalize });
  process.stdout.write(`Installed ${market.plugins.length} project-local plugins in ${projectRoot}\nReload the Cursor window to activate them.\n`);
}

if (options.dryRun && options.uninstall) {
  process.stdout.write(`Would remove only the Fusengine hook, rule, and managed directory under ${projectRoot}\nDry run: nothing written.\n`);
} else if (options.uninstall) {
  try {
    assertNotSymlink(cursorRoot);
    withProjectLock(cursorRoot, () => uninstallProject({ cursorRoot, hooksPath, managedRoot, receiptPath, rulePath }));
    process.stdout.write(`Uninstalled project-local plugins from ${projectRoot}\n`);
  }
  catch (error) { fail(error.message); }
}
else {
  try {
    assertNotSymlink(cursorRoot);
    if (options.dryRun) install();
    else withProjectLock(cursorRoot, install);
  }
  catch (error) { fail(error.message); }
}
