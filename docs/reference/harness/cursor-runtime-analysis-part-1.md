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


Continued in [Part 2](cursor-runtime-analysis-part-2.md).
