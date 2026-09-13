# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-13. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## Source canonique et lot actif

| Champ | État vérifié |
|---|---|
| `main` | `45b74baa3ddf8910f2aaa3d23c63f3e9bbedcf60` ; D03 intégré par #87, D04 non intégré |
| Acquis intégrés | Reset R0–R7, H1–H4 et D01–D03 terminés dans leurs périmètres ; dernier jalon produit G51 Daily Spine |
| Lot actif | **D04 : moteurs réels et exploitation, sortie H5** |
| Branche / PR | `hardening/d04-real-engine-qualification`, [#88](https://github.com/fredbuhr/nevolium/pull/88), draft ; une seule branche de développement active |
| Base de cette reprise | `e8708934448255d1e1ab4207fe35ebf4bd5bcb5b`, 10/10 workflows réussis ; comparer le head live à cette base |
| Schéma / images | `0014_capacity_and_data` ; baseline images v9, pas de migration ni de nouvelle dépendance dans cette reprise |
| Cible H5 | Premier serveur Linux x86_64 Netcup, 12 CPU, 32 Gio, 1 Tio ; pilote 3–4 personnes |

## Dernier état cible attesté, distinct du code de branche

| Composant | Dernier code déployé confirmé dans les preuves opérateur |
|---|---|
| Core | `e3adbe648b245e2567970769e6a4bf4333b3e4a4` |
| Worker | `969fe668d08984b0e6aea38b8ba7f1ff18972b21` |
| LiteLLM | `e4d886b9b32907135cb5faeb7737f09de27c6389` ; `local-fast`, Ollama natif `qwen2.5:0.5b`, deux threads |
| Web MCP | `db3da89acfb041db75e6c7a2417a83dbafc6ce80` ; deux outils A1 en lecture seule |

Dernier checkout cible attesté dans le dépôt : `fb59fc4…`. Worker actif `a04ca3056060…`, image
`sha256:b14d17a97f3f295b3ad78d13ee16fe61da11f050c65d735bddbe711b0cc26b6b`, pollers Workflow/Activity présents.
Module installé sous `/app/.venv/lib/python3.12/site-packages/nevolium_worker/`.
Rollbacks Worker `rollback-35303f2e3a5e` et `rollback-e4d886b9b329` conservés.
Contrôles publics `200|200|401` ; snapshot SQL identique avant/après cette activation.
Ces observations sont historiques : aucune connexion au serveur dans cette reprise.

## Acquis et incidents à préserver

- Serveur durci, Docker/réseaux internes, Caddy/TLS, comptes nominatifs avec MFA, retrait du bootstrap
  Keycloak, récupération séparée des clés OpenBao et renouvellement workload vérifiés.
- Core/Web/Worker et moteurs actifs ; PDF Docling propriétaire, Mem0/Graphiti et rejeu sans doublon
  prouvés sur cible. News fonctionne avec fallback déterministe ; usages locaux observés comptabilisés.
- Veto sémantique actif. Pertinence générale du routage et modèle quotidien non qualifiés.
- `COLD-03` échouée : 2 388 jetons, réservation réglée, aucun outil/artefact. `COLD-04`
  (`e1c81a97-59d4-4be8-ae12-732d09796085`) échouée : 2 290 jetons, réservation réglée, aucun outil/artefact.
  Le correctif Worker `969fe66…` traite le champ d'enveloppe absent, sans second appel modèle.
- **COLD-05 : résultat non disponible dans cette reprise.** Le dernier retour de la discussion
  précédente n'est pas attaché ici. Ne présumer ni absence, ni échec, ni réussite de la Task ou de son
  marqueur ; ne pas réarmer/rejouer avant lecture du retour ou d'un constat cible en lecture seule.
- Les cinq réservations `uncertain` du dernier snapshot sont conservées. Ne supprimer aucune donnée,
  lease, dépense inconnue ou preuve pour faire passer un contrôle.

## Travail de cette reprise

[Audit du 13 septembre](docs/archive/d04-progress-audit-2026-09-13.md) et consolidation du suivi courant.
Défaut Core reproduit : deux outils différents pouvaient partager un slot malgré `max_tool_calls=1`.
Le correctif verrouille le parent durant la liaison et recherche le slot indépendamment de l'outil ;
les historiques ambigus sont refusés. IDs/clés existants conservés, sans migration.
Régression de concurrence ajoutée au scénario Core/PostgreSQL existant. **Correctif non déployé sur cible.**

Validation locale : uv 0.12.13, synchronisation verrouillée Core/Worker, Ruff F/E9, identité ; contrats
Research, gateway/comptabilité, Context Pack, ownership Research et états terminaux réussis.
Reproduction relationnelle locale : deux invocations avant correction, une après ; elle ne prouve pas
le verrou PostgreSQL. Vérifier la CI du head final dans #88 pour la concurrence et les intégrations.
Docker et l'accès au serveur ne sont pas disponibles dans ce workspace.

## Prochaine action et sortie

**Récupérer le dernier retour COLD-05 et examiner l'unique Task existante avant toute nouvelle exécution.**
Vérifier état terminal, appels MCP, artefact/citations, usages et réservations. Aucun redéploiement
Worker requis pour lire ce résultat. Un défaut de qualité exige une analyse des sorties conservées
avant une autre campagne cible, sans prolonger les normalisations JSON au cas par cas.

Les quatre preuves restantes figurent dans le [protocole H5](docs/qualification-d04.md#restauration-et-passage-de-h5) :
Research/modèle quotidien ; charge/files mixtes ; upgrade/rollback et frontières affectées ; restauration
Restic indépendante sur volumes neufs. Conserver les acquis non affectés. Avant activation du correctif
Core, vérifier head CI et inactivité, utiliser la procédure existante avec image précédente conservée.
Aucun merge, D05, achat ou lancement commercial implicite.

## Références et périmètre

[État produit](docs/status.md) · [plan D01–D22](docs/implementation-plan.md) · [workflow](docs/development-workflow.md)
· [preuves serveur](docs/archive/server-foundation-2026-09-11.md) · [preuves CI D04](docs/archive/qualification-d04-2026-09-11.md).
L'[ADR-030](docs/decisions/ADR-030-nevolium-canonical-identity.md) fixe Nevolium sans alias antérieur.
L'[ADR-029](docs/decisions/ADR-029-server-personal-and-offline-clients.md) conserve serveur prioritaire,
installation personnelle et clients PC/mobile/tablette ; tous les OS, l'offline et la 3D ne conditionnent pas H5.
Budget préféré 50 €/mois, plafond 90 € ; portable ASUS FA608PM seulement candidat à une répétition ultérieure.
Les anciennes refs H/D existent encore mais sont retirées du développement actif. Réservoirs inspectés :
prototype `ed12d503…`, `consolidate/g49-research-durable-stages` à `57a1a217…` ; aucun merge en bloc.
