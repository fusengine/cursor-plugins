# MANDAT — Correctifs P0 (suite). Le P0 est corrigé, mais le correctif a introduit une régression.

> À exécuter **dans `fuse-harness`**. Prompt prêt à coller.
> Contexte : une vérification adverse indépendante a rejoué la matrice d'origine avec des payloads
> construits depuis `cursor.com/docs/hooks` (aucune fixture du repo). Verdict : **PARTIEL**.

---

## Prompt

```
CE QUI EST ACQUIS — ne le refais pas, ne le casse pas.

Le défaut P0 d'origine EST corrigé, vérifié en A/B contre un export pristine de HEAD :
les 6 payloads Cursor réels (`beforeShellExecution` avec suppression récursive, édition de flux
en place, install de dépendance ; `preToolUse` avec tool_name:"Shell") donnent tous `deny` là où
ils passaient avant. Aucune régression sur claude-code / codex / kimi : 40 cas rejoués en A/B,
aucun `deny` devenu `allow`. Le scénario 21 a bien été corrigé aux vrais schémas.

Trois problèmes subsistent. Traite-les dans cet ordre.

=== B1 — RÉGRESSION À CORRIGER EN PREMIER (bloquant) ===

`src/adapters/cursor/normalize.ts:33` décide la phase sur `filePath && edits.length > 0`
au lieu de `hook_event_name`. Conséquence : tout `afterFileEdit` dont `edits` est vide,
absent, `null` ou non-tableau bascule dans le pipeline PRE et peut BLOQUER.

Reproduction (sur HEAD ce payload donne `allow`, stdout vide) :

  echo '{"hook_event_name":"afterFileEdit","file_path":"/tmp/x.ts","edits":[]}' \
    | bun src/cli/bin.ts hook cursor core

  -> {"permission":"deny","continue":false,"user_message":"[BLOCKED] APEX: explore + research required…"}

Deux raisons pour lesquelles c'est bloquant :
1. `afterFileEdit` est le SEUL hook d'édition que `cursorInit` câble (`src/init/templates.ts:42-51`).
   La régression est donc en production, pas en théorie.
2. Elle contredit frontalement le contrat que le module s'impose lui-même,
   `src/adapters/cursor/index.ts:36-44` : « We deliberately never emit `permission:"deny"` here ».

CORRECTIF ATTENDU : dériver la phase du `hook_event_name` (la table `aYg` du binaire Cursor est
exhaustive : `after*` / `post*` -> post ; `before*` / `pre*` -> pre), et non de la forme du payload.
Un payload dégénéré doit rester `allow`, jamais bloquer.

MÊME CAUSE, à corriger dans la foulée — ces trois events Cursor réels renvoient aujourd'hui
`deny` alors qu'ils donnaient `allow` sur HEAD :
  - `postToolUse` {tool_name:"Shell",tool_input:{command},tool_output} -> deny
    (et son schéma documenté n'a AUCUN champ `permission` : la réponse est hors-contrat)
  - `afterShellExecution` {command,exit_code} -> deny  (un deny APRÈS exécution n'a pas de sens)
  - `beforeReadFile` {file_path} -> deny
Corollaire : puisque `phase` n'est jamais `post` hors `afterFileEdit`, TOUT le pipeline post
de Cursor est mort (activity tracking, receipts, deny-loop store).

=== B2 — LE SECOND DÉFAUT N'EST PAS FERMÉ (finding, pas bloquant) ===

Le rapport dit « `afterFileEdit.edits[]` est ventilé mais reste observe-only ». La ventilation
fonctionne : `content` et `oldString` SONT peuplés depuis `edits[]`. Mais le verdict est ensuite
JETÉ — `src/runtime/post-outcome.ts:30` : `if (cursorAfterFileEdit) return { stdout:"", exit:0 };`
et dans `handle-post.ts` chaque retour anticipé est neutralisé par `&& !cursorAfterFileEdit`.

Mesuré : un `new_string` de 400 lignes via `afterFileEdit` -> `allow`, stdout vide, dans les scopes
`core`, `solid` et `tailwindcss`. Effet net pour l'utilisateur : identique à l'avant-correctif.
La gate n'est plus aveugle en entrée, elle est muette en sortie.

DÉCIDE ET ASSUME — deux issues acceptables, une inacceptable :
  (a) émettre le verdict en `permission:"allow"` + `user_message` (le seul canal que
      `afterFileEdit` expose) — c'est exactement ce que fait `adapters/cursor/index.ts:48-53`,
      fonction qui n'est JAMAIS appelée par le chemin câblé ;
  (b) acter que c'est inerte, et le documenter comme une perte réelle ;
  (c) INACCEPTABLE : le statu quo, où `test/cursor-cli-p0.test.ts` VERROUILLE le silence
      par `toEqual({exit:0, stdout:""})`. Un test qui fige un défaut le rend permanent.

=== B3 — LE PATTERN QUI A PRODUIT LE P0 EST RECONDUIT (finding) ===

`cursorToolName()` (`src/adapters/cursor/normalize.ts:14-18`) fait
`tool === "Shell" || (!tool && hasCommand)`. Tout `tool_name` présent et différent de `"Shell"`
qui porte une commande désarme tous les guards Bash :

  preToolUse tool_name:"MCP:run_command", tool_input:{command:"<destructeur>"}  -> ALLOW
  preToolUse tool_name:"shell"  (minuscule)                                     -> ALLOW
  preToolUse tool_name:"Terminal"                                               -> ALLOW

`MCP:<tool_name>` est une valeur DOCUMENTÉE de `preToolUse`. Honnêteté : sur claude-code à HEAD,
`mcp__shell__run` avec un `command` est déjà autorisé — c'est un trou pré-existant multi-harness,
pas une régression. Mais l'allowlist exact-match est littéralement la logique qui a produit le P0.
Bascule sur le critère robuste : **présence d'un `command` => armer les guards**, quel que soit
le nom de l'outil.

Non couvert non plus : `beforeMCPExecution` porte, pour un serveur stdio, un `command` RACINE
(« launch command and args ») avec un `tool_input` qui est une CHAÎNE JSON — `record()` la rejette,
donc la commande de lancement n'est jamais gatée.

=== B4 — DEUX AFFIRMATIONS DU RAPPORT NE TIENNENT PAS ===

1. « 1113 tests réussis, 0 échec » — NON REPRODUCTIBLE. Trois `bun test` consécutifs dans le repo :
   1119/2 fail, 1122/1 fail, 1123/2 fail — avec des tests en échec DIFFÉRENTS à chaque run.
   Sur l'export pristine de HEAD, même machine, mêmes node_modules : 1107/0 fail, deux fois,
   déterministe. Un échec est isolable : `test/approval-never.test.ts:67` —
   `evaluate(never("git commit … > fichier"))` renvoie `deny` au lieu de `warn`.

2. « Branches fonctionnelles limitées à `cursor` » — FAUX. 25 fichiers modifiés + 6 non suivis,
   dont `src/policy/guards/bash-write.ts`, `bash-write-safe-paths.ts`, `bash-write-redirects.ts`,
   `protected-path.ts`, `src/policy/shell-read-refs.ts`, `src/prompt/types.ts`,
   `src/runtime/confirm/confirm-gate.ts`, `codex-confirm.ts`.
   Pire : l'arbre a CHANGÉ PENDANT la vérification (12 fichiers modifiés au début, 25 à la fin,
   mtimes datés pendant le run).

EXIGENCE : **isole le chantier `bash-write` du correctif Cursor** (commits séparés, ou stash),
puis rejoue `bun test` sur un arbre figé. Tant que l'arbre bouge sous la mesure, « 0 échec » est
infalsifiable et l'échec `approval-never` ne peut être attribué à personne — il vient très
probablement du chantier concurrent, pas du correctif Cursor.

=== COUVERTURE DE TEST À AJOUTER ===

Le scénario 21 corrigé a perdu `hook_event_name` sur ses trois steps — donc AUCUN test n'exerce
le routage par nom d'événement, c'est-à-dire précisément le mécanisme cassé en B1. Il a aussi
perdu son step `bashWriteGuard` (heredoc vers un `.ts`) sans remplacement.
Ajoute des cas pour : `afterFileEdit` avec `edits` vide / absent / null / non-tableau ;
`postToolUse`, `afterShellExecution`, `beforeReadFile` sur payload réel ; les variantes de
`tool_name` porteuses de commande. Aucun de ces retours de défaut ne serait détecté aujourd'hui.
Et évite le base64 dans les fixtures — une commande encodée est illisible en revue.

=== CONTRAINTES ===
- SOLID: `FUSE_SOLID_MAX_LINES` (positive integer, default `200`) is the only file-size ceiling;
  split by responsibility before exceeding it, keep interfaces in `interfaces/`, and document
  every export with JSDoc.
- Chaque affirmation de schéma Cursor adossée à `cursor.com/docs` ou au binaire. Rien d'inventé.
- Rends compte en distinguant ce qui est PROUVÉ PAR EXÉCUTION de ce qui est déduit de la lecture.
- Ne déclare « sans régression » que sur un arbre figé, avec la commande et la sortie à l'appui.
```

---

## Reproduction rapide

```bash
cd /Users/brunoazoulay/Labo/docker-lab/dev.local/Dev-ai/claude-code/fuse-harness

# B1 — doit devenir allow, donne deny aujourd'hui
echo '{"hook_event_name":"afterFileEdit","file_path":"/tmp/x.ts","edits":[]}' | bun src/cli/bin.ts hook cursor core

# B3 — doit devenir deny, donne allow aujourd'hui
echo '{"hook_event_name":"preToolUse","tool_name":"Terminal","tool_input":{"command":"rm -rf /"}}' | bun src/cli/bin.ts hook cursor core

# B4 — trois fois de suite, comparer les compteurs et les noms des tests en échec
bun test 2>&1 | tail -3
```
