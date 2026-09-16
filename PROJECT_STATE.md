# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 ouvert — Web KISS actif, stabilisation et recette réelle

| Champ | État attesté |
|---|---|
| Base vérifiée | Main `1785aa3196a795487200fd5cae0e6405965fed75` relu avant ce checkpoint. La comparaison `702c2a3… → 1af538b…` confirme dix commits d'avance et aucun changement des quatre fichiers Compose ; seuls Web, tests et documentation sont concernés |
| Branche / PR | Aucune PR ouverte à cette reprise, aucune branche normale active. #97 et #98 intégrées ; branches `fix/d09-kiss-desktop` et `docs/d09-refoundation-adoption` retirées du développement actif, ne pas les réutiliser |
| Gate autorisé | Refondation acceptée, [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) complète ADR-033. DOC-01 terminé ; **D09-REC-01 actif**, D09 non accepté, D10 non commencé |
| Activation opérateur | `ACTIVATION_WEB_KISS_REUSSIE` reçue. Release active `/opt/nevolium/releases/1af538b53dfec6bb490625d7478330353e609599`, conteneur Web `f433360826fa…`, image `sha256:2610523a1e11…`. Index exact `05d8cf43d074…` vérifié dans le conteneur et via `127.0.0.1:5173`. [Preuve complète](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705145471) |
| Services non Web | Core `454e44a27cc9…`, Worker `dcbc682b00ed…`, Web-MCP `125dc53d049c…` strictement inchangés pendant la bascule. Le script a comparé IDs de conteneur, images, dates de démarrage et nombres de restart avant/après |
| Effets de la bascule | Uniquement recréation de `nevolium-web` avec l'image déjà contrôlée et désignation atomique de la release. Aucune construction d'image, migration, import, mutation métier ou traitement IA. Le retour automatique n'a pas été déclenché |
| Prochaine action exécutable | Exécuter une fois le [contrôle de stabilisation en lecture seule](https://github.com/fredbuhr/nevolium/pull/97#issuecomment-5705179937) et transmettre toute la sortie. Succès attendu : `STABILITE_TECHNIQUE_KISS_REUSSIE`. Ensuite effectuer la recette KISS réelle dans le navigateur ; ne pas commencer D10 |
| Contrôle préparé, pas exécuté | Vérifie release/conteneur exacts, quatre images sans restart, santés PostgreSQL/NATS/Temporal/OpenBao, Core live/ready/trust, empreinte Web interne et HTTPS, découverte OIDC, refus public de `/health` et API sans jeton. Aucune écriture ni rollback |
| Validation du contrôle | `bash -n` réussi ; SHA-256 `5a7d2bb1f1a537cb3eaf072f4590f0833db51ed2165aa6d53d0847553f52af62`. Docker/Netcup non exécuté par l'agent ; la sortie opérateur reste nécessaire |
| Validation du code existant | #97, tête `1af538b…` : 8/8 workflows historiques, dont [UI 35131493038](https://github.com/fredbuhr/nevolium/actions/runs/35131493038). #98 documentaire, tête `9ae00e57…` : 8/8, dont [UI 35150084122](https://github.com/fredbuhr/nevolium/actions/runs/35150084122) |
| Données : preuves antérieures, non relues ici | Schéma `0018_editable_knowledge`. Corpus `mycelium-example-v1` déjà importé/relu : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations, 112 opérations. Après import : 12 projets, 69 tâches, 22 documents ; aucune activité non terminale/outbox/réservation active, 5 réservations historiques `uncertain`, 1 configuration modèle active. Ne pas imposer ces compteurs à une nouvelle mesure |
| Recette utilisateur restante | Connexion OIDC réelle ; transparence/lisibilité du bureau ; sélection d'un projet, idée, source et fichier ; conservation sélection/caméra au retour d'un outil ; couleur puis image personnelle persistantes ; FR/EN ; clavier/Échap ; liste 2D, mode calme et tactile ; isolation entre deux comptes |
| Limites | Activation technique immédiate ≠ stabilité ≠ acceptation utilisateur. Les liens affichés restent explicites, sans enrichissement automatique. DATA-01/DIST-01 ouverts ; adoption des règles de données ≠ conformité attestée |
| Points de retour | Tag `nevolium-rollback-web:d09-702c2a3d` → ancien Web `sha256:85cf94464781…`, images D05, tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2 à préserver. Aucune purge Docker, aucun retour aveugle à D05, aucune réimportation |
| Accès et autorisations | Aucun accès SSH direct de l'agent. Opérations serveur par l'utilisateur. Aucun élargissement d'autorité, traitement externe ou mutation des données dans cette gate |

Après stabilisation, faire d'abord la recette sur ordinateur. Un format tactile et le second compte
peuvent suivre dans la même gate, sans développement parallèle. Toute anomalie doit être décrite avec
l'écran, l'action, le résultat attendu/observé et, si utile, une capture sans information privée.

La [procédure de construction historique](docs/d09-kiss-desktop.md) reste une référence et ne doit
pas être rejouée. [Preuve pilote et digests complets](docs/d09-home-pilot-update.md).
La refondation et ses 24 critères restent dans [le contrat](docs/refoundation-contract.md) et
[le backlog](docs/refoundation-backlog.md) ; ils ne constituent pas des lots actifs parallèles.
Reprendre selon [development-workflow](docs/development-workflow.md). Aucun secret, PDF privé,
contrat signé ou registre nominatif dans le dépôt public.
