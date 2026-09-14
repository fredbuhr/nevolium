# D04 : preuves finales du pilote — 14 septembre 2026

Les quatre scénarios du [protocole D04](../qualification-d04.md) sont acquis.
Ce rapport transcrit les sorties opérateur fournies dans la conversation ; il ne résulte pas
d'une connexion SSH de l'agent. La clôture GitHub est suivie dans [PROJECT_STATE](../../PROJECT_STATE.md).

## Cible et périmètre

- Serveur Netcup Debian 13, Linux 6.12.107+deb13, x86_64, AMD EPYC 9645, 12 CPU logiques,
  mémoire relevée 32 869 552 Kio. Pilote privé de 3–4 personnes.
- API OpenAI derrière LiteLLM `smart`, attribution `openai/gpt-4.1`, sortie maximale 4096 tokens.
  LLM local différé selon ADR-031.
- PostgreSQL canonique au schéma `0014_capacity_and_data` ; Temporal, JetStream, SeaweedFS
  et OpenBao réels. Mem0/Graphiti restent des projections dérivées.
- Code Research/Worker qualifié `a4635462a4380aad2b2b991053c1078e36e5e79a`.
  Procédure de récupération qualifiée `61d7687088dcbb002febd4c5f1a97f33edcb1269`.

## Résultats des quatre preuves

| Preuve | Résultat attesté | Limite |
|---|---|---|
| Deux Research OpenAI | 23,591 s et 9,524 s ; Search puis Fetch ; quatre usages et réservations réglées ; coût total 0,039764 USD ; Trixie et 9 août 2025 avec citations | Un fournisseur et une question fixe ; Search étaye la date initiale, Fetch lit une annonce de mise à jour |
| Charge de lecture | 3 333 requêtes, paliers 1/10/100/1 000 clients virtuels, concurrence 20, zéro erreur, p95 maximal 0,524 s (seuil 2 s) ; TLS et refus d'accès vérifiés | Un compte réel, générateur dans le conteneur Core de la cible ; ne prouve pas 1 000 comptes ou générations simultanées |
| Charge mixte et rollback | Research 13,217 s / 0,017448 USD ; Docling 2.126.0 : 39,499 s après 1,471 s d'admission ; Mem0/Graphiti : 21,451 s après 43,378 s d'admission ; ancien Worker réactivé puis candidat remis, services/accès/comptes conservés | Scénario borné de pilote ; aucune ancienne Task rejouée |
| Récupération hors serveur | Deux snapshots chiffrés B2, tous les packs relus ; PostgreSQL, JetStream, SeaweedFS et OpenBao restaurés dans des volumes neufs ; marqueurs source et environnement isolé supprimés | Stockage B2 hors serveur ; restauration dans un projet Compose isolé sur le même serveur. La restauration entre deux VM est une preuve CI distincte |

Les temps PDF/mémoire sont des temps d'exécution ; l'attente d'admission est mesurée séparément.
Les critères n'ont pas été modifiés après mesure.

## Rapport de récupération final

Rapport serveur :
`/var/lib/nevolium/qualification/d04-off-host-recovery-20260914T123615Z.78b757/recovery.json`.

Fenêtre : `2026-09-14T12:36:15.478336+00:00` à `2026-09-14T12:39:39.333128+00:00`.
Restic 0.19.1. Destination B2 S3 région `eu-central-003`, bucket privé ;
aucune clé, mot de passe, part OpenBao ou adresse de bucket n'est versionné ici.

| Cas | Durée | Seuil | Statut |
|---|---:|---:|---|
| Dépôt Restic B2 | 11,150 s | 120 s | passed |
| Taille des volumes source | 3,548 s | 180 s | passed |
| Création des preuves | 5,921 s | 180 s | passed |
| Snapshot cohérent chiffré hors serveur | 86,979 s | 1 800 s | passed |
| Suppression des marqueurs source | 6,651 s | 180 s | passed |
| Relecture complète des packs B2 | 13,108 s | 1 800 s | passed |
| Restauration isolée des quatre magasins | 44,686 s | 2 400 s | passed |

