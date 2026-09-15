# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D09 actif — organisme neuronal vivant, revue visuelle et matérielle

| Champ | État attesté |
|---|---|
| Base intégrée | `main` = `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`, 8/8 workflows push verts |
| D08 intégré | PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`; tête finale `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f`, 9/9 workflows PR verts, arbre identique au merge |
| Branche / PR active | `feat/d09-mycelium-3d`, **PR #93 draft** ; aucune autre branche normale ouverte par ce travail |
| Référence qualifiée D09 | `0fa97e6a5a35cd5c4ba1d967665ba21fa420f369` : **8/8 workflows PR verts**, UI run `35033102993`. Membranes fonctionnelles, dessin jugé encore circulaire et immobile |
| Présent descendant | Corps neuronaux 3D, dendrites effilées, respiration au repos et vagues lumineuses ; commande calme/mouvement réduit ; vérifier les checks/captures/vidéo du head live #93, sans transférer les performances du parent |
| Implémenté D09 | Projection pure ; renderer R3F/Three différé ; orbite/focus/zoom ; sélection 2D↔3D ; filaments/groupes/labels bornés ; activité réelle des Tasks ; navigation Planning/Knowledge |
| Canon | Snapshot D08 owner-scoped, mêmes `project`/`task`/`document` et `RelationshipRecord`; aucune nouvelle migration ou API métier |
| Présentation | `WorkspaceLayout` distinct `mycelium3d.project.{project_id}` : vue/qualité/caméra, PUT sérialisés/retry/garde de session ; positions spatiales dérivées, positions 2D conservées |
| Lifecycle | Démontage quand panneau/document/viewport masqué ; mouvement réduit ; qualité adaptative/économique ; fallback 2D/retry à l'indisponibilité/perte WebGL ; téléphone 2D par défaut |
| Cohérence | Actualisation manuelle/retour panneau/focus/online avec lectures coalescées ; sélection des objets conservés ; conversion et actions D08 réutilisées |
| Compatibilité | React/DOM 19.2.8 fixés dans la plage supportée par R3F 9.7.0 ; types Three 0.180.0 |
| Retours utilisateur | Nouveau kit correct/fonctionnel, mais manque de vie et de volume : demande explicite de neurones, ramifications naturelles et énergie en circulation |
| Rapport physique récent | Build 0fa97e6, 201/300, éco, 601,216 s, 401 fenêtres : médiane 151 / p10 41 / minimum 1 FPS ; mémoire absente. Journal préservé, 0 événements perdus annoncés ; chute de fluidité à prendre en compte |
| Preuves | Rapport joint analysé et hash conservé dans le suivi organique ; référence kit `10419823329` ; preuve exacte du descendant dans les checks et le corps de #93 |
| Banc matériel | `node apps/web/qualification.build.mjs` ; artefact CI `d09-hardware-kit`, HTML autonome. Renderer réel, graphes synthétiques 51/50, 201/300, 401/1000, stress 501/1500. Aucune API ; campagne 10 minutes, interruptions distinctes, mémoire inconnue conservée comme inconnue, export local `needs_review` |
| Limites | API navigateur simulée distincte des contrats PostgreSQL ; mémoire longue durée et cockpit physique à compléter ; design révisé à examiner. DPR corrigé : comparer les nouvelles mesures à résolution déclarée |
| Production | Dernier runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; D06–D09 non déployés |
| Prochaine action | Vérifier le head live #93 et sa CI, examiner silhouette 3D et animation réelle sur captures/vidéo, remettre le kit neuronal ; recueillir le retour visuel et compléter les preuves mémoire/GPU intégré/cockpit avant clôture |
| Hors scope | D10 assistant ; D11 connecteurs ; D12 coédition/offline ; D13 complétude FR/EN globale ; D10 non commencé |

Réservoir `ed12d503…` inspecté sélectivement, aucune fusion globale. Les écarts D06/D07/FR-EN/PWA
issus du bilan sont dans `docs/status.md`. Ne pas confondre intégration au dépôt et déploiement pilote.

[Suivi D09](docs/archive/d09-spatial-progress-2026-09-15.md) ·
[Reprise organique et retour matériel](docs/archive/d09-organic-revision-2026-09-15.md) ·
[Organisme neuronal vivant](docs/archive/d09-neural-life-2026-09-15.md) ·
[PR #93](https://github.com/fredbuhr/nevolium/pull/93) ·
[Plan](docs/implementation-plan.md) · [État produit](docs/status.md)
