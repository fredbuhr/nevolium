# Nevolium : état fonctionnel vérifié

Révision : 2026-09-14. D04 est intégré par [#88](https://github.com/fredbuhr/nevolium/pull/88),
ses quatre preuves sont acquises, le tag H5 vise son commit de fusion et la branche D04 est retirée.
D05 est en revue dans la [PR #89](https://github.com/fredbuhr/nevolium/pull/89), sur la branche
unique suivie dans [PROJECT_STATE](../PROJECT_STATE.md). Son dernier checkpoint complet vérifié
est `96c29fb9a37efe666935705ce047a74a55184556` ; ses 10 workflows réussissent. Chromium couvre
bureau/tablette/téléphone et un second scénario traverse le vrai Keycloak avec PKCE pour les rôles
administrateur et utilisateur. Le lot n'est ni intégré ni déployé. Les textes visibles sont alignés avec la
[charte d'identité](identite-nevolium.md) sur cette même PR.
Les mesures cible proviennent des sorties opérateur conservées dans le
[rapport final D04](archive/d04-pilot-qualification-2026-09-14.md).

## Acquis canoniques et qualification

Reset R0–R7, H1–H4 et D01–D04 intégrés ; dernier jalon produit G51 Daily Spine.
D01 borne Worker/parsing, D02 apporte admission/budgets/pagination/rétention et D03 durcit
droits/déploiement/reproductibilité. D04 qualifie les vrais moteurs et l'exploitation du pilote API.
D05 n'est ni intégré ni déployé ; sa livraison cohérente est en cours de revue.

| Domaine | Preuve disponible | Limite |
|---|---|---|
| Serveur et état durable | Debian 13 durci, PostgreSQL `0014_capacity_and_data`, Temporal, JetStream, SeaweedFS ; charge mixte et restauration B2 acquises | Premier serveur Linux x86_64 |
| Identité | TLS, OIDC/PKCE, comptes nominatifs et TOTP ; bootstrap retiré, refus anonyme/faux jeton/routes internes vérifiés | Ergonomie et nouveaux parcours |
| Worker | Confinement, bundle hors ligne, Temporal réel ; mixte et rollback acquis | Capacité commerciale non qualifiée |
| Documents | Docling 2.126.0, PDF propriétaire, version/chunks/source ; 39,499 s en mixte | Scans complexes, tableaux et gros documents hors essai |
| Mémoire | Mem0/Graphiti réels et scope propriétaire ; rejeu sans doublon ; 21,451 s en mixte après 43,378 s d'admission | Qualité quotidienne à mesurer ; projections dérivées |
| News | Sources propriétaire et briefing avec fallback déterministe | Synthèse quotidienne API non qualifiée ; anomalie financière historique conservée |
| Modèle/comptabilité | OpenAI `openai/gpt-4.1` via `smart`, limite 4096 ; tokens/coûts et réservations réglés sur cible | Un fournisseur qualifié ; estimation ne garantit pas un plafond fournisseur |
| Routage | Command Center, propositions, garde Core et veto sans Task métier ; routes API | Pertinence quotidienne à améliorer |
| Research | Deux recherches citées terminées en 23,591 s et 9,524 s ; Search puis Fetch ; résultat et usages canoniques | Une question de qualification ; classement lexical des sources, pas preuve générale de pertinence |
| Unicité Research | Binding atomique déployé, concurrence Core/PostgreSQL et crash/replay CI verts | Préserver les identités historiques |
| Secrets/exploitation | OpenBao persistant, policy minimale, root révoqué, renouvellement ; ancien Worker réactivé puis candidat ; récupération chiffrée réussie | Ne pas confondre exercice manuel et sauvegarde planifiée |
| Restauration | Deux snapshots B2, packs relus, quatre magasins vérifiés sur volumes isolés neufs ; production inchangée | Restauration utilisateur isolée sur même serveur ; restauration entre VM prouvée séparément en CI |

Cible : 12 CPU logiques, environ 32 Gio de RAM. Lecture : 3 333 requêtes, concurrence 20,
p95 maximal 0,524 s, zéro erreur. Un compte réel alimente les clients virtuels depuis le Core
de la cible ; ces mesures ne prouvent pas 1 000 utilisateurs distincts ni générations simultanées.

La récupération réussie au code `61d7687088dcbb002febd4c5f1a97f33edcb1269` a pris 86,979 s
pour le backup et 44,686 s pour la restauration. Deux snapshots contiennent 21 129 842 octets
de données Restic. Comptes finaux inchangés `52|52|25|30|16|39|5`, travaux/outbox `0|0|0|0`.
Les cinq réservations uncertain et les anciens essais sont conservés sans rejeu.

## Produit présent et fonctions futures

| Domaine | Présent | À livrer |
|---|---|---|
| Cockpit | Web/OIDC, panneaux persistés ; candidat D05 avec repères Assistant, Actualités, Recherche, Aujourd'hui, Projets et Documents, identité Mycelium cyan/émeraude/violet, accès rapide, inspecteur, profils/ambiances, tablette et téléphone à activité visible unique par défaut, layouts par fenêtre, détachement multi-écran sur bureau, clavier et PWA ; cinq vues Chromium qualifiées | Revue humaine puis intégration du candidat D05 |
| Planification | Priorité, dates, échéances, PATCH propriétaire, Today/fuseaux | D06 : Gantt, calendrier, dépendances/jalons, Kanban et récurrences |
| Connaissances/graphes | Documents/chunks inspectables, relations canoniques et interfaces de graphe | D07 : édition ; D08 : mindmap 2D ; D09 : Mycelium 3D |
| Realtime/Desktop/voix | Scaffolds ou moteurs configurés | Parcours authentifiés, collaboration, permissions appareil et voix |
| Finance/Crypto/Home/Dev | Profils optionnels déclarés | Adaptateurs, policy, workspaces et parcours réels |

La présence de Three, Tauri, Yjs ou d'un moteur optionnel ne vaut pas une fonctionnalité livrée.
[ADR-029](decisions/ADR-029-server-personal-and-offline-clients.md) conserve serveur prioritaire
et clients PC/téléphone/tablette ; offline, synchronisation et packaging suivent le plan.

## Validation et décisions

Le code qualifié `61d7687…` passe 10/10 workflows CI, dont Research, Foundation et D04,
avec restauration sur deux VM. Le job LLM local optionnel est skipped conformément à
[ADR-031](decisions/ADR-031-api-first-pilot.md). La tête finale `2946df59664c01d77abc3b5720fff1dbbf96cb4c` passe aussi
10/10 workflows avant fusion de #88. Le commit de fusion est `db07f7a90cc406ddc80683521bbf1744e3a2b668`.
La présente mise à jour après fusion modifie uniquement la documentation.

API uniquement pour le pilote : autres fournisseurs, capacité commerciale et autres OS ne
conditionnent pas H5. Les clés restent côté serveur. Le candidat D05 ajoute les réglages
fournisseur/modèle d'instance avec test réel borné et activation après drainage ;
le BYOK par compte, les usages avancés et l'éventuel retour local gardent leurs lots du
[plan D01–D22](implementation-plan.md).

Les [archives opérateur](archive/d04-operator-history-2026-09-14.md) conservent les incidents ;
leurs anciennes prochaines actions ne doivent pas être exécutées.
