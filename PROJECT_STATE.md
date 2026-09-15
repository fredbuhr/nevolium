# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D09 actif — Mycelium 3D interactif et vue spatiale

| Champ | État attesté |
|---|---|
| Base vérifiée | `main` = `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`, handoff D08→D09 qualifié **8/8 workflows push verts** |
| D08 intégré | PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`; head final `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f`, 9/9 workflows PR verts, arbre identique au merge |
| Branche / PR active | `feat/d09-mycelium-3d`, **PR #93 draft** |
| Head d'entrée | Audit D09 initial `1d74ecde9054d290fca9a15dc8a600ef5006b86a`; le présent checkpoint est descendant, vérifier le head live avant toute édition suivante |
| Objectif D09 | Vue Mycelium 3D client-side : caméra/focus/zoom/sélection, filaments/groupes, labels limités et activité, sur les mêmes identités que D08 |
| Canon | D08/Core restent autoritaires pour `project`/`task`/`document` et `RelationshipRecord`; aucun modèle métier 3D parallèle |
| Données d'entrée | Réutiliser le snapshot borné/owner-scoped `/v1/projects/{project_id}/mindmap`; `@nevolium/graph` peut porter des projections/layouts purs, jamais la vérité métier |
| Présentation | Positions/caméra/qualité 3D séparées des positions 2D et stockées dans un `WorkspaceLayout` 3D distinct ; aucune clé définitive choisie avant le premier contrat de persistance |
| Dépendances | `@react-three/fiber`, `three`, `react-force-graph-3d` déjà installés ; aucune n'est encore une preuve produit |
| Réservoir inspecté | Prototype historique `ed12d503…` : caméra/R3F, instancing nœuds, filaments batchés, labels, clusters, activité, qualité adaptative et worker-layout potentiellement salvagables **sélectivement** ; aucun merge global |
| Première tranche | Projection 3D pure + renderer minimal + switch 2D/3D + sélection conservée + lifecycle hidden + perte WebGL/fallback 2D + qualité/caméra persistées ; aucune mutation métier nouvelle |
| Gates précoces | Contrat statique anti-seconde-vérité, build/typecheck, navigateur WebGL/fallback, pause quand masqué, cohérence sélection 2D↔3D, préférence owner-scoped |
| Sortie D09 | 2D↔3D cohérent, objet modifié cohérent partout, reconnexion sans doublon, mesures fluidité/mémoire sur tailles annoncées ; 3D facultative sur mobile |
| Production | Inchangée : runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; D06–D09 non déployés |
| Prochaine action | Qualifier ce head d'entrée de PR #93. S'il est vert : inspecter précisément `MyceliumViewport`, `InstancedNodeField`, `BatchedFilamentField`, `NodeLabelField`, `adaptiveQuality` et le contrat `WorkspaceLayout`, puis implémenter **uniquement** la projection 3D pure et son contrat déterministe avant tout renderer |
| Hors scope | D10 assistant opérant; D11 intégrations externes; D12 coédition/offline; D13 complétude FR/EN globale |

Audit d'entrée : [docs/archive/d09-entry-inspection-2026-09-15.md](docs/archive/d09-entry-inspection-2026-09-15.md).

D09 ne doit pas transformer la vue spatiale en nouveau graphe canonique. La vue 2D D08 reste le
fallback produit et le point de continuité si WebGL est indisponible ou perdu.

## D08 intégré et verrouillé

D08 réutilise les canons D06/D07 et `WorkspaceLayout`. La mindmap 2D couvre liens typés,
groupes/layouts, multi-sélection, deep links, export, reprise de sauvegarde et conversion d'une
branche d'idées vers des Tasks planifiées visibles au Gantt. Le détail des preuves et limites est dans
[docs/archive/d08-editable-mindmap-progress-2026-09-15.md](docs/archive/d08-editable-mindmap-progress-2026-09-15.md).

[PR D09 #93](https://github.com/fredbuhr/nevolium/pull/93) ·
[Audit D09](docs/archive/d09-entry-inspection-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [Workflow](docs/development-workflow.md) ·
[État produit](docs/status.md)
