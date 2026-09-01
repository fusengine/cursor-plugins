# MANDAT — Adaptateur Cursor pour `@fusengine/harness`

> À exécuter **dans le repo `fuse-harness`** (`/Users/brunoazoulay/Labo/docker-lab/dev.local/Dev-ai/claude-code/fuse-harness`), pas dans `cursor-plugins`.
> Prompt prêt à coller. Version du constat : harness `v0.1.90`, Cursor `3.x` (plugins depuis 2.5, fév. 2026).

---

## Prérequis d'exécution — à vérifier AVANT de lancer l'agent

1. **Répertoire de travail** : `/Users/brunoazoulay/Labo/docker-lab/dev.local/Dev-ai/claude-code/fuse-harness`.
2. **`bun` disponible dans le PATH.** Le critère d'acceptation P0 exige d'exécuter `bun src/cli/bin.ts hook cursor core` et de constater la sortie réelle. Un test unitaire sur `src/adapters/cursor/index.ts` ne prouve rien : c'est précisément ce chemin-là qui n'est pas câblé en production.
3. **Droits d'écriture effectifs sur le repo.** Ce repo a des guards `bash-write` actifs — un agent d'audit précédent s'est fait bloquer en écriture. Vérifier que l'agent peut écrire, sinon il échouera silencieusement ou tournera en boucle sur des tentatives refusées.
4. **Livrer P0 seul, en premier.** P0 est un correctif de sécurité indépendant. S'il est traité dans le même lot que P1–P3, le fix se retrouve bloqué derrière des chantiers d'architecture. P0 doit être mergeable seul.
5. **Pas de réseau requis** pour P0. P1 et P2 en ont besoin (vérification de la doc `cursor.com/docs`).

---

## Prompt

