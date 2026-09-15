# D08 — mindmap 2D éditable — inspection d'entrée du 15 septembre 2026

## Point de départ vérifié

D08 démarre depuis `main` `a9edcd96b6227fe362765863aabbcacbbc53fa4f`, après intégration D07
par PR #91 et commit de handoff post-merge. Les **8 workflows `push` de ce `main` sont verts** :
Code Quality, UI workspace, MCP registry, Document ingestion, Baseline reproducibility, Foundation,
Multi-user isolation et Autonomous research. D04 ne se déclenche pas sur ce push documentaire ; il
était vert dans le 9/9 exact-head D07 et l'arbre D07 fusionné a été vérifié identique.

Branche D08 : `feat/d08-editable-mindmap`. Aucun changement métier n'est encore déclaré qualifié.

## Périmètre D08 confirmé

Le plan exécutable demande une mindmap 2D éditable qui affiche les **mêmes identités canoniques** :
projets, tâches et Documents D07 (source/note/idea/decision). La carte doit permettre liens typés,
édition, groupes, multi-sélection, positions/layouts, filtres, recherche, undo/redo et deep links.
La conversion idée → tâche doit créer une Task canonique et conserver la provenance ; elle ne doit
pas copier silencieusement le métier dans un modèle propre à la carte.

Sortie D08 attendue : construire une carte, transformer une branche d'idées en tâches visibles dans
la planification/Gantt, puis prouver que reload/export préservent identités et liens, avec isolation
propriétaire et chargement borné par périmètre.

## Primitives actuelles à réutiliser

### Identités et relations

`RelationshipRecord` existe déjà dans `models.py` avec : propriétaire, source type/id, type de
relation, cible type/id, metadata et index owner/source/target. Les endpoints historiques :

- `GET /v1/relationships` lit **un voisinage borné** autour d'une entité, owner-scoped, paginé,
  avec revalidation des deux extrémités ;
- `POST /v1/relationships` impose `require_same_owner_entities`, écrit audit + outbox et crée une
  relation canonique.

Les types d'entités validés par les lectures de voisinage sont `project`, `task` et `document`.
C'est suffisant pour D08 : une idée, une décision ou une note D07 est déjà un `document`. Aucun type
`idea` parallèle ne doit être introduit.

Le schéma `RelationshipCreate` est aujourd'hui volontairement générique et accepte un
`relation_type` chaîne libre. D08 ne doit pas durcir silencieusement tout le système historique ; un
contrat D08 dédié pourra borner le vocabulaire proposé par la mindmap sans casser les relations
existantes hors D08.

### Layouts

`WorkspaceLayout` stocke déjà un JSON owner-scoped par `workspace_key`, avec versions de schéma et
limite de 256 000 octets. C'est la bonne couche pour les **positions, groupes repliés, viewport et
préférences visuelles** de la carte. Ces données de présentation ne doivent pas polluer
`RelationshipRecord.metadata_json` ni les objets métier.

### Web / graph

`@xyflow/react` est déjà installé dans le Web. Le package `@nevolium/graph` courant est volontairement
minimal : node/edge/snapshot avec identités et relation. Il peut être étendu par des fonctions pures
de projection/layout sans y déplacer l'autorité métier.

## Prototype historique `ed12d503…`

Le prototype historique contenait `BrainMindMap.tsx` et un `mindmap.ts` radial. Les éléments
réutilisables sélectivement sont :

- XYFlow comme renderer 2D ;
- sélection et double-clic d'exploration ;
- fallback radial déterministe basé sur un BFS ;
- distinction visuelle relations explicites / structurelles ;
- conservation des positions locales lorsqu'une projection est rafraîchie.

À **ne pas reprendre tel quel** : anciens types de marque, score importance/activity/recency, arêtes
structurelles synthétiques considérées comme une projection autonome, et stockage implicite des
positions uniquement dans l'état React. Le prototype ne sera jamais fusionné en bloc.

## Architecture D08 retenue

Trois couches restent séparées :

1. **Canon métier** — `Project`, `Task`, `Document` D07 et `RelationshipRecord`.
2. **Projection de carte bornée** — lecture serveur owner-scoped d'un périmètre explicitement
   demandé ; elle résout labels/kinds/status sans inventer de nouvelles identités.
3. **Layout utilisateur** — positions, viewport, groupes et préférences sauvegardés dans
   `WorkspaceLayout` sous une clé stable D08 ; le layout n'est jamais une vérité métier.

Le premier chargement ne doit pas devenir un « global graph » non borné. L'API historique de
voisinage reste utile pour explorer un nœud ; pour une carte de projet, D08 pourra ajouter une
projection **project-scoped avec caps explicites** plutôt qu'une lecture globale de toutes les
relations du propriétaire.

La conversion idée → tâche doit : créer la Task dans le projet choisi, puis créer une relation
canonique `document → task` qui conserve la provenance. La relation exacte sera verrouillée dans le
contrat D08 après inspection des usages existants ; ne pas inventer plusieurs synonymes.

## Ordre d'implémentation

1. Définir la projection D08 et ses caps : nœuds projet/tâches/documents + relations visibles.
2. Ajouter/adapter l'API de lecture owner-scoped et bornée sans modifier `main.py` si un router D08
   séparé suffit.
3. Définir le vocabulaire de liens proposé par la mindmap et la mutation sûre/réutilisant le canon.
4. Définir la convention `WorkspaceLayout` pour positions/viewport/groupes et une stratégie de
   fallback radial déterministe.
5. Monter XYFlow dans une surface Mindmap du cockpit : sélection, liens, drag, groupes,
   multi-sélection, filtres/recherche, undo/redo et deep links.
6. Implémenter idée → tâche avec provenance, puis prouver sa visibilité dans Planning/Gantt.
7. Qualifier PostgreSQL, isolation, reload/export d'identités/liens et Chromium desktop/tactile.

## Hors scope

D09 Mycelium 3D, D10 assistant opérant, coédition/offline D12 et complétude linguistique historique
D13 ne doivent pas entrer dans cette branche. D08 ne remplace ni le graphe dérivé Graphiti ni la
mindmap par un moteur 3D.
