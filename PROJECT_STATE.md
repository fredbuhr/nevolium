# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D09 actif — matière translucide et circulation lumineuse, revue visuelle et matérielle

| Champ | État attesté |
|---|---|
| Base intégrée | `main` = `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`, 8/8 workflows push verts |
| D08 intégré | PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`; tête finale `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f`, 9/9 workflows PR verts, arbre identique au merge |
| Branche / PR active | `feat/d09-mycelium-3d`, **PR #93 draft** ; aucune autre branche normale ouverte par ce travail |
| Référence qualifiée D09 | `d5c438e4348b9e804ffd47f289c77181b5f6d9cb` : **8/8 workflows PR verts**, UI run `35042490052` ; 13 scénarios spatiaux, 16 contrôles kit ; animation 4 677 pixels changés, calme 0. Rendu jugé trop mat/régulier par l’utilisateur |
| Présent descendant | Enveloppes irrégulières translucides + petits noyaux lumineux 3D, cyan/menthe, accents ambrés locaux ; énergie des filaments composée séparément du fond, parcours 3,4–5,5 s, 32/48/72 relations animables ; vérifier CI/captures/film du head live #93 avant de qualifier |
| Implémenté D09 | Projection pure ; renderer R3F/Three différé ; orbite/focus/zoom ; sélection 2D↔3D ; filaments/groupes/labels bornés ; activité réelle des Tasks ; navigation Planning/Knowledge |
| Canon | Snapshot D08 owner-scoped, mêmes `project`/`task`/`document` et `RelationshipRecord`; aucune nouvelle migration ou API métier |
| Présentation | `WorkspaceLayout` distinct `mycelium3d.project.{project_id}` : vue/qualité/caméra, PUT sérialisés/retry/garde de session ; positions spatiales dérivées, positions 2D conservées |
| Lifecycle | Démontage quand panneau/document/viewport masqué ; mouvement réduit ; qualité adaptative/économique ; fallback 2D/retry à l'indisponibilité/perte WebGL ; téléphone 2D par défaut |
| Cohérence | Actualisation manuelle/retour panneau/focus/online avec lectures coalescées ; sélection des objets conservés ; conversion et actions D08 réutilisées |
| Compatibilité | React/DOM 19.2.8 fixés dans la plage supportée par R3F 9.7.0 ; types Three 0.180.0 |
| Retours utilisateur | Nouvelle capture + référence de tissu neuronal : retrouver transparence et cyan/vert, éviter les galets opaques trop réguliers, rendre les chemins perceptiblement vivants ; usage et lisibilité prioritaires |
| Rapport physique récent | Build d5c438e, maximum 401/1000, high, 60,281 s, 41 fenêtres : médiane 136/p10 125/minimum 116 FPS, 0 sous90 ; 5 appels, 4 géométries sur39 fenêtres et2 sur2, mémoire inconnue. Mesure du parent uniquement |
| Preuves | Archive matière translucide du 16 septembre : rapport/hash et référence fournie ; parent kit `10425517549`, navigateur `10425303457`, spatial `10425567472`. SHA exact et artefacts du descendant à vérifier dans #93 |
| Banc matériel | `node apps/web/qualification.build.mjs` ; artefact CI `d09-hardware-kit`, HTML autonome. Renderer réel, graphes synthétiques 51/50, 201/300, 401/1000, stress 501/1500. Aucune API ; campagne 10 minutes, interruptions distinctes, mémoire inconnue conservée comme inconnue, export local `needs_review` |
| Limites | API navigateur simulée distincte des contrats PostgreSQL ; mémoire longue durée et cockpit physique à compléter ; design révisé à examiner. DPR corrigé : comparer les nouvelles mesures à résolution déclarée |
| Production | Dernier runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; D06–D09 non déployés |
| Prochaine action | Vérifier le head live #93 et sa CI ; comparer membranes/noyaux et progression lumineuse hors des corps dans le film, examiner zoom/densité/téléphone ; remettre le kit exact. Retour utilisateur puis mémoire/GPU intégré/cockpit avant clôture |
| Hors scope | D10 assistant ; D11 connecteurs ; D12 coédition/offline ; D13 complétude FR/EN globale ; D10 non commencé |

Réservoir `ed12d503…` inspecté sélectivement, aucune fusion globale. Les écarts D06/D07/FR-EN/PWA
issus du bilan sont dans `docs/status.md`. Ne pas confondre intégration au dépôt et déploiement pilote.

[Suivi D09](docs/archive/d09-spatial-progress-2026-09-15.md) ·
[Reprise organique et retour matériel](docs/archive/d09-organic-revision-2026-09-15.md) ·
[Organisme neuronal vivant](docs/archive/d09-neural-life-2026-09-15.md) ·
[Corps arrondis et raccords](docs/archive/d09-smooth-junctions-2026-09-16.md) ·
[Matière translucide et énergie](docs/archive/d09-translucent-tissue-2026-09-16.md) ·
[PR #93](https://github.com/fredbuhr/nevolium/pull/93) ·
[Plan](docs/implementation-plan.md) · [État produit](docs/status.md)
