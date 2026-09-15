# D06 — planification cohérente et fondation multilingue — checkpoint du 15 septembre 2026

## Intégration

D06 a été ouvert depuis `main` `03a1fcf348361f870556e0c8808cae5d70970394` sur
`feat/d06-planning-workspace`. La tête finale de la PR #90 est
`b09a62cd207371c2610d16198bbbaa0b46561c1c` et passe **9/9 workflows PR**. La PR est intégrée par le
commit signé `20720774552418a6c9e7acbfbf069945ff0f57df` ; ses parents sont la base D06 et cette tête
finale, et l'arbre de fusion `5d29dfaee0b0c0d4857956efeb4da8f4254151d0` est identique à l'arbre
qualifié de la branche.

Le serveur pilote reste sur le runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` et le schéma
`0015_model_configurations`. Les migrations D06 `0016_planning_structure` et
`0017_project_work_calendar` sont intégrées au dépôt mais n'ont été appliquées qu'en CI. La fusion
D06 n'a modifié aucun conteneur, snapshot B2, secret, Task historique ou donnée de production.

## Résultat D06

| Zone | Comportement qualifié |
|---|---|
| Modèle canonique | Profils versionnés, sous-tâches, tâches/jalons, dépendances FS/SS/FF/SF et calendrier de travail par projet, sans modèle parallèle propre au Gantt |
| Projection | Lecture owner-scoped/paginée des mêmes Tasks ; les anciennes Tasks sans profil reçoivent des valeurs de projection par défaut |
| Cycles et conflits | Refus cycles hiérarchiques/dépendances, verrou projet, `expected_version` et isolation propriétaires |
| Chemin critique | Calcul déterministe Core, raccordé au calendrier de travail ; réseau incomplet signalé et tâches non planifiées exclues sans dates inventées |
| Calendrier de travail | Fuseau IANA, semaine ouvrée et exceptions versionnées ; DST et calculs bornés qualifiés |
| Récurrences | Occurrences virtuelles bornées/paginées générées par Core ; aucune Task copiée par occurrence ni RRULE interprétée dans le Web |
| Replanification | `preview` puis `apply` atomique ; digest/versions revalidés, violations bloquantes, effets aval proposés mais jamais inclus implicitement |
| Liste/Kanban | Même projection ; `queued/running` restent pilotés par workflow, transitions manuelles limitées à `todo/completed` |
| Gantt | SVAR 2.7.3 renderer/input seulement ; chart-only, dépendances/critique visibles, gestes date/progression renvoyés aux contrats Nevolium |
| Calendrier UI | Surface Nevolium dédiée Tasks/occurrences, agenda compact et édition non-glisser ; Schedule-X installé mais non utilisé comme preuve |
| Today | Après `apply`, Planning recharge l'état canonique et Today retrouve la même Task mise à jour |
| FR/EN | Provider central extensible, choix persistant, `document.lang`, formatage central et propagation Assistant/News ; D13 reste la complétude globale |

## Incident Gantt tactile fermé

Chromium a révélé un crash Liste → Gantt sur tablette : `Cannot read properties of null (reading
'forEach')`. L'inspection du code amont SVAR a montré que `DataTree.parse()` garde `data=null` sur
les feuilles tandis que `DataTree.toArray()` descend toute ligne `open === true`. Nevolium marquait
toutes les lignes ouvertes. Le mapping ne marque désormais `open: true` que les tâches ayant au
moins un enfant effectivement rendu. Un contrat statique verrouille cette règle. Le mode chart-only
évite en plus la grille SVAR redondante sur les écrans compacts.

## Validation

Sur la tête finale `b09a62cd207371c2610d16198bbbaa0b46561c1c` :

- **9/9 workflows PR réussis** : Code quality, UI workspace, MCP registry, Document ingestion,
  Baseline reproducibility, Foundation, Multi-user isolation, Autonomous research et D04 real engine ;
- migrations PostgreSQL jusqu'à D06, projection/CPM/replan/cycles/conflits/isolation, occurrences,
  calendrier de travail et effets aval réussis ;
- TypeScript/Vite et contrats statiques réussis ;
- Chromium : tablette tactile avec Gantt + alternative d'édition et téléphone avec calendrier,
  preview/apply, reload Planning puis Today ;
- les gardes D04, isolation, Research et documents restent vertes sur la même tête finale.

La preuve navigateur fonctionnelle est conservée par le workflow UI ; le run qui a fermé le crash
Gantt a produit l'artefact D06 ID `10401197268`, digest
`sha256:bcb91b747f8274649f83f810fbcce504062780d67f889f7f5f2fa9ef64ecd297`.

## Limites et rollback

D13 reste responsable de la traduction complète des surfaces historiques. Aucune voix TTS anglaise
n'est qualifiée. Il n'y a pas de solveur universel ; calendriers externes en D11 et offline/synchro
en D12. La CI tactile ne remplace pas une revue ergonomique sur appareils physiques.

Aucun rollback de production n'est requis puisque D06 n'y est pas déployé. Si les migrations sont
appliquées plus tard puis doivent être retirées, examiner les données et revenir dans l'ordre
`0017` puis `0016` vers `0015`, après arrêt/drainage normal.

D06 est intégré. La prochaine tranche produit est D07 ; elle doit démarrer depuis le `main` live sur
une nouvelle branche après annonce explicite du lot, sans démarrer D08/D09 en parallèle.
