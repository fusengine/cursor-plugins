# Cursor harness adapter analysis — Part 2

Continued from [Part 1](cursor-runtime-analysis-part-1.md).

=== P2 — CÂBLAGE ET RÉSOLUTION ===

  - `src/init/templates.ts:41` (`cursorInit`) ne câble que `beforeShellExecution`, `preToolUse`,
    `afterFileEdit`. Aucun event lifecycle -> zéro injection règles/lessons/APEX sur Cursor,
    ce que `docs/adapters.md` admet déjà ("none" en lifecycle events). Étends le câblage aux
    events Cursor réellement utiles : `sessionStart`, `postToolUse`, `subagentStart`,
    `subagentStop`, `stop`, `beforeMCPExecution`, `sessionEnd`.
    ATTENTION : `subagentStart` n'existe qu'en Cursor NATIF — il est absent de la table de
    mapping tiers et §Limitations le confirme. Il impose donc `.cursor/hooks.json`, il ne
    peut pas venir de `.claude/settings.json`.
  - Response shape: when a lifecycle branch is reached with `id="cursor"`,
    `contextResponse`/`attachSystemMessage` emit the Claude compatibility shape
    (`hookSpecificOutput`). Cursor accepts the exact compatibility envelope, but the native Cursor
    adapter should emit each event's documented top-level response. Note that the schemas
    diffèrent PAR EVENT (`permission` sur preToolUse/beforeShell/beforeMCP ;
    `followup_message` sur stop/subagentStop ; `additional_context` sur sessionStart/postToolUse ;
    RIEN sur afterFileEdit/sessionEnd/postToolUseFailure/afterShellExecution) — une enveloppe
    unique ne suffit pas.
  - `resolveRulesRoot` (`src/runtime/lifecycle/.../rules-root.ts:78-81`) ne probe que
    codex/kimi/claude-code -> fallback `cwd` pour cursor. Idem `apexDocName` et
    `harnessHomeSegment` : `claudeMd(home,"cursor")` va lire `~/.cursor/CLAUDE.md`, chemin
    non conventionnel côté Cursor. Ajoute une résolution cursor conforme
    (`.cursor/rules/`, `AGENTS.md`).
  - `src/runtime/mcp.ts:11,20` : `denyWith`/`mutateWith` sont gardés `claude-code||codex` et
    retournent `""` pour cursor -> pas de deny cache-hit MCP ni de cap de verbosité.
    Or Cursor expose `beforeMCPExecution` avec `permission` + `mcp_server_name` + `tool_name` :
    le canal existe, il n'est pas implémenté.
  - **PREUVE SUR LE PAQUET PUBLIÉ (0.1.89/0.1.90), pas seulement sur les sources** : l'adaptateur
    cursor distribué (`adapters/cursor/index.mjs`) fait **58 lignes** et n'expose que
    `beforeShellExecution` + `afterFileEdit` — **aucune branche lifecycle**. Conséquence concrète
    et vérifiable aujourd'hui : les trois hooks du plugin de règles (`sessionStart`,
    `subagentStart`, `beforeSubmitPrompt`) **n'émettent rien** sous Cursor. Toute documentation
    affirmant que « les hooks injectent les règles » décrit le harness FUTUR, pas celui publié.
    C'est la première chose que P2 doit rendre vraie.
  - **`~/.cursor/CLAUDE.md` est bien une invention du harness — confirmé dans le paquet publié** :
    `HOME_DIR.cursor = ".cursor"` (`dotenv-*.mjs`) croisé avec `apexDocName()` qui retourne
    `"CLAUDE.md"` pour tout sauf codex/kimi (`validate-*.mjs`), d'où `buildClaudeMdContext` qui lit
    `~/.cursor/CLAUDE.md`. Recherche croisée `userHome` × `CLAUDE.md` dans le binaire Cursor :
    **zéro occurrence**. Ce chemin n'existe nulle part côté Cursor.
    Les vrais chemins, prouvés : `~/.cursor/rules/*.mdc` (`getRuleTargetDirectory(isUser=true)`,
    offset 21681849 — Cursor y écrit lui-même via son deep-link `install-home`), et `AGENTS.md`
    à la racine d'un workspace, **lu inconditionnellement** (offset 31677776) là où
    `CLAUDE.md`/`CLAUDE.local.md` dépendent du toggle `thirdPartyExtensibilityEnabled`.
  - **PRÉCÉDENT À RÉUTILISER, déjà dans le code : `rulesInAgentsMd` (branche kimi).** Ce drapeau
    supprime la ré-injection par hook quand le corpus est déjà chargé nativement par l'hôte.
    C'est EXACTEMENT le garde anti-double-injection dont Cursor a besoin : les instructions
    globales sont désormais déployées en `~/.cursor/rules/fuse-global.mdc` avec
    `alwaysApply: true`, donc chargées nativement — si le harness les ré-injecte AUSSI par
    `beforeSubmitPrompt`, l'utilisateur paie deux fois le même contexte à chaque tour.
    Généralise ce mécanisme à cursor plutôt que d'en écrire un nouveau.
  - `src/runtime/handle.ts:57` exclut cursor de `designLifecycle` avec la mention "unverified".
    Les schémas `subagentStart`/`subagentStop` Cursor sont désormais documentés
    (`subagent_id`, `subagent_type`, `task`, `status`, `modified_files[]`...). Lève ou
    reconduis cette exclusion sur preuve, pas par défaut.

