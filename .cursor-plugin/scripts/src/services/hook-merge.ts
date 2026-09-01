/**
 * Hook merge service
 * @description SRP: conservatively merge the fusengine hooks-loader entry into an
 * existing Cursor hooks map without clobbering user-authored entries. Idempotent.
 *
 * Cursor entries are flat — `{command, matcher?}` — unlike Claude Code's nested
 * `{matcher, hooks:[{type, command}]}`.
 */
import type { HookType } from "../interfaces/hook-types";

/** A single Cursor hooks[event] entry. */
interface HookEntry {
	command?: string;
	matcher?: string;
	[key: string]: unknown;
}

/**
 * Path-anchored marker identifying an entry owned by the fusengine hooks-loader.
 * The leading separator requires the actual `hooks-loader.ts` filename (not the
 * bare word), so a user command that merely mentions "hooks-loader" — or a
 * differently-named file like `my-hooks-loader.ts` — is never mistaken for ours.
 * Path-independent on purpose: matches the loader across install paths so a stale
 * entry from a previous location is still replaced, not duplicated.
 */
const LOADER_MARKER = "/hooks-loader.ts";

/**
 * True when the entry routes through the fusengine hooks-loader. Loader entries
 * are regenerated on every setup run; every other entry is user data and is
 * preserved verbatim.
 *
 * @param entry - A hooks[event] entry.
 * @returns Whether the entry belongs to the fusengine loader.
 */
function isLoaderEntry(entry: HookEntry): boolean {
	return typeof entry.command === "string" && entry.command.includes(LOADER_MARKER);
}

/**
 * Build the canonical fusengine loader entry for one hook type.
 *
 * @param loaderPath - Absolute path to hooks-loader.ts.
 * @param hookType - The Cursor hook event name.
 * @returns The loader entry to install.
 */
function loaderEntry(loaderPath: string, hookType: HookType): HookEntry {
	return { command: `bun ${loaderPath} ${hookType}` };
}

/**
 * Conservatively merge the fusengine loader entry for one hook type: drop the
 * previous loader entry (idempotent — no duplicate on re-run), keep every
 * user-authored entry in place, then append the fresh loader entry.
 *
 * @param existing - Current entries for the hook type (may be undefined).
 * @param loaderPath - Absolute path to hooks-loader.ts.
 * @param hookType - The Cursor hook event name.
 * @returns The merged entry list.
 */
export function mergeHookType(
	existing: unknown[] | undefined,
	loaderPath: string,
	hookType: HookType,
): unknown[] {
	const kept = (existing ?? []).filter((e) => !isLoaderEntry(e as HookEntry));
	return [...kept, loaderEntry(loaderPath, hookType)];
}
