# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-14. Lire `AGENTS.md`, puis vérifier GitHub live.

## H5 clôturé ; D05 actif

| Champ | État attesté |
|---|---|
| Base main vérifiée | `1896468513f92ee5c0d6a811301a1b898cc6abd2` |
| D04 / H5 | #88 intégrée ; `H5` vise `db07f7a90cc406ddc80683521bbf1744e3a2b668` ; branche D04 fusionnée supprimée |
| Branche / PR unique | `feat/d05-coherent-cockpit` · [PR #89](https://github.com/fredbuhr/nevolium/pull/89) ; relire sa tête live |
| Dernière preuve complète avant cette reprise visuelle | `b122a09d499506797735cbb121f6d5a3326fcf3c` : 10/10 workflows réussis, revérifiés depuis GitHub |
| Reprise active | Matière organique : filaments ramifiés, membranes bioluminescentes, paysage nocturne, logo affiné et adaptation responsive ; [note et preuves](docs/archive/d05-organic-material-2026-09-14.md) |
| Qualification de cette reprise | Contrôles locaux réussis ; contrôles exact-head et artefacts Chromium suivis dans la PR, à relire avant toute intégration |
| Production | Dernier checkout attesté `61d7687088dcbb002febd4c5f1a97f33edcb1269` ; aucun accès serveur, conteneur ni déploiement pendant cette reprise |
| Prochaine action | Relire les captures réelles de la tête PR avec l'utilisateur ; ne pas considérer le design accepté sur la seule base de tests verts |

## Livraison D05 et limites

La [livraison fonctionnelle](docs/archive/d05-coherent-cockpit-progress-2026-09-14.md) réutilise
Dockview, layouts propriétaires/appareil/fenêtre, inspecteur, recherche rapide, PWA, rôles,
LiteLLM, workflows, budgets et usages canoniques. L'accueil ouvre six espaces réellement présents,
sans inventer de liens métier. Le cockpit reste l'espace de travail modulable, détachable sur
bureau et à activité unique par défaut sur tablette/téléphone. Aucun WebGL n'est requis.

La [charte d'identité](docs/identite-nevolium.md) reste la référence éditoriale. Les nouvelles
références utilisateur corrigent un écart réel : les versions précédentes restaient trop
géométriques. La matière est maintenant décrite dans le [contrat visuel](docs/design-mycelium.md).
Les captures de test doivent être distinguées des images d'inspiration ou des textures générées.
Le design n'est pas encore accepté par l'utilisateur ; D05 n'est ni clos, ni fusionné, ni déployé.

Le réglage administrateur conserve les clés côté serveur, un test candidat borné, une activation
explicite et la dernière configuration valide en cas d'échec. Le vrai parcours OIDC/PKCE et les
réponses `401/200/403` ont été qualifiés séparément. Les tests responsive utilisent des API
déterministes : ils ne prouvent aucune compatibilité fournisseur. Aucun nouvel essai fournisseur
réel n'a été effectué ; celui choisi reste à vérifier avant la clôture D05. Gantt/calendrier,
édition, mindmap et Mycelium 3D restent en D06–D09.

## Exploitation à préserver

Le [rapport D04](docs/archive/d04-pilot-qualification-2026-09-14.md) conserve les preuves et
leurs limites : deux Research OpenAI, 3 333 lectures / concurrence 20 / zéro erreur, charge mixte
et rollback, deux snapshots Restic B2 chiffrés relus et restauration de quatre magasins sur volumes
neufs dans un Compose isolé du même serveur. Une restauration entre VM est prouvée séparément en
CI. Aucune sauvegarde automatique attestée.

- Pilote API uniquement : LiteLLM `smart`, `openai/gpt-4.1`, sortie maximale 4096 (ADR-031).
- Préserver snapshots B2, images de rollback et cinq réservations historiques uncertain.
- Ne relancer ni Ollama, ni ancienne Task, ni campagne de qualification D04 en production.
- Schéma attesté `0014_capacity_and_data` ; comptes `52|52|25|30|16|39|5`, travaux/outbox `0|0|0|0`.
- Un changement de checkout ne vaut jamais une mise à jour des conteneurs.

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md)
