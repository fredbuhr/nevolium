# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D08 — candidat final de branche, en attente de requalification documentaire

| Champ | État attesté |
|---|---|
| Base intégrée | `main` = `a9edcd96b6227fe362765863aabbcacbbc53fa4f` ; D07 intégré par #91 |
| Branche / PR | `feat/d08-editable-mindmap`, **#92 ouverte et draft** ; ne pas recréer de branche |
| Head fonctionnel qualifié | `1576e8f73bc48b058ec0c7981853b80d40e7e93a` : **9/9 workflows PR réussis** |
| UI / preuve navigateur | UI run `35010647609` : contrats D05–D08, PostgreSQL D08/D06 et Chromium D05–D08 verts. Artefact D08 `10413396962`, SHA256 `ca8364bd22bd05ba0aaf8b98e40632a8445b9ffff902675216a5771919f092ec` |
| Sortie D08 | Carte éditable ; liens/groupes/layouts sauvegardés ; déplacements multiples et reprise de sauvegarde ; deep link frais ; branche de 2 idées convertie en 2 Tasks, planifiée via D06 `preview/apply`, puis visible dans le Gantt |
| Invariants | `RelationshipRecord` = canon des liens ; idées/notes/décisions = `Document` D07 ; Tasks = D06 ; positions/viewport/groupes seulement dans `WorkspaceLayout` ; XYFlow reste renderer/input |
| Persistance | PUT sérialisés par client/workspace, dernier snapshot gagné, faux succès interdit, retry explicite, garde session/auth ; pas de promesse inter-onglets/offline durable (D12) |
| Deep links | `?mindmap=<type>:<id>` ouvre directement cockpit + Mindmap. Task/Document est résolu owner-scoped vers son projet canonique ; `mindmapProject` est seulement un indice facultatif |
| Portée des preuves | Chromium utilise une API simulée ; PostgreSQL D08 est un job réel séparé. Pas de prétention à une session Web→Core→PostgreSQL unique ni à une validation sur appareil physique |
| Production | Inchangée : runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations` ; D06–D08 non déployés |
| Head courant | Le présent checkpoint est un commit documentaire **descendant** de `1576e8f7…`. Vérifier le SHA live et exiger 9/9 workflows sur ce head avant de rendre #92 prête |
| Prochaine action | Requalifier le head documentaire final. Si 9/9 vert : audit final du diff/base, mettre #92 ready, fusionner avec garde SHA, vérifier `main` et l'identité des arbres, puis seulement ouvrir D09 |
| Hors scope | D09 3D avant merge D08 ; D10 assistant opérant ; D12 coédition/offline ; complétude FR/EN historique globale D13 |

D08 n'ajoute pas de migration propre : il réutilise les modèles canoniques D06/D07 et `WorkspaceLayout`.
Le scénario de sortie prévu dans `docs/implementation-plan.md` est couvert sur le head fonctionnel qualifié :
construction/édition de carte, conversion d'une branche en tâches planifiées visibles au Gantt,
rechargement/export conservant identité/liens/layout, isolation propriétaire et chargement borné.

Le détail des preuves, limites et rollback est dans le
[checkpoint D08](docs/archive/d08-editable-mindmap-progress-2026-09-15.md).

## D07 intégré et verrouillé

Head final qualifié `0db6df6326b553136ab8a375b30fddbe5f6b27aa` : 9/9 workflows PR verts ;
merge `f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4`, arbre
`ecd1947a1cf7f2adf2f6583b54748fdd62289e98` identique à l'arbre qualifié.

Une connaissance éditable reste un `Document` canonique. Chaque sauvegarde/restauration crée
une nouvelle `DocumentVersion`. Les chunks et l'index restent des projections reconstruisibles.
Les citations et la recherche cross-project restent owner-scoped. Lexical sérialise son état
dans `content_json`, le texte est une projection ; `nevolium-json` est l'échange lossless.

[PR D08 #92](https://github.com/fredbuhr/nevolium/pull/92) ·
[Checkpoint D08](docs/archive/d08-editable-mindmap-progress-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [Workflow](docs/development-workflow.md) ·
[État produit](docs/status.md)
