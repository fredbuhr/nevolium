# D06 — planification cohérente et fondation multilingue — checkpoint du 15 septembre 2026

## Point de départ et statut

D06 a été ouvert depuis le `main` live `03a1fcf348361f870556e0c8808cae5d70970394` sur
`feat/d06-planning-workspace`, PR #90. La tête fonctionnelle qualifiée est
`9730e9c10aabf1a8725173dddbf26c66abe8f9ef` : les 9 workflows PR sont réussis.
La PR reste volontairement en brouillon pendant la clôture documentaire ; D06 n'est donc pas encore
intégré ni déployé au moment de ce checkpoint.

Le serveur pilote reste sur le runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` et le schéma
`0015_model_configurations`. Les migrations D06 `0016_planning_structure` et
`0017_project_work_calendar` n'ont été appliquées qu'en CI sur des bases de qualification. Aucun
conteneur, snapshot B2, secret, Task historique ou donnée de production n'a été modifié par D06.

## Résultat livré dans la branche

| Zone | Comportement qualifié |
|---|---|
| Modèle canonique | Profils de planification versionnés, sous-tâches, tâches/jalons, dépendances FS/SS/FF/SF et calendrier de travail par projet, sans second modèle propre au Gantt |
| Projection | Lecture owner-scoped et paginée des mêmes Tasks canoniques ; les anciennes Tasks sans profil reçoivent des valeurs de projection par défaut sans duplication de vérité |
| Cycles et conflits | Refus des cycles hiérarchiques et de dépendances, verrou projet pour les mutations structurelles, contrôle `expected_version` et isolation entre propriétaires |
| Chemin critique | Calcul déterministe côté Core, d'abord en temps écoulé puis raccordé au calendrier de travail ; réseau incomplet signalé explicitement et tâches non planifiées exclues sans inventer de dates |
| Calendrier de travail | Fuseau IANA, semaine ouvrée et exceptions datées versionnées ; calculs bornés et scénarios DST qualifiés |
| Récurrences | Occurrences virtuelles bornées/paginées, générées par Core depuis la Task canonique ; aucune copie persistée par occurrence et aucune interprétation RRULE dans le Web |
| Replanification | `preview` puis `apply` atomique ; digest déterministe, versions revalidées sous verrou, violations de dépendances bloquantes et effets aval proposés mais jamais inclus implicitement |
| Liste/Kanban | Une même projection alimente liste et Kanban ; les statuts `queued/running` restent pilotés par workflow, les transitions manuelles restent limitées à `todo/completed` |
| Gantt | SVAR React Gantt utilisé comme renderer/surface d'entrée seulement ; mode chart-only, dépendances visibles, chemin critique signalé, drag/resize/progression renvoyés vers les contrats Nevolium canoniques |
| Calendrier UI | Surface Nevolium dédiée sur les Tasks/occurrences canoniques, agenda compact et édition non-glisser ; Schedule-X reste une dépendance installée mais n'est pas la preuve de cette livraison |
| Today | Après `apply`, Planning recharge l'état canonique et Today retrouve la même Task mise à jour |
| FR/EN | Provider central extensible, choix persistant, `document.lang`, formatage central, langue transmise à Assistant/News et catalogue D06 FR/EN ; D13 reste le gate de complétude linguistique du produit entier |

## Incident Gantt tactile et correction

La qualification Chromium a découvert un défaut réel au passage Liste → Gantt sur tablette : React
était démonté par `Cannot read properties of null (reading 'forEach')`. Le test a d'abord éliminé
une course de chargement, puis la grille interne SVAR a été retirée du parcours compact au profit
d'un rendu chart-only, sans résoudre à elle seule le crash.

L'inspection du code amont SVAR 2.7.3 a isolé la cause : `DataTree.parse()` laisse `data = null` sur
les feuilles, tandis que `DataTree.toArray()` descend récursivement dans toute ligne ayant
`open === true`. Nevolium marquait auparavant toutes les lignes `open: true`, donc une feuille
provoquait `toArray(null)`. Le mapping D06 ne marque désormais `open: true` que les tâches ayant au
moins un enfant effectivement rendu. Un contrat statique verrouille cette règle. La qualification
tactile réussit ensuite sans affaiblir le scénario.

## Validation exacte de la tête fonctionnelle

Sur `9730e9c10aabf1a8725173dddbf26c66abe8f9ef` :

- **9/9 workflows PR réussis** : Code quality, UI workspace, MCP registry, Document ingestion,
  Baseline reproducibility, Foundation, Multi-user isolation, Autonomous research et D04 real engine ;
- UI workspace : contrats D06 locale/structure/replan/CPM/récurrence/calendrier de travail/workspace,
  compilation Web/Core et intégration PostgreSQL réelles réussis ;
- PostgreSQL : migrations jusqu'à D06, projection/CPM/replan/cycles/conflits/isolation, occurrences,
  calendrier de travail et effets aval de replanification réussis ;
- TypeScript + Vite : réussite, 190 modules transformés ; avertissement non bloquant de bundle
  principal supérieur à 500 kB ;
- Chromium D06 :
  `tablet={touch:true,gantt:true,alternativeEditor:true}` et
  `phone={touch:true,calendar:true,previewReads:1,applyReads:1,planningReads:2,todayReads:1}` ;
- artefact `d06-planning-browser-qualification` : ID `10401197268`, digest
  `sha256:bcb91b747f8274649f83f810fbcce504062780d67f889f7f5f2fa9ef64ecd297` ;
- le garde-fou D04 a requalifié les adaptateurs document/mémoire réels et la restauration sur
  destination distincte ; le job LLM local reste skipped conformément à ADR-031.

## Limites conservées

- D13 reste responsable de la traduction complète des surfaces historiques. D06 pose la fondation
  extensible et traduit ses surfaces ; il ne permet pas de déclarer tout Nevolium bilingue.
- Aucune voix TTS anglaise n'est qualifiée : la voix existante n'est pas renommée ni supposée
  compatible par déduction.
- Pas de solveur universel : le moteur traite le réseau borné et les contraintes définies par D06.
- Les calendriers externes restent D11 ; le hors-ligne préparé et sa synchronisation restent D12.
- Schedule-X est installé mais la surface calendrier D06 qualifiée est l'implémentation Nevolium.
- La CI tactile est une preuve Chromium déterministe ; la revue ergonomique sur appareils physiques
  reste un suivi produit et non un prérequis caché au gate automatisé.

## Reprise et rollback

Aucun rollback de production n'est nécessaire puisque D06 n'y est pas déployé. Si les migrations
étaient appliquées plus tard puis devaient être retirées, revenir dans l'ordre `0017` puis `0016`
vers `0015`, après arrêt/drainage normal et examen des données de planification créées ; ne jamais
supprimer ces données pour masquer un incident.

Prochaine action de la branche : qualifier le commit documentaire de clôture sur sa tête exacte,
mettre la PR #90 à jour, puis fusionner seulement si les checks requis restent verts. Après fusion,
revérifier le `main` live, mettre `PROJECT_STATE.md` au statut intégré et retirer la branche D06.
