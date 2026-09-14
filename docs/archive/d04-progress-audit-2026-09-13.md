# Audit de progression D04 du 13 septembre 2026

## Conclusion

D04 progresse techniquement, mais sa conduite s'est fragmentée en trop de préparations, activations
et checkpoints documentaires. La qualification du modèle 0.5B rencontre des défauts de format successifs
alors qu'elle devait d'abord prouver le câblage. Le suivi doit distinguer les preuves acquises,
les bugs reproduits et les conditions restantes, sans rejouer les incidents.

L'audit corrige un vrai défaut de doublons Research et consolide les trois documents courants.
Le retour COLD-05 reçu ensuite confirme que la chaîne atteint les outils et la synthèse, mais que le
modèle 0.5B n'est pas qualifiable pour Research. H5 reste ouvert.

## Sources et périmètre

- Dépôt cloné depuis GitHub, branche active selon `AGENTS.md` ; `main` vérifié à
  `45b74baa3ddf8910f2aaa3d23c63f3e9bbedcf60` ; PR #88 draft à
  `e8708934448255d1e1ab4207fe35ebf4bd5bcb5b` avant modifications.
- 86 commits propres à D04 depuis main, dont 40 messages commençant par `docs` ; 282 fichiers
  modifiés dans le diff de PR, largement influencé par la transition d'identité. Ces nombres
  ne mesurent ni le nombre de fonctionnalités ni le pourcentage d'achèvement.
- 323 fichiers suivis, dont 183 fichiers Python/TypeScript inspectés par inventaire statique.
  Revue détaillée de Research Core/Worker, gateway, checkpoints, routage, exécutions, protocole et CI.
