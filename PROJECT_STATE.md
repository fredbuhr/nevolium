# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-13. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## Source canonique et lot actif

| Champ | État vérifié |
|---|---|
| `main` | `45b74baa3ddf8910f2aaa3d23c63f3e9bbedcf60` ; D03 intégré par #87, D04 non intégré |
| Acquis intégrés | Reset R0–R7, H1–H4 et D01–D03 terminés dans leurs périmètres ; dernier jalon produit G51 Daily Spine |
| Lot actif | **D04 : moteurs réels et exploitation, sortie H5** |
| Branche / PR | `hardening/d04-real-engine-qualification`, [#88](https://github.com/fredbuhr/nevolium/pull/88), draft ; une seule branche de développement active |
| Dernier head publié vérifié | `7b1ded0fa0849d3607e7b76bc26f38c01c5cab1d`, 10/10 workflows réussis ; changements suivants à revalider en CI |
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
- `COLD-05`, Task `ccb61e1c-7fb2-460b-ad70-e4cef359ed42`, a échoué sans retry en 48 s. Planning
  accepté, mais le seul appel `web.search` a recherché le marqueur COLD-05 au lieu de la requête Debian ;
  aucun `web.fetch`. La synthèse a ensuite produit 13 jetons non JSON (`JSONDecodeError`), donc aucun
  artefact Research final. Les deux appels LiteLLM/Ollama HTTP 200 totalisent 2 383 puis 2 063 jetons ;
  les deux réservations sont `settled`, zéro workflow/réservation actif, cinq historiques `uncertain`
  inchangés. Ollama confirme deux threads, aucun OOM ni redémarrage. **Ne pas rejouer COLD-05.**
- Les cinq réservations `uncertain` du dernier snapshot sont conservées. Ne supprimer aucune donnée,
  lease, dépense inconnue ou preuve pour faire passer un contrôle.

## Travail de cette reprise

[Audit du 13 septembre](docs/archive/d04-progress-audit-2026-09-13.md) et consolidation du suivi courant.
Défaut Core reproduit : deux outils différents pouvaient partager un slot malgré `max_tool_calls=1`.
Le correctif verrouille le parent durant la liaison et recherche le slot indépendamment de l'outil ;
les historiques ambigus sont refusés. IDs/clés existants conservés, sans migration.
Régression de concurrence ajoutée au scénario Core/PostgreSQL existant. **Correctif non déployé sur cible.**

Le gateway Worker accepte désormais un JSON Schema natif borné et Research transmet directement les
schémas `ResearchPlan` et `ResearchSynthesis` à LiteLLM/Ollama. La validation Pydantic, l'allowlist Core
et les citations restent autoritatives. Le scénario réel local vérifie aussi ce transport structuré.
Un runner de présélection compare jusqu'à trois modèles Ollama déjà installés, un seul en mémoire, sans
Task canonique ni appel Web : plan froid/chaud exact, synthèse sourcée et résistance à une instruction
injectée. Aucun modèle n'est adopté automatiquement. **Ces changements Worker ne sont pas déployés.**

Validation locale : uv 0.12.13, synchronisation verrouillée Core/Worker, Ruff F/E9, identité ; contrats
Research, gateway/comptabilité, Context Pack, ownership Research et états terminaux réussis.
Reproduction relationnelle locale : deux invocations avant correction, une après ; elle ne prouve pas
le verrou PostgreSQL. Vérifier la CI du head final dans #88 pour la concurrence et les intégrations.
Docker et l'accès au serveur ne sont pas disponibles dans ce workspace.

## Prochaine action et sortie

**Présélectionner Qwen3 4B et 8B hors données canoniques avec le runner borné, sans nouvelle Task.**
Un candidat doit réussir tous les critères de qualité à froid et à chaud, rester sous 180 s par cas et
sous 12 Gio chargé. En l'absence de candidat éligible, arrêter et conserver le rapport. Sinon, regrouper
le modèle retenu et le Worker à schéma natif dans une seule activation réversible, puis créer deux
nouvelles Tasks Research canoniques, froide et chaude, avec une question propre et de nouveaux identifiants
consignés hors du texte utilisateur. COLD-05 reste intacte.

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
