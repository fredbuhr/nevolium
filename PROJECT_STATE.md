# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## Handoff D08 → D09

| Champ | État attesté |
|---|---|
| `main` vérifié | D08 fusionné par PR #92 : merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c` |
| Head D08 final | `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f` : **9/9 workflows PR verts** |
| Intégrité du merge | Le merge a pour parents `a9edcd96b6227fe362765863aabbcacbbc53fa4f` et `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f`; son arbre `6d8c80e1feca5c01bf67794d7ee3b36ed87f9694` est identique à celui du head D08 qualifié |
| Qualification post-merge | Les **9 workflows push** associés à `2ded338e…` sont terminés avec succès |
| Sortie D08 | Carte 2D éditable sur identités canoniques; liens/groupes/layouts; multi-sélection; panne/retry de sauvegarde; deep link frais; branche de deux idées → deux Tasks → replanification D06 `preview/apply` → Gantt |
| Persistance D08 | PUT sérialisés par client/workspace, dernier snapshot gagné, faux succès interdit, retry explicite, garde session/auth; pas de promesse inter-onglets/offline durable avant D12 |
| Portée des preuves | Chromium D08 utilise une API simulée; PostgreSQL D08 est une preuve réelle séparée. Pas de prétention à un parcours Web→Core→PostgreSQL unique ni à une validation sur appareils physiques |
| Production | Inchangée : runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; D06–D08 non déployés |
| Lot suivant | **D09 — Mycelium 3D interactif et vue spatiale**, prérequis D08 désormais satisfait |
| Limites D09 | Mêmes identités 2D/3D; positions spatiales séparées des relations métier; rendu client, visible-only, pause quand masqué, fallback 2D, qualité adaptative; aucune réécriture des canons D06–D08 |
| Prochaine action | Qualifier le présent commit de handoff sur `main`. Si vert : créer une branche fraîche `feat/d09-mycelium-3d` depuis ce `main`, inspecter les composants 3D déjà configurés et le prototype historique de façon sélective, puis figer l'audit d'entrée avant tout renderer ou API nouvelle |
| Hors scope | D10 assistant opérant; D11 intégrations externes; D12 coédition/offline; D13 complétude FR/EN globale |

D08 n'ajoute pas de migration propre et reste entièrement fondé sur les canons D06/D07 et
`WorkspaceLayout`. La PR #92 est fusionnée et sa branche doit être considérée comme retirée pour la
suite du développement, même si la ref Git distante existe encore.

Le détail des preuves, limites et rollback D08 est conservé dans
[docs/archive/d08-editable-mindmap-progress-2026-09-15.md](docs/archive/d08-editable-mindmap-progress-2026-09-15.md).

## D07 intégré et verrouillé

Head final qualifié `0db6df6326b553136ab8a375b30fddbe5f6b27aa`, merge
`f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4`; `Document`/`DocumentVersion` restent les canons des
connaissances, avec recherche/citations owner-scoped et Lexical comme éditeur/projection.

[PR D08 #92](https://github.com/fredbuhr/nevolium/pull/92) ·
[Checkpoint D08](docs/archive/d08-editable-mindmap-progress-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [Workflow](docs/development-workflow.md) ·
[État produit](docs/status.md)
