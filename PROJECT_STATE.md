# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 ouvert — image KISS existante, contrôle isolé avant bascule Web

| Champ | État attesté |
|---|---|
| Base vérifiée | Main `08ee8a097cd1536824f0a2dc2b5c7fd34cb316f4` relu avant ce checkpoint opérationnel. PR #98 fusionnée au commit `c8c41dbc5ff494b3b7f3573daa56337e589023f3` ; arbre `63b03610bc86369e4dc7a08568e8b832640935e3` qualifié. Aucun fichier applicatif modifié ici |
| Branche / PR | Aucune PR ouverte à cette reprise, aucune branche normale active. #97 et #98 intégrées ; branches `fix/d09-kiss-desktop` et `docs/d09-refoundation-adoption` retirées du développement actif, ne pas les réutiliser |
| Gate autorisé | Refondation acceptée, [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) complète ADR-033. DOC-01 terminé ; **D09-REC-01 actif**, D09 non accepté, D10 non commencé |
| Dernière preuve opérateur | `CONTROLE_RECEPTION_KISS_REUSSI` reçu : release `702c2a3…`, quatre services running sans restart, candidate KISS déjà présente. Aucun build/activation/import effectué par ce contrôle. [Sortie résumée et prochaine procédure](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5704768157) |
| Production confirmée | `/opt/nevolium/current` → `/opt/nevolium/releases/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8`, commit de la release identique. Core `454e44a27cc9…`, Web `85cf94464781…`, Worker `dcbc682b00ed…`, Web-MCP `125dc53d049c…` : mêmes IDs d'image attendus, restarts=0. Le contrôle ne qualifie pas toutes les santés/API |
| Checkout source confirmé | `/opt/nevolium/source` propre au commit `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`. Ce checkout historique est distinct de la release active ; ne pas faire de reset/pull de son arbre pour ce travail |
| Image candidate existante | Tag `nevolium-web:kiss-1af538b53dfe`, ID **`sha256:2610523a1e11a542b130ea4baabdd5ea24fc0566ae46bef35f659406ce98520c`**. Cible source qualifiée `1af538b53dfec6bb490625d7478330353e609599`. Présence attestée, contenu et démarrage non encore contrôlés sur le serveur ; ne pas reconstruire aveuglément |
| Prochaine action exécutable | Exécuter le [bloc de contrôle isolé de la candidate](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5704768157) dans la session SSH habituelle et recueillir toute la sortie. Attendu : serveur statique comparé, paramètres publics/signatures KISS présents, HTTP interne, retour préservé, conteneurs de production inchangés et `CONTROLE_IMAGE_KISS_REUSSI`. Aucune bascule dans ce bloc |
| Procédure préparée, pas exécutée | Candidat fixé par ID, worktree et ancêtre intégré vérifiés ; configuration validée sans afficher de secrets. Conteneur temporaire sans réseau de production/port publié/volume, lecture seule et ressources bornées ; suppression du seul conteneur de test. Le tag de retour Web `nevolium-rollback-web:d09-702c2a3d` est vérifié ou créé. Préservation à attester par l'opérateur |
| Validation de cette préparation | `bash -n` et `node --check` locaux réussis. Vérificateur Node sur fixture synthétique : positif, CSS antérieur, paramètre public manquant, entrée Web absente — 4/4 résultats attendus. Docker non disponible localement ; aucun test Docker/Netcup ou parcours navigateur exécuté par l'agent. Ce checkpoint ne réattribue pas les anciens succès CI au nouveau contrôle |
| Validation du code existant | #97, tête `1af538b…` : 8/8 workflows historiques, dont [UI 35131493038](https://github.com/fredbuhr/nevolium/actions/runs/35131493038). #98 documentaire, tête `9ae00e57…` : 8/8, dont [UI 35150084122](https://github.com/fredbuhr/nevolium/actions/runs/35150084122). [Revue DOC-01](https://github.com/fredbuhr/nevolium/pull/98#issuecomment-5704546025) |
| Données : preuves antérieures, non relues ici | Schéma `0018_editable_knowledge`. Corpus `mycelium-example-v1` déjà importé/relu : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations, 112 opérations. Après import : 12 projets, 69 tâches, 22 documents ; aucune activité non terminale/outbox/réservation active, 5 réservations historiques `uncertain`, 1 configuration modèle active. Ne pas imposer ces compteurs à une nouvelle mesure |
| Limites | Présence/signatures d'un bundle ≠ preuve reproductible de tous les octets du build. HTTP isolé ≠ OIDC réel ≠ acceptation appareil. KISS n'est pas encore activé. Liens automatiques non actifs. DATA-01/DIST-01 ouverts ; adoption des règles de données ≠ conformité attestée |
| Points de retour | Web actif `sha256:85cf94464781356b1aa96ca43c9fb01e62693455e04089f0e97fbe2906c7032a`, images D05, tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2 à préserver. Aucune purge Docker, aucun retour aveugle à D05, aucune réimportation. Disque : 556 Go disponibles selon la sortie reçue |
| Accès et autorisations | Aucun accès SSH direct de l'agent. Opérations serveur par l'utilisateur ; appliquer les autorisations déjà enregistrées à leur périmètre. Ce contrôle ne déclenche ni effets externes ni nouveau traitement IA |

Après réception de l'essai, préparer la bascule **Web seule** sur l'ID d'image contrôlé, avec
retour explicite et vérifications réelles. Ne pas réexécuter le bloc de construction historique
par défaut. En cas d'échec, conserver l'étape et l'état du nettoyage avant toute reprise.

La [procédure de construction historique](docs/d09-kiss-desktop.md) reste une référence, pas la
prochaine action pour cette image déjà présente. [Preuve pilote et digests complets](docs/d09-home-pilot-update.md).
La refondation et ses 24 critères restent dans [le contrat](docs/refoundation-contract.md) et
[le backlog](docs/refoundation-backlog.md) ; ils ne constituent pas des lots actifs parallèles.
Reprendre selon [development-workflow](docs/development-workflow.md). Aucun secret, PDF privé,
contrat signé ou registre nominatif dans le dépôt public.
