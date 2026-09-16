# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 ouvert — correctifs de recette ordinateur en cours

| Champ | État attesté |
|---|---|
| Base vérifiée | Main `23351d8b5ee21881b2a1af943628d78e96e955dd` relu avant le correctif. La release KISS active reste `1af538b…`; ce nouveau travail n'est pas encore déployé |
| Branche / PR | `fix/d09-display-menu`, [PR #99](https://github.com/fredbuhr/nevolium/pull/99), seule branche normale active. Base exacte `23351d8…` |
| Gate autorisé | Refondation acceptée, [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) complète ADR-033. DOC-01 et activation D09-REC-01 terminées ; **D09-UX actif**, D09 non accepté, D10 non commencé |
| Activation opérateur | `ACTIVATION_WEB_KISS_REUSSIE`. Release active `/opt/nevolium/releases/1af538b53dfec6bb490625d7478330353e609599`, conteneur Web `f433360826fa…`, image `sha256:2610523a1e11…`. Index exact `05d8cf43d074…` vérifié dans le conteneur et via le port hôte. [Preuve](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705145471) |
| Stabilisation opérateur | `STABILITE_TECHNIQUE_KISS_REUSSIE`. Quatre services attendus à `restarts=0`; PostgreSQL, NATS, Temporal et OpenBao sains ; Core live/ready/trust ; Web interne et HTTPS public sur l'empreinte exacte ; OIDC public valide ; santé privée `404` et API sans jeton `401`. [Preuve](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705206974) |
| Effets constatés | Uniquement recréation de `nevolium-web` avec l'image déjà contrôlée et désignation atomique de la release. Core, Worker et Web-MCP inchangés. Aucune construction d'image, migration, import, mutation métier ou traitement IA. Le retour automatique n'a pas été déclenché |
| Recette utilisateur ordinateur | Confirmés : Mycelium 3D centré, fiche immédiate, retour au contexte, Échap, persistance de personnalisation et FR/EN. Écarts : accueil initial observé en 2D ; commandes 2D/3D/réglages persistantes au-dessus des outils ; personnalisation séparée. Décision : une commande compacte `Affichage · 2D/3D` regroupe ces choix |
| Correctif proposé | #99 sépare les préférences spatiales par classe d'appareil, conserve la 3D par défaut ordinateur/tablette et la 2D téléphone, regroupe vue/réglages/personnalisation et retire les commandes du DOM lorsque le cockpit est actif. Aucun changement Core ou données métier |
| Prochaine action exécutable | Qualifier la tête finale de #99 : checks statiques et Chromium D09 sur bureau/tablette/téléphone, absence de barre du bureau au-dessus du cockpit, FR/EN et persistance par appareil. Corriger tout échec avant merge ; ne pas déployer cette branche |
| Données : preuves antérieures, non relues pendant la bascule | Schéma `0018_editable_knowledge`. Corpus `mycelium-example-v1` déjà importé/relu : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations, 112 opérations. Après import : 12 projets, 69 tâches, 22 documents ; aucune activité non terminale/outbox/réservation active, 5 réservations historiques `uncertain`, 1 configuration modèle active. Ne pas imposer ces compteurs à une nouvelle mesure |
| Recette suivante dans la même gate | Après merge et nouvelle activation Web contrôlée : revalider sur ordinateur les trois écarts corrigés, puis liste 2D, mode calme, téléphone ou tablette, et second compte pour l'isolation des épingles et de l'image personnelle |
| Limites | Activation et stabilisation techniques ≠ acceptation utilisateur. Les liens affichés restent explicites, sans enrichissement automatique. DATA-01/DIST-01 ouverts ; adoption des règles de données ≠ conformité attestée |
| Points de retour | Tag `nevolium-rollback-web:d09-702c2a3d` → ancien Web `sha256:85cf94464781…`, images D05, tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2 à préserver. Aucune purge Docker, aucun retour aveugle à D05, aucune réimportation |
| Accès et autorisations | Aucun accès SSH direct de l'agent. #99 ne construit ni n'active la production ; toute future activation reste une étape opérateur séparée après merge et qualification |

Commencer par la recette sur ordinateur et arrêter au premier défaut important afin de le qualifier
avant d'empiler d'autres observations. Une capture peut être jointe si elle ne montre ni identité,
contenu privé, jeton ni secret. Le format tactile et le second compte suivent dans la même gate.

La [procédure de construction historique](docs/d09-kiss-desktop.md) reste une référence et ne doit
pas être rejouée. [Preuve pilote et digests complets](docs/d09-home-pilot-update.md).
La refondation et ses 24 critères restent dans [le contrat](docs/refoundation-contract.md) et
[le backlog](docs/refoundation-backlog.md) ; ils ne constituent pas des lots actifs parallèles.
Reprendre selon [development-workflow](docs/development-workflow.md). Aucun secret, PDF privé,
contrat signé ou registre nominatif dans le dépôt public.