Volumes source : PostgreSQL 161 558 528 octets, NATS 208 896, SeaweedFS 385 024,
OpenBao 249 856. Données Restic `raw_data_bytes=21129842`, deux snapshots.
Cette mesure ne constitue pas un plafond permanent de facturation B2.

- Snapshot données : `c9ba90354c30eff72f8b87676f1299b66e69d96dc8e5e1955c22bc18871d7c28`.
- Snapshot récupération OpenBao : `f60c2608f67f3f462658ebc1df277fea241a6482fb3e79d19b3d55a15a7a532a`.
- Marqueur SQL : `78b7570a-a829-47d8-9a43-9deca4235e5d`.
- JetStream : `D04_RECOVERY_78B7570AA829`, séquence 1.
- SHA-256 objet : `62df23e84fc2aba1ad6de0fbfa495d0b5a8b4fd1fb5c8d6a3228b2715d9674c7`.
- Empreinte persistante workload OpenBao identique avant/après :
  `6165dba5101e02f94a9ab3ef448caa37d3f992aa88f071090507ba3adbdd3843`.
- OpenBao descellé avec les parts récupérées depuis le snapshot chiffré ; aucun jeton root utilisé.
- `d04_gate=passed`, `source_unchanged=true`, `isolated_environment_removed=true`.
- Comptes avant/après : `52|52|25|30|16|39|5` (Tasks, workflows, usages, réservations,
  invocations, artefacts, réservations uncertain).
- Travaux/outbox finaux : `0|0|0|0`.
- Sortie opérateur : `REPRISE_RESTAURATION_D04_OK`,
  `RECUPERATION_OPENBAO_EPHEMERE_EFFACEE`. Aucun appel IA pendant cette récupération.

## Reprise et conservation

Conserver les deux snapshots B2, le mot de passe Restic hors serveur et le fichier privé
`/etc/nevolium/restic.env` root 0600. Le succès d'un exercice manuel ne prouve pas
l'existence d'une planification automatique de sauvegardes.

Dernières images attestées :
Core `69453e7b1348c95070127ab55dd4470b24f2925a14303273f467a6c759ef16fa`,
Worker `cb9b73de90824416a9ce438107af3bf30613248838c6bac282d89d0b7ce23200`,
Web MCP `fcfba65ffada03597b5067034057ec759cf49fcaefb559237828fce1eba19ca0`.
Un changement de checkout ne reconstruit pas ces images.

Les cinq réservations historiques uncertain et les anciens essais restent conservés sans rejeu.
Les incidents corrigés et la preuve de rollback sont archivés dans
[l'historique opérateur](d04-operator-history-2026-09-14.md).
Aucun P0/P1 bloquant n'est identifié par les scénarios de sortie du pilote ;
ergonomie, qualité quotidienne, capacité commerciale et autres fournisseurs restent hors de cette preuve.

## CI et passage de lot

Le code qualifié `61d7687088dcbb002febd4c5f1a97f33edcb1269` passe 10/10 workflows,
notamment [D04](https://github.com/fredbuhr/nevolium/actions/runs/34843637197),
[Foundation](https://github.com/fredbuhr/nevolium/actions/runs/34843637139)
et [Research](https://github.com/fredbuhr/nevolium/actions/runs/34843637213).
Le job local optionnel est skipped conformément à ADR-031.
La CI de la tête documentaire finale et la fusion sont vérifiées séparément lors de la clôture de #88.

D05 peut suivre la clôture H5 : cockpit Mycelium cohérent, navigation/états/clavier/accessibilité,
layouts par appareil et réglages API administrateur, selon le plan existant.
Aucun Gantt, nouveau moteur ou graphe 3D décoratif permanent n'est ajouté à ce passage.
