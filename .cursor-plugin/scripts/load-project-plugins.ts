#!/usr/bin/env bun
/**
 * load-project-plugins.ts - Cursor workspaceOpen loader entry point (dev source)
 * @description The installed copy of this script runs in a target project as plain
 * `node .cursor/fusengine/load-plugins.mjs` (see src/services/project-verify.ts's regex and
 * project-install-transaction.mjs's buildStage), with zero dependencies and no Bun
 * requirement on that machine. This file is the typed dev-source mirror of that same
 * contract: validate argv, then print `{"pluginPaths":[...]}` on stdout — preserve exactly,
 * a Cursor hook consumes it.
 */
import { loadProjectPlugins, validateLoaderArguments } from "./src/services/load-project-plugins";

const loaderArguments = process.argv.slice(2);
validateLoaderArguments(loaderArguments);
process.stdout.write(`${JSON.stringify(loadProjectPlugins(import.meta.dir, process.cwd()))}\n`);
