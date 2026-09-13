# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-13. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## Source canonique et lot actif

| Champ | État vérifié |
|---|---|
| `main` | `45b74baa3ddf8910f2aaa3d23c63f3e9bbedcf60` ; D03 intégré par #87 |
| Acquis intégrés | Reset R0–R7, H1–H4, D01–D03 ; dernier jalon produit G51 Daily Spine |
| Lot actif | **D04 : moteurs réels et exploitation, sortie H5** ; D05 non commencé |
| Branche / PR | `hardening/d04-real-engine-qualification`, [#88](https://github.com/fredbuhr/nevolium/pull/88), draft ; une seule branche active |
| Checkout cible | `5f4bdd35ee2a4743e45986d88523b7d83bb505f8` ; checkout serveur propre à ce SHA |
| Correctif actif | `0e57de2b840f1692fa5dbff20f3fa98792182207` ; Worker et Web MCP actifs, 10/10 workflows réussis au checkpoint `5f4bdd3…` |
| Correctif candidat | `bef11ff317565d9d05da278a8fcebaec6b736dc8` ; bootstrap interne corrigé, 10/10 workflows réussis |
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
| Worker | image `babd504b95f2…`, correctif `0e57de2…` actif |
| Web | image `55a970ff01c4…`, construite au SHA technique `7fb2211…` |
| LiteLLM | image épinglée `29a0daf2593d…` ; routes API `smart`/`alternative`, sans route locale |
| Web MCP | image `fcfba65ffada…`, correctif `0e57de2…` actif ; registre encore à resynchroniser |

Le checkout serveur a été avancé à `a4ec6491eb2a44e8ee4e8c4a31b293f562100405`. La première préparation
s'est arrêtée au contrôle après sortie de l'éditeur sans enregistrer. La reprise sans éditeur a réussi :
clé saisie localement, six paramètres API appliqués, anciennes variables OpenAI/Ollama retirées,
configuration de production acceptée. Core construit en 10,8 s, Worker en 338,3 s, Web en 9,5 s.
Résultat opérateur : `REPRISE_API_OK`, `CONFIGURATION_VALIDEE_IMAGES_CONSTRUITES`.

L'activation suivante a réussi sans reconstruction. Core, Worker, Web et LiteLLM ont été recréés avec
les images ci-dessus ; Core/LiteLLM sont sains et le nouveau Worker est présent dans les deux queues
Temporal. Ollama `4245ff7673bc…` est arrêté. Les accès publics donnent `200|200|401`. Les travaux actifs
étaient `0|0|0` avant et pendant la bascule. Le relevé canonique est strictement inchangé :
`27|27|11|16|1|19|5` pour Tasks, workflows, usages, réservations, invocations, artefacts et réservations
`uncertain`. Résultat opérateur : `ACTIVATION_API_OK`. Aucune requête générative OpenAI n'avait
encore été effectuée à ce stade historique.

Le checkout serveur a ensuite été avancé à `ee6be6cb7791432da6e9982e20ecf994d4d19941` et le Worker
`f8e84dfdd1b1…` a remplacé `ce1b2bc9638c…`. La liaison déterministe Search vers Fetch est active,
le poller Temporal est sain, aucun travail n'était actif et les comptes sont restés strictement
`32|32|14|19|4|22|5` pendant l'activation. Image de retour conservée :
`nevolium-api-rollback/nevolium-worker:before-fetch-binding-ee6be6c`.

Le checkout cible est maintenant `5f4bdd35ee2a4743e45986d88523b7d83bb505f8`. Worker
`babd504b95f2…` et Web MCP `fcfba65ffada…` ont remplacé les images précédentes et le nouveau catalogue
répond. La synchronisation s'est arrêtée avant toute écriture : la liste publique des ToolServers masque
volontairement `endpoint_url`, mais le bootstrap essayait de comparer ce champ absent à
`http://nevolium-web-mcp:8090/mcp`. La lecture SQL et l'environnement Worker prouvent que les deux
valeurs réelles sont identiques sur 32 octets. Le registre reste en génération 1, les comptes restent
`35|35|15|20|6|23|5`, les travaux actifs `0|0|0` et aucune Task/OpenAI n'a été lancée.

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
Le candidat `0e57de2…` passe localement Ruff 0.13.0 F/E9, compilation et les contrats Research,
Web MCP, Tool/Task, News, registre MCP, Context Pack et gateway. Aucun appel OpenAI n'a été effectué.
Publication autorisée par l'utilisateur. Le connecteur GitHub a conservé l'arbre exact du commit
technique local `69c4c3d…` ; seul l'identifiant du commit change lors de cette publication.
Les 10 workflows GitHub sont ensuite passés au checkpoint `5f4bdd3…`. Le correctif `bef11ff…` ajoute
une vue interne minimale du binding ToolServer, protégée par le jeton interservice ; la liste publique
reste expurgée. Le bootstrap vérifie cette vue avant toute synchronisation. Contrats Web MCP, Tool/Task,
Research, OpenAPI, Ruff F/E9 et compilation réussis localement sans appel externe. Les 10 workflows
GitHub sont verts ; l'unique reset réseau Docker Hub de Foundation a réussi lors de la relance ciblée.

## Prochaine action exécutable

Le premier essai OpenAI `a1ea7662-4ab2-421a-9e60-5e6c0d7f2766` a terminé en 18 s avec deux usages et
deux réservations réglées, mais seulement `web.search`. La qualification a correctement refusé le
résultat et n'a pas lancé le second essai. Ce résultat est connu et ne doit pas être rejoué. Le défaut
observé vient du contrat du planificateur : « minimum utile » permettait d'ignorer une clé d'outil
explicitement demandée alors que le plan complet est produit avant toute exécution.

Le correctif Worker a été déployé sans travaux actifs et son poller Temporal est sain. La nouvelle Task
`f6946d6a-6139-4647-b6af-91f33ec09750` prouve que le plan corrigé a bien créé `web.search`, puis
`web.fetch` dans l'ordre. Search a terminé ; fetch a échoué, donc la Task et son workflow ont échoué
avant synthèse. Un seul usage et une seule réservation OpenAI ont été créés et réglés ; le second essai
n'a pas été lancé. Le diagnostic sans rejeu a identifié l'entrée exacte : le modèle avait placé
`TO_BE_FILLED_FROM_SEARCH_RESULT` dans `url`. Le lecteur Web n'était donc jamais arrivé à une URL réelle.
Les comptes après arrêt sont `32|32|14|19|4|22|5` ; les cinq réservations historiques `uncertain`
restent inchangées. Ne rejouer aucune de ces Tasks.

La liaison a été déployée et une nouvelle Task distincte
`00b08588-d1be-4e74-94ed-42a311df94b0` l'a effectivement utilisée : `web.search` a terminé puis
`web.fetch` a reçu l'URL réelle `https://www.msn.com/fr-fr/actualite/other/clap-de-fin-pour-debian-11-il-est-temps-de-migrer/ar-AA2bkf29`.
La recherche générale avait toutefois forcé SearXNG en catégorie `news` avec `time_range=year` ; les
trois résultats étaient MSN Debian 11, iOS et Dacia, sans source Debian officielle. Fetch a reçu HTTP
200 mais Trafilatura n'a trouvé aucun texte principal lisible. Temporal a rejoué dix fois cette erreur
MCP déjà retournée. Un seul usage et une seule réservation OpenAI ont été créés et réglés, aucune
synthèse n'a été lancée et le second essai n'a pas été créé. Les comptes après arrêt sont
`35|35|15|20|6|23|5`, les travaux actifs `0|0|0` et les cinq réservations historiques `uncertain`
restent inchangées. Ne rejouer aucune Task connue.

**Construire le Core et le Worker au checkpoint contenant `bef11ff…`.** Remplacer ensuite ces deux
services sans travail actif, puis resynchroniser le registre avec un jeton administrateur éphémère.
Web MCP `fcfba65ffada…` reste actif et n'a pas à être reconstruit.
Après la génération de registre attendue, lancer deux nouvelles Tasks Research séquentielles. Ne pas
réutiliser les UUID connus ni COLD-03/04/05. Le [protocole D04](docs/qualification-d04.md) porte la suite
finie et les limites, sans nouveau sous-lot.

Sortie H5 : Research OpenAI, charge bornée du pilote, upgrade/rollback, restauration indépendante.
Les preuves non affectées restent acquises. Aucun merge, tag H5 ou démarrage D05 avant cette sortie.

## Références

[État produit](docs/status.md) · [plan D01–D22](docs/implementation-plan.md) · [workflow](docs/development-workflow.md)
· [preuves serveur](docs/archive/server-foundation-2026-09-11.md) · [audit D04](docs/archive/d04-progress-audit-2026-09-13.md).
Les anciennes refs H/D restent retirées du développement actif. Réservoirs déjà inspectés : prototype
`ed12d503…`, `consolidate/g49-research-durable-stages` à `57a1a217…` ; aucun merge en bloc.
