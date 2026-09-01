/**
 * Helpers pour les opérations fichiers
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { $ } from "bun";

/**
 * Copy the hooks loader together with the `src/` tree it imports.
 *
 * The loader pulls five relative modules; shipping the single file leaves it
 * unrunnable, so every hook wired to it would die on "Cannot find module".
 * Tests, node_modules and lockfiles are left behind — the loader needs none of
 * them, and copying them would bloat the install.
 * @param srcDir - Source `scripts/` directory.
 * @param destDir - Destination directory (replaced wholesale).
 * @returns Whether the tree was copied.
 */
export function copyLoaderTree(srcDir: string, destDir: string): boolean {
	if (!existsSync(join(srcDir, "hooks-loader.ts"))) return false;
	const skip = new Set(["node_modules", "__tests__", "bun.lock", "package.json", ".DS_Store"]);
	rmSync(destDir, { recursive: true, force: true });
	mkdirSync(destDir, { recursive: true });
	cpSync(join(srcDir, "hooks-loader.ts"), join(destDir, "hooks-loader.ts"));
	cpSync(join(srcDir, "src"), join(destDir, "src"), {
		recursive: true,
		filter: (path) => !skip.has(path.split("/").pop() ?? ""),
	});
	return true;
}

/**
 * Copie un fichier avec création du dossier destination
 */
export function copyFile(src: string, dest: string): boolean {
	if (!existsSync(src)) return false;

	mkdirSync(dirname(dest), { recursive: true });
	copyFileSync(src, dest);
	return true;
}

/**
 * Copie un fichier et le rend exécutable
 */
export async function copyExecutable(
	src: string,
	dest: string,
): Promise<boolean> {
	if (!copyFile(src, dest)) return false;
	await $`chmod +x ${dest}`.quiet();
	return true;
}

/**
 * Rend tous les scripts .sh exécutables dans un répertoire
 */
export async function makeScriptsExecutable(dir: string): Promise<number> {
	// A missing directory is not an error here: BSD find exits 1 on it, and Bun's
	// `$` turns any non-zero exit into a throw, which aborted the whole install
	// over a directory that simply has nothing to chmod.
	if (!existsSync(dir)) return 0;
	const result = await $`find ${dir} -name "*.sh" -type f`.nothrow().quiet();
	const files = result.text().trim().split("\n").filter(Boolean);
	for (const file of files) {
		await $`chmod +x ${file}`.quiet();
	}
	return files.length;
}

/**
 * Install bun dependencies in a plugin directory
 */
export async function installPluginDeps(dir: string): Promise<boolean> {
	if (!existsSync(join(dir, "package.json"))) return false;
	const result = await $`cd ${dir} && bun install --silent`.quiet().nothrow();
	return result.exitCode === 0;
}

/**
 * Compare le contenu de deux fichiers
 */
export async function filesAreEqual(
	path1: string,
	path2: string,
): Promise<boolean> {
	if (!existsSync(path1) || !existsSync(path2)) return false;

	const content1 = await Bun.file(path1).text();
	const content2 = await Bun.file(path2).text();
	return content1 === content2;
}
