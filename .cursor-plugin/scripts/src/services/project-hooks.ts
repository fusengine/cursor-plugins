/**
 * Project-local Cursor loader hook merge/removal.
 * @description SRP: own the `hooks.json` `workspaceOpen` entry that points at
 * the project's loader — merge it in non-destructively, remove only the
 * exact owned entry.
 */
import type {
	HookDocument,
	HookEntry,
	HookMergeResult,
	InstallReceipt,
	RawHookDocument,
} from "../interfaces/project-install";

/** Project-relative Cursor loader command prefix owned by this installer. */
export const baseCommand = "node .cursor/fusengine/load-plugins.mjs";

/** Build the uniquely owned loader command persisted in the install receipt. */
export function loaderCommand(token: string): string {
	return `${baseCommand} --fusengine-owner=${token}`;
}

function isMatching(entry: unknown): entry is HookEntry {
	if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return false;
	const command = (entry as { command?: unknown }).command;
	return (
		command === baseCommand ||
		(typeof command === "string" &&
			new RegExp(`^${baseCommand.replaceAll(".", "\\.")} --fusengine-owner=[a-f0-9]{16}$`).test(command))
	);
}

function isExact(entry: unknown, command: string): entry is HookEntry {
	return isMatching(entry) && entry.command === command && Object.keys(entry).length === 1;
}

/** Merge a loader entry only when no matching foreign entry already supplies discovery. */
export function mergeLoaderHook(
	document: HookDocument,
	previousReceipt: InstallReceipt,
	candidateToken: string,
): HookMergeResult {
	const entries = document.hooks.workspaceOpen;
	if (previousReceipt.hookAdded === true && /^[a-f0-9]{16}$/.test(previousReceipt.hookToken ?? "")) {
		const command = loaderCommand(previousReceipt.hookToken as string);
		let hookIndex = previousReceipt.hookIndex;
		if (!Number.isInteger(hookIndex) || !isExact(entries[hookIndex as number], command)) {
			const indexes = entries.flatMap((entry, index) => (isExact(entry, command) ? [index] : []));
			hookIndex = indexes.length === 1 ? indexes[0] : -1;
		}
		if ((hookIndex as number) < 0) {
			hookIndex = entries.length;
			entries.push({ command });
		}
		return {
			document,
			hookAdded: true,
			hookCommand: command,
			hookIndex: hookIndex as number,
			hookToken: previousReceipt.hookToken as string,
		};
	}
	if (entries.some(isMatching)) {
		return { document, hookAdded: false, hookCommand: baseCommand, hookIndex: -1, hookToken: null };
	}
	const command = loaderCommand(candidateToken);
	const hookIndex = entries.length;
	entries.push({ command });
	return { document, hookAdded: true, hookCommand: command, hookIndex, hookToken: candidateToken };
}

/** Remove at most one exact canonical entry, and only when the receipt says we added it. */
export function removeLoaderHook(document: RawHookDocument, receipt: InstallReceipt): boolean {
	if (receipt.hookAdded !== true || !/^[a-f0-9]{16}$/.test(receipt.hookToken ?? "")) return false;
	const entries = document.hooks?.workspaceOpen;
	if (!Array.isArray(entries)) return false;
	const command = loaderCommand(receipt.hookToken as string);
	let index = receipt.hookIndex;
	if (!Number.isInteger(index) || !isExact(entries[index as number], command)) {
		const indexes = entries.flatMap((entry, entryIndex) => (isExact(entry, command) ? [entryIndex] : []));
		if (indexes.length !== 1) throw new Error("owned loader hook occurrence is missing or ambiguous");
		[index] = indexes;
	}
	entries.splice(index as number, 1);
	if (entries.length === 0 && document.hooks) delete document.hooks.workspaceOpen;
	return true;
}
