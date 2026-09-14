# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-14. Lire `AGENTS.md` puis vérifier GitHub live.

## Source canonique et passage de lot

| Champ | État attesté |
|---|---|
| Base main vérifiée | `45b74baa3ddf8910f2aaa3d23c63f3e9bbedcf60` ; D03 intégré par #87 |
| Acquis | Reset R0–R7, H1–H4, D01–D03 ; quatre preuves D04 acquises sur cible |
| Opération active | Clôture D04/H5 dans [#88](https://github.com/fredbuhr/nevolium/pull/88) |
| Branche | `hardening/d04-real-engine-qualification` ; unique branche de livraison D04 |
| Cible | Checkout `61d7687088dcbb002febd4c5f1a97f33edcb1269`, récupération réussie |
| CI code qualifié | 10/10 workflows verts à `61d7687…` ; CI documentaire finale à vérifier avant fusion |
| Étape suivante | Fusion de #88, tag H5 et retrait de la branche, puis ouverture de D05 |

## Preuves acquises et limites

Les [preuves finales D04](docs/archive/d04-pilot-qualification-2026-09-14.md) consignent les mesures,
snapshots et limites. L'[historique opérateur](docs/archive/d04-operator-history-2026-09-14.md)
conserve les anciens essais ; ses prochaines actions sont périmées.

- Deux Research OpenAI : 23,591 s et 9,524 s, Search puis Fetch, coûts/tokens reportés,
  quatre usages et réservations réglées, total 0,039764 USD.
- Lecture : 3 333 requêtes, concurrence 20, p95 maximal 0,524 s, zéro erreur.
  Un compte réel et un générateur sur la cible ; pas 1 000 générations simultanées.
- Mixte : Research 13,217 s ; Docling 39,499 s ; mémoire 21,451 s d'exécution.
  Attente mémoire 43,378 s mesurée séparément. Retour ancien Worker puis candidat validé.
- B2 : backup cohérent 86,979 s, restauration isolée 44,686 s ; quatre magasins relus.
  Deux snapshots chiffrés, 21 129 842 octets de données Restic, tous les packs vérifiés.
  Stockage hors serveur ; restauration en Compose isolé sur le même serveur.
- Production finale : `52|52|25|30|16|39|5`, travaux/outbox `0|0|0|0`.
  Marqueurs et environnement isolé supprimés, parts OpenBao temporaires effacées.
- Rapport : `/var/lib/nevolium/qualification/d04-off-host-recovery-20260914T123615Z.78b757/recovery.json`.

Aucune commande de qualification ni ancienne Task à rejouer. Conserver les cinq réservations
historiques uncertain. Les sauvegardes sont réelles ; un calendrier automatique n'est pas attesté.

## Exploitation à préserver

Pilote API uniquement selon [ADR-031](docs/decisions/ADR-031-api-first-pilot.md) :
LiteLLM `smart`, `openai/gpt-4.1`, plafond de sortie 4096. Ne pas relancer Ollama
ou la présélection locale. Clé fournisseur côté LiteLLM, aucune clé dans Core/Worker/Web.

Schéma `0014_capacity_and_data` ; pas de migration pour la clôture.
Core `69453e7b1348…`, Worker `cb9b73de908…`, Web MCP `fcfba65ffada…`,
registre génération 2 ; images de rollback conservées.
Le checkout source n'est pas une preuve de reconstruction des conteneurs.
Restic B2 privé dans `/etc/nevolium/restic.env`, root 0600 ; mot de passe conservé hors serveur.
OpenBao valide : display name `token-nevolium-core`, policy minimale, période 604800 s,
orphan/renewable, accessor comparé au bootstrap par diagnostic sans exposition.

## D05 : périmètre préparé, implémentation non commencée

Après clôture H5, suivre [D05](docs/implementation-plan.md#d05--cockpit-cohérent-et-langage-visuel-mycelium) :
cockpit partagé, navigation/recherche rapide/inspecteur, états vides/chargement/erreur,
clavier et réduction des animations ; Dockview et layouts par propriétaire/appareil conservés.
PWA et formats téléphone/tablette/bureau, fonctionnement sans WebGL.
Réglages fournisseur/modèle de l'instance réservés à l'administrateur, clés côté serveur,
test borné et conservation de la dernière configuration valide. Réutiliser LiteLLM et la comptabilité.

Commencer par inspecter l'interface existante et les références visuelles effectivement disponibles ;
ne pas prétendre disposer d'images absentes du dépôt. D06–D09 gardent planification, édition et graphes.
Aucun nouveau lot technique D04, fournisseur supplémentaire ou benchmark local avant D05.

## Références

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) · [Protocole](docs/qualification-d04.md)
· [Workflow](docs/development-workflow.md). Les anciens noms H/D et réservoirs sont historiques ;
aucun merge en bloc de `ed12d503…` ou `57a1a217…`.
