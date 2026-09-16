# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 ouvert — image KISS contrôlée, bascule Web bornée à exécuter

| Champ | État attesté |
|---|---|
| Base vérifiée | Main `960af24af3837554d7c127f7a8bb1f2f50bb70eb` relu avant ce checkpoint. La comparaison `702c2a3… → 1af538b…` confirme dix commits d'avance et aucun changement des quatre fichiers Compose ; seuls Web, tests et documentation sont concernés. Aucun fichier applicatif modifié par ce checkpoint |
| Branche / PR | Aucune PR ouverte à cette reprise, aucune branche normale active. #97 et #98 intégrées ; branches `fix/d09-kiss-desktop` et `docs/d09-refoundation-adoption` retirées du développement actif, ne pas les réutiliser |
| Gate autorisé | Refondation acceptée, [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) complète ADR-033. DOC-01 terminé ; **D09-REC-01 actif**, D09 non accepté, D10 non commencé |
| Dernière preuve opérateur | `CONTROLE_IMAGE_KISS_REUSSI` reçu. Serveur statique identique à la release, paramètres publics et signatures KISS présents, HTTP isolé réussi, retour préservé, conteneur d'essai supprimé et production inchangée. Aucune construction, activation, migration ou import. [Preuve résumée](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5704928323) |
| Production confirmée | `/opt/nevolium/current` → `/opt/nevolium/releases/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8`. Core `454e44a27cc9…`, Web `85cf94464781…`, Worker `dcbc682b00ed…`, Web-MCP `125dc53d049c…` : production strictement inchangée pendant l'essai |
| Checkout source confirmé | `/opt/nevolium/source` propre au commit `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`. Ce checkout historique est distinct de la release active ; ne pas faire de reset/pull de son arbre pour ce travail |
| Image candidate contrôlée | Tag `nevolium-web:kiss-1af538b53dfe`, ID **`sha256:2610523a1e11a542b130ea4baabdd5ea24fc0566ae46bef35f659406ce98520c`**. Serveur `e1587a041752…`, index `05d8cf43d074…`, deux entrées Web servies. Cible source qualifiée `1af538b53dfec6bb490625d7478330353e609599` |
| Prochaine action exécutable | Exécuter une seule fois la [bascule Web bornée](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5704990976) dans la session SSH habituelle et transmettre toute la sortie. Succès attendu : `ACTIVATION_WEB_KISS_REUSSIE`. En cas d'interruption, ne pas relancer avant d'avoir vérifié le marqueur de retour automatique |
| Procédure préparée, pas exécutée | Recréation de `nevolium-web` uniquement avec `--no-deps --no-build --pull never`; digest et empreinte exacts vérifiés dans le conteneur et via le port hôte ; Core, Worker et Web-MCP figés par ID/image/démarrage/restarts ; release désignée atomiquement après succès. Toute sortie non nulle après le début tente de restaurer l'ancien Web et l'ancien lien `current` |
| Validation de la procédure | `bash -n` réussi ; SHA-256 du bloc `87b56e9d0d52699786886e9a8e32aa9889dc77dd37d41c09cd30e5ceaa75c413`. ShellCheck absent localement ; Docker/Netcup non exécuté par l'agent. La sortie opérateur reste la preuve de l'activation et du rollback éventuel |
| Validation du code existant | #97, tête `1af538b…` : 8/8 workflows historiques, dont [UI 35131493038](https://github.com/fredbuhr/nevolium/actions/runs/35131493038). #98 documentaire, tête `9ae00e57…` : 8/8, dont [UI 35150084122](https://github.com/fredbuhr/nevolium/actions/runs/35150084122). [Revue DOC-01](https://github.com/fredbuhr/nevolium/pull/98#issuecomment-5704546025) |
| Données : preuves antérieures, non relues ici | Schéma `0018_editable_knowledge`. Corpus `mycelium-example-v1` déjà importé/relu : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations, 112 opérations. Après import : 12 projets, 69 tâches, 22 documents ; aucune activité non terminale/outbox/réservation active, 5 réservations historiques `uncertain`, 1 configuration modèle active. Ne pas imposer ces compteurs à une nouvelle mesure |
| Limites | Image/HTTP isolé ≠ OIDC réel ≠ ingress public ≠ acceptation appareil. Après activation technique, les parcours réels FR/EN, retour au contexte, fond personnel, 2D/tactile et isolation de deux comptes restent à faire. Liens automatiques non actifs. DATA-01/DIST-01 ouverts |
| Points de retour | Web actif `sha256:85cf94464781356b1aa96ca43c9fb01e62693455e04089f0e97fbe2906c7032a` et tag `nevolium-rollback-web:d09-702c2a3d`, images D05, tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2 à préserver. Aucune purge Docker, aucun retour aveugle à D05, aucune réimportation |
| Accès et autorisations | Aucun accès SSH direct de l'agent. Opérations serveur par l'utilisateur ; l'activation autorisée reste strictement Web. Aucun traitement IA, migration, import ou mutation des données dans cette gate |

Après la sortie d'activation, contrôler immédiatement le navigateur réel et distinguer : image active,
ingress/OIDC fonctionnels, puis acceptation utilisateur. D09 reste ouvert tant que les parcours KISS
sur ordinateur et au moins un format tactile ne sont pas observés ; D10 ne commence pas.

La [procédure de construction historique](docs/d09-kiss-desktop.md) reste une référence et ne doit
pas être rejouée pour cette image déjà contrôlée. [Preuve pilote et digests complets](docs/d09-home-pilot-update.md).
La refondation et ses 24 critères restent dans [le contrat](docs/refoundation-contract.md) et
[le backlog](docs/refoundation-backlog.md) ; ils ne constituent pas des lots actifs parallèles.
Reprendre selon [development-workflow](docs/development-workflow.md). Aucun secret, PDF privé,
contrat signé ou registre nominatif dans le dépôt public.
