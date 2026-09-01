/**
 * Ambient typing for the untyped project-install-files.mjs module (owned by
 * another agent's lot). Narrows only the exports consumed by the global-*
 * services; delete once that module is ported to TypeScript.
 */
export function assertNotSymlink(file: string): void;
export function writeFileAtomic(file: string, content: Buffer | string): void;
export function restoreFile(file: string, content: Buffer | string | null): void;
export function withProjectLock<T>(cursorRoot: string, action: () => T): T;
