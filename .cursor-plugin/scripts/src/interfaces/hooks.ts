/**
 * Hook Interfaces - Type definitions for the hook system
 *
 * @description SRP: Hook interfaces only (types in hook-types.ts)
 */

export type { HookType } from "./hook-types";
export { HOOK_TYPES } from "./hook-types";

/**
 * Entrée de hook d'un `hooks.json` de plugin — forme PLATE, la seule que Cursor accepte.
 *
 * La commande est portée par l'entrée elle-même. La forme imbriquée de Claude Code
 * (`{ matcher, hooks: [{ type, command }] }`) n'existe que dans `.claude/settings.json`,
 * converti par une couche de compatibilité distincte — jamais dans un `hooks.json` natif.
 * Une entrée peut aussi être évaluée par le LLM (`{ type: "prompt", prompt }`), sans `command`.
 * @see https://cursor.com/docs/hooks — "Per-Script Configuration Options"
 * @see https://cursor.com/docs/reference/third-party-hooks — "Migration from Claude Code"
 */
export interface HookEntry {
	/** Regex testée contre une cible dépendant de l'event. Absente = tout passe. */
	matcher?: string;
	/** Requis pour un hook `command` ; absent sur un hook `prompt`. */
	command?: string;
	/** `"command"` (défaut) ou `"prompt"`. */
	type?: string;
	/** Condition en langage naturel, requise quand `type === "prompt"`. */
	prompt?: string;
	/** Secondes avant kill. */
	timeout?: number;
	/** `true` : un échec du hook bloque au lieu de laisser passer. */
	failClosed?: boolean;
}

/** Configuration complète des hooks d'un plugin */
export interface HooksConfig {
	hooks: Record<string, HookEntry[]>;
}

/**
 * Valeurs extraites du payload, contre lesquelles un matcher est confronté.
 *
 * Cursor teste le matcher sur une cible qui varie selon l'event ; ce contexte porte
 * toutes les cibles possibles pour que le choix se fasse en un seul endroit.
 */
export interface MatchContext {
	/** `tool_name` du payload. */
	toolName: string;
	/** Ligne de commande, pour les events shell. */
	command: string;
	/** `subagent_type`, pour les events de sous-agent. */
	agentType: string;
	/** Type de notification — Claude Code uniquement, sans équivalent Cursor. */
	notifType: string;
}

/** Commande à exécuter avec métadonnées */
export interface ExecutableHook {
	command: string;
	isAsync: boolean;
	pluginName: string;
	pluginPath: string;
}

/** Résultat du parsing d'une command de hook en argv shell-free */
export interface ParsedHookCommand {
	/** Tokens word-split ; argv[0] est le nom littéral du programme (ex. "bun"). */
	argv: string[];
	/** True si la command finissait par `|| true` (bash avale tout exit≠0, y compris 2). */
	ignoreExit: boolean;
}

/** Résultat d'exécution d'un hook */
export interface HookResult {
	success: boolean;
	exitCode: number;
	stdout: string;
	stderr: string;
	blocked: boolean;
}

/** Input JSON reçu de Claude */
export interface HookInput {
	tool_name?: string;
	tool_input?: Record<string, unknown>;
	type?: string;
	notification_type?: string;
	agent_type?: string;
}

/** Configuration du scanner de plugins */
export interface ScannerConfig {
	pluginsDir: string;
}

/** Informations sur un plugin scanné */
export interface PluginInfo {
	name: string;
	path: string;
	hasHooks: boolean;
	config?: HooksConfig;
}
