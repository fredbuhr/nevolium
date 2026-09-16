# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 ouvert — Web KISS stable, recette utilisateur réelle à effectuer

| Champ | État attesté |
|---|---|
| Base vérifiée | Main `1b32fb3bb0c49afeefe02eddd745e336d79ab370` relu avant ce checkpoint. La comparaison `702c2a3… → 1af538b…` confirme dix commits d'avance et aucun changement des quatre fichiers Compose ; seuls Web, tests et documentation sont concernés |
| Branche / PR | Aucune PR ouverte à cette reprise, aucune branche normale active. #97 et #98 intégrées ; branches `fix/d09-kiss-desktop` et `docs/d09-refoundation-adoption` retirées du développement actif, ne pas les réutiliser |
| Gate autorisé | Refondation acceptée, [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) complète ADR-033. DOC-01 terminé ; **D09-REC-01 actif**, D09 non accepté, D10 non commencé |
| Activation opérateur | `ACTIVATION_WEB_KISS_REUSSIE`. Release active `/opt/nevolium/releases/1af538b53dfec6bb490625d7478330353e609599`, conteneur Web `f433360826fa…`, image `sha256:2610523a1e11…`. Index exact `05d8cf43d074…` vérifié dans le conteneur et via le port hôte. [Preuve](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705145471) |
| Stabilisation opérateur | `STABILITE_TECHNIQUE_KISS_REUSSIE`. Quatre services attendus à `restarts=0`; PostgreSQL, NATS, Temporal et OpenBao sains ; Core live/ready/trust ; Web interne et HTTPS public sur l'empreinte exacte ; OIDC public valide ; santé privée `404` et API sans jeton `401`. [Preuve](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705206974) |
| Effets constatés | Uniquement recréation de `nevolium-web` avec l'image déjà contrôlée et désignation atomique de la release. Core, Worker et Web-MCP inchangés. Aucune construction d'image, migration, import, mutation métier ou traitement IA. Le retour automatique n'a pas été déclenché |
| Prochaine action exécutable | Ouvrir `https://app.nevolium.com` sur ordinateur après rechargement forcé et réaliser le premier parcours KISS : connexion, accueil transparent/lisible, sélection d'objets et relations, déplacement de caméra, ouverture d'un outil puis retour au même contexte, couleur/image persistantes, FR/EN et clavier. Rapporter chaque écart avec action, attendu et observé |
| Données : preuves antérieures, non relues pendant la bascule | Schéma `0018_editable_knowledge`. Corpus `mycelium-example-v1` déjà importé/relu : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations, 112 opérations. Après import : 12 projets, 69 tâches, 22 documents ; aucune activité non terminale/outbox/réservation active, 5 réservations historiques `uncertain`, 1 configuration modèle active. Ne pas imposer ces compteurs à une nouvelle mesure |
| Recette suivante dans la même gate | Après l'ordinateur : liste 2D, mode calme, téléphone ou tablette, puis second compte de test pour vérifier que les épingles et l'image personnelle du premier compte ne sont pas visibles |
| Limites | Activation et stabilisation techniques ≠ acceptation utilisateur. Les liens affichés restent explicites, sans enrichissement automatique. DATA-01/DIST-01 ouverts ; adoption des règles de données ≠ conformité attestée |
| Points de retour | Tag `nevolium-rollback-web:d09-702c2a3d` → ancien Web `sha256:85cf94464781…`, images D05, tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2 à préserver. Aucune purge Docker, aucun retour aveugle à D05, aucune réimportation |
| Accès et autorisations | Aucun accès SSH direct de l'agent. La prochaine action est une recette utilisateur, sans commande serveur ni effet externe supplémentaire |

Commencer par la recette sur ordinateur et arrêter au premier défaut important afin de le qualifier
avant d'empiler d'autres observations. Une capture peut être jointe si elle ne montre ni identité,
contenu privé, jeton ni secret. Le format tactile et le second compte suivent dans la même gate.

La [procédure de construction historique](docs/d09-kiss-desktop.md) reste une référence et ne doit
pas être rejouée. [Preuve pilote et digests complets](docs/d09-home-pilot-update.md).
La refondation et ses 24 critères restent dans [le contrat](docs/refoundation-contract.md) et
[le backlog](docs/refoundation-backlog.md) ; ils ne constituent pas des lots actifs parallèles.
Reprendre selon [development-workflow](docs/development-workflow.md). Aucun secret, PDF privé,
contrat signé ou registre nominatif dans le dépôt public.