- Le head publié `7b1ded0fa0849d3607e7b76bc26f38c01c5cab1d` passe dix workflows, dont
  [Research](https://github.com/fredbuhr/nevolium/actions/runs/34770471731) et
  [D04 moteurs réels](https://github.com/fredbuhr/nevolium/actions/runs/34770471699).
- Les preuves cible viennent du [rapport serveur](server-foundation-2026-09-11.md).
  Aucun accès direct au serveur. Le diagnostic COLD-05 fourni après le premier audit est une lecture
  seule du checkout cible `e870893…` et se termine par l'attestation qu'aucune Task n'a été relancée et
  qu'aucune donnée n'a été modifiée.

La revue des sources et les contrats ne constituent pas un audit exhaustif de toutes les branches
d'exécution ni une certification d'absence de bugs.

## Pourquoi D04 s'est allongé

| Observation | Diagnostic | Décision |
|---|---|---|
| Installation réelle, TLS/MFA, identité Nevolium, secrets, PDF et mémoire ajoutés dans D04 | Avancement réel, avec extension de fait de la campagne au premier déploiement | Conserver les acquis ; pas de remise à zéro |
| Research échoue d'abord sur les délais puis sur 12 threads pour un quota de 2 CPU | Bugs de runtime confirmés ; hausse initiale du délai insuffisante | Configuration deux threads conservée ; ne plus relever les seuils sans mesure |
| COLD-03/04 échouent sur des enveloppes JSON, puis COLD-05 sur la pertinence et la synthèse non JSON | La chaîne fonctionne, mais les normalisations successives ne peuvent pas qualifier un modèle 0.5B | Arrêter les rejeux ; schéma natif, puis comparaison bornée de modèles avant une seule activation |
| Préparation, build et activation répétés pour chaque petite correction | Prudence sur les données utile, nombreux allers-retours opérateur | Regrouper les défauts démontrés, régressions et activation du composant affecté |
| `PROJECT_STATE` 222 lignes, `status` 310, protocole 361 ; mêmes étapes avec plusieurs anciennes prochaines actions | Dette de suivi et risque de refaire du travail | Checkpoint compact, état produit synthétique, protocole stable, historique dans les preuves |
| Quatre conditions de sortie encore ouvertes | H5 n'est pas terminé, même avec CI verte | Tableau explicite dans le protocole ; pas de nouveau sous-lot ni D05 anticipé |

## Résultat COLD-05 : arrêt des rejeux du modèle 0.5B

Une seule Task `ccb61e1c-7fb2-460b-ad70-e4cef359ed42` et un seul Workflow
`nevolium-task-ccb61e1c-7fb2-460b-ad70-e4cef359ed42`, run
`01a09b88-5941-75f9-a32d-ba01cd0b6026`, existent pour le marqueur. Ils passent de 16:09:59 à
16:10:47 UTC, puis échouent sans retry.

| Étape | Observation | Conclusion |
|---|---|---|
| Planning | 2 307 jetons d'entrée, 76 de sortie ; objet accepté | Le format du plan franchit le correctif COLD-04 |
| Outil | Un seul `web.search`, terminé, cherche littéralement le marqueur COLD-05 | Mauvais suivi de l'instruction ; résultats sans rapport avec Debian |
| Fetch | Aucun appel `web.fetch` | Séquence demandée incomplète |
| Synthèse | 2 050 jetons d'entrée, 13 de sortie ; HTTP 200 mais `JSONDecodeError` au premier caractère | Sortie non JSON, aucun artefact Research final |
| Comptabilité | Totaux 2 383 et 2 063 jetons, coût local nul, deux réservations `settled` | Aucun usage ni lease actif abandonné |
| Runtime | Chargement froid 1,58 s, deux threads, environ 17,23 s puis 12,88 s de calcul | Ni timeout, ni OOM, ni redémarrage : défaut de capacité du modèle |

Les cinq réservations historiques `uncertain` restent inchangées. Les services publics répondent
`200|200|401`. Cette exécution prouve le câblage Ollama/LiteLLM, l'appel MCP et la comptabilité ; elle
ne prouve ni une recherche pertinente ni une synthèse utilisable. COLD-05 ne doit pas être rejouée.

## Défaut corrigé : slot Research réutilisable par un autre outil

**Priorité P1 dans le périmètre interne Research : limite d'appels et idempotence insuffisantes.**
Dans `services/core/src/nevolium_core/research.py`, `start_research_tool` recherche l'invocation
existante par `research:{parent}:{slot}:{tool_key}`. Le test `slot < max_tool_calls` ne suffit donc
pas : changer d'outil conserve le numéro de slot mais produit une autre clé et une autre Task.
Il n'y avait pas non plus de verrou parent avant la recherche puis l'insertion.

Reproduction locale sur les vrais modèles SQLAlchemy et la fonction Core, avec SQLite pour les
requêtes relationnelles, effets d'audit et dispatch Temporal simulés :

| Séquence avec `max_tool_calls=1` | Avant | Après |
|---|---|---|
| Outil `fixture.search`, slot 0 | Accepté | Accepté |
| Même appel, même slot | Même invocation | Même invocation |
| Outil `fixture.lookup`, slot 0 | Deuxième invocation acceptée | HTTP 409, aucune deuxième invocation |
| Nombre d'invocations | 2 | 1 |

Le correctif verrouille la Task parente jusqu'au commit, recherche toutes les liaisons du slot
indépendamment du nom d'outil, refuse une liaison différente et refuse un historique déjà ambigu.
Les UUID et clés existants sont conservés pour le rejeu, sans migration ni modification des données.
Le point d'accès reste interne et authentifié ; cet audit ne démontre pas une exploitation publique.

Le scénario **existant** `scripts/smoke/research_boundary.py` est étendu : second outil sur un slot
occupé refusé ; huit requêtes simultanées sur deux outils ne produisent qu'une liaison ; huit rejeux
identiques partagent invocation, Task et WorkflowExecution ; slot hors budget refusé. La concurrence
doit être prouvée par Core/PostgreSQL/Temporal en CI, SQLite n'étant pas une preuve de verrouillage.

## Doublons, code mort et limites restantes

- Ruff 0.13.0 F/E9 passe sur Core, Worker, scripts d'exploitation, smoke et qualification : aucun
  import mort ou défaut syntaxique signalé dans ce périmètre.
- Le contrat d'identité passe : aucun résidu d'identité technique antérieure dans l'arbre suivi.
- Inventaire AST : aucune duplication exacte détectée des corps de fonctions Python de plus de
  dix lignes impliquant le runtime ; aucun helper module-level non décoré du runtime sans autre
  référence textuelle. Cette heuristique ne justifie pas de suppressions automatiques.
- Les stubs mémoire sont utilisés par les fixtures et refusés en production par la configuration.
  Les scaffolds Desktop/graphes et composants optionnels correspondent aux lots futurs ; ils ne
  sont pas présentés comme fonctionnalités livrées ni supprimés comme prétendu code mort.
- Les anciennes branches H/D existent encore, mais sont retirées du développement actif. Elles
  ne sont pas des doubles déployés ; leur retrait relève du nettoyage après intégration.
- Les anciens états terminaux sans `completed_at` sont des observations historiques. Le code de
  terminalisation actuel renseigne le champ ; aucune date historique n'est inventée rétroactivement.
- Défauts d'affichage et partage d'erreurs Command/News encore signalés ; non reproduits ici.
  La pertinence du routage, le modèle quotidien, la charge mixte, le rollback et la restauration
  indépendante restent à qualifier. Aucun défaut n'est masqué par la consolidation documentaire.

## Validation de la correction et reprise

Environnement local : Python 3.12.14 ; uv 0.12.13 installé dans l'espace de travail pour respecter
`uv.toml`, puis `uv sync --locked --all-packages` réussi, sans changement du lockfile.
Ruff F/E9, identité et contrats Research, gateway/comptabilité, Context Pack, ownership Research,
états terminaux réussis. La reproduction relationnelle passe de deux invocations à une.
La CI de `7b1ded0…` prouve ensuite la concurrence Core/PostgreSQL et le rejeu Worker réel. Les ajouts
suivants transmettent les schémas Pydantic Planning/Synthèse par `response_format` LiteLLM et ajoutent
une présélection directe Ollama sans Task canonique. Leurs contrats locaux passent ; leurs intégrations
doivent être vérifiées sur le prochain head de [#88](https://github.com/fredbuhr/nevolium/pull/88).

Les trois documents courants ont été consolidés. Les versions exactes avant nettoyage restent
accessibles dans Git : [checkpoint](https://github.com/fredbuhr/nevolium/blob/e8708934448255d1e1ab4207fe35ebf4bd5bcb5b/PROJECT_STATE.md),
[état produit](https://github.com/fredbuhr/nevolium/blob/e8708934448255d1e1ab4207fe35ebf4bd5bcb5b/docs/status.md),
[protocole](https://github.com/fredbuhr/nevolium/blob/e8708934448255d1e1ab4207fe35ebf4bd5bcb5b/docs/qualification-d04.md).
Les archives de preuves n'ont pas été réécrites.

Prochaine action : comparer Qwen3 4B et 8B avec le runner borné, sans Task canonique ni Web réel, puis
conserver son JSON. Un candidat doit réussir tous les critères et les limites de temps/mémoire ; sinon
la campagne s'arrête. Le correctif Core et le Worker à schéma natif ne sont pas déployés. Aucun serveur,
modèle ou donnée de production n'a été modifié pendant cette reprise.
