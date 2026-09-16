# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D09 actif — design accepté, intégration et installation pilote

| Champ | État attesté |
|---|---|
| Base intégrée | `main` = `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`, 8/8 workflows push verts |
| D08 intégré | PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`; tête finale `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f`, 9/9 workflows PR verts, arbre identique au merge |
| Branche / PR active | `feat/d09-mycelium-3d`, **PR #93 draft** ; aucune autre branche normale ouverte par ce travail |
| Référence qualifiée D09 | `48d7be9752424e8cd4c3793ee5da58225ab2069b` : **8/8 workflows PR verts**, UI run `35046479283` ; 13 scénarios spatiaux, 16 contrôles kit ; animation 2 388 pixels, calme 0 |
| Présent descendant | Modèle visuel conservé ; acceptation utilisateur du 16 septembre et autorisation d’installer. Ajout d’un inventaire serveur en lecture seule et d’un plan D05→D09 ; pas d’activation serveur depuis cette session |
| Implémenté D09 | Projection pure ; renderer R3F/Three différé ; orbite/focus/zoom ; sélection 2D↔3D ; filaments/groupes/labels bornés ; activité réelle des Tasks ; navigation Planning/Knowledge |
| Canon | Snapshot D08 owner-scoped, mêmes `project`/`task`/`document` et `RelationshipRecord`; aucune nouvelle migration ou API métier |
| Présentation | `WorkspaceLayout` distinct `mycelium3d.project.{project_id}` : vue/qualité/caméra, PUT sérialisés/retry/garde de session ; positions spatiales dérivées, positions 2D conservées |
| Lifecycle | Démontage quand panneau/document/viewport masqué ; mouvement réduit ; qualité adaptative/économique ; fallback 2D/retry à l'indisponibilité/perte WebGL ; téléphone 2D par défaut |
| Cohérence | Actualisation manuelle/retour panneau/focus/online avec lectures coalescées ; sélection des objets conservés ; conversion et actions D08 réutilisées |
| Compatibilité | React/DOM 19.2.8 fixés dans la plage supportée par R3F 9.7.0 ; types Three 0.180.0 |
| Retours utilisateur | « C’est bon on valide ce modèle pour l’instant tu peux installer ce design et continuer » : référence adoptée, sans nouvelle itération esthétique demandée |
| Rapport physique récent | Build d5c438e, maximum 401/1000, high, 60,281 s, 41 fenêtres : médiane 136/p10 125/minimum 116 FPS, 0 sous90 ; 5 appels, 4 géométries sur39 fenêtres et2 sur2, mémoire inconnue. Mesure du parent uniquement |
| Preuves | Head visuel 48d7be9 : kit `10427526848`, navigateur `10427477105`, spatial `10427278203`. HTML SHA-256 `48d7537f3e716f6d4135f473d2c1978c97a8fc4f1e8cef4438e6489150efbb59`. Preuves exactes du descendant dans #93 |
| Banc matériel | `node apps/web/qualification.build.mjs` ; artefact CI `d09-hardware-kit`, HTML autonome. Renderer réel, graphes synthétiques 51/50, 201/300, 401/1000, stress 501/1500. Aucune API ; campagne 10 minutes, interruptions distinctes, mémoire inconnue conservée comme inconnue, export local `needs_review` |
| Limites | API navigateur simulée distincte des contrats PostgreSQL ; mémoire longue durée/GPU intégré/cockpit physique à compléter. Acceptation visuelle acquise pour l’instant ; aucune preuve serveur D06–D09 nouvelle |
| Production | Dernier runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; D06–D09 non déployés |
| Prochaine action | Intégrer #93 après CI de sa tête finale ; exécuter l’inventaire D09 depuis la session SSH opérateur, examiner versions/images/Compose/SQL, puis préparer sauvegarde et release compatible avant activation |
| Hors scope | D10 assistant ; D11 connecteurs ; D12 coédition/offline ; D13 complétude FR/EN globale ; D10 non commencé |

Réservoir `ed12d503…` inspecté sélectivement, aucune fusion globale. Les écarts D06/D07/FR-EN/PWA
issus du bilan sont dans `docs/status.md`. Ne pas confondre intégration au dépôt et déploiement pilote.

[Suivi D09](docs/archive/d09-spatial-progress-2026-09-15.md) ·
[Reprise organique et retour matériel](docs/archive/d09-organic-revision-2026-09-15.md) ·
[Organisme neuronal vivant](docs/archive/d09-neural-life-2026-09-15.md) ·
[Corps arrondis et raccords](docs/archive/d09-smooth-junctions-2026-09-16.md) ·
[Matière translucide et énergie](docs/archive/d09-translucent-tissue-2026-09-16.md) ·
[PR #93](https://github.com/fredbuhr/nevolium/pull/93) ·
[Installation pilote](docs/d09-pilot-installation.md) · [Plan](docs/implementation-plan.md) · [État produit](docs/status.md)