```
CONTEXTE. Tu travailles dans `@fusengine/harness` v0.1.90. Le paquet se déclare
compatible Cursor (`docs/adapters.md` : "Cursor (hook) | @fusengine/harness/adapters/cursor | ✅")
et 24 plugins d'un marketplace Claude Code doivent être portés vers Cursor en s'appuyant
dessus. Un audit croisé (3 agents + 1 challenger avec preuve d'exécution) a établi que
ce support est non fonctionnel et, sur un point, dangereux.

Tous les faits ci-dessous ont été vérifiés — ne les re-litige pas, corrige-les.

=== P0 — DÉFAUT DE SÉCURITÉ ACTIF (à traiter en premier, isolément) ===

Preuve, obtenue en exécutant `bun src/cli/bin.ts hook cursor core` avec des payloads
conformes au schéma officiel cursor.com/docs/hooks :

  payload beforeShellExecution réel {command,cwd,sandbox} + `git push --force` -> deny        (OK)
  payload beforeShellExecution réel                       + `rm -rf /`         -> AUTORISÉ    (KO)
  payload beforeShellExecution réel                       + `sed -i` sur .ts    -> AUTORISÉ    (KO)
  payload beforeShellExecution réel                       + `npm install`      -> AUTORISÉ    (KO)
  payload preToolUse réel {tool_name:"Shell",...}         + `rm -rf /`         -> AUTORISÉ    (KO)
  payload forgé          {tool_name:"Bash",...}           + `rm -rf /`         -> deny        (faux vert)

Chaîne causale établie :
1. `src/runtime/normalize.ts:46-89` n'a pas de branche `cursor` — cursor tombe dans la
   branche générique Claude/Codex/Gemini, qui lit `str(payload.tool_name) ?? ""`.
2. Les payloads Cursor `beforeShellExecution` et `afterFileEdit` ne portent PAS `tool_name`
   -> `event.tool === ""`.
3. Là où `tool_name` existe (`preToolUse`), Cursor le nomme `"Shell"` / `"Write"` / `"Read"`
   / `"Grep"` / `"Task"` — jamais `"Bash"` / `"Edit"` (table de mapping officielle :
   cursor.com/docs/reference/third-party-hooks, section Tool Name Mapping).
4. Aucune normalisation n'existe pour cursor : `src/runtime/codex-shell-tool.ts:37` et
   `src/runtime/mcp-tool-name.ts:76` sont strictement no-op hors `id === "codex"`.
5. Résultat : tous les guards conditionnés `ctx.tool === "Bash"` ne s'arment jamais sur
   Cursor — `policy/guards/bash-write.ts:33`, `policy/guards/install.ts:11`,
   `policy/guards/security.ts:73`, `runtime/precommit.ts:50`, branche Bash de
   `policy/guards/protected-path.ts:95`. Seul `evaluateGitGates` survit
   (`src/policy/evaluate.ts:40` — signature sans `tool`, donc tool-agnostique).

CAUSE RACINE — l'audit initial a d'abord conclu "il manque une branche cursor" ; c'est faux.
`src/adapters/cursor/index.ts` contient DÉJÀ le correctif exact :
  - ligne 16 : `evaluate({ tool: "Bash", command: payload.command })`
  - ligne 44 : `evaluate({ tool: "Edit", ..., content: payload.edits.map(e => e.new_string).join("\n") })`
Mais `grep -rn "adapters/cursor" .` ne renvoie que `package.json` (sous-export public) et
`test/adapters.test.ts`. AUCUN import depuis `src/`. Le chemin runtime réel est
`bin.ts -> handleHook -> normalizeEvent` (`src/runtime/handle.ts:35`), qui ne passe jamais par
l'adaptateur. C'est du code de production testé et jamais câblé — d'où une suite verte
sur une production cassée.

TÂCHE P0 :
a) Rendre les guards effectifs sur payload Cursor authentique. Deux voies — choisis-en une
   et JUSTIFIE ton choix par écrit avant de coder : (i) brancher l'adaptateur existant sur
   le dispatch ; (ii) porter sa logique dans `normalizeEvent` via une branche `cursor` qui
   dérive `tool` de `hook_event_name` quand `tool_name` est absent, ET applique la table
   inverse `Shell->Bash`, `Write->Edit`. Ne duplique pas la logique dans les deux endroits.
b) `afterFileEdit` : le schéma officiel imbrique le contenu dans `edits:[{old_string,new_string}]`,
   alors que `normalize.ts:83-85` lit `input.content` / `input.old_string` à plat -> les deux
   sont `undefined`. Les gates de taille de fichier, DRY et `detectFramework` sont donc aveugles
   même après le fix (a). Fanne `edits[]` comme `apply_patch` est déjà fanné (`normalize.ts:77-81`).
c) `test/sim/scenarios/21-cursor-shell-destructive-deny.json` envoie
   `{"tool_name":"Bash","tool_input":{...}}` — une forme qui n'existe dans AUCUN event Cursor.
   Sa clé `doc` affirme pourtant une vérification réelle. Réécris ce scénario aux schémas
   officiels et ajoute un cas de non-régression par event Cursor câblé. Sans ça la régression
   revient silencieusement.

Critère d'acceptation P0 : `rm -rf /`, `sed -i` sur un fichier source, et `npm install`
sont DENY sur payload `beforeShellExecution` réel ET sur payload `preToolUse` réel
(`tool_name:"Shell"`), prouvé par exécution du binaire, pas par un test unitaire sur
l'adaptateur isolé.

=== P1 — RENVERSÉ PAR LA PREUVE BINAIRE : LE CANAL D'INJECTION EXISTE ===

!! LIS CE BLOC AVANT LE TEXTE BARRÉ QUI SUIT. La section P1 d'origine (conservée plus bas
pour mémoire) concluait à la PERTE du canal d'injection par tour. C'est FAUX. Elle reposait
sur la doc publique, qui est un sous-ensemble du schéma réel.

Inspection de `/Applications/Cursor.app/.../workbench.desktop.main.js` (build 24 Aug 2026),
lecture seule. VU LITTÉRALEMENT :

  offset 17469792 :
  E6l = makeMessageType("agent.v1.BeforeSubmitPromptRequestResponse", () => [
    {no:1, name:"continue",           kind:"scalar", T:8, opt:!0},
    {no:2, name:"user_message",       kind:"scalar", T:9, opt:!0},
    {no:3, name:"additional_context", kind:"scalar", T:9, opt:!0}])

  offset 19789643 — la whitelist, invariant activement gardé par `Gpf` (offset 21008411) :
  yNi = new Set([Wu.sessionStart, Wu.beforeSubmitPrompt, Wu.preToolUse,
                 Wu.postToolUse, Wu.postToolUseFailure])

=> **`beforeSubmitPrompt` accepte `additional_context`.** CINQ events l'acceptent, pas deux.

MIEUX — dans le parseur de réponse des hooks déjà chargés, la compatibilité Claude Code est
NATIVE et ACTIVE PAR DÉFAUT. Cette preuve ne signifie pas que Cursor charge automatiquement
une configuration Claude sans les prérequis Cursor correspondants. VU LITTÉRALEMENT,
offsets 19790546-19791638 et 32949738 :

  function YUs(e){ return e?.enableClaudeNestedHookSpecificOutputCompatibility ?? !1 }
  function $Yg(e,t,n){ if(!YUs(n)) return; const i=eKu[e]; if(i===void 0) return;
    const r=ZUs(t); if(XUs(r,i)) return typeof r.additionalContext=="string" ? r.additionalContext : void 0 }
  function jYg(e,t,n,i){ if(!yNi.has(e) || !Sgt(n) || n.additional_context!==void 0) return n;
    const r = Sgt(t) ? UYg(t) ?? $Yg(e,t,i) : void 0; return r===void 0 ? n : {...n, additional_context:r} }

  // le flag par défaut est false, MAIS il est codé en dur à `true` au point d'entrée réel :
  validateParsedHookResponse(e,t){ return TKu(e,t,{enableClaudeNestedHookSpecificOutputCompatibility:!0}) }

=> Un hook émettant la convention Claude Code EXACTE :
     {"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}
   voit son `additionalContext` recopié dans `BeforeSubmitPromptRequestResponse.additional_context`.

CONSÉQUENCE POUR CE MANDAT :
- **L'architecture d'injection se porte À L'IDENTIQUE.** Aucun contournement à construire.
- **NE construis PAS** la génération de `.cursor/rules/*.mdc` comme substitut à l'injection.
  Elle reste un choix légitime pour du contenu purement statique, mais elle n'est plus une
  compensation obligatoire — ne la présente pas comme telle.
- L'état APEX dynamique (`buildApexTaskInjection`, `apexDocName`, `attachBudgetRecap`) n'est
  PLUS sans canal : il passe par `beforeSubmitPrompt.additional_context`, exactement comme
  `UserPromptSubmit` aujourd'hui. Ne le dégrade pas vers `followup_message`.
- Reste vrai : `preCompact` n'a aucun champ de sortie -> pas de ré-hydratation après
  compaction. C'est la seule perte réelle de cette section.
- Les deux bugs Cursor cités plus bas (`sessionStart` #158452, `postToolUse` #155689)
  concernent la LIVRAISON de `additional_context` sur CES deux events. Le schéma, lui, est
  établi. Vérifie leur statut avant de t'appuyer dessus, mais ne conclus plus à l'absence
  de canal.

TÂCHE P1 (révisée) : câbler `beforeSubmitPrompt` avec émission de `additional_context`, et
vérifier laquelle des deux formes passe le mieux — la forme native (`additional_context` en
racine) ou la forme Claude Code imbriquée (`hookSpecificOutput.additionalContext`), toutes
deux acceptées. Préfère la forme native pour l'adaptateur cursor ; la compat imbriquée est
un filet, pas une cible.

--- ci-dessous : rédaction d'origine, CONSERVÉE POUR MÉMOIRE, conclusion INVALIDE ---

=== P1 (obsolète) — INJECTION DE CONTEXTE : NE PAS CONSTRUIRE LE CONTOURNEMENT ÉVIDENT ===

Sur les 16 events Cursor, seuls `sessionStart` et `postToolUse` exposent `additional_context`.
`beforeSubmitPrompt` (event vers lequel `UserPromptSubmit` est mappé) n'expose que
`{continue, user_message}` — `user_message` est documenté comme "shown to the user when the
prompt is blocked" : canal humain, jamais modèle.

PIÈGE VÉRIFIÉ : les DEUX champs `additional_context` sont des bugs Cursor ouverts, confirmés
par leur staff.
  - forum.cursor.com/t/158452 (v3.1.15) : "additional_context from sessionStart gets dropped
    due to a timing issue [...] Right now there isn't a workaround."
  - forum.cursor.com/t/155689 : postToolUse accepte et logge `additional_context`, mais le
    contexte n'atteint pas le modèle. Suivi #167274 (3.14.7). Toujours ouvert.
N'implémente donc PAS de stratégie "bootstrap sessionStart + ré-injection postToolUse" :
elle repose intégralement sur ces deux bugs.

TÂCHE P1 : séparer statique et dynamique.
  - STATIQUE (règles 00->08, préambule CLAUDE.md) : sortir du hook. Canal natif fiable =
    `.cursor/rules/*.mdc` avec `alwaysApply: true` ("Always included [...] rule contents are
    included at the start of the model context", cursor.com/docs/rules). Le harness doit
    savoir GÉNÉRER ces fichiers (commande d'init) plutôt que tenter de les injecter à chaud.
  - DYNAMIQUE (état APEX par tour : `buildApexTaskInjection`, `apexDocName`,
    `attachBudgetRecap` dans `src/runtime/inject-context.ts`) : aucun canal fiable aujourd'hui.
    Dégrade explicitement vers `stop.followup_message` / `subagentStop.followup_message`
    (seuls canaux vers-le-modèle documentés et non signalés cassés) et DOCUMENTE la
    dégradation. N'invente pas un canal.
  - `preCompact` est observe-only côté Cursor (aucun champ de sortie) : pas de ré-hydratation
    post-compaction possible. À acter, pas à contourner.

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
