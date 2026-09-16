# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 actif — code KISS intégré, préparation du Web puis acceptation pilote

| Champ | État attesté |
|---|---|
| Base vérifiée | Main après intégration `9a56ffe5d11c054ab5be6ef7af38f0df31759b0a`, arbre `186a80cb9423ef2420c382a94b2741e993e78565` identique à la tête qualifiée ; ce checkpoint n'ajoute que de la documentation |
| Branche / PR | [PR #97](https://github.com/fredbuhr/nevolium/pull/97) fusionnée. `fix/d09-kiss-desktop` retirée du développement actif ; ne pas la réutiliser. Aucune branche normale active. #96 reste intégrée |
| Gate autorisé | L'utilisateur a accepté le bilan KISS et demandé de commencer avec reprise fiable entre discussions. D09 : bureau transparent, fond choisi, fiche/liens et retour au contexte. [ADR-033](docs/decisions/ADR-033-kiss-contextual-mycelium.md) ; D10 planifié, non commencé |
| Réalisé dans ce gate | Mémoire produit, décision acceptée, séquencement corrigé et preuves archivées ; bureau transparent, fond privé persistant, réglages en dialogue, fiche avec relations immédiates et retour outil conservant la scène intégrés. Cadrage portrait corrigé ; panneau téléphone accessible sans recouvrir les commandes |
| Validation du code | Tête `1af538b53dfec6bb490625d7478330353e609599` : **8/8 workflows réussis**, dont [UI 35131493038](https://github.com/fredbuhr/nevolium/actions/runs/35131493038), contrats PostgreSQL et régressions D05–D09. 9 captures finales revues ; arbre de merge revérifié. Contrat modèle et TypeScript/build locaux réussis ; Chromium local indisponible (SIGTRAP avant chargement). [Preuves et limites](docs/d09-kiss-desktop.md#qualification) |
| Prochaine action exécutable | Faire exécuter le [bloc de préparation Web](docs/d09-kiss-desktop.md#préparation-web-sur-le-serveur-après-intégration-de-la-pr) par l'utilisateur : release `1af538b…`, image Web isolée, préservation du retour. Obtenir `IMAGE_WEB_KISS_PREPAREE` avec son digest et `PREPARATION_WEB_KISS_REUSSIE`, puis préparer l'activation Web seule sur ces preuves. Aucun nouveau build ou import du corpus aveugle |
| Production attestée | `/opt/nevolium/current` → release `702c2a3de4b4bd2219e27bf12c5b5286624d4bd8`, schéma `0018_editable_knowledge` ; aucun déploiement du nouveau gate |
| Images actives | Core `454e44a27cc9…`, Web `85cf94464781…` ; Worker `dcbc682b00ed…` et Web-MCP `125dc53d049c…` conservés. Digests complets dans [preuve pilote](docs/d09-home-pilot-update.md) |
| Corpus déjà importé | `mycelium-example-v1` : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations ; journal 112 opérations, double relecture API. Aucun appel IA ni tâche exécutée. Ne pas réimporter aveuglément |
| Données après import | 12 projets, 69 tâches, 22 documents ; aucune activité non terminale/outbox/réservation active. 5 réservations historiques `uncertain` conservées ; 1 configuration modèle active |
| Stabilité connue | Core/Web sans restart après 8 minutes, infrastructure healthy, Core et Web 200, API sans jeton 401. Preuve technique, pas acceptation produit |
| Points de retour | Préserver images D05 et tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2. Aucune purge Docker. Les données écrites depuis migration interdisent un retour aveugle à D05 |
| Limites | Tests navigateur avec API simulée distincts des contrats PostgreSQL. Fluidité et acceptation sur appareils réels encore ouvertes. Extraction automatique des liens non active ; corpus prérelié |
| Autorisations / accès | Publication, intégration et activation déjà autorisées ; nouveau chantier KISS explicitement autorisé. Aucun accès SSH direct établi : opérations serveur par l'utilisateur avec commandes bornées |
| Hygiène | Reset R0–R7 terminé ; lot de code fusionné et branche retirée du développement actif. Le connecteur n'expose pas la suppression de la référence distante ; son existence éventuelle ne signifie pas travail actif. Aucun secret ou jeton dans le dépôt |

Historique complet : [checkpoint pilote archivé](docs/archive/d09-pilot-checkpoint-2026-09-16.md),
[preuve/procédure pilote](docs/d09-home-pilot-update.md), [bilan KISS](docs/archive/nevolium-kiss-bilan-2026-09-16.md), [bureau KISS et acceptation](docs/d09-kiss-desktop.md).
Le code et les checks live priment. Si ce checkpoint main précède une PR ouverte, lire le checkpoint
sur cette PR avant toute création de branche. [Protocole de reprise](docs/development-workflow.md).
