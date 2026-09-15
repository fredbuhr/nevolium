# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D09 actif — qualification logicielle acquise, gate matériel ouvert

| Champ | État attesté |
|---|---|
| Base intégrée | `main` = `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`, 8/8 workflows push verts |
| D08 intégré | PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`; tête finale `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f`, 9/9 workflows PR verts, arbre identique au merge |
| Branche / PR active | `feat/d09-mycelium-3d`, **PR #93 draft** ; aucune autre branche normale ouverte par ce travail |
| Référence qualifiée D09 | `825cee775870cd97bc860e7d4ea63501f4cb07bb` : **8/8 workflows PR verts**, dont tous les parcours navigateur D05–D09 et les contrats PostgreSQL |
| Présent descendant | Correction visuelle des chevauchements de labels + assertion navigateur et checkpoint ; consulter les checks du head live #93 avant reprise, sans transférer automatiquement les résultats du parent |
| Implémenté D09 | Projection pure ; renderer R3F/Three différé ; orbite/focus/zoom ; sélection 2D↔3D ; filaments/groupes/labels bornés ; activité réelle des Tasks ; navigation Planning/Knowledge |
| Canon | Snapshot D08 owner-scoped, mêmes `project`/`task`/`document` et `RelationshipRecord`; aucune nouvelle migration ou API métier |
| Présentation | `WorkspaceLayout` distinct `mycelium3d.project.{project_id}` : vue/qualité/caméra, PUT sérialisés/retry/garde de session ; positions spatiales dérivées, positions 2D conservées |
| Lifecycle | Démontage quand panneau/document/viewport masqué ; mouvement réduit ; qualité adaptative/économique ; fallback 2D/retry à l'indisponibilité/perte WebGL ; téléphone 2D par défaut |
| Cohérence | Actualisation manuelle/retour panneau/focus/online avec lectures coalescées ; sélection des objets conservés ; conversion et actions D08 réutilisées |
| Compatibilité | React/DOM 19.2.8 fixés dans la plage supportée par R3F 9.7.0 ; types Three 0.180.0 |
| Mesures | Référence 825cee7 : 51/201/501 nœuds synthétiques, profil éco, SwiftShader : 32/28/23 FPS, heap JS 15,2/29,4/44,7 Mo ; 3 géométries/3 draw calls. Ce ne sont pas des mesures GPU intégré/tablette physiques |
| Preuves | UI run `35023375224`, artefact D09 `10418842039`, captures bureau/graphe dense/téléphone examinées ; détail et digest dans le suivi D09 |
| Limites | API navigateur simulée distincte des contrats PostgreSQL ; sessions physiques et stabilité mémoire longue durée à qualifier ; déploiement séparé |
| Production | Dernier runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; D06–D09 non déployés |
| Prochaine action | Vérifier le head live #93 et sa CI, puis réaliser la campagne GPU intégré/tablette physique décrite dans le suivi D09 ; consigner les résultats avant clôture/intégration du lot |
| Hors scope | D10 assistant ; D11 connecteurs ; D12 coédition/offline ; D13 complétude FR/EN globale ; D10 non commencé |

Réservoir `ed12d503…` inspecté sélectivement, aucune fusion globale. Les écarts D06/D07/FR-EN/PWA
issus du bilan sont dans `docs/status.md`. Ne pas confondre intégration au dépôt et déploiement pilote.

[Suivi D09](docs/archive/d09-spatial-progress-2026-09-15.md) ·
[PR #93](https://github.com/fredbuhr/nevolium/pull/93) ·
[Plan](docs/implementation-plan.md) · [État produit](docs/status.md)
