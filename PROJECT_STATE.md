# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 ouvert — correctif d’affichage intégré, activation à préparer

| Champ | État attesté |
|---|---|
| Base vérifiée | Main `faef129a28b1d09c1644654eab754f00304f68e8` après fusion de #99. La release KISS active reste `1af538b…`; le correctif n'est pas encore construit ni déployé |
| Branche / PR | [PR #99](https://github.com/fredbuhr/nevolium/pull/99) fusionnée par squash dans `faef129…`. Aucune PR ouverte ni branche normale active ; ne pas réutiliser `fix/d09-display-menu` |
| Gate autorisé | Refondation acceptée, [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) complète ADR-033. DOC-01 et activation D09-REC-01 terminées ; **D09-UX actif**, correctif #99 intégré mais non activé, D09 non accepté, D10 non commencé |
| Activation opérateur | `ACTIVATION_WEB_KISS_REUSSIE`. Release active `/opt/nevolium/releases/1af538b53dfec6bb490625d7478330353e609599`, conteneur Web `f433360826fa…`, image `sha256:2610523a1e11…`. Index exact `05d8cf43d074…` vérifié dans le conteneur et via le port hôte. [Preuve](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705145471) |
| Stabilisation opérateur | `STABILITE_TECHNIQUE_KISS_REUSSIE`. Quatre services attendus à `restarts=0`; PostgreSQL, NATS, Temporal et OpenBao sains ; Core live/ready/trust ; Web interne et HTTPS public sur l'empreinte exacte ; OIDC public valide ; santé privée `404` et API sans jeton `401`. [Preuve](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705206974) |
| Effets constatés | Uniquement recréation de `nevolium-web` avec l'image déjà contrôlée et désignation atomique de la release. Core, Worker et Web-MCP inchangés. Aucune construction d'image, migration, import, mutation métier ou traitement IA. Le retour automatique n'a pas été déclenché |
| Recette utilisateur ordinateur | Confirmés : Mycelium 3D centré, fiche immédiate, retour au contexte, Échap, persistance de personnalisation et FR/EN. Écarts : accueil initial observé en 2D ; commandes 2D/3D/réglages persistantes au-dessus des outils ; personnalisation séparée. Décision : une commande compacte `Affichage · 2D/3D` regroupe ces choix |
| Correctif intégré | #99 sépare les préférences spatiales par classe d'appareil, conserve la 3D par défaut ordinateur/tablette et la 2D téléphone, regroupe vue/réglages/personnalisation sous `Affichage · 2D/3D` et retire les commandes du DOM lorsque le cockpit est actif. Aucun changement Core ou données métier |
| Validation exacte | Tête PR `03c64ecb6e7204f10833a9c1ab32d5b67fc9bc71` : 8/8 workflows réussis. Qualification Chromium : accueil et personnalisation, desktop/tablette/téléphone, retour cockpit, FR/EN, préférences par appareil et absence de barre du bureau pendant l'outil. Captures générées relues ; pas de recette physique ni de production sur cette tête |
| Prochaine action exécutable | Préparer une nouvelle image **Web seule** depuis le main exact `faef129…`, avec les mêmes paramètres publics que la release active ; la contrôler isolément avant toute activation. Ne reconstruire ni Core, Worker ou Web-MCP ; aucune migration ni import |
| Données : preuves antérieures, non relues pendant la bascule | Schéma `0018_editable_knowledge`. Corpus `mycelium-example-v1` déjà importé/relu : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations, 112 opérations. Après import : 12 projets, 69 tâches, 22 documents ; aucune activité non terminale/outbox/réservation active, 5 réservations historiques `uncertain`, 1 configuration modèle active. Ne pas imposer ces compteurs à une nouvelle mesure |
| Recette suivante dans la même gate | Après merge et nouvelle activation Web contrôlée : revalider sur ordinateur les trois écarts corrigés, puis liste 2D, mode calme, téléphone ou tablette, et second compte pour l'isolation des épingles et de l'image personnelle |
| Limites | Activation et stabilisation techniques ≠ acceptation utilisateur. Les liens affichés restent explicites, sans enrichissement automatique. DATA-01/DIST-01 ouverts ; adoption des règles de données ≠ conformité attestée |
| Points de retour | Tag `nevolium-rollback-web:d09-702c2a3d` → ancien Web `sha256:85cf94464781…`, images D05, tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2 à préserver. Aucune purge Docker, aucun retour aveugle à D05, aucune réimportation |
| Accès et autorisations | Aucun accès SSH direct de l'agent. La prochaine construction/activation Web reste une étape opérateur séparée ; aucun effet serveur n'a été produit par #99 ou ce checkpoint |

Commencer par la recette sur ordinateur et arrêter au premier défaut important afin de le qualifier
avant d'empiler d'autres observations. Une capture peut être jointe si elle ne montre ni identité,
contenu privé, jeton ni secret. Le format tactile et le second compte suivent dans la même gate.

La [procédure de construction historique](docs/d09-kiss-desktop.md) reste une référence et ne doit
pas être rejouée. [Preuve pilote et digests complets](docs/d09-home-pilot-update.md).
La refondation et ses 24 critères restent dans [le contrat](docs/refoundation-contract.md) et
[le backlog](docs/refoundation-backlog.md) ; ils ne constituent pas des lots actifs parallèles.
Reprendre selon [development-workflow](docs/development-workflow.md). Aucun secret, PDF privé,
contrat signé ou registre nominatif dans le dépôt public.
