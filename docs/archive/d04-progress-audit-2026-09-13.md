# Audit de progression D04 du 13 septembre 2026

## Conclusion

D04 progresse techniquement, mais sa conduite s'est fragmentée en trop de préparations, activations
et checkpoints documentaires. La qualification du modèle 0.5B rencontre des défauts de format successifs
alors qu'elle devait d'abord prouver le câblage. Le suivi doit distinguer les preuves acquises,
les bugs reproduits et les conditions restantes, sans rejouer les incidents.

L'audit corrige un vrai défaut de doublons Research et consolide les trois documents courants.
Il ne clôture pas H5 et ne prétend pas connaître le résultat COLD-05 manquant dans cette reprise.

## Sources et périmètre

- Dépôt cloné depuis GitHub, branche active selon `AGENTS.md` ; `main` vérifié à
  `45b74baa3ddf8910f2aaa3d23c63f3e9bbedcf60` ; PR #88 draft à
  `e8708934448255d1e1ab4207fe35ebf4bd5bcb5b` avant modifications.
- 86 commits propres à D04 depuis main, dont 40 messages commençant par `docs` ; 282 fichiers
  modifiés dans le diff de PR, largement influencé par la transition d'identité. Ces nombres
  ne mesurent ni le nombre de fonctionnalités ni le pourcentage d'achèvement.
- 323 fichiers suivis, dont 183 fichiers Python/TypeScript inspectés par inventaire statique.
  Revue détaillée de Research Core/Worker, gateway, checkpoints, routage, exécutions, protocole et CI.
- Dix workflows terminés avec succès au head de reprise, dont
  [Research](https://github.com/fredbuhr/nevolium/actions/runs/34767333592) et
  [D04 moteurs réels](https://github.com/fredbuhr/nevolium/actions/runs/34767333590).
- Les preuves cible viennent du [rapport serveur](server-foundation-2026-09-11.md).
  Aucun accès direct au serveur ; le fichier du dernier retour COLD-05 de la conversation précédente
  n'est pas disponible. La récupération du contexte ne remplace pas son contenu exact.

La revue des sources et les contrats ne constituent pas un audit exhaustif de toutes les branches
d'exécution ni une certification d'absence de bugs.

## Pourquoi D04 s'est allongé

| Observation | Diagnostic | Décision |
|---|---|---|
| Installation réelle, TLS/MFA, identité Nevolium, secrets, PDF et mémoire ajoutés dans D04 | Avancement réel, avec extension de fait de la campagne au premier déploiement | Conserver les acquis ; pas de remise à zéro |
| Research échoue d'abord sur les délais puis sur 12 threads pour un quota de 2 CPU | Bugs de runtime confirmés ; hausse initiale du délai insuffisante | Configuration deux threads conservée ; ne plus relever les seuils sans mesure |
| COLD-03 puis COLD-04 échouent sur des formes JSON différentes | Deux correctifs utiles, mais approche au cas par cas coûteuse et qualité 0.5B non démontrée | Examiner COLD-05 ; si la qualité échoue encore, qualifier les prompts/modèle avant un autre cycle cible |
| Préparation, build et activation répétés pour chaque petite correction | Prudence sur les données utile, nombreux allers-retours opérateur | Regrouper les défauts démontrés, régressions et activation du composant affecté |
| `PROJECT_STATE` 222 lignes, `status` 310, protocole 361 ; mêmes étapes avec plusieurs anciennes prochaines actions | Dette de suivi et risque de refaire du travail | Checkpoint compact, état produit synthétique, protocole stable, historique dans les preuves |
| Quatre conditions de sortie encore ouvertes | H5 n'est pas terminé, même avec CI verte | Tableau explicite dans le protocole ; pas de nouveau sous-lot ni D05 anticipé |

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
Les intégrations et la concurrence sur PostgreSQL doivent être vérifiées sur le head final de
[#88](https://github.com/fredbuhr/nevolium/pull/88), sans extrapoler le succès du head de reprise.

Les trois documents courants ont été consolidés. Les versions exactes avant nettoyage restent
accessibles dans Git : [checkpoint](https://github.com/fredbuhr/nevolium/blob/e8708934448255d1e1ab4207fe35ebf4bd5bcb5b/PROJECT_STATE.md),
[état produit](https://github.com/fredbuhr/nevolium/blob/e8708934448255d1e1ab4207fe35ebf4bd5bcb5b/docs/status.md),
[protocole](https://github.com/fredbuhr/nevolium/blob/e8708934448255d1e1ab4207fe35ebf4bd5bcb5b/docs/qualification-d04.md).
Les archives de preuves n'ont pas été réécrites.

Prochaine action : obtenir et lire le retour COLD-05 avant toute nouvelle Task, puis suivre le
[tableau des quatre preuves H5 restantes](../qualification-d04.md#restauration-et-passage-de-h5).
Le correctif Core de cette reprise n'est pas déployé ; le Worker existant n'a pas besoin d'être
reconstruit pour examiner COLD-05. Aucun serveur, modèle ou donnée de production n'a été modifié.