=== P3 — RESTRICTION D'OUTILS PAR AGENT ===

MISE À JOUR (postérieure à la première rédaction de ce mandat — la doc publique nous avait
induits en erreur). La documentation Cursor ne liste que `name`, `description`, `model`,
`readonly`, `is_background` pour le frontmatter subagent. C'est un SOUS-ENSEMBLE du schéma
réel. Inspection du binaire installé
(`/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js`,
build 24 Aug 2026), message protobuf `agent.v1.CustomSubagent` (offset ~16734859), vu
littéralement :

  1 full_path · 2 name · 3 description · 4 tools (repeated) · 5 model · 6 prompt
  7 permission_mode (enum) · 8 is_background · 9 plugin · 10 marketplace
  11 plugin_id · 12 marketplace_id · 13 force_default_model · 14 source

Donc : **`tools` EST un champ de première classe du modèle de données.** Et `readonly` n'est
pas un booléen en interne mais une projection sur l'enum
`agent.v1.CustomSubagentPermissionMode` = `UNSPECIFIED | DEFAULT | READONLY | AGENT_ONLY`
(ce dernier mode n'est documenté nulle part).

CE QUI RESTE VRAI, et qui justifie encore P3 : nous n'avons PAS de preuve que le parseur
YAML frontmatter peuple ce champ depuis un `.md` local, ni que la valeur est appliquée au
runtime comme une restriction DURE. Le champ existe dans le modèle ; son application est
non vérifiée. Par ailleurs le point d'application de `READONLY` sur les outils MCP n'a pas
été localisé dans le binaire.

TÂCHE P3 (révisée) :
a) TRANCHER d'abord empiriquement, avant de coder quoi que ce soit : le champ `tools:` d'un
   `.md` local est-il honoré ? Si oui, P3 devient largement sans objet et il faut le dire
   plutôt que de construire un mécanisme redondant.
b) Si et seulement si (a) montre que la restriction n'est pas appliquée : implémenter le
   filet côté harness — un guard sur `preToolUse` / `beforeMCPExecution` (qui exposent
   `mcp_server_name` + `tool_name`), alimenté par le frontmatter `tools:` des agents, indexé par
   `subagent_type`. C'est ce qui rendrait le portage des 43 agents scriptable au lieu de 43
   décisions manuelles.
c) Dans les deux cas, documenter `AGENT_ONLY` : c'est un mode de permission réel et non
   documenté qui pourrait être plus adapté que `READONLY` pour nos agents lecteurs.

