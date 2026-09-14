# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-14. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## Source canonique et lot actif

| Champ | État vérifié |
|---|---|
| `main` | `45b74baa3ddf8910f2aaa3d23c63f3e9bbedcf60` ; D03 intégré par #87 |
| Acquis intégrés | Reset R0–R7, H1–H4, D01–D03 ; dernier jalon produit G51 Daily Spine |
| Lot actif | **D04 : moteurs réels et exploitation, sortie H5** ; D05 non commencé |
| Branche / PR | `hardening/d04-real-engine-qualification`, [#88](https://github.com/fredbuhr/nevolium/pull/88), draft ; une seule branche active |
| Checkout cible | `a876af5f94eccca181df2b546a21989f62643d8c` ; correctif PostgreSQL déployé ; arrêt sur le contrôle d’identité OpenBao avant backup |
| Correctif actif | Requête ciblée et classement des sources déployés ; 10/10 workflows réussis à `a463546…`, attribution LiteLLM et plafond 4096 conservés |
| Gate courante | Research OpenAI, charge complète et upgrade/rollback acquis ; seule la restauration indépendante reste avant H5 |
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
| Core | image `69453e7b1348…`, correctif `bef11ff…` actif |
| Worker | image `cb9b73de90824416a9ce438107af3bf30613248838c6bac282d89d0b7ce23200`, code `a463546…` actif ; sortie modèle 4096 |
| Web | image `55a970ff01c4…`, construite au SHA technique `7fb2211…` |
| LiteLLM | image épinglée `29a0daf2593d…` ; routes API `smart`/`alternative`, sans route locale |
| Web MCP | image `fcfba65ffada…`, correctif `0e57de2…` actif ; registre synchronisé génération 2 |

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

Le checkout a ensuite été avancé à `29638ae8dbf05a5dbcc9383d94d5d546ee6c54e7`. Core
`69453e7b1348…` et Worker `695e06a8ca32…` ont été activés ; Web MCP `fcfba65ffada…` est resté
inchangé. Le bootstrap interne a réussi et le registre est passé de génération 1 à 2 : seul le schéma
`web.search` a changé, `web.fetch` et les deux politiques read-only A1 sont restés cohérents. Les
pollers Temporal sont sains, les comptes sont restés `35|35|15|20|6|23|5`, les travaux actifs
`0|0|0`, le jeton administrateur éphémère a été effacé et aucune Task/OpenAI n'a été lancée.

Le checkout a enfin été avancé à `617a5f99f1f22bf8e232d259fcc48914f1ae3e4e`. Le Worker
`933fdacb68ec…` a remplacé `695e06a8ca32…` ; Core et Web MCP sont restés inchangés. La limite de
sortie API est passée de 256 à 4096 et le chemin d'attribution du déploiement LiteLLM est actif. Le
Worker est présent dans les deux queues Temporal, les comptes sont restés `38|38|17|22|8|25|5`,
les travaux actifs `0|0|0` et aucune Task/OpenAI n'a été lancée. Retour conservé sous
`nevolium-api-rollback/nevolium-worker:before-output-617a5f9` et sauvegarde privée de l'environnement
`/etc/nevolium/production.env.before-output-617a5f9.5hSaTc`.

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
Le candidat `ae4e7fb…` préfère l'en-tête de déploiement `x-litellm-model-name` au champ de réponse
réécrit avec l'alias. Contrats gateway, Research, Context Pack, News et routage sémantique, Ruff F/E9,
Ruff ciblé, compilation et diff réussissent localement sans appel fournisseur. Le contrat SQL
d'admission attend la base jetable de CI et n'a pas été exécuté contre une base locale persistante.
Les 10 workflows GitHub sont verts au checkpoint exact `449a68800f5527afa55f0df004b2e8abf91c3183`,
y compris Autonomous Research, Foundation et D04.
Le checkpoint documentaire final `617a5f99f1f22bf8e232d259fcc48914f1ae3e4e` passe aussi les 10
workflows. L'unique reset Docker Hub du premier job Foundation a réussi lors de la relance ciblée ;
les neuf jobs Foundation et D04 sont verts.

## Historique des essais Research (ne pas rejouer)

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

Le bootstrap corrigé est déployé et le registre est synchronisé. La nouvelle Task
`e6af6434-22da-4efc-b2f2-881d039fd5c6` a terminé `web.search` puis `web.fetch` sur
`https://www.debian.org/download.fr.html`. Les deux usages OpenAI ont des tokens/coûts reportés et
leurs réservations sont réglées. La synthèse a toutefois atteint exactement l'ancienne limite cible de
256 jetons et son JSON a été coupé au caractère 825 ; le workflow a échoué sans artefact parent et le
second essai n'a pas été créé. Les comptes sont `38|38|17|22|8|25|5`, travaux actifs `0|0|0`.
La même lecture a montré que LiteLLM remet l'alias `smart` dans le champ `model`, donc l'attribution
canonique doit lire son en-tête de déploiement. Ne pas rejouer cette Task.

La Task `48cad72d-cd45-415a-89a8-41cc2ea6be43` est terminée avec son artefact et deux usages
`openai/gpt-4.1` réglés (total 0,018782 USD). Elle ne valide pas H5 : la requête générale a conduit
à la page de téléchargement, qui ne contient pas la date initiale ; la synthèse reconnaît ce manque.
L'extrait Fetch n'est pas tronqué. Comptes attestés `41|41|19|24|10|28|5`, travaux actifs `0|0|0`.
Les deux arrêts SQL précédents appartenaient au bloc opérateur, avant toute Task ou appel IA.
Ne rejouer aucune de ces tentatives et ne pas abaisser les exigences de preuve.

Le correctif Worker demande des requêtes ciblées sur les faits et choisit parmi les résultats du
domaine autorisé celui dont les titres/extraits recouvrent le plus de mots de la requête persistée.
Classement déterministe, égalités stables, URL explicites préservées, aucune dépendance/migration,
aucun nouvel appel modèle et aucune règle spécifique Debian. Il s'agit d'une heuristique, pas d'une
garantie de complétude. Contrats Research, Context Pack, gateway, mémoire et ownership réussis
localement, Ruff F/E9 et compilation réussis. Web MCP local bloqué par le proxy SOCKS du workspace
(socksio absent), à valider en CI ; aucun changement de dépendance pour contourner ce point.
Les 10 workflows au SHA publié `a4635462a4380aad2b2b991053c1078e36e5e79a` sont verts,
y compris le contrat Web MCP en CI. Le job local optionnel est skipped conformément à ADR-031.

## Research acquis sur cible le 14 septembre 2026

Activation du seul Worker à `a463546…`, pollers sains, Core/Web MCP conservés. Retour :
`nevolium-api-rollback/nevolium-worker:before-relevance-a463546` (image `933fdacb68ec…`).
Deux nouvelles Tasks ont réussi Search puis Fetch et leur synthèse :

| Task | Artefact parent | Durée | Coût reporté |
|---|---|---|---|
| `306fd2fe-afde-4260-b560-153dd2192d16` | `e938acdb-d915-4284-80f7-86df3dd706b8` | 23,591 s | 0,021516 USD |
| `d1455d14-2999-4c7e-9a4b-8688735d1499` | `46f22a44-0c28-4ee4-af32-996913aa7d00` | 9,524 s | 0,018248 USD |

Réponse correcte : Trixie, publication initiale le 9 août 2025. La date est étayée par l'extrait
Search de la page officielle des versions (E1). Fetch a lu l'annonce de mise à jour du 10 janvier
2026 : E2 confirme le nom de code, pas la date initiale ; les claims citent E1 pour cette date.
Cette limite du classement lexical est conservée, sans prétendre que Fetch a lu l'annonce initiale.
Quatre usages `openai/gpt-4.1` avec tokens/coûts reportés et quatre réservations réglées,
total 0,039764 USD. Comptes `41|41|19|24|10|28|5` → `47|47|23|28|14|34|5`, delta exact
`6|6|4|4|4|6|0`, travaux actifs `0|0|0`, cinq incertains historiques conservés.
Rapport opérateur : `/var/lib/nevolium/qualification/d04-openai-relevance-20260914T012643Z.jsonl`.
Résultat final : `CORRECTION_ET_PREUVE_RESEARCH_D04_OK`. Aucun rejeu à prévoir.

## Charge et rollback acquis sur cible

La charge de lecture est acquise sur la cible au code `a463546…`. Le runner a vérifié TLS, le refus
anonyme/invalide et cinq routes internes non exposées, puis les quatre paliers avec concurrence 20 :
3 requêtes/1 client (p95 0,057 s), 30/10 (0,398 s), 300/100 (0,524 s) et 3 000/1 000
(0,445 s), zéro erreur. Les 1 000 sont des clients virtuels alimentés par un seul compte réel ; le
générateur tournait dans le conteneur Core de la même cible, limité à 2 CPU et 1 Gio. Le serveur
mesuré reste 12 CPU, 32 Gio. Aucun conteneur n'a redémarré ou subi d'OOM ; comptes inchangés
`47|47|23|28|14|34|5`, travaux actifs `0|0|0`, aucun appel IA. Rapport :
`/var/lib/nevolium/qualification/d04-load-20260914T014343Z.LMEDPZ/load.json`.
La séquence mixte suivante a lancé simultanément un Research, un PDF Docling et une projection
Mem0/Graphiti. Research a terminé en 13,217 s avec deux usages `openai/gpt-4.1`, deux réservations
réglées et un coût reporté de 0,017448 USD. Docling 2.126.0 a produit un chunk après 1,471 s
d'attente d'admission et 39,499 s d'exécution. La mémoire réelle a attendu 43,378 s pendant Docling,
puis a terminé en 21,451 s avec `graphiti-neo4j` et `mem0-pgvector`. Les états
`waiting → active → finished` et l'absence de deux travaux lourds simultanés pour le propriétaire
prouvent l'application du quota. Les trois parcours et leurs cinq Tasks/workflows/artefacts ont terminé ; delta
canonique exact `5|5|2|2|2|5|0`, comptes finaux `52|52|25|30|16|39|5`, cinq incertains historiques,
aucun travail ou outbox oublié. Rapport :
`/var/lib/nevolium/qualification/d04-mixed-rollback-20260914T063303Z.Y09SHw/mixed.jsonl`.

Le même bloc a ensuite activé l'ancien Worker `933fdacb68ec…`, vérifié pollers, services,
configuration de production et accès publics `200|401|401|404`, sans modifier les compteurs ni
rejouer de Task. Le candidat `cb9b73de908…` a été réactivé et contrôlé avec la limite 4096 et la
mémoire réelle ; Core `69453e7b1348…` et Web MCP `fcfba65ffada…` sont restés inchangés. Résultat :
`CHARGE_MIXTE_ET_ROLLBACK_D04_OK`.

## Prochaine action exécutable

L'utilisateur a créé un bucket Backblaze B2 privé et une clé Read/Write limitée à ce bucket ; aucun
identifiant n'a été transmis ou versionné. Le premier lancement du runner à `abb479a…` s'est arrêté
avant toute saisie B2, sauvegarde ou mutation : il attendait encore à tort
`/etc/nevolium/openbao-recovery.json`, supprimé après validation de sa copie chiffrée hors site. Le
correctif exige désormais l'export déchiffré uniquement dans `/run`, n'utilise que les trois parts
OpenBao au seuil deux, ignore l'ancien jeton root révoqué et place seulement une copie assainie sans
jeton root dans Restic. PostgreSQL, JetStream et SeaweedFS reçoivent des marqueurs jetables ; OpenBao
est prouvé sans écriture privilégiée par comparaison de l'enregistrement persistant du jeton workload.
Le lancement à `fb8d918…` a validé les secrets saisis et créé `/etc/nevolium/restic.env` root
`0600`, puis s'est arrêté avant marqueur et snapshot : Restic signalait normalement par le code 10
que le dépôt n'existait pas encore, mais le runner refusait ce code avant de pouvoir lancer `init`.
La reprise V4 à `e00d284…` a réparé l'index Git, réutilisé les secrets B2 et initialisé le dépôt :
Restic 0.19.1, aucun snapshot existant. La taille des quatre volumes (environ 155 Mio) passe le garde.
Elle s'est arrêtée sur `marqueur PostgreSQL non cree` avant backup et restauration, dans le rapport
`/var/lib/nevolium/qualification/d04-off-host-recovery-20260914T115600Z.5d5b58/recovery.json`.
Les comptes `52|52|25|30|16|39|5` et travaux/outbox `0|0|0|0` sont attestés **avant** le marqueur,
pas après : un artefact jetable peut rester inséré. Ne pas relancer ni supprimer par catégorie.

Le correctif ajoute `psql -q` pour séparer les lignes RETURNING des command tags, arme le nettoyage
avant l'INSERT même si la réponse est perdue et consigne l'UUID prévu avant toute mutation.
Il transmet aussi la confirmation exigée par restore.sh uniquement pour le nom de projet isolé
généré et après contrôle de collision. Aucun garde de restore.sh n'est retiré.
Les contrats couvrent la réponse SQL invalide/perdue après commit et l'échec du magasin suivant ;
un test CI PostgreSQL réel vérifie les sorties RETURNING (Docker indisponible localement).

Le diagnostic puis la reprise opérateur confirment la suppression de l'unique marqueur résiduel
`5d5b58c3-cff1-4d5b-ba0c-593aa31768c1`, le retour à `52|52|25|30|16|39|5` et le checkout
`a876af5…` (10/10 workflows verts, dont le contrat PostgreSQL réel). Le nouvel essai du 14 septembre
à 12:20 UTC s'arrête dans `seed-source-recovery-evidence` sur
`identite durable du jeton OpenBao inattendue`, après les écritures des trois marqueurs et avant backup.
Rapport : `/var/lib/nevolium/qualification/d04-off-host-recovery-20260914T122009Z.6fb33b/recovery.json`.
Le dépôt contient encore zéro snapshot au précontrôle. Le nettoyage final a été tenté sans message
d'échec affiché ; les compteurs et l'absence des trois marqueurs restent à confirmer par lecture.

Prochaine action : extraire exclusivement les propriétés non secrètes de la réponse lookup-self déjà
journalisée, comparer l'accessor en mémoire aux métadonnées de bootstrap sans l'afficher, et vérifier
le nettoyage dans les trois magasins. Le renouvellement existant valide accessor/policy/période/orphan ;
le runner ajoute un nom d'affichage exact. Ne pas supposer lequel diffère ni renouveler/révoquer le jeton
pour contourner ce contrôle. D04 reste ouvert ; aucune reprise de backup avant diagnostic.
Les six secrets B2/Restic ne sont plus demandés. Après la preuve de restauration, consigner le rapport final,
repasser la CI du head, finaliser et intégrer #88, poser le tag H5 puis retirer la branche avant D05.
Le [protocole D04](docs/qualification-d04.md) conserve les seuils et limites.
Les preuves non affectées restent acquises. Aucun merge, tag H5 ou D05 avant leur validation.

## Références

[État produit](docs/status.md) · [plan D01–D22](docs/implementation-plan.md) · [workflow](docs/development-workflow.md)
· [preuves serveur](docs/archive/server-foundation-2026-09-11.md) · [audit D04](docs/archive/d04-progress-audit-2026-09-13.md).
Les anciennes refs H/D restent retirées du développement actif. Réservoirs déjà inspectés : prototype
`ed12d503…`, `consolidate/g49-research-durable-stages` à `57a1a217…` ; aucun merge en bloc.
