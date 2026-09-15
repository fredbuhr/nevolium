# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D06 intégré ; passage à D07 autorisé

| Champ | État attesté |
|---|---|
| `main` vérifié | D06 intégré par [PR #90](https://github.com/fredbuhr/nevolium/pull/90), commit de fusion signé `20720774552418a6c9e7acbfbf069945ff0f57df` |
| Vérification du merge | Parents exacts `03a1fcf348361f870556e0c8808cae5d70970394` + `b09a62cd207371c2610d16198bbbaa0b46561c1c`; arbre du merge `5d29dfaee0b0c0d4857956efeb4da8f4254151d0`, identique à la tête D06 fusionnée |
| Branche / PR active | Aucune après nettoyage D06 ; ne pas réutiliser `feat/d06-planning-workspace` |
| Tête D06 qualifiée | `b09a62cd207371c2610d16198bbbaa0b46561c1c` : **9/9 workflows PR réussis** après le commit documentaire final |
| Réalisé D06 | Fondation FR/EN extensible ; sous-tâches/jalons/dépendances ; projection paginée ; calendrier de travail/DST ; récurrences virtuelles ; chemin critique ; preview/apply ; effets aval explicites ; Liste/Kanban/Gantt/Calendrier et cohérence Today |
| Validation navigateur | Tablette tactile : Gantt + alternative d'édition ; téléphone : calendrier + preview/apply + reload Planning + Today. Preuve fonctionnelle conservée dans le checkpoint D06 |
| Incident fermé | Crash SVAR `null.forEach` : les feuilles (`data=null`) ne sont plus `open`; seules les tâches ayant un enfant rendu sont ouvertes et la règle est couverte par contrat |
| Production | **Inchangée** : runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; la fusion D06 ne constitue pas un déploiement |
| Données / récupération | Snapshots et matériel D04/D05 préservés ; aucune ancienne Task, réservation, clé, volume ou sauvegarde modifié par D06 |
| Migrations D06 | `0016_planning_structure` puis `0017_project_work_calendar`, intégrées au code et qualifiées en CI mais non appliquées au pilote |
| Limites | Complétude FR/EN en D13 ; voix anglaise non qualifiée ; calendriers externes D11 ; offline/synchronisation D12 ; pas de solveur universel |
| Rollback futur | Si D06 est déployé puis retiré : examiner les données et downgrader `0017` → `0016` → `0015` après arrêt/drainage ; aucun rollback production requis aujourd'hui |
| Prochaine action | Annoncer D07, relire son périmètre dans `docs/implementation-plan.md`, vérifier le `main` live puis ouvrir une seule branche D07 fraîche. Ne pas commencer D08/D09 en parallèle |

## Autorité et continuité

PostgreSQL/Core restent l'autorité de planification. SVAR est uniquement un renderer/input Gantt et
le calendrier D06 est une surface Nevolium dédiée. Les mutations de dates passent par aperçu puis
application atomique versionnée ; les effets aval doivent être explicitement inclus. Les occurrences
récurrentes sont virtuelles et bornées. Today, Liste, Kanban, Gantt et Calendrier relisent les mêmes
Tasks canoniques.

La fondation linguistique accepte `fr`/`en`, persiste le choix et propage la locale aux surfaces
touchées. Elle prépare les langues futures sans remplacer D13, qui reste le gate de complétude du
produit entier. Aucune voix TTS anglaise n'est déduite de la voix française existante.

[Checkpoint D06 détaillé](docs/archive/d06-planning-workspace-progress-2026-09-15.md) ·
[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [PR #90](https://github.com/fredbuhr/nevolium/pull/90)
