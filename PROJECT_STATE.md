# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 ouvert — adoption de la refondation, réception KISS toujours nécessaire

| Champ | État attesté |
|---|---|
| Base vérifiée | Main `e03546a34e502dda00274d4eef5fbc532052a636` ; PR #97 déjà fusionnée. Aucune PR ouverte à l'entrée de ce travail |
| Branche / PR | `docs/d09-refoundation-adoption`, unique branche normale active, depuis cette base ; publication de DOC-01 en cours. Lire son checkpoint si main est antérieur |
| Gate autorisé | L'utilisateur accepte le dossier de refondation et demande de commencer. [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) précise ADR-033. DOC-01 est documentaire, rattaché à D09 ; D10 non commencé |
| Réalisé | Adoption des parcours manuels, trois contextes, missions, frontières consultation/traitement/transmission et critères de preuve ; [contrat](docs/refoundation-contract.md) et [24 critères de backlog](docs/refoundation-backlog.md) versionnés. Aucun changement applicatif dans ce travail |
| Validation | Documents en cours de contrôle ; aucune nouvelle qualification runtime ou appareil. Les preuves KISS de la tête `1af538b53dfec6bb490625d7478330353e609599` restent historiques et distinctes de cette PR documentaire |
| Prochaine action | Terminer DOC-01 : vérifier cohérence des documents, références et checks de la tête finale, ouvrir/relire la PR et enregistrer l'intégration. Ensuite seulement reprendre D09-REC-01, sans ouvrir D10 |
| Réception KISS en attente | Procédure [préparation Web](docs/d09-kiss-desktop.md#préparation-web-sur-le-serveur-après-intégration-de-la-pr) : cible `1af538b…`. Attendre les preuves opérateur `IMAGE_WEB_KISS_PREPAREE` et `PREPARATION_WEB_KISS_REUSSIE` avant de préparer l'activation adaptée ; ne pas reconstruire aveuglément une image déjà préparée |
| Production attestée | `/opt/nevolium/current` → `702c2a3de4b4bd2219e27bf12c5b5286624d4bd8`, schéma `0018_editable_knowledge`. Aucun nouveau déploiement attesté |
| Images actives | Core `454e44a27cc9…`, Web `85cf94464781…`, Worker `dcbc682b00ed…`, Web-MCP `125dc53d049c…`. Digests complets dans la [preuve pilote](docs/d09-home-pilot-update.md) |
| Corpus et données | `mycelium-example-v1` déjà importé/relu : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations, 112 opérations. Après import : 12 projets, 69 tâches, 22 documents. Aucune activité non terminale/outbox/réservation active ; 5 réservations historiques `uncertain` et 1 configuration modèle active conservées |
| Limites | KISS intégré ≠ installé ≠ accepté. Navigateur avec Core simulé distinct des contrats PostgreSQL ; fluidité/OIDC/usage sur appareils réels ouverts. Liens automatiques non actifs. Registres et règles de données prévus ne constituent pas une conformité attestée |
| Points de retour | Images D05, tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2 conservés. Aucune purge Docker, aucun retour aveugle à D05, aucune réimportation de démonstration |
| Accès et autorisations | Pas d'accès SSH direct établi ; opérations serveur par l'utilisateur avec commandes bornées. Adoption documentaire ≠ nouvelle autorisation d'activation ou d'effet externe. Les autorisations déjà enregistrées restent à appliquer à leur périmètre exact |
| Hygiène | Reset R0–R7 terminé. Ne pas réutiliser `fix/d09-kiss-desktop`, retirée du développement actif. Contrats signés, PDF privé, captures utilisateur, secrets et journaux sensibles hors dépôt public |

Preuves antérieures : [checkpoint pilote archivé](docs/archive/d09-pilot-checkpoint-2026-09-16.md),
[preuve pilote](docs/d09-home-pilot-update.md), [KISS et réception](docs/d09-kiss-desktop.md).
Le backlog ne constitue pas une liste de lots actifs. Le code, le live et la preuve opérateur
priment sur les résumés ; reprendre selon [development-workflow](docs/development-workflow.md).
