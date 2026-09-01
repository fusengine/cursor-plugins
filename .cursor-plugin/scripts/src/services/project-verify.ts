/**
 * Project installation verification (read-only)
 * @description SRP: verify one installed project's Fusengine plugin wiring without changing
 * it. Ported 1:1 from project-verify.mjs — this module and every check it performs are
 * READ-ONLY, preserve that property, never write to the target project.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { HooksFile, InstalledMarketplace, LoaderCliResponse } from "../interfaces/verify";

const WORKSPACE_OPEN_COMMAND =
	/^node \.cursor\/fusengine\/load-plugins\.mjs(?: --fusengine-owner=[a-f0-9]{16})?$/;

/** Verify one installed project's Fusengine wiring, resolved against its real path. */
export function verifyProject(projectArgument: string): string[] {
	const project = fs.realpathSync(path.resolve(projectArgument));
	const cursorRoot = path.join(project, ".cursor");
	const managedRoot = path.join(cursorRoot, "fusengine");
	const failures: string[] = [];
	const pass = (message: string): void => {
		process.stdout.write(`PASS ${message}\n`);
	};
	const check = (condition: boolean, message: string): void => {
		if (condition) pass(message);
		else failures.push(message);
	};

	const hooksPath = path.join(cursorRoot, "hooks.json");
	const marketPath = path.join(managedRoot, "marketplace.json");
	check(fs.existsSync(path.join(managedRoot, ".managed-by-fusengine")), "managed installation marker exists");
	check(fs.existsSync(path.join(cursorRoot, "rules", "fusengine.mdc")), "project rule exists");
	check(fs.existsSync(hooksPath), "project hooks file exists");
	check(fs.existsSync(marketPath), "installed marketplace inventory exists");

	if (fs.existsSync(hooksPath)) {
		const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8")) as HooksFile;
		const entries =
			hooks.hooks?.workspaceOpen?.filter((hook) =>
				WORKSPACE_OPEN_COMMAND.test(String(hook?.command ?? "")),
			) ?? [];
		check(hooks.version === 1, "hooks schema version is 1");
		check(entries.length === 1, "workspaceOpen loader is registered exactly once");
	}

	if (fs.existsSync(marketPath)) {
		const market = JSON.parse(fs.readFileSync(marketPath, "utf8")) as InstalledMarketplace;
		// "node", not process.execPath: this entry runs under bun, whereas the
		// deployed hook command is `node .cursor/fusengine/load-plugins.mjs`
		// (project-hooks.ts::baseCommand). process.execPath would re-launch the
		// CURRENT runtime — verifying an interpreter production never uses.
		const run = spawnSync("node", [".cursor/fusengine/load-plugins.mjs"], {
			cwd: project,
			encoding: "utf8",
		});
		check(run.status === 0, "project loader exits successfully");
		if (run.status === 0) {
			const response = JSON.parse(run.stdout) as LoaderCliResponse;
			const paths = response.pluginPaths ?? [];
			check(paths.length === market.plugins.length, "loader returns one path per marketplace entry");
			check(!paths.includes(managedRoot), "loader does not return the marketplace root");
			check(paths.every((pluginPath) => path.isAbsolute(pluginPath)), "all plugin paths are absolute");
			check(
				paths.every((pluginPath) => fs.existsSync(path.join(pluginPath, ".cursor-plugin", "plugin.json"))),
				"all paths resolve to individual plugin roots",
			);
		}
	}

	return failures;
}
