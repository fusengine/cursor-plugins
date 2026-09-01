/**
 * MCP Installer Service
 * Single Responsibility: turn catalog entries into Cursor mcp.json servers
 */
import { join } from "node:path";
import type { McpCatalog, McpServerConfig } from "../interfaces/mcp";
import { mergeMcpDocument, readMcpDocument, userMcpPath, writeMcpDocument } from "./mcp-config";

const MCP_JSON_PATH = join(import.meta.dir, "../../mcp/mcp.json");

/** Load MCP catalog from mcp.json */
export async function loadMcpCatalog(): Promise<McpCatalog> {
	const file = Bun.file(MCP_JSON_PATH);
	return await file.json();
}

/** Replace environment variables in string */
function expandEnvVars(value: string): string {
	const home = process.env.HOME || process.env.USERPROFILE || "";
	return value.replace(/\$\{HOME\}/g, home).replace(/\$HOME/g, home);
}

/** Recursively expand env vars in config */
function expandConfigVars(obj: unknown): unknown {
	if (typeof obj === "string") return expandEnvVars(obj);
	if (Array.isArray(obj)) return obj.map(expandConfigVars);
	if (obj && typeof obj === "object") {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj)) result[k] = expandConfigVars(v);
		return result;
	}
	return obj;
}

/**
 * Build a Cursor mcp.json entry: drop catalog metadata, expand `$HOME`, and
 * reference the API key as `${env:NAME}` so the secret never lands in the file
 * — Cursor interpolates it when it launches the server.
 * @param config - Catalog entry.
 * @returns The server object to write under `mcpServers`.
 */
export function buildCursorConfig(config: McpServerConfig): Record<string, unknown> {
	const { _description, requiresApiKey, apiKeyEnv, apiKeyUrl, default: _d, ...rest } = config;
	void _description;
	void apiKeyUrl;
	const server = expandConfigVars(rest) as Record<string, unknown>;
	if (requiresApiKey && apiKeyEnv) {
		const env = (server.env ?? {}) as Record<string, string>;
		server.env = { ...env, [apiKeyEnv]: `\${env:${apiKeyEnv}}` };
	}
	return server;
}

/**
 * Install the selected servers into Cursor's user-scoped mcp.json.
 *
 * Non-destructive: a server the user already declares is preserved and
 * reported in `kept`, never overwritten.
 * @param names - Selected catalog server names.
 * @param catalog - Parsed catalog.
 * @param mcpPath - Target mcp.json; defaults to `~/.cursor/mcp.json`.
 * @returns Added, failed and preserved server names.
 */
export async function installMcpServers(
	names: string[],
	catalog: McpCatalog,
	mcpPath: string = userMcpPath(),
): Promise<{ success: string[]; failed: string[]; kept: string[] }> {
	const entries = new Map<string, Record<string, unknown>>();
	const failed: string[] = [];
	for (const name of names) {
		const config = catalog.mcpServers[name];
		if (!config) failed.push(name);
		else entries.set(name, buildCursorConfig(config));
	}

	try {
		const { doc, added, kept } = mergeMcpDocument(readMcpDocument(mcpPath), entries);
		if (added.length > 0) writeMcpDocument(mcpPath, doc);
		return { success: added, failed, kept };
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		process.stderr.write(`warning: MCP configuration skipped (${reason})\n`);
		return { success: [], failed: [...failed, ...entries.keys()], kept: [] };
	}
}

export { buildMcpOptions, getDefaultSelections, hasApiKey } from "./mcp-defaults";
