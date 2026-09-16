# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 actif — bureau Mycelium transparent et simplicité KISS

| Champ | État attesté |
|---|---|
| Base vérifiée | Main `0aa4908ce0d2deed88ca8060e89a4afe6f9881d9`, arbre `5caa1062f5032487eced0ea188c80bf9d796ded4` ; GitHub live vérifié le 16 septembre |
| Branche / PR | Une branche active : `fix/d09-kiss-desktop`, fraîche depuis main. [PR #97](https://github.com/fredbuhr/nevolium/pull/97) en brouillon ; code publié `346461d62d26847f15077762309b3956388f684e`, dernier correctif téléphone en qualification. #96 est fusionnée ; ancienne branche retirée du développement actif |
| Gate autorisé | L'utilisateur a accepté le bilan KISS et demandé de commencer avec reprise fiable entre discussions. D09 : bureau transparent, fond choisi, fiche/liens et retour au contexte. [ADR-033](docs/decisions/ADR-033-kiss-contextual-mycelium.md) ; D10 planifié, non commencé |
| Réalisé dans ce gate | Mémoire produit, décision acceptée, séquencement corrigé, preuves pilote archivées ; bureau transparent, fond privé persistant, réglages en dialogue, fiche avec relations immédiates et retour outil conservant la scène implémentés ; qualification en cours |
| Validation du gate | Contrat modèle accueil et TypeScript/build locaux réussis. Chromium local ne démarre pas (SIGTRAP environnement) ; CI `346461d` : 7/8 workflows verts ; D06/D07/D08/spatial passent. Accueil desktop/tablette complet ; le téléphone révèle une fiche couvrant Accueil (corrigée en flux). Un ancien test D05 visait le décor 2D supprimé ; il vérifie maintenant le mouvement réduit du renderer partagé. Nouvelle tête à qualifier |
| Prochaine action | Inspecter les checks de la tête live de #97, corriger toute régression, examiner les captures desktop/tablette/téléphone ; mettre à jour ce checkpoint avant intégration |
| Production attestée | `/opt/nevolium/current` → release `702c2a3de4b4bd2219e27bf12c5b5286624d4bd8`, schéma `0018_editable_knowledge` ; aucun déploiement du nouveau gate |
| Images actives | Core `454e44a27cc9…`, Web `85cf94464781…` ; Worker `dcbc682b00ed…` et Web-MCP `125dc53d049c…` conservés. Digests complets dans [preuve pilote](docs/d09-home-pilot-update.md) |
| Corpus déjà importé | `mycelium-example-v1` : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations ; journal 112 opérations, double relecture API. Aucun appel IA ni tâche exécutée. Ne pas réimporter aveuglément |
| Données après import | 12 projets, 69 tâches, 22 documents ; aucune activité non terminale/outbox/réservation active. 5 réservations historiques `uncertain` conservées ; 1 configuration modèle active |
| Stabilité connue | Core/Web sans restart après 8 minutes, infrastructure healthy, Core et Web 200, API sans jeton 401. Preuve technique, pas acceptation produit |
| Points de retour | Préserver images D05 et tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2. Aucune purge Docker. Les données écrites depuis migration interdisent un retour aveugle à D05 |
| Limites | Tests navigateur avec API simulée distincts des contrats PostgreSQL. Fluidité et acceptation sur appareils réels encore ouvertes. Extraction automatique des liens non active ; corpus prérelié |
| Autorisations / accès | Publication, intégration et activation déjà autorisées ; nouveau chantier KISS explicitement autorisé. Aucun accès SSH direct établi : opérations serveur par l'utilisateur avec commandes bornées |
| Hygiène | Reset R0–R7 terminé (roadmap) ; aucune PR ouverte au démarrage du gate. Une seule branche normale active. Aucun secret ou jeton dans le dépôt |

Historique complet : [checkpoint pilote archivé](docs/archive/d09-pilot-checkpoint-2026-09-16.md),
[preuve/procédure pilote](docs/d09-home-pilot-update.md), [bilan KISS](docs/archive/nevolium-kiss-bilan-2026-09-16.md), [bureau KISS et acceptation](docs/d09-kiss-desktop.md).
Le code et les checks live priment. Si ce checkpoint main précède une PR ouverte, lire le checkpoint
sur cette PR avant toute création de branche. [Protocole de reprise](docs/development-workflow.md).
