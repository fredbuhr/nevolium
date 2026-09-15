# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D08 actif — stabilité de la mindmap et persistance de toute la sélection

| Champ | État attesté |
|---|---|
| Base intégrée | `main` = `a9edcd96b6227fe362765863aabbcacbbc53fa4f` ; D07 intégré par #91 |
| Branche / PR | `feat/d08-editable-mindmap`, **#92 ouverte et draft** ; ne pas recréer de branche |
| Dernier point qualifié avant cette correction | `eaa2f3d5f977880f59921270754f9838b7d62756`, 9/9 workflows PR réussis ; run UI `35001745851`, artefact `10410435665`, SHA256 `4ee23d888e51cdb51009a399cbf68cd0ae6bdcfef95abea2efd391efa14b0f15` |
| Limite du point précédent | Le smoke passait mais la capture EN montrait une restauration du cockpit. Le déplacement conjoint, sa persistance et les erreurs de sauvegarde n'étaient pas prouvés |
| Correction de cette reprise | Callback d'initialisation Dockview stable, titres actualisés en place, réponses de restauration périmées ignorées ; la langue ne recharge plus le snapshot Mindmap ni son layout |
| Positions et historique | Les événements de drag de nœud et de sélection transmettent tous les nœuds concernés. Capture des positions initiales, y compris générées, et une seule entrée undo/redo pour tout le geste ; fusion synchronisée avec le viewport |
| Persistance | Un PUT à la fois par workspace, dernier snapshot complet retenu, succès affiché seulement après son acquittement ; erreur visible, retry explicite et brouillon conservé pendant la bascule de langue. Les événements de fitView programmatiques ne déclenchent pas de sauvegarde |
| Qualification nouvelle | `d08_mindmap_stability.mjs`, appelé par le scénario Chromium D08 existant : déplacement conjoint, undo/redo après FR/EN, identité du panneau/projet sans restauration, échec HTTP 503 puis retry, deux edits pendant un PUT retenu, rechargement de trois positions |
| État CI de cette correction | À vérifier sur le **head live**. Le succès de `eaa2f3d…` ne qualifie pas ces fichiers nouveaux. Consulter la dernière mise à jour de #92 et les artefacts de la même tête |
| Prochaine action | Lire les neuf workflows exact-head, particulièrement l'étape D08 du job navigateur. Si rouge, lire `failure.json` avec son `stage` et corriger la cause. Si vert, inspecter les captures `desktop-canvas`, `stability-en-canvas` et `stability-reload-canvas`, puis les critères de sortie ci-dessous |
| Sortie encore non couverte | Lien profond ouvert dans un contexte neuf ; conversion d'une branche d'idées puis planification explicite de ses tâches réellement visibles au Gantt. Le smoke de conversion individuelle vers la liste Planning ne suffit pas |
| Portée des preuves | Chromium avec API simulée ; PostgreSQL réel dans un job séparé. Pas une preuve Web→Core→PostgreSQL complète ni une validation sur matériel physique. Environnement local sans accès réseau au dépôt : CI requise pour build/intégrations |
| Limite de la file de sauvegarde | Ordonnancement des écritures de ce client, pas résolution de conflits inter-onglets ni coédition. Le retry du brouillon est disponible tant que le workspace est monté ; aucune promesse de stockage offline, traitement global multi-appareil en D12 |
| Production / rollback | Production inchangée, aucun déploiement/commande serveur/migration. Dernier runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations` ; D06/D07/D08 non déployés. Correctif Web/tests/documentation réversible sans toucher aux données |
| Hors scope | D09 3D, D10 assistant opérant, D12 coédition/offline ; complétude FR/EN historique globale en D13. Aucune fusion implicite |

Le modèle ne change pas : `RelationshipRecord` porte les liens, les idées/notes/décisions sont
les `Document` D07 et `WorkspaceLayout` ne contient que positions/viewport/groupes.
Les nouveaux fichiers de persistance sont des adaptateurs Web, pas un nouveau modèle métier.

Les preuves du point précédent et le diagnostic historique de l'export (`Exporter JSON`, pas
`Exporter`) figurent dans le bilan de #92. Les nouveaux tests conservent le scénario initial,
ses assertions de provenance, ses trois exports réellement relus et le contrôle téléphone.

## D07 intégré et verrouillé

Head final qualifié `0db6df6326b553136ab8a375b30fddbe5f6b27aa` : 9/9 workflows PR verts ;
merge `f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4`, arbre
`ecd1947a1cf7f2adf2f6583b54748fdd62289e98` identique à l'arbre qualifié.

Une connaissance éditable reste un `Document` canonique. Chaque sauvegarde/restauration crée
une nouvelle `DocumentVersion`. Les chunks et l'index restent des projections reconstruisibles.
Les citations et la recherche cross-project restent owner-scoped. Lexical sérialise son état
dans `content_json`, le texte est une projection ; `nevolium-json` est l'échange lossless.

[PR D08 #92](https://github.com/fredbuhr/nevolium/pull/92) ·
[Checkpoint D07](docs/archive/d07-editable-knowledge-progress-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [Workflow](docs/development-workflow.md) ·
[État produit](docs/status.md)
