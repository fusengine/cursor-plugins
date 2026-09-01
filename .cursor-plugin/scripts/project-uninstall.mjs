import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { assertNotSymlink, restoreFile, writeFileAtomic } from "./project-install-files.mjs";
import { removeLoaderHook } from "./project-hooks.mjs";

const markerContent = "fusengine cursor project installation\n";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function requireType(file, type) {
  const stat = fs.lstatSync(file);
  if ((type === "file" && !stat.isFile()) || (type === "directory" && !stat.isDirectory())) {
    throw new Error(`expected ${type}: ${file}`);
  }
}

function serialize(document) {
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
}

function buildPlan(paths) {
  const { cursorRoot, managedRoot, hooksPath, rulePath, receiptPath } = paths;
  for (const target of [cursorRoot, managedRoot, hooksPath, path.dirname(rulePath), rulePath, receiptPath]) {
    assertNotSymlink(target);
  }
  requireType(cursorRoot, "directory");
  requireType(managedRoot, "directory");
  const markerPath = path.join(managedRoot, ".managed-by-fusengine");
  assertNotSymlink(markerPath);
  requireType(markerPath, "file");
  if (fs.readFileSync(markerPath, "utf8") !== markerContent) throw new Error(`invalid ownership marker: ${markerPath}`);
  if (fs.existsSync(receiptPath)) requireType(receiptPath, "file");
  const receipt = fs.existsSync(receiptPath) ? readJson(receiptPath) : {};

  let hooksAction = { type: "none" };
  const hooksExist = fs.existsSync(hooksPath);
  if (hooksExist) requireType(hooksPath, "file");
  const originalHooks = hooksExist ? fs.readFileSync(hooksPath) : null;
  if (originalHooks !== null) {
    const document = readJson(hooksPath);
    if (removeLoaderHook(document, receipt)) {
      const hookKeys = Object.keys(document.hooks ?? {});
      const onlyBaseKeys = Object.keys(document).every((key) => key === "version" || key === "hooks");
      hooksAction = receipt.hooksFileExisted === false && hookKeys.length === 0 && onlyBaseKeys
        ? { type: "remove" }
        : { type: "write", content: serialize(document) };
    }
  }

  let ruleAction = { type: "none" };
  const ruleExists = fs.existsSync(rulePath);
  if (ruleExists) requireType(rulePath, "file");
  const originalRule = ruleExists ? fs.readFileSync(rulePath) : null;
  if (originalRule !== null) {
    ruleAction = sha256(originalRule) === receipt.ruleSha256 && receipt.ruleFileExisted !== true
      ? { type: "remove" }
      : { type: "preserve" };
  }
  return { hooksAction, originalHooks, originalRule, receipt, ruleAction };
}

function applyFileAction(file, action) {
  if (action.type === "write") writeFileAtomic(file, action.content);
  else if (action.type === "remove") fs.rmSync(file);
}

function injectAfterHook() {
  if (process.env.NODE_ENV === "test" && process.env.FUSE_INSTALL_TEST_FAIL_UNINSTALL_AFTER_HOOK === "1") {
    throw new Error("injected uninstall failure after hook mutation");
  }
}

/** Preflight and atomically coordinate removal of one owned project installation. */
export function uninstallProject(paths) {
  const plan = buildPlan(paths);
  const tombstone = path.join(paths.cursorRoot, `.fusengine-uninstall-${process.pid}-${Date.now()}`);
  try {
    applyFileAction(paths.hooksPath, plan.hooksAction);
    injectAfterHook();
    applyFileAction(paths.rulePath, plan.ruleAction);
    fs.renameSync(paths.managedRoot, tombstone);
  } catch (error) {
    restoreFile(paths.rulePath, plan.originalRule);
    restoreFile(paths.hooksPath, plan.originalHooks);
    throw error;
  }
  if (plan.ruleAction.type === "preserve") process.stderr.write(`warning: preserved pre-existing or modified rule ${paths.rulePath}\n`);
  try { fs.rmSync(tombstone, { recursive: true }); }
  catch (error) { process.stderr.write(`warning: uninstall committed; retained cleanup directory ${tombstone}: ${error.message}\n`); }
}
