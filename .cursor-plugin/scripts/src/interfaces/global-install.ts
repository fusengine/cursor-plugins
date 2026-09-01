/**
 * Global installer interfaces.
 * @description SRP: types for the user-global Cursor plugin installer only
 * (global-install / global-artifacts / global-transaction services).
 */

/** Parsed CLI flags for the global installer. */
export interface GlobalOptions {
	dryRun: boolean;
	uninstall: boolean;
}

/** Every filesystem path the global installer reads or writes, resolved once at startup. */
export interface GlobalPaths {
	/** Root of this repository (or the test-injected source root override). */
	sourceRoot: string;
	/** Resolved real path of the user's home directory. */
	homeRoot: string;
	/** `~/.cursor`. */
	cursorRoot: string;
	/** `~/.cursor/plugins`. */
	pluginsRoot: string;
	/** `~/.cursor/plugins/local`. */
	localRoot: string;
	/** `~/.cursor/rules`. */
	rulesRoot: string;
	/** `~/.cursor/rules/fuse-global.mdc`. */
	rulePath: string;
	/** `~/.cursor/.fusengine-global`. */
	controlRoot: string;
	/** `~/.cursor/.fusengine-global/receipt.json`. */
	receiptPath: string;
	/** `~/.cursor/.fusengine-global/.managed-by-fusengine`. */
	controlMarker: string;
}

/** One marketplace plugin resolved to its real on-disk source directory. */
export interface GlobalPluginSource {
	name: string;
	source: string;
}

/** Shape of `receipt.json`: per-plugin content hashes plus the installed rule's hash. */
export interface GlobalReceipt {
	version: 1;
	plugins: Record<string, string>;
	ruleHash: string;
}

/** One file the transaction commits or removes as part of finalizing a snapshot swap. */
export interface GlobalFinalFile {
	path: string;
	content: Buffer | string | null;
}

/** Arguments to atomically swap the local-plugin snapshot and finalize global files. */
export interface CommitGlobalSnapshotArgs {
	cursorRoot: string;
	stageRoot: string;
	finalFiles: GlobalFinalFile[];
}

/** Lifecycle phase of an in-flight global install/uninstall transaction. */
export type GlobalTransactionPhase = "prepared" | "old-moved" | "new-moved" | "finalized";

/** Journal persisted to disk so a crash mid-swap can be recovered on the next run. */
export interface GlobalTransactionJournal {
	version: 1;
	nonce: string;
	phase: GlobalTransactionPhase;
	hadLocal: boolean;
	snapshot: Record<string, string | null>;
}

/** The three roots a transaction nonce maps to inside `~/.cursor/plugins`. */
export interface GlobalTransactionRoots {
	backup: string;
	local: string;
	stage: string;
}
