#!/usr/bin/env node
/** Dispatch the default global installer or the explicit project installer. */
const target = process.argv.slice(2).includes("--project") ? "./project-install.mjs" : "./global-install.mjs";
await import(target);
