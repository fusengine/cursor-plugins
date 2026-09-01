/**
 * Global artifact hashing.
 * @description SRP: deterministic content hashing for owned global artifacts
 * (plugin directories and the installed rule file) only.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/** Recursively hash one directory's structure and file contents in stable name order. */
function visitDirectory(root: string, relative: string, hash: crypto.Hash): void {
	const directory = path.join(root, relative);
	const entries = fs
		.readdirSync(directory, { withFileTypes: true })
		.sort((a, b) => a.name.localeCompare(b.name));
	for (const entry of entries) {
		const childRelative = path.join(relative, entry.name);
		const child = path.join(root, childRelative);
		if (entry.isSymbolicLink()) throw new Error(`owned artifact contains a symlink: ${child}`);
		hash.update(`${childRelative}\0${entry.isDirectory() ? "d" : "f"}\0`);
		if (entry.isDirectory()) visitDirectory(root, childRelative, hash);
		else if (entry.isFile()) hash.update(fs.readFileSync(child));
		else throw new Error(`unsupported owned artifact type: ${child}`);
	}
}

/**
 * Hash a real directory tree deterministically without following symlinks.
 * @param root - Absolute path of the directory to hash.
 * @returns Hex-encoded SHA-256 digest of the tree's names, kinds and contents.
 */
export function hashDirectory(root: string): string {
	const stat = fs.lstatSync(root);
	if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`expected real directory: ${root}`);
	const hash = crypto.createHash("sha256");
	visitDirectory(root, "", hash);
	return hash.digest("hex");
}

/**
 * Hash a real regular file without following symlinks.
 * @param file - Absolute path of the file to hash.
 * @returns Hex-encoded SHA-256 digest of the file's contents.
 */
export function hashFile(file: string): string {
	const stat = fs.lstatSync(file);
	if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`expected real file: ${file}`);
	return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
