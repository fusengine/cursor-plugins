#!/usr/bin/env bun
/**
 * verify.ts - Read-only verification entry point for an installed project
 * @description Ported 1:1 from project-verify.mjs. `verify-project.sh` in the usage message
 * below is a pre-existing naming quirk from the original script, preserved verbatim.
 * READ-ONLY: never writes to the target project.
 */
import { verifyProject } from "./src/services/project-verify";

const argument = process.argv[2];
if (!argument) {
	process.stderr.write("Usage: verify-project.sh <project-path>\n");
	process.exit(1);
}

const failures = verifyProject(argument);
for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
if (failures.length > 0) process.exit(1);
process.stdout.write("VERDICT project installation verified\n");
