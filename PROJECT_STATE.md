# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-13. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## Source canonique et lot actif

| Champ | État vérifié |
|---|---|
| `main` | `45b74baa3ddf8910f2aaa3d23c63f3e9bbedcf60` ; D03 intégré par #87 |
| Acquis intégrés | Reset R0–R7, H1–H4, D01–D03 ; dernier jalon produit G51 Daily Spine |
| Lot actif | **D04 : moteurs réels et exploitation, sortie H5** ; D05 non commencé |
| Branche / PR | `hardening/d04-real-engine-qualification`, [#88](https://github.com/fredbuhr/nevolium/pull/88), draft ; une seule branche active |
| Parent vérifié avant pivot API | `25566363c66bcc41980077214c3f379e2880f3a4`, 10/10 workflows réussis ; 91 commits dans #88 à cette revue |
| Validation du pivot | Contrats locaux puis CI du nouveau head à vérifier avant activation ; le job local manuel n'est plus requis |
| Schéma / images | `0014_capacity_and_data` ; baseline images v9 ; pas de migration ni de nouvelle dépendance dans le pivot |
| Cible H5 | Serveur Linux x86_64 Netcup, 12 CPU, 32 Gio, 1 Tio ; pilote de 3–4 personnes |

## Décision active : API uniquement pour le pilote

Sur instruction utilisateur, OpenAI remplace le LLM local. Ne plus relancer la présélection Qwen,
réparer son DNS ou régler les threads Ollama. Le local attend une nouvelle décision et du matériel
adapté ; il ne conditionne ni D04, ni D05, ni D13. Voir [ADR-031](docs/decisions/ADR-031-api-first-pilot.md).

`smart` est l'alias de l'API choisie : `NEVOLIUM_API_MODEL` + `NEVOLIUM_API_KEY` dans LiteLLM,
OpenAI `openai/gpt-4.1` initialement. Aucun secret fournisseur côté Core/Worker/Web. Les nouvelles
Tasks Research et le routage sémantique utilisent `smart` ; Core persiste le choix et l'estimation,
le Worker les reçoit dans le contexte. Anciennes Tasks inchangées. Le garde de production refuse
les routes/services locaux et une clé API absente/placeholder. Le sélecteur API de l'interface est
prévu en D05 ; tous les fournisseurs n'ont pas à être testés pour fermer H5.

## Dernier état cible attesté

| Composant | Dernier code déployé confirmé |
|---|---|
| Core | `e3adbe648b245e2567970769e6a4bf4333b3e4a4` |
| Worker | `969fe668d08984b0e6aea38b8ba7f1ff18972b21` |
| LiteLLM | `e4d886b9b32907135cb5faeb7737f09de27c6389` ; ancienne route locale |
| Web MCP | `db3da89acfb041db75e6c7a2417a83dbafc6ce80` ; outils A1 search/fetch |

Le checkout serveur est à `25566363c66bcc41980077214c3f379e2880f3a4`. La dernière commande a construit
le client de qualification en 389,9 s, puis échoué au premier téléchargement de `qwen3:4b` : résolution
DNS de `registry.ollama.ai`. Statut 1, avant isolation des services. Core/Worker/Ollama n'ont pas été
arrêtés par ce script ; aucune nouvelle Task. Le build/cache client reste présent. Ne pas relancer.
Ces faits proviennent de la sortie opérateur ; aucune connexion serveur dans cette reprise.

## Acquis et anomalies à préserver

- Cible durcie, TLS/OIDC/MFA et comptes nominatifs, bootstrap retiré, OpenBao persistant et
  renouvellement prouvés. PDF Docling propriétaire et Mem0/Graphiti avec rejeu sans doublon acquis.
- News fonctionne avec fallback déterministe ; veto sémantique actif. Qualité quotidienne via API
  encore à mesurer. Ne pas confondre succès de fixture et bon résultat utilisateur.
- COLD-03/04/05 restent des échecs historiques. COLD-05 (`ccb61e1c-7fb2-460b-ad70-e4cef359ed42`)
  a recherché son marqueur, omis fetch puis rendu une synthèse non JSON. Deux usages réglés, aucun OOM.
  Conserver les cinq réservations historiques `uncertain`, sans effacement ni rejeu automatique.
- Correctif Core déjà sur la branche : un slot Research lie atomiquement un seul appel/entrée,
  même en concurrence ; IDs existants conservés, aucune migration. **Non déployé sur cible.**
- Worker transmet les JSON Schemas Research natifs et valide toujours contenu/outils/citations.
  **Non déployé sur cible.** Le pivot conserve ces correctifs et retire les défauts `local-fast`
  des nouvelles demandes au lieu d'ajouter un second gateway ou un nouveau runner de campagne.
- Les essais/procédures locaux sont archivés. La fixture reste isolée et manuelle ; les contrats de
  comptabilité, concurrence, ownership et crash/replay Research restent requis.

Le panneau Web Research imposait également `local-fast` et une estimation propre : ces deux champs
sont retirés au profit des valeurs Core. Une nouvelle demande locale explicite est refusée en
production ; le contexte des anciennes Tasks reste lisible. **Le Web doit aussi être reconstruit.**

## Validation du pivot avant publication

Ruff F/E9 (dont imports/code inutilisés), identité canonique et diff sans erreur réussis.
Contrats gateway, planning/synthèse Research, routage sémantique et six contrôles du runner cible
réussis. Neuf contrôles déploiement/configuration/reprise réussis sans Docker ; isolation de la clé
API vérifiée dans le vrai processus enfant mémoire. Docker indisponible dans ce workspace : rendu
Compose et intégrations restent à vérifier par la CI du nouveau head. Aucun appel OpenAI effectué.

## Prochaine action exécutable

**Vérifier la CI du head API publié dans #88, puis préparer la configuration sur le serveur.**
Après mise à jour contrôlée du checkout, éditer uniquement le fichier protégé :

```bash
sudoedit /etc/nevolium/production.env
```

Y renseigner le couple modèle/clé de l'API, `smart` pour Research/News/routage et l'estimation Research
0.10 comme décrit dans [deployment](docs/deployment.md#selection-du-fournisseur-api). Ne jamais
transmettre ce fichier ou la clé. Ensuite valider la topologie effective avec le contrôleur existant,
construire avant activation, vérifier inactivité (workflows ET réservations), garder les images et
configurations précédentes, arrêter l'ancien Ollama et activer Core/Worker/Web/LiteLLM en une fois.
Le [protocole D04](docs/qualification-d04.md) porte la suite finie et les limites, sans nouveau sous-lot.

Sortie H5 : Research OpenAI, charge bornée du pilote, upgrade/rollback, restauration indépendante.
Les preuves non affectées restent acquises. Aucun merge, tag H5 ou démarrage D05 avant cette sortie.

## Références

[État produit](docs/status.md) · [plan D01–D22](docs/implementation-plan.md) · [workflow](docs/development-workflow.md)
· [preuves serveur](docs/archive/server-foundation-2026-09-11.md) · [audit D04](docs/archive/d04-progress-audit-2026-09-13.md).
Les anciennes refs H/D restent retirées du développement actif. Réservoirs déjà inspectés : prototype
`ed12d503…`, `consolidate/g49-research-durable-stages` à `57a1a217…` ; aucun merge en bloc.
