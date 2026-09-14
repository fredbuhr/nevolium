# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-14. Lire `AGENTS.md` puis vérifier GitHub live.

## Gate actif : clôture H5, opérations GitHub bloquées

| Champ | État attesté |
|---|---|
| Base main vérifiée | `ea2f3644ab19f2da2eedd2927cf7c0bedf2f9211` ; D04 intégré par #88 / `db07f7a90cc406ddc80683521bbf1744e3a2b668` |
| Acquis | Reset R0–R7, H1–H4 et D01–D04 intégrés ; quatre preuves D04 acquises sur cible |
| Refs live | H5 absent ; `hardening/d04-real-engine-qualification` encore à `2946df59664c01d77abc3b5720fff1dbbf96cb4c`, fusionnée |
| Branche / PR active | Aucune PR ouverte ; aucune branche D05 créée. Les anciennes branches ne deviennent pas des branches actives |
| CI inspectée | D04 `2946df5…` : 10/10 workflows réussis ; main `ea2f364…` : 8/8 workflows exécutés réussis ; arbre du merge identique à la tête D04 testée |
| Réalisé dans cette reprise | Audit live et inspection du cockpit, des primitives API et du prototype ; documentation uniquement, aucune implémentation D05 |
| Limite de session | Aucun terminal exposé ; aucune action GitHub de création de tag ni de suppression de branche |
| Prochaine action | Exécuter le bloc de [clôture préparé](docs/archive/d05-entry-inspection-2026-09-14.md#blocage-et-commande-opérateur-préparée), puis vérifier H5 sur `db07f7a…` et absence de la seule branche D04 |
| Passage D05 | Après vérification H5 : actualiser ce checkpoint, relire main/CI, créer une seule branche depuis main live |

Les opérations H5 sont déjà autorisées. La commande documentée n'a **pas été exécutée** ;
ce checkpoint ne clôture pas H5. La CI ci-dessus concerne les SHA nommés, pas la présente
mise à jour documentaire. Le commit documentaire `b75bc0d…` a échoué au contrôle d'identité :
les chemins cités du prototype contenaient l'ancien nom. La note a été corrigée sans changer
le contrôle ; vérifier la CI de la nouvelle tête. Aucun checkout serveur ni conteneur modifié.

## Preuves et exploitation à préserver

Le [rapport final D04](docs/archive/d04-pilot-qualification-2026-09-14.md) conserve les quatre
preuves et leurs limites : deux Research OpenAI, 3 333 lectures/concurrence 20/zéro erreur,
charge mixte et rollback Worker, deux snapshots Restic B2 chiffrés relus et restauration de
PostgreSQL/JetStream/SeaweedFS/OpenBao sur volumes neufs dans un Compose isolé du même serveur.
La restauration entre deux VM est une preuve CI distincte. Aucune sauvegarde automatique attestée.

- Dernier checkout serveur attesté : `61d7687088dcbb002febd4c5f1a97f33edcb1269` ; non revérifié ici.
- Pilote API uniquement : LiteLLM `smart`, `openai/gpt-4.1`, sortie maximale 4096 (ADR-031).
  Clé fournisseur côté LiteLLM ; aucune clé dans Core/Worker/Web.
- Schéma `0014_capacity_and_data`. Comptes finaux `52|52|25|30|16|39|5`, travaux/outbox `0|0|0|0`.
- Conserver les cinq réservations historiques uncertain, snapshots B2 et images de rollback.
  Ne relancer ni Ollama, ni ancienne Task, ni campagne D04.
- Images attestées : Core `69453e7b1348…`, Worker `cb9b73de908…`, Web MCP `fcfba65ffada…`,
  registre génération 2. Changer le checkout ne reconstruit pas les conteneurs.
- Restic privé `/etc/nevolium/restic.env`, root 0600, mot de passe hors serveur.
  OpenBao workload valide ; parts temporaires effacées. Détails dans le rapport final.

## D05 : inspection réalisée, implémentation non commencée

[Inspection datée et réutilisation](docs/archive/d05-entry-inspection-2026-09-14.md).
Dockview, API propriétaire de layouts, panneaux métier, inspecteur documentaire, rôles administrateur
et comptabilité existent. Manquent notamment reprise par appareil, erreurs de layout visibles,
navigation rapide, PWA et test/bascule du fournisseur d'instance. Réutiliser ces primitives.

Aucune image de référence dans les arbres main/prototype consultés ; demander une ou deux
captures validées et le logo éventuel. Le code `ed12d503…` est un réservoir inspecté, pas un
design visuel vu ou validé. Aucun merge global de ce prototype ou de `57a1a217…`.

Suivre [D05](docs/implementation-plan.md#d05--cockpit-cohérent-et-langage-visuel-mycelium) en une
livraison : design/navigation/inspecteur, états/clavier/mouvement réduit, appareils/PWA et réglages
API administrateur. Test réel borné du fournisseur choisi, clés serveur, budgets/usages canoniques,
vidage coordonné des appels et conservation de la configuration valide en cas d'échec.
D06–D09 gardent planification, édition et graphes ; aucun graphe 3D décoratif permanent en D05.

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [Historique opérateur](docs/archive/d04-operator-history-2026-09-14.md)
(anciennes prochaines actions périmées).