RÈGLE DE MÉTHODE qui découle de tout ceci et qui vaut pour l'ensemble du mandat : **la doc
Cursor est un sous-ensemble du schéma réel. Une clé absente de la doc n'est pas une clé non
supportée.** Avant de conclure qu'une capacité manque, vérifier dans le binaire (messages
protobuf `agent.v1.*` / `aiserver.v1.*` de `workbench.desktop.main.js`). Cela vaut aussi pour
les schémas de hooks de P1/P2 : si un canal d'injection semble absent de la doc, cherche-le
dans le binaire avant d'acter la perte.

=== CONTRAINTES ===

- SOLID maison : `FUSE_SOLID_MAX_LINES` (entier positif, `200` par défaut) est l'unique plafond
  de taille ; scinder par responsabilité avant de le dépasser, placer les interfaces dans
  `interfaces/`, et documenter chaque export avec JSDoc.
- Chaque affirmation de schéma Cursor doit être adossée à cursor.com/docs — n'invente aucun
  nom de champ ni d'event. Si un point n'est pas documenté, écris NON DOCUMENTÉ et dégrade.
- Ordre imposé : P0 livré, prouvé et mergeable AVANT d'ouvrir P1. P0 est un correctif de
  sécurité, il ne doit pas être bloqué par le reste.
- Mets à jour `docs/adapters.md` (le "✅" est actuellement mensonger) et `docs/runtime.md`
  (il affirme que `normalizeEvent` unifie Cursor via `tool_name`+`tool_input` — faux).
- Rends compte à la fin : ce qui est corrigé, ce qui est dégradé et pourquoi, ce qui reste
  impossible côté Cursor.

=== DEUX EXPÉRIENCES À MENER (non tranchées par l'audit, ~15 min) ===

1. Déposer un `.cursor/agents/x.md` portant `tools:` et `color:`, vérifier dans
   Customize -> Subagents s'il apparaît. Hypothèse : clés inconnues ignorées silencieusement
   (Cursor charge `.claude/agents/` en compat, ce qui l'implique) — mais non prouvé
   directement. Le risque réel n'est pas le rejet, c'est la dégradation muette.
2. Invoquer une command contenant `$ARGUMENTS` avec un argument et observer si la
   substitution a lieu. 22 des 34 commands en dépendent et
   cursor.com/docs/reference/plugins ne documente que `name` + `description`.
```

---

## Annexe — chiffres du corpus à porter

| Élément | Compte | Note de portage |
|---|---|---|
| Plugins | 24 | `.claude-plugin/` → `.cursor-plugin/`, quasi isomorphe |
| Agents | 43 | tous portent `tools:` (hors schéma Cursor) ; aussi `color:` 43, `skills:` 41, `effort:` 2, `rules:` 1 |
| Skills | 196 | **0 mismatch** nom/dossier — contrainte dure Cursor déjà respectée |
| Commands | 34 | dont **22 utilisent `$ARGUMENTS`** (non documenté côté Cursor) |
| Fichiers de règles | 9 | `rules/` participe à la découverte par défaut ; l'activation native de ces fichiers `.md` sans frontmatter reste à vérifier dans Cursor |
| Chaînes de commande de hook | 62 | toutes utilisent actuellement la forme non épinglée `npx -y @fusengine/harness hook cursor ...` ; ne pas épingler `0.1.90` |
| Events sans équivalent | 3 | `PermissionRequest`, `Notification` (documentés « No »), `SubagentStart` (natif Cursor uniquement) |
| `core-guards/statusline/` | 1 sous-projet | aucun mécanisme d'enregistrement plugin Cursor — `/statusline` intégré CLI = piste de remplacement, pas de portage |

## Annexe — répartition de l'effort

- **Où vit le risque** : ~80 % harness (guards, gates, injection, cache viennent tous du binaire).
- **Où vit l'effort** : **~55 % harness / ~45 % fichiers plugin + packaging**.

Les 45 % côté fichiers contiennent les éléments **irréductibles** (43 décisions d'agent, 3 events non mappables, statusline), alors que la part harness est concentrée — et pour P0, **déjà écrite mais non câblée**.
