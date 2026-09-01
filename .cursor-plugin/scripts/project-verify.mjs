#!/usr/bin/env node
/** Verify one installed project without changing it. */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const argument = process.argv[2];
if (!argument) {
  process.stderr.write("Usage: verify-project.sh <project-path>\n");
  process.exit(1);
}

const project = fs.realpathSync(path.resolve(argument));
const cursorRoot = path.join(project, ".cursor");
const managedRoot = path.join(cursorRoot, "fusengine");
const command = /^node \.cursor\/fusengine\/load-plugins\.mjs(?: --fusengine-owner=[a-f0-9]{16})?$/;
const failures = [];
const pass = (message) => process.stdout.write(`PASS ${message}\n`);
const check = (condition, message) => condition ? pass(message) : failures.push(message);

const hooksPath = path.join(cursorRoot, "hooks.json");
const marketPath = path.join(managedRoot, "marketplace.json");
check(fs.existsSync(path.join(managedRoot, ".managed-by-fusengine")), "managed installation marker exists");
check(fs.existsSync(path.join(cursorRoot, "rules", "fusengine.mdc")), "project rule exists");
check(fs.existsSync(hooksPath), "project hooks file exists");
check(fs.existsSync(marketPath), "installed marketplace inventory exists");

if (fs.existsSync(hooksPath)) {
  const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
  const entries = hooks.hooks?.workspaceOpen?.filter((hook) => command.test(hook?.command ?? "")) ?? [];
  check(hooks.version === 1, "hooks schema version is 1");
  check(entries.length === 1, "workspaceOpen loader is registered exactly once");
}

if (fs.existsSync(marketPath)) {
  const market = JSON.parse(fs.readFileSync(marketPath, "utf8"));
  const run = spawnSync(process.execPath, [".cursor/fusengine/load-plugins.mjs"], { cwd: project, encoding: "utf8" });
  check(run.status === 0, "project loader exits successfully");
  if (run.status === 0) {
    const response = JSON.parse(run.stdout);
    const paths = response.pluginPaths ?? [];
    check(paths.length === market.plugins.length, "loader returns one path per marketplace entry");
    check(!paths.includes(managedRoot), "loader does not return the marketplace root");
    check(paths.every((pluginPath) => path.isAbsolute(pluginPath)), "all plugin paths are absolute");
    check(paths.every((pluginPath) => fs.existsSync(path.join(pluginPath, ".cursor-plugin", "plugin.json"))), "all paths resolve to individual plugin roots");
  }
}

for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
if (failures.length > 0) process.exit(1);
process.stdout.write("VERDICT project installation verified\n");
