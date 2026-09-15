# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D09 actif — implémenté, qualification en cours

| Champ | État attesté |
|---|---|
| Base vérifiée | `main` = `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`, 8/8 workflows push verts |
| D08 intégré | PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`; tête finale `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f`, 9/9 workflows PR verts, arbre identique au merge |
| Branche / PR active | `feat/d09-mycelium-3d`, **PR #93 draft** ; base de cette livraison `3c80857647723085612f1f4e51b1e84568009d6a` |
| Réalisé D09 | Projection pure déterministe ; renderer R3F/Three chargé à la demande, sélection 2D↔3D, orbite/focus/zoom, filaments/groupes/labels/activité, navigation Planning/Knowledge |
| Canon | Snapshot D08 owner-scoped ; mêmes `project`/`task`/`document` et `RelationshipRecord`; aucune nouvelle migration ou mutation métier |
| Persistance | `WorkspaceLayout` distinct `mycelium3d.project.{project_id}` : vue, qualité, caméra ; PUT sérialisés, retry, garde de session ; positions 3D dérivées, positions 2D conservées |
| Lifecycle | Scène démontée hors viewport/panneau/document visible, mouvement réduit, qualité adaptative et économique, fallback 2D/retry WebGL ; téléphone 2D par défaut |
| Cohérence | Actualisation manuelle/retour panneau/focus/online, lectures coalescées ; conversion et actions D08 réutilisées |
| Compatibilité | React/DOM 19.2.8 fixés dans la plage supportée par R3F 9.7.0 ; types Three 0.180.0 ajoutés |
| Validation | Contrats purs D09 et contrats Web D08/locale passent localement ; build final passé (React 19.2.8). Premier head `db346a8` : build, navigateur D05–D07 et PostgreSQL D06/D08 verts ; correctifs du contrat D05 et de la hauteur du canvas D08 à requalifier |
| Incertitudes | Chromium D09 à exécuter ; fluidité/mémoire physique sur GPU intégré/tablette non mesurées ; API navigateur simulée distincte des contrats PostgreSQL |
| Production | Inchangée : runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; D06–D09 non déployés |
| Prochaine action | Pousser/qualifier cette livraison sur #93, corriger les échecs réels, conserver captures/mesures et enregistrer les résultats exacts ; maintenir draft tant que les gates matériels D09 restent ouverts |
| Hors scope | D10 assistant opérant ; D11 connecteurs ; D12 coédition/offline ; D13 complétude FR/EN globale |

Le réservoir historique `ed12d503…` a été inspecté sélectivement : aucune fusion globale.
Les écarts D06/D07/FR-EN/PWA recensés au bilan sont consignés dans `docs/status.md`.

[Suivi D09](docs/archive/d09-spatial-progress-2026-09-15.md) ·
[PR #93](https://github.com/fredbuhr/nevolium/pull/93) ·
[Audit d'entrée](docs/archive/d09-entry-inspection-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [État produit](docs/status.md)
