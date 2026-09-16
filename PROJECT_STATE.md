# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D09 actif — design intégré, installation pilote à exécuter

| Champ | État attesté |
|---|---|
| Base intégrée vérifiée | `main` = merge garde de récupération `7326fd2b1a2565c08fc324f2e10d20b3cad27196`, fichiers identiques à la tête #95 qualifiée. Merge correctif d’inventaire `fb755c238408f940ab3e7e25c3d3f65abf9948e6` ; merge design D09 `7c6d39ea9abc2856a7fec4bfc2d4c10f36761f76` |
| D08 intégré | PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`; tête finale `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f`, 9/9 workflows PR verts, arbre identique au merge |
| Branche / PR | [#95](https://github.com/fredbuhr/nevolium/pull/95) fusionnée ; aucune branche de développement active. Tête finale `04dc89aaf17ec3b3cd73288b38b68737347d6b18`, **9/9 workflows verts**, dont sauvegarde et restauration sur hôte distinct après relance d’un transfert interrompu par GitHub |
| Tête finale qualifiée D09 | `7d748797c6accc8a6c5115abe634c24d3d5dee29` : **9/9 workflows PR verts**, UI run `35047879779` ; 13 scénarios spatiaux, 16 contrôles kit ; animation 1 978 pixels, calme 0. Contrat d’inventaire réussi dans Foundation |
| Modèle adopté | Renderer `48d7be9752424e8cd4c3793ee5da58225ab2069b` inchangé ; acceptation utilisateur du 16 septembre et autorisation d’installer. Inventaire serveur en lecture seule et plan D05→D09 intégrés ; aucune activation serveur depuis cette session |
| Implémenté D09 | Projection pure ; renderer R3F/Three différé ; orbite/focus/zoom ; sélection 2D↔3D ; filaments/groupes/labels bornés ; activité réelle des Tasks ; navigation Planning/Knowledge |
| Canon | Snapshot D08 owner-scoped, mêmes `project`/`task`/`document` et `RelationshipRecord`; aucune nouvelle migration ou API métier |
| Présentation | `WorkspaceLayout` distinct `mycelium3d.project.{project_id}` : vue/qualité/caméra, PUT sérialisés/retry/garde de session ; positions spatiales dérivées, positions 2D conservées |
| Lifecycle | Démontage quand panneau/document/viewport masqué ; mouvement réduit ; qualité adaptative/économique ; fallback 2D/retry à l'indisponibilité/perte WebGL ; téléphone 2D par défaut |
| Cohérence | Actualisation manuelle/retour panneau/focus/online avec lectures coalescées ; sélection des objets conservés ; conversion et actions D08 réutilisées |
| Compatibilité | React/DOM 19.2.8 fixés dans la plage supportée par R3F 9.7.0 ; types Three 0.180.0 |
| Retours utilisateur | « C’est bon on valide ce modèle pour l’instant tu peux installer ce design et continuer » : référence adoptée, sans nouvelle itération esthétique demandée |
| Rapport physique récent | Build d5c438e, maximum 401/1000, high, 60,281 s, 41 fenêtres : médiane 136/p10 125/minimum 116 FPS, 0 sous90 ; 5 appels, 4 géométries sur39 fenêtres et2 sur2, mémoire inconnue. Mesure du parent uniquement |
| Preuves finales | Head 7d748797 : kit `10428130673`, navigateur `10428195369`, spatial `10428360099`. HTML SHA-256 `eab1ad272c6453b906a7bea86e6ff45b59e566813e0f85a7a5c68494603213f0`. Source/arbre, anciens livrables et digests archivés dans le suivi matière |
| Banc matériel | `node apps/web/qualification.build.mjs` ; artefact CI `d09-hardware-kit`, HTML autonome. Renderer réel, graphes synthétiques 51/50, 201/300, 401/1000, stress 501/1500. Aucune API ; campagne 10 minutes, interruptions distinctes, mémoire inconnue conservée comme inconnue, export local `needs_review` |
| Limites | API navigateur simulée distincte des contrats PostgreSQL ; mémoire longue durée/GPU intégré/cockpit physique à compléter. Aucun déploiement D06–D09 attesté |
| Production | Inventaire corrigé du 16 septembre 10:16 UTC complet, sans activation : runtime D05 propre `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`, projet Compose `nevolium`, un Core, zéro travail non terminal/outbox non publié/réservation active. 7 projets, 57 tâches, 2 documents, 5 réservations historiques `uncertain` préservées. Pas de disposition `current`/`releases`, 597 717 602 304 octets libres |
| Correctif inventaire | Docker 29.8 accepte tous les champs séparés et le JSON sans santé, mais refuse la condition santé dans le JSON combiné. #94 sépare les deux lectures autorisées ; **9/9 workflows PR**, dont le contrat d’inventaire Foundation, et arbre du merge vérifié |
| Retour pré-migration | Snapshot Netcup `d09-pre-migration-20260916` READY. B2 données `aaeebe1697d2867117752d2502571a01d37328bb22378d8a068af932860f700e` ; récupération OpenBao `c7af600a989745b02b87a775b41ef41d2de17b33b251627b59411136e259c26c`. Lecture intégrale et restauration isolée des quatre magasins réussies ; compteurs `57|57|29|34|16|44|5` inchangés ; rapport privé `d04-off-host-recovery-20260916T112539Z.d6a630` |
| Prochaine action | Préparer une release D09 séparée et construire ses images sans modifier les conteneurs actifs. Conserver les quatre images D05 par identifiant avant toute migration, puis contrôler la configuration effective et l’espace disque |
| Reprise / retour | Ne pas activer Web seul contre Core D05. Les images D05, le snapshot Netcup, les deux snapshots B2, les secrets et les 5 réservations historiques doivent rester préservés jusqu’au go/no-go après `0016`–`0018`. Aucun nettoyage Docker avant validation D09 |
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
