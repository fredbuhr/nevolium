# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 ouvert — défaut d’espace utile en 3D sur téléphone à corriger

| Champ | État attesté |
|---|---|
| Base vérifiée | Code produit `faef129a28b1d09c1644654eab754f00304f68e8` après fusion de #99. Release de production active `/opt/nevolium/releases/faef129a28b1d09c1644654eab754f00304f68e8` |
| Branche / PR | [PR #99](https://github.com/fredbuhr/nevolium/pull/99) fusionnée par squash dans `faef129…`. Aucune PR ouverte ni branche normale active ; ne pas réutiliser `fix/d09-display-menu` |
| Gate autorisé | Refondation acceptée, [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) complète ADR-033. DOC-01 et activation D09-REC-01 terminées ; **D09-UX actif**, affichage ordinateur accepté, défaut tactile ouvert, isolation multi-compte suspendue, D09 non accepté, D10 non commencé |
| Activation opérateur KISS | `ACTIVATION_WEB_KISS_REUSSIE`. Release active `/opt/nevolium/releases/1af538b53dfec6bb490625d7478330353e609599`, conteneur Web `f433360826fa…`, image `sha256:2610523a1e11…`. Index exact `05d8cf43d074…` vérifié dans le conteneur et via le port hôte. [Preuve](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705145471) |
| Stabilisation opérateur KISS | `STABILITE_TECHNIQUE_KISS_REUSSIE`. Quatre services attendus à `restarts=0`; PostgreSQL, NATS, Temporal et OpenBao sains ; Core live/ready/trust ; Web interne et HTTPS public sur l'empreinte exacte ; OIDC public valide ; santé privée `404` et API sans jeton `401`. [Preuve](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705206974) |
| Préparation correctif affichage | `PREPARATION_WEB_AFFICHAGE_REUSSIE`. Release `/opt/nevolium/releases/faef129a28b1d09c1644654eab754f00304f68e8`, image Web seule `nevolium-web:d09-faef129a28b1` → `sha256:4988736944b467575a190f5e88cd49c52ad2af8f6736bdf23ec38b37b34de2fe`, index `c87d7f218a81532e793b4b6c4314ee40e08b1a7a848335ec8c453b10916e4710`. Paramètres publics, signature du menu et HTTP isolé contrôlés ; production inchangée. [Preuve](https://github.com/fredbuhr/nevolium/pull/99#issuecomment-5705841271) |
| Activation correctif affichage | `ACTIVATION_WEB_AFFICHAGE_REUSSIE`. Conteneur `cb2ec77073ae…`, image `sha256:4988736944b4…`; index exact `c87d7f218a81…` vérifié dans le conteneur, sur le port hôte et en HTTPS public. OIDC public valide ; Core, Worker et Web-MCP inchangés à `restarts=0`. Retour automatique non déclenché. [Preuve](https://github.com/fredbuhr/nevolium/pull/99#issuecomment-5705888412) |
| Effets constatés | Préparation : construction de l'image Web candidate et suppression du conteneur isolé. Activation : recréation du seul Web et désignation atomique de la release. Aucune reconstruction pendant l'activation, migration, import, mutation métier ou traitement IA |
| Recette utilisateur ordinateur | Parcours initial confirmé. Après #99 : 3D par défaut, menu `Affichage` unique, commandes absentes dans les outils, retour à l'accueil et préférence 3D conservée — 4/4 acceptés par l'utilisateur. [Preuve](https://github.com/fredbuhr/nevolium/pull/99#issuecomment-5705974694) |
| Correctif intégré | #99 sépare les préférences spatiales par classe d'appareil, conserve la 3D par défaut ordinateur/tablette et la 2D téléphone, regroupe vue/réglages/personnalisation sous `Affichage · 2D/3D` et retire les commandes du DOM lorsque le cockpit est actif. Aucun changement Core ou données métier |
| Validation exacte | Tête PR `03c64ecb6e7204f10833a9c1ab32d5b67fc9bc71` : 8/8 workflows réussis. Qualification Chromium : accueil et personnalisation, desktop/tablette/téléphone, retour cockpit, FR/EN, préférences par appareil et absence de barre du bureau pendant l'outil. Captures générées relues ; pas de recette physique ni de production sur cette tête |
| Variantes ordinateur | Liste 2D complète et utilisable, préférence 2D conservée après rechargement, ambiance `Calme` correcte et retour à l'ambiance `Neurale` correct — 4/4 acceptés par l'utilisateur. [Preuve](https://github.com/fredbuhr/nevolium/pull/99#issuecomment-5706026326) |
| Recette téléphone réelle | Accueil 2D sans débordement, fiche tactile, menu 2D/3D et retour accueil : OK. Défaut bloquant : en 3D, le Mycelium est recouvert par trop d'éléments et n'est pas facilement utilisable. Recette arrêtée avant le second compte. [Preuve](https://github.com/fredbuhr/nevolium/pull/99#issuecomment-5706099020) |
| Prochaine action exécutable | Corriger uniquement la composition mobile 3D : masquer les informations redondantes, conserver une navigation compacte, présenter la fiche comme un panneau inférieur borné et laisser la majeure partie de la scène tactile libre. Ajouter une qualification Chromium dédiée avant toute nouvelle activation |
| Données : preuves antérieures, non relues pendant la bascule | Schéma `0018_editable_knowledge`. Corpus `mycelium-example-v1` déjà importé/relu : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations, 112 opérations. Après import : 12 projets, 69 tâches, 22 documents ; aucune activité non terminale/outbox/réservation active, 5 réservations historiques `uncertain`, 1 configuration modèle active. Ne pas imposer ces compteurs à une nouvelle mesure |
| Recette suivante dans la même gate | Après correctif, qualification et activation Web mobile : refaire le point 4 sur téléphone, puis utiliser un second compte pour vérifier l'isolation des épingles, dispositions et image personnelle |
| Limites | Activation et stabilisation techniques ≠ acceptation utilisateur. Les liens affichés restent explicites, sans enrichissement automatique. DATA-01/DIST-01 ouverts ; adoption des règles de données ≠ conformité attestée |
| Points de retour | Retour immédiat `nevolium-rollback-web:d09-1af538b5` → Web actif `sha256:2610523a1e11…`. Retour antérieur `nevolium-rollback-web:d09-702c2a3d` → `sha256:85cf94464781…`; images D05, tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2 à préserver. Aucune purge Docker, aucun retour aveugle à D05, aucune réimportation |
| Accès et autorisations | Aucun accès SSH direct de l'agent. L'activation opérateur est terminée ; la prochaine étape est une vérification fonctionnelle par l'utilisateur dans son navigateur |

Commencer par qualifier et corriger le défaut d'espace utile en 3D sur téléphone. Ne pas poursuivre
la recette multi-compte tant que le correctif mobile n'est pas qualifié et activé. Une capture peut être jointe si elle ne montre ni identité, contenu privé, jeton ni
secret. Le format tactile et le second compte suivent dans la même gate.

La [procédure de construction historique](docs/d09-kiss-desktop.md) reste une référence et ne doit
pas être rejouée. [Preuve pilote et digests complets](docs/d09-home-pilot-update.md).
La refondation et ses 24 critères restent dans [le contrat](docs/refoundation-contract.md) et
[le backlog](docs/refoundation-backlog.md) ; ils ne constituent pas des lots actifs parallèles.
Reprendre selon [development-workflow](docs/development-workflow.md). Aucun secret, PDF privé,
contrat signé ou registre nominatif dans le dépôt public.
