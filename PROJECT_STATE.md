# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-14. Lire `AGENTS.md` puis vérifier GitHub live.

## H5 clôturé ; D05 actif

| Champ | État attesté |
|---|---|
| Base main vérifiée | `1896468513f92ee5c0d6a811301a1b898cc6abd2` |
| D04 / H5 | D04 intégré par #88 ; tag `H5` sur `db07f7a90cc406ddc80683521bbf1744e3a2b668` |
| Nettoyage | `hardening/d04-real-engine-qualification` supprimée après vérification de sa tête fusionnée |
| CI | D05 : 10/10 workflows réussis sur `48210102a9814a30ef1c35f1245d693c126c5bd0` ; D04 : 10/10 réussis sur la tête testée `2946df59664c01d77abc3b5720fff1dbbf96cb4c` |
| Branche / PR active | `feat/d05-coherent-cockpit` · [PR #89](https://github.com/fredbuhr/nevolium/pull/89) · tête vérifiée `48210102a9814a30ef1c35f1245d693c126c5bd0` |
| Cible | Checkout serveur vérifié inchangé à `61d7687088dcbb002febd4c5f1a97f33edcb1269` |
| Prochaine action | Revue de #89, références visuelles Nevolium et qualification interactive/fournisseur explicitement autorisée ; ne pas intégrer ni déployer implicitement |

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

## D05 : livraison cohérente en cours

[Inspection datée](docs/archive/d05-entry-inspection-2026-09-14.md) : Dockview, layouts
propriétaires, panneaux métier, inspecteur documentaire, rôles administrateur, LiteLLM,
workflows, budgets et usages canoniques ont été réutilisés. Le
[checkpoint de livraison](docs/archive/d05-coherent-cockpit-progress-2026-09-14.md) décrit le
shell, le registre de modèle candidat, les preuves exécutées et les limites restantes.

La branche rassemble design partagé, navigation/recherche rapide/inspecteur, états et
accessibilité, layouts par appareil, PWA et réglages administrateur de l'API. Une configuration
candidate reçoit un alias immuable, passe un appel réel borné via le gateway canonique et doit
correspondre à l'identifiant de déploiement LiteLLM avant une activation récente et explicite.
Un démarrage Temporal indéterminé reprend le même test sans retransmettre la clé et les réponses de
validation ne la reflètent pas. La dernière configuration valide reste active lors d'un échec.
D06–D09 gardent planification,
édition et graphes ; aucun graphe 3D décoratif permanent n'entre dans D05.

Validations locales du commit fonctionnel réussies : compilation Python, TypeScript, build Web,
SQL Alembic hors ligne, contrats cockpit/PWA,
gateway/configuration modèle, dispatch, Assistant, News, Semantic Router et layouts. Les 10
workflows GitHub de `48210102…` réussissent, dont PostgreSQL réel, matrice Compose et contrôles de
non-régression D04. Le navigateur cloud refuse le serveur loopback local ; aucun contrôle
visuel interactif n'est revendiqué. Aucun test avec une nouvelle clé fournisseur ni déploiement
n'a été effectué.

Aucune image de référence n'existe dans les arbres Git inspectés. Les captures utilisateur
accessibles dans la conversation devront guider le langage visuel ; ne pas attribuer au dépôt
des références absentes.

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [Rapport D04](docs/archive/d04-pilot-qualification-2026-09-14.md)
