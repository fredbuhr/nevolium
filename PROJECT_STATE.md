# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D09 actif — correctif intégré, préparation pilote à exécuter

| Champ | État attesté |
|---|---|
| Base intégrée vérifiée | Merge #96 = `702c2a3de4b4bd2219e27bf12c5b5286624d4bd8`, arbre `53f204d33f828274bc16dd85a856105f272d358b`, identique à la tête PR qualifiée. Le suivi documentaire ultérieur ne change pas le code. Dernière release pilote attestée : `69f5926be72227a5fc1c4e3dff7c0e436099e51c` |
| D08 intégré | PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`; tête finale `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f`, 9/9 workflows PR verts, arbre identique au merge |
| Branche / PR | [PR #96](https://github.com/fredbuhr/nevolium/pull/96) sortie du brouillon puis fusionnée le 16 septembre à 15:21 UTC avec garde sur `d9eff70dbcea3c40f0513fabfeee35b5eaf63e07`. Branche `fix/d09-guided-workspace` retirée du développement actif ; aucun nouveau lot. Déploiement non effectué |
| Qualification avant correction | `7d748797c6accc8a6c5115abe634c24d3d5dee29` : **9/9 workflows PR verts**, UI run `35047879779` ; 13 scénarios spatiaux, 16 contrôles kit ; animation 1 978 pixels, calme 0. Contrat d’inventaire réussi dans Foundation |
| Modèle adopté | Renderer `48d7be9752424e8cd4c3793ee5da58225ab2069b` inchangé ; acceptation utilisateur du 16 septembre et autorisation d’installer. Le pilote D09 est activé ; l’acceptation fonctionnelle et visuelle en production reste à effectuer |
| Implémenté D09 | Projection pure ; renderer R3F/Three différé ; orbite/focus/zoom ; sélection 2D↔3D ; filaments/groupes/labels bornés ; activité réelle des Tasks ; navigation Planning/Knowledge |
| Canon | Intégré #96 : projection PostgreSQL en lecture `GET /v1/mycelium/{type}/{id}` sur neuf types existants ; pagination 36/max80, droits à chaque extrémité ; aucune nouvelle table ni migration. Pilote : API D08 initiale toujours active au dernier constat |
| Présentation | `WorkspaceLayout` distinct `mycelium3d.project.{project_id}` : vue/qualité/caméra, PUT sérialisés/retry/garde de session ; positions spatiales dérivées, positions 2D conservées |
| Lifecycle | Démontage quand panneau/document/viewport masqué ; mouvement réduit ; qualité adaptative/économique ; fallback 2D/retry à l'indisponibilité/perte WebGL ; téléphone 2D par défaut |
| Cohérence | Actualisation manuelle/retour panneau/focus/online avec lectures coalescées ; sélection des objets conservés ; conversion et actions D08 réutilisées |
| Compatibilité | React/DOM 19.2.8 fixés dans la plage supportée par R3F 9.7.0 ; types Three 0.180.0 |
| Retours utilisateur | Après activation : FR/EN mélangés, création d’idée ambiguë, objets isolés et animation non perceptible, interface trop complexe. **Pas de go fonctionnel D09** ; le rendu synthétique accepté ne prouve pas l’usage réel |
| Rapport physique récent | Build d5c438e, maximum 401/1000, high, 60,281 s, 41 fenêtres : médiane 136/p10 125/minimum 116 FPS, 0 sous90 ; 5 appels, 4 géométries sur39 fenêtres et2 sur2, mémoire inconnue. Mesure du parent uniquement |
| Vision accueil autorisée | Mycelium commence dès l’accueil, moteur commun, personnalisation simple par utilisateur, toutes les relations canoniques accessibles progressivement. L’utilisateur autorise les travaux et demande un corpus exploitable, avec KISS comme règle backend/frontend |
| Preuves avant correction | Head 7d748797 : kit `10428130673`, navigateur `10428195369`, spatial `10428360099`. HTML SHA-256 `eab1ad272c6453b906a7bea86e6ff45b59e566813e0f85a7a5c68494603213f0`. Source/arbre, anciens livrables et digests archivés dans le suivi matière |
| Banc matériel | `node apps/web/qualification.build.mjs` ; artefact CI `d09-hardware-kit`, HTML autonome. Renderer réel, graphes synthétiques 51/50, 201/300, 401/1000, stress 501/1500. Aucune API ; campagne 10 minutes, interruptions distinctes, mémoire inconnue conservée comme inconnue, export local `needs_review` |
| Limites | API navigateur simulée distincte des contrats PostgreSQL ; mémoire longue durée/GPU intégré/cockpit physique à compléter. La qualification fonctionnelle et visuelle du pilote réel reste à terminer |
| Production avant migration | Inventaire corrigé du 16 septembre 10:16 UTC : runtime D05 propre `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`, projet Compose `nevolium`, un Core, zéro travail non terminal/outbox non publié/réservation active. 7 projets, 57 tâches, 2 documents, 5 réservations historiques `uncertain` préservées |
| Correctif inventaire | Docker 29.8 accepte tous les champs séparés et le JSON sans santé, mais refuse la condition santé dans le JSON combiné. #94 sépare les deux lectures autorisées ; **9/9 workflows PR**, dont le contrat d’inventaire Foundation, et arbre du merge vérifié |
| Retour pré-migration | Snapshot Netcup `d09-pre-migration-20260916` READY. B2 données `aaeebe1697d2867117752d2502571a01d37328bb22378d8a068af932860f700e` ; récupération OpenBao `c7af600a989745b02b87a775b41ef41d2de17b33b251627b59411136e259c26c`. Lecture intégrale et restauration isolée des quatre magasins réussies ; compteurs `57\|57\|29\|34\|16\|44\|5` inchangés ; rapport privé `d04-off-host-recovery-20260916T112539Z.d6a630` |
| Activation D09 | Réussie le 16 septembre : release `69f5926be72227a5fc1c4e3dff7c0e436099e51c`, sélectionnée par `/opt/nevolium/current`. Migrations transactionnelles `0015→0016→0017→0018`, schéma final `0018_editable_knowledge`. Core live/ready/trust et Web prêts ; activité et données vérifiées après démarrage |
| Images actives D09 | Web `79e606139f59…`, Core `d69c565761f6…`, Worker `dcbc682b00ed…`, Web-MCP `125dc53d049c…` ; répertoires Compose des quatre conteneurs rattachés à la release active |
| Intégrité après activation | 7 projets, 57 tâches, 2 documents ; aucun workflow non terminal, aucune Task queued/running, aucun outbox non publié, aucune réservation active. Les 5 réservations historiques `uncertain` sont préservées ; une configuration modèle active |
| Stabilisation D09 | Contrôle après 6–7 minutes réussi : quatre conteneurs D09 running, digests et répertoires exacts, zéro restart ; PostgreSQL, NATS, Temporal et OpenBao healthy ; Core live/ready/trust et Web internes à 200. État SQL inchangé `0018_editable_knowledge\|7\|57\|2\|0\|0\|0\|0\|5\|1` |
| Prochaine action | Exécuter le [bloc de préparation Core + Web](docs/d09-home-pilot-update.md) dans la session SSH opérateur, puis examiner sa sortie et préparer l’activation sur les digests construits et l’état réel du serveur. Ensuite import du corpus avec journal et validation sur appareils. D10 reste fermé |
| Reprise / retour | Conserver les quatre images D05, le snapshot Netcup, les deux snapshots B2, les secrets et les 5 réservations historiques jusqu’au go/no-go fonctionnel. Aucun nettoyage Docker avant validation finale D09 ; un retour de données après écritures post-migration exige une décision explicite |
| Correctif publié | Correctif publié : accueil central avec renderer organique partagé, raccourcis par compte, dossiers, ordre, annulation et navigation transversale ; ancien menu SVG retiré. Corpus fictif 5 projets/20 contenus/12 fichiers/12 tâches/9 dépendances/32 relations, import public avec journal de reprise |
| Validation du correctif | Tête finale `d9eff70dbcea3c40f0513fabfeee35b5eaf63e07` : **9/9 workflows PR verts**, dont [UI 35113871065](https://github.com/fredbuhr/nevolium/actions/runs/35113871065). Arbre du merge identique. Code parent `9b6b010` déjà 9/9, captures inspectées ; PostgreSQL réel et API navigateur simulée distingués |
| Reprise après interruption | Point d’arrêt retrouvé : PR publiée en brouillon et CI du suivi documentaire encore en cours. Dernière CI maintenant verte ; intégration terminée. Aucun journal ne permet d’attribuer l’arrêt de la réponse ChatGPT à une cause technique. Aucun déploiement ni import pilote exécuté |
| Publication autorisée | Publication puis poursuite/intégration expressément autorisées. Merge avec SHA attendu, aucune ref forcée. Procédure de préparation serveur documentée et syntaxe Bash vérifiée ; sortie opérateur requise car aucun accès SSH direct établi |
| Captures et limites | TypeScript/build et contrats locaux réussis. Neuf captures d’accueil et captures Knowledge FR/EN/téléphone et petit réseau inspectées ; archives téléchargées avec SHA-256 vérifié. Les tests navigateur utilisent un Core simulé ; l’import complet et la fluidité sur matériel réel restent à vérifier après déploiement |
| Hors scope | D10 assistant ; D11 connecteurs ; D12 coédition/offline ; D13 complétude FR/EN globale ; D10 non commencé |

Réservoir `ed12d503…` inspecté sélectivement, aucune fusion globale. Les écarts D06/D07/FR-EN/PWA
issus du bilan sont dans `docs/status.md`. Ne pas confondre intégration au dépôt et déploiement pilote.

[Correctif d’usage D09](docs/d09-usability-correction.md) · [Suivi D09](docs/archive/d09-spatial-progress-2026-09-15.md) ·
[Reprise organique et retour matériel](docs/archive/d09-organic-revision-2026-09-15.md) ·
[Organisme neuronal vivant](docs/archive/d09-neural-life-2026-09-15.md) ·
[Corps arrondis et raccords](docs/archive/d09-smooth-junctions-2026-09-16.md) ·
[Matière translucide et énergie](docs/archive/d09-translucent-tissue-2026-09-16.md) ·
[PR #93](https://github.com/fredbuhr/nevolium/pull/93) ·
[Installation pilote](docs/d09-pilot-installation.md) · [Plan](docs/implementation-plan.md) · [État produit](docs/status.md)
