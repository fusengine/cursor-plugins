/**
 * Project installer interfaces.
 * @description SRP: shared types for the project-local Cursor installer
 * (project-install / project-files / project-transaction / project-uninstall
 * / project-hooks services). No runtime code here. Plugin/marketplace shapes
 * are NOT redefined here — reused from `./marketplace` (owned by the
 * marketplace-sources/plugin-inventory port) to avoid duplicate types.
 */
import type { MarketplaceManifest, ResolvedMarketplacePlugin } from "./marketplace";

export type { MarketplaceManifest };

/** CLI options parsed from `process.argv` for the project installer. */
export interface InstallOptions {
	dryRun: boolean;
	uninstall: boolean;
	project: string;
}

/** One `hooks.json` `workspaceOpen` (or other) hook entry. */
export interface HookEntry {
	command: string;
	[key: string]: unknown;
}

/** The `hooks` object of a normalized `hooks.json` document. */
export interface HookGroups {
	workspaceOpen: unknown[];
	[key: string]: unknown;
}

/**
 * Normalized `hooks.json` shape guaranteed by `hookDocument()`: `version` is 1
 * and `hooks.workspaceOpen` is always an array.
 */
export interface HookDocument {
	version: number;
	hooks: HookGroups;
	[key: string]: unknown;
}

/**
 * Raw `hooks.json` as parsed straight off disk, before normalization — used on
 * the uninstall path, which never runs the document through `hookDocument()`.
 */
export interface RawHookDocument {
	version?: number;
	hooks?: {
		workspaceOpen?: unknown[];
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

/** Persisted install receipt: what the installer added, so uninstall reverses only that. */
export interface InstallReceipt {
	hooksFileExisted?: boolean;
	ruleFileExisted?: boolean;
	hookAdded?: boolean;
	hookIndex?: number;
	hookToken?: string | null;
	ruleSha256?: string;
}

/** Result of merging (or reusing) the owned loader hook into a hooks document. */
export interface HookMergeResult {
	document: HookDocument;
	hookAdded: boolean;
	hookCommand: string;
	hookIndex: number;
	hookToken: string | null;
}

/** Absolute paths the uninstaller needs to plan and apply removal. */
export interface UninstallPaths {
	cursorRoot: string;
	managedRoot: string;
	hooksPath: string;
	rulePath: string;
	receiptPath: string;
}

/** One planned mutation for a single owned file during uninstall. */
export type FileAction =
	| { type: "none" }
	| { type: "remove" }
	| { type: "write"; content: Buffer }
	| { type: "preserve" };

/** Full uninstall plan computed before any filesystem mutation (preflight). */
export interface UninstallPlan {
	hooksAction: FileAction;
	originalHooks: Buffer | null;
	originalRule: Buffer | null;
	receipt: InstallReceipt;
	ruleAction: FileAction;
}

/** Inputs to build one staged managed-root directory before it is swapped in. */
export interface StageBuildInput {
	stageRoot: string;
	sourceRoot: string;
	plugins: ResolvedMarketplacePlugin[];
	receipt: InstallReceipt;
}

/** Inputs to atomically replace the managed root, with rollback around finalize. */
export interface ReplaceManagedRootInput {
	cursorRoot: string;
	managedRoot: string;
	sourceRoot: string;
	plugins: ResolvedMarketplacePlugin[];
	receipt: InstallReceipt;
	finalize: () => void;
	rollbackFinalize: () => void;
}
