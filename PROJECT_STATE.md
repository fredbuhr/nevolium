# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-14. Lire `AGENTS.md` puis vérifier GitHub live.

## H5 clôturé ; passage à D05 autorisé

| Champ | État attesté |
|---|---|
| Base main vérifiée | `021bd58614e3294da5545765540d9d1c43419bea` |
| D04 / H5 | D04 intégré par #88 ; tag `H5` sur `db07f7a90cc406ddc80683521bbf1744e3a2b668` |
| Nettoyage | `hardening/d04-real-engine-qualification` supprimée après vérification de sa tête fusionnée |
| CI | 8/8 workflows exécutés réussis sur `021bd58614e3294da5545765540d9d1c43419bea` ; 10/10 réussis sur la tête D04 testée `2946df59664c01d77abc3b5720fff1dbbf96cb4c` |
| Branche / PR active | Aucune au moment de cette clôture ; créer une seule branche D05 depuis le présent checkpoint |
| Cible | Checkout serveur vérifié inchangé à `61d7687088dcbb002febd4c5f1a97f33edcb1269` |
| Prochaine action | Créer `feat/d05-coherent-cockpit`, enregistrer ce nom dans son checkpoint puis implémenter D05 en une livraison cohérente |

La sortie opérateur `H5_OK`, l'absence de la branche D04 et la cible du tag ont été
revérifiées depuis GitHub. Aucun checkout, conteneur ou service de production n'a été modifié.
Le dépôt serveur reste volontairement sur son code qualifié ; une mise à jour de checkout ne
constituerait pas un déploiement.

## Preuves et exploitation à préserver

Le [rapport final D04](docs/archive/d04-pilot-qualification-2026-09-14.md) conserve les quatre
preuves et leurs limites : deux Research OpenAI, 3 333 lectures avec concurrence 20 et zéro erreur,
charge mixte et rollback Worker, deux snapshots Restic B2 chiffrés relus et restauration de
PostgreSQL, JetStream, SeaweedFS et OpenBao dans un Compose isolé du même serveur.
La restauration entre deux VM est une preuve CI distincte. Aucune sauvegarde automatique attestée.

- Pilote API : LiteLLM `smart`, `openai/gpt-4.1`, sortie maximale 4096 (ADR-031).
- Schéma `0014_capacity_and_data` ; comptes `52|52|25|30|16|39|5`, travaux/outbox `0|0|0|0`.
- Conserver les cinq réservations historiques uncertain, snapshots B2 et images de rollback.
- Ne relancer ni Ollama, ni ancienne Task, ni campagne D04.
- Clés exclusivement côté serveur ; aucun secret ou jeton dans Git ou les sorties.
- Images attestées : Core `69453e7b1348…`, Worker `cb9b73de908…`, Web MCP `fcfba65ffada…`.

## D05 : inspection réalisée, implémentation à commencer

[Inspection datée](docs/archive/d05-entry-inspection-2026-09-14.md) : Dockview, layouts
propriétaires, panneaux métier, inspecteur documentaire, rôles administrateur, LiteLLM,
workflows, budgets et usages canoniques existent et doivent être réutilisés.

Livrer ensemble le design partagé, la navigation/recherche rapide/l'inspecteur, les états et
l'accessibilité, les layouts par appareil, la PWA et les réglages administrateur de l'API.
Le fournisseur sélectionné doit réussir un test réel borné avant bascule ; un échec conserve
la dernière configuration valide et ne révèle aucune clé. D06–D09 gardent planification,
édition et graphes. Aucun graphe 3D décoratif permanent dans D05.

Aucune image de référence n'existe dans les arbres Git inspectés. Les captures utilisateur
accessibles dans la conversation devront guider le langage visuel ; ne pas attribuer au dépôt
des références absentes.

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [Rapport D04](docs/archive/d04-pilot-qualification-2026-09-14.md)
