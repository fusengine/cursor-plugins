/**
 * MCP Server interfaces for installer
 */

/** MCP Server configuration from mcp.json */
export interface McpServerConfig {
	_description: string;
	command?: string;
	args?: string[];
	env?: Record<string, string>;
	type: "stdio" | "http";
	url?: string;
	headers?: Record<string, string>;
	requiresApiKey: boolean;
	apiKeyEnv?: string;
	apiKeyUrl?: string;
	default?: boolean;
}

/** MCP catalog from mcp.json */
export interface McpCatalog {
	mcpServers: Record<string, McpServerConfig>;
}

/** A Cursor mcp.json document, as written to ~/.cursor/mcp.json. */
export interface McpDocument {
	mcpServers?: Record<string, unknown>;
	[key: string]: unknown;
}

/** Outcome of merging catalog servers into a user's mcp.json. */
export interface McpMergeResult {
	doc: McpDocument;
	added: string[];
	kept: string[];
}

/** MCP server with resolved status */
export interface McpServerStatus {
	name: string;
	config: McpServerConfig;
	hasApiKey: boolean;
	isInstalled: boolean;
}

/** Group of MCP servers for display */
export interface McpServerGroup {
	label: string;
	servers: McpServerStatus[];
}

/** Selection option for @clack/prompts */
export interface McpSelectOption {
	value: string;
	label: string;
	hint?: string;
}
