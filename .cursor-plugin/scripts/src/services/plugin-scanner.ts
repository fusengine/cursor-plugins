/**
 * Plugin scanning service
 * @description SRP: Scan and load plugin configurations
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
	ExecutableHook,
	HookEntry,
	MatchContext,
	PluginInfo,
	ScannerConfig,
} from "../interfaces/hooks";

/** Absolute home dir, OS-aware — same fallback chain as harness-path-resolver.ts. */
const HOME = process.env.HOME || process.env.USERPROFILE || "";

/** Scan plugins and return their configurations */
export function scanPlugins(config: ScannerConfig): PluginInfo[] {
	const { pluginsDir } = config;
	if (!existsSync(pluginsDir)) return [];

	return readdirSync(pluginsDir).map((name) => {
		const path = join(pluginsDir, name);
		const hooksFile = join(path, "hooks/hooks.json");
		const hasHooks = existsSync(hooksFile);
		let config: PluginInfo["config"];
		if (hasHooks) {
			try {
				config = JSON.parse(readFileSync(hooksFile, "utf8"));
			} catch {
				/* ignore parse errors */
			}
		}
		return { name, path, hasHooks, config };
	});
}

/**
 * Collecte les commandes à exécuter pour un event donné.
 *
 * @param plugins - Plugins scannés.
 * @param hookType - Event Cursor (lower-camel).
 * @param toolName - `tool_name` du payload.
 * @param notifType - Type de notification (Claude Code seulement ; passer `""`).
 * @param agentType - `subagent_type` du payload.
 * @param command - Ligne de commande, requise pour les events shell.
 * @returns Les hooks dont le matcher accepte ce contexte.
 */
export function extractHooks(
	plugins: PluginInfo[],
	hookType: string,
	toolName: string,
	notifType: string,
	agentType = "",
	command = "",
): ExecutableHook[] {
	const hooks: ExecutableHook[] = [];
	const ctx: MatchContext = { toolName, command, agentType, notifType };

	for (const plugin of plugins) {
		if (!plugin.config) continue;
		const entries: HookEntry[] = plugin.config.hooks?.[hookType] ?? [];

		for (const entry of entries) {
			if (!matchesEntry(entry.matcher, hookType, ctx)) continue;
			// Cursor entries are flat: the command sits on the entry itself. A `prompt`
			// entry (LLM-evaluated, e.g. core-guards/stop[1]) carries no `command` and
			// is not ours to spawn — skip it rather than push an undefined command.
			if (entry.type && entry.type !== "command") continue;
			if (!entry.command) continue;
			// $HOME/${HOME} runtime fallback: a marketplace re-checkout resets
			// hooks.json to its git-tracked literal (resolveHomeInHooks only
			// rewrites install-time), and hook-executor spawns argv directly
			// with no shell to expand it — resolve here too, mirroring
			// CURSOR_PLUGIN_ROOT/CLAUDE_PROJECT_DIR above.
			const command = resolveRelativeScript(
				entry.command
					.replace(/\$\{CURSOR_PLUGIN_ROOT\}/g, plugin.path)
					.replace(/\$\{CLAUDE_PROJECT_DIR\}/g, process.cwd())
					.replace(/\$\{HOME\}/g, HOME)
					.replace(/\$HOME/g, HOME),
				plugin.path,
			);
			hooks.push({ command, isAsync: command.startsWith("afplay"), pluginName: plugin.name, pluginPath: plugin.path });
		}
	}

	return hooks;
}

/**
 * Résout un chemin de script relatif contre la racine du plugin.
 *
 * Les manifestes déclarent `./scripts/hook.sh` — la forme que la checklist de soumission
 * Cursor exige (aucun chemin absolu). Le hook est ensuite spawné sans shell et sans `cwd`,
 * donc un chemin relatif serait résolu contre le répertoire courant de l'éditeur et
 * introuvable : le hook échoue, et le fail-open le rend silencieux.
 * Seul le premier token est réécrit ; les arguments ne sont pas touchés.
 * @param command - Ligne de commande du manifeste, placeholders déjà substitués.
 * @param pluginPath - Racine absolue du plugin.
 * @returns La même ligne, son exécutable rendu absolu s'il était relatif.
 */
function resolveRelativeScript(command: string, pluginPath: string): string {
	if (!command.startsWith("./") && !command.startsWith("../")) return command;
	const cut = command.indexOf(" ");
	const script = cut === -1 ? command : command.slice(0, cut);
	const args = cut === -1 ? "" : command.slice(cut);
	return `${join(pluginPath, script)}${args}`;
}

/**
 * Cible contre laquelle Cursor teste le matcher, par event.
 *
 * Cursor filtre lui-même quand un matcher figure dans son propre `hooks.json` ; ici
 * `~/.cursor/hooks.json` ne câble qu'un hook nu par event, donc c'est ce loader qui
 * reproduit la sémantique — sinon un matcher de plugin est testé contre la mauvaise valeur.
 * `beforeMCPExecution`/`afterMCPExecution` comparent `MCP:<tool_name>` : le préfixe est
 * synthétisé, il n'est jamais présent dans `tool_name` brut.
 * @param hookType - Event Cursor (lower-camel).
 * @param ctx - Valeurs extraites du payload.
 * @returns La chaîne à confronter au matcher.
 * @see https://cursor.com/docs/hooks — "Available matchers by hook"
 */
function matchTarget(hookType: string, ctx: MatchContext): string {
	switch (hookType) {
		case "beforeShellExecution":
		case "afterShellExecution":
			return ctx.command;
		case "beforeMCPExecution":
		case "afterMCPExecution":
			return ctx.toolName ? `MCP:${ctx.toolName}` : "";
		case "subagentStart":
		case "subagentStop":
			return ctx.agentType;
		case "beforeSubmitPrompt":
			return "UserPromptSubmit";
		case "stop":
			return "Stop";
		case "afterAgentResponse":
			return "AgentResponse";
		case "afterAgentThought":
			return "AgentThought";
		case "notification":
			return ctx.notifType;
		default:
			return ctx.toolName;
	}
}

/**
 * Décide si une entrée de hook s'applique au contexte courant.
 *
 * @param matcher - Regex du manifeste ; absente, l'entrée s'applique toujours.
 * @param hookType - Event Cursor.
 * @param ctx - Valeurs extraites du payload.
 * @returns `true` si l'entrée doit être exécutée. Une regex invalide renvoie `false`.
 */
function matchesEntry(matcher: string | undefined, hookType: string, ctx: MatchContext): boolean {
	if (!matcher) return true;
	try {
		return new RegExp(matcher).test(matchTarget(hookType, ctx));
	} catch {
		return false;
	}
}
