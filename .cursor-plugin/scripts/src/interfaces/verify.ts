/**
 * Project verification I/O shapes
 * @description SRP: read-only diagnostic types for project-verify's on-disk contracts
 * (hooks.json, the installed marketplace.json, and the loader's stdout response).
 */

/** `hooks.json` shape, as read from an installed project — untrusted until checked. */
export interface HooksFile {
	version?: unknown;
	hooks?: {
		workspaceOpen?: Array<{ command?: unknown }>;
	};
}

/** Installed marketplace inventory (`marketplace.json`) shape, as read from disk. */
export interface InstalledMarketplace {
	plugins: unknown[];
}

/** stdout contract of the project-local loader (`{"pluginPaths":[...]}`). */
export interface LoaderCliResponse {
	pluginPaths?: string[];
}
