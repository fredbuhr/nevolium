# D08 — checkpoint final de branche avant intégration

Date : 2026-09-15  
PR : #92 `feat/d08-editable-mindmap` → `main`

## État qualifié

Le head fonctionnel `1576e8f73bc48b058ec0c7981853b80d40e7e93a` a passé **9/9 workflows PR** :

| Workflow | Run |
|---|---:|
| Code quality | `35010647582` |
| Document ingestion | `35010647661` |
| MCP tool registry | `35010647563` |
| Multi-user isolation | `35010647557` |
| UI workspace | `35010647609` |
| Baseline reproducibility | `35010647644` |
| Foundation | `35010647583` |
| Autonomous research | `35010647521` |
| D04 real engine qualification | `35010647622` |

Le présent document crée un head documentaire descendant : **il doit lui-même repasser les gates avant merge**.

## Livré

- snapshot Mindmap borné, project-scoped et owner-scoped sur les identités canoniques `project`, `task` et `document` ;
- `RelationshipRecord` reste l'autorité des liens, avec vocabulaire D08 explicite ; liens historiques visibles mais non réécrits par la surface ;
- création/suppression de liens Mindmap, provenance `converted_to` non supprimable et conversion idée→Task atomique ;
- placement radial déterministe dans `@nevolium/graph`, XYFlow comme renderer/input et non comme base métier ;
- positions, viewport et groupes uniquement dans `WorkspaceLayout` ;
- recherche, filtres, sélection multiple, groupes, undo/redo, export JSON et nouvelles chaînes FR/EN ;
- déplacement conjoint de plusieurs nœuds, historique et rechargement des positions ;
- file de sauvegarde de layout sérialisée, état `saved/error` honnête, retry explicite et garde de session d'authentification ;
- deep link frais `?mindmap=<type>:<id>` : résolution owner-scoped de la Task/du Document vers son projet, ouverture directe du cockpit et de la Mindmap ;
- sortie branche→Gantt : deux idées liées converties avec provenance, planifiées par le vrai flux D06 `preview/apply`, puis visibles dans le renderer Gantt.

Aucune migration D08 n'est nécessaire : D08 réutilise `RelationshipRecord`, `Document`, `Task` et `WorkspaceLayout`.

## Preuves D08

### PostgreSQL réel

Le job `mindmap-integration` du run UI `35010647609` passe sur PostgreSQL réel. Il couvre notamment :

- isolation propriétaire/projet ;
- relations cross-project exclues du snapshot ;
- caps et troncature ;
- création/suppression de liens ;
- lien historique non supprimable depuis la Mindmap ;
- conversion idée→Task et présence dans la projection Planning canonique ;
- outbox/audit et provenance corrélés.

### Chromium

Artefact : `d08-mindmap-browser-qualification`, ID `10413396962`, digest
`sha256:ca8364bd22bd05ba0aaf8b98e40632a8445b9ffff902675216a5771919f092ec`.

Le scénario Web utilise une **API simulée** ; la preuve PostgreSQL ci-dessus est séparée. Le résultat `result.json` atteste :

- drag + sauvegarde ;
- liens, undo/redo ;
- groupes ;
- exports FR/EN/reload relus ;
- tactile téléphone émulé ;
- déplacement conjoint, undo/redo après bascule de langue et rechargement de trois positions ;
- panne de sauvegarde sans faux succès, conservation locale, retry explicite ;
- sérialisation des PUT et `maxLayoutInFlight = 1` ;
- `exit.deepLink = true` dans un contexte navigateur neuf ;
- `exit.branchToGantt = { conversions: 2, plannedTasks: 2, gantt: true }`.

La capture `branch-to-gantt.png` montre les deux tâches converties et planifiées dans le Gantt ; une troisième tâche non planifiée reste volontairement hors du chart conformément au contrat D06.

## Invariants / limites

- XYFlow ne devient jamais l'autorité des nœuds/liens métier.
- Un deep link ne contourne pas l'ownership : Task/Document est résolu via les endpoints canoniques owner-scoped.
- Une conversion de branche réutilise l'opération idée→tâche existante pour chaque idée ; aucun second modèle ou batch implicite n'est ajouté.
- Les dates de Gantt sont appliquées via la replanification D06 `preview/apply`, jamais par écriture locale du renderer.
- Les preuves Chromium mockées + PostgreSQL réel ne constituent pas une session Web→Core→PostgreSQL unique de bout en bout.
- La CI tactile ne remplace pas une revue ergonomique sur appareils physiques.
- Pas de coédition/inter-onglets/offline durable en D08 : D12 porte ces garanties.
- D09 3D n'est pas commencé par ce lot.

## Production / rollback

Aucun déploiement ni commande de production n'a été effectué. Le pilote attesté reste sur le runtime D05
`e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations` ; D06–D08 ne sont pas déployés.

D08 étant additif sans migration propre, un rollback de la PR consiste à revenir au code D07 intégré ; les relations/Documents/Tasks/layouts déjà canoniques ne nécessitent pas de suppression de schéma.

## Sortie

Le scénario de sortie D08 du plan est couvert sur le head fonctionnel : carte éditable, branche d'idées convertie en tâches planifiées visibles au Gantt, rechargement/export préservant identité/relations/layout, isolation et chargement borné.

Prochaine action : requalifier le head documentaire final de #92 ; si 9/9 vert, rendre la PR prête, fusionner avec garde SHA, vérifier `main`/arbre, puis seulement ouvrir D09.
