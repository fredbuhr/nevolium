# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D06 qualifié sur branche ; intégration en attente

| Champ | État attesté |
|---|---|
| Base D06 vérifiée | `main` `03a1fcf348361f870556e0c8808cae5d70970394`, D05 déjà intégré |
| Branche / PR active | `feat/d06-planning-workspace` · [PR #90](https://github.com/fredbuhr/nevolium/pull/90), encore draft pendant la clôture |
| Tête fonctionnelle qualifiée | `9730e9c10aabf1a8725173dddbf26c66abe8f9ef` : **9/9 workflows PR réussis** |
| Réalisé D06 | Fondation FR/EN extensible ; structure canonique sous-tâches/jalons/dépendances ; projection paginée ; calendrier de travail/DST ; récurrences virtuelles ; chemin critique ; preview/apply de replanification ; effets aval explicites ; Liste/Kanban/Gantt/Calendrier et cohérence Today |
| Validation navigateur | Tablette tactile : Gantt + alternative d'édition ; téléphone : calendrier + preview/apply + reload Planning + Today. Artefact `10401197268`, digest `bcb91b747f8274649f83f810fbcce504062780d67f889f7f5f2fa9ef64ecd297` |
| Incident fermé | Crash SVAR `null.forEach` causé par `open: true` sur les feuilles (`data=null`) ; seules les tâches ayant un enfant rendu sont désormais ouvertes, règle couverte par contrat |
| Production | **Inchangée** : runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; D06 n'est ni fusionné ni déployé à ce checkpoint |
| Données / récupération | Snapshots et matériel de récupération D04/D05 préservés ; aucune ancienne Task, réservation, secret, volume ou sauvegarde modifié par D06 |
| Migrations D06 | `0016_planning_structure` puis `0017_project_work_calendar`, qualifiées en CI seulement |
| Limites | Complétude FR/EN en D13 ; voix anglaise non qualifiée ; calendriers externes D11 ; offline/synchronisation D12 ; pas de solveur universel |
| Rollback | Si D06 est ultérieurement déployé : examiner les données puis downgrade `0017` → `0016` → `0015` après arrêt/drainage ; aucune action de rollback production requise maintenant |
| Prochaine action | Qualifier la tête documentaire courante de #90 ; si les checks restent verts, mettre la PR à jour/fusionner, revérifier `main`, actualiser ce checkpoint au statut intégré puis retirer la branche D06 |

## Ce que D06 verrouille

PostgreSQL/Core restent l'autorité de planification. SVAR n'est qu'un renderer/input Gantt ; le
calendrier Web D06 est une vue Nevolium dédiée. Aucun état métier parallèle n'est confié à une
bibliothèque UI. Les mutations de dates passent par aperçu puis application atomique avec version ;
les effets aval sont proposés et doivent être explicitement inclus avant un second aperçu. Les
occurrences récurrentes sont virtuelles et bornées. Today, Liste, Kanban, Gantt et Calendrier
relisent les mêmes Tasks canoniques.

La fondation linguistique accepte `fr`/`en`, persiste le choix et propage la locale aux surfaces
touchées. Elle prépare les langues futures mais ne remplace pas le gate D13 de traduction complète.
Aucune voix anglaise n'a été inventée à partir de la voix française existante.

[Checkpoint D06 détaillé](docs/archive/d06-planning-workspace-progress-2026-09-15.md) ·
[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [PR #90](https://github.com/fredbuhr/nevolium/pull/90)
