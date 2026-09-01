/**
 * MCP Config Service
 * Single Responsibility: read, merge and atomically write Cursor's mcp.json
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { McpDocument, McpMergeResult } from "../interfaces/mcp";

/** Absolute path of the user-scoped Cursor MCP configuration. */
export function userMcpPath(): string {
	const home = process.env.HOME || process.env.USERPROFILE || "";
	return join(home, ".cursor", "mcp.json");
}

/**
 * Parse an existing mcp.json. A missing or malformed file yields an empty
 * document rather than throwing: the installer never aborts on a file it does
 * not own.
 * @param file - Path to mcp.json.
 * @returns The parsed document, or an empty one.
 */
export function readMcpDocument(file: string): McpDocument {
	try {
		return JSON.parse(readFileSync(file, "utf8")) as McpDocument;
	} catch {
		return {};
	}
}

/**
 * Add absent servers, preserving every server the user already declares.
 *
 * A name already present is never overwritten — it comes back in `kept`, which
 * is what makes the installer safe to re-run.
 * @param existing - Current document.
 * @param entries - Server name to Cursor-shaped config.
 * @returns Merged document, plus what was added and preserved.
 */
export function mergeMcpDocument(
	existing: McpDocument,
	entries: Map<string, Record<string, unknown>>,
): McpMergeResult {
	const servers: Record<string, unknown> = { ...(existing.mcpServers ?? {}) };
	const added: string[] = [];
	const kept: string[] = [];

	for (const [name, config] of entries) {
		if (Object.hasOwn(servers, name)) kept.push(name);
		else {
			servers[name] = config;
			added.push(name);
		}
	}
	return { doc: { ...existing, mcpServers: servers }, added, kept };
}

/**
 * Write through a sibling temp file then rename, so an interrupted run never
 * leaves a truncated mcp.json behind.
 * @param file - Target path.
 * @param doc - Document to serialise.
 */
export function writeMcpDocument(file: string, doc: McpDocument): void {
	const temp = `${file}.fusengine-${process.pid}`;
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(temp, `${JSON.stringify(doc, null, 2)}\n`);
	renameSync(temp, file);
}
