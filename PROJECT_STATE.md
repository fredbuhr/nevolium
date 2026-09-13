# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-13. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## Source canonique et lot actif

| Champ | État vérifié |
|---|---|
| `main` | `45b74baa3ddf8910f2aaa3d23c63f3e9bbedcf60` ; D03 intégré par #87 |
| Acquis intégrés | Reset R0–R7, H1–H4, D01–D03 ; dernier jalon produit G51 Daily Spine |
| Lot actif | **D04 : moteurs réels et exploitation, sortie H5** ; D05 non commencé |
| Branche / PR | `hardening/d04-real-engine-qualification`, [#88](https://github.com/fredbuhr/nevolium/pull/88), draft ; une seule branche active |
| Code cible construit | `7fb2211095a56b11eca0f9cef9ccf59ee0e1e4a4` ; checkout serveur propre à ce SHA |
| Validation du pivot | 10/10 workflows réussis à ce SHA ; quatre jobs D04 requis réussis, fixture locale manuelle ignorée |
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
| Core | image `e5c245924d50…`, construite au SHA technique `7fb2211…` |
| Worker | image `932e3d909448…`, construite au SHA technique `7fb2211…` |
| Web | image `55a970ff01c4…`, construite au SHA technique `7fb2211…` |
| LiteLLM | image épinglée `29a0daf2593d…` ; routes API `smart`/`alternative`, sans route locale |
| Web MCP | `db3da89acfb041db75e6c7a2417a83dbafc6ce80` ; outils A1 search/fetch |

Le checkout serveur a été avancé à `7fb2211095a56b11eca0f9cef9ccf59ee0e1e4a4`. La première préparation
s'est arrêtée au contrôle après sortie de l'éditeur sans enregistrer. La reprise sans éditeur a réussi :
clé saisie localement, six paramètres API appliqués, anciennes variables OpenAI/Ollama retirées,
configuration de production acceptée. Core construit en 10,8 s, Worker en 338,3 s, Web en 9,5 s.
Résultat opérateur : `REPRISE_API_OK`, `CONFIGURATION_VALIDEE_IMAGES_CONSTRUITES`.

L'activation suivante a réussi sans reconstruction. Core, Worker, Web et LiteLLM ont été recréés avec
les images ci-dessus ; Core/LiteLLM sont sains et le nouveau Worker est présent dans les deux queues
Temporal. Ollama `4245ff7673bc…` est arrêté. Les accès publics donnent `200|200|401`. Les travaux actifs
étaient `0|0|0` avant et pendant la bascule. Le relevé canonique est strictement inchangé :
`27|27|11|16|1|19|5` pour Tasks, workflows, usages, réservations, invocations, artefacts et réservations
`uncertain`. Résultat opérateur : `ACTIVATION_API_OK`. Aucune requête générative OpenAI encore attestée.

Sauvegarde privée existante : `/etc/nevolium/api-rollback.9KmtYC` (ancien environnement et configurations).
Images conservées : `nevolium-api-rollback/{nevolium-core,nevolium-worker,nevolium-web,litellm}:9KmtYC`.
Ne pas redemander la clé, ouvrir un éditeur, refaire les builds ou relancer les commandes de préparation.
Ces faits proviennent de la sortie opérateur ; aucune connexion SSH depuis ce workspace.

## Acquis et anomalies à préserver

- Cible durcie, TLS/OIDC/MFA et comptes nominatifs, bootstrap retiré, OpenBao persistant et
  renouvellement prouvés. PDF Docling propriétaire et Mem0/Graphiti avec rejeu sans doublon acquis.
- News fonctionne avec fallback déterministe ; veto sémantique actif. Qualité quotidienne via API
  encore à mesurer. Ne pas confondre succès de fixture et bon résultat utilisateur.
- COLD-03/04/05 restent des échecs historiques. COLD-05 (`ccb61e1c-7fb2-460b-ad70-e4cef359ed42`)
  a recherché son marqueur, omis fetch puis rendu une synthèse non JSON. Deux usages réglés, aucun OOM.
  Conserver les cinq réservations historiques `uncertain`, sans effacement ni rejeu automatique.
- Correctif Core actif sur la cible : un slot Research lie atomiquement un seul appel/entrée,
  même en concurrence ; IDs existants conservés, aucune migration.
- Worker transmet les JSON Schemas Research natifs et valide toujours contenu/outils/citations.
  **Actif sur la cible.** Le pivot conserve ces correctifs et retire les défauts `local-fast`
  des nouvelles demandes au lieu d'ajouter un second gateway ou un nouveau runner de campagne.
- Les essais/procédures locaux sont archivés. La fixture reste isolée et manuelle ; les contrats de
  comptabilité, concurrence, ownership et crash/replay Research restent requis.

Le panneau Web Research imposait également `local-fast` et une estimation propre : ces deux champs
sont retirés au profit des valeurs Core. Une nouvelle demande locale explicite est refusée en
production ; le contexte des anciennes Tasks reste lisible. **Le Web corrigé est actif.**

## Validation du pivot avant publication

Ruff F/E9 (dont imports/code inutilisés), identité canonique et diff sans erreur réussis.
Contrats gateway, planning/synthèse Research, routage sémantique et six contrôles du runner cible
réussis. Neuf contrôles déploiement/configuration/reprise réussis sans Docker ; isolation de la clé
API vérifiée dans le vrai processus enfant mémoire. Docker indisponible dans ce workspace ; rendu
Compose et intégrations ensuite validés en CI au SHA `7fb2211…` : Foundation 9/9 jobs, Research
contrats/concurrence/crash-replay, vrais PDF/mémoire et restauration CI réussis. Aucun appel OpenAI effectué.

## Prochaine action exécutable

**Exécuter deux nouvelles Tasks Research OpenAI séquentielles sur les services déjà actifs.** Chaque
Task doit faire `web.search` puis `web.fetch`, terminer en moins de 600 s, produire un artefact cité et
exactement deux usages `smart` avec tokens/coût reportés et réservations réglées. Conserver les UUID dès
la création et arrêter la paire au premier échec ou résultat inconnu, sans rejouer COLD-03/04/05.
Cette mise à jour documentaire n'impose ni mise à jour du checkout serveur ni reconstruction. Le
[protocole D04](docs/qualification-d04.md) porte la suite finie et les limites, sans nouveau sous-lot.

Sortie H5 : Research OpenAI, charge bornée du pilote, upgrade/rollback, restauration indépendante.
Les preuves non affectées restent acquises. Aucun merge, tag H5 ou démarrage D05 avant cette sortie.

## Références

[État produit](docs/status.md) · [plan D01–D22](docs/implementation-plan.md) · [workflow](docs/development-workflow.md)
· [preuves serveur](docs/archive/server-foundation-2026-09-11.md) · [audit D04](docs/archive/d04-progress-audit-2026-09-13.md).
Les anciennes refs H/D restent retirées du développement actif. Réservoirs déjà inspectés : prototype
`ed12d503…`, `consolidate/g49-research-durable-stages` à `57a1a217…` ; aucun merge en bloc.
