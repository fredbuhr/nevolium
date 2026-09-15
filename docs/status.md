# Nevolium : état fonctionnel vérifié

Révision : 2026-09-15.

D04 est intégré par #88 et ses quatre preuves H5 restent acquises. D05 est intégré par #89 ; le
pilote exécute toujours le correctif D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` avec le schéma
`0015_model_configurations`, OpenAI `openai/gpt-4.1` qualifié et activé. D06 est actuellement un
**candidat qualifié mais non encore intégré ni déployé** sur la PR #90. Sa tête fonctionnelle
`9730e9c10aabf1a8725173dddbf26c66abe8f9ef` passe 9/9 workflows PR.

## Acquis canoniques

| Domaine | État vérifié | Limite actuelle |
|---|---|---|
| Serveur et données | PostgreSQL/pgvector, Temporal, JetStream, SeaweedFS ; migrations production jusqu'à `0015` ; restauration B2 acquise | Premier serveur Linux x86_64 ; migrations D06 non déployées |
| Identité | TLS, OIDC/PKCE, comptes nominatifs/TOTP et isolation owner-scoped vérifiée | Nouveaux parcours à requalifier à chaque lot |
| Worker / documents | Confinement, Temporal réel, Docling 2.126.0 et parsing borné ; garde D04 réel toujours vert | Scans complexes/gros documents hors campagne |
| Mémoire / graphe | Mem0/Graphiti réels et scope propriétaire, rejeu sans doublon | Qualité quotidienne à mesurer ; projections dérivées |
| Modèle / coûts | LiteLLM, OpenAI `openai/gpt-4.1`, usages/budgets canoniques ; test pilote comptabilisé | Un fournisseur qualifié ; pas de garantie de plafond fournisseur |
| Research | Recherche sourcée, crash/replay et ownership requalifiés | Pertinence générale non déduite des scénarios de qualification |
| Secrets / reprise | OpenBao persistant, snapshots et matériel LiteLLM chiffré restaurés | Préserver les snapshots et réservations historiques |
| Cockpit D05 | Accueil Mycelium 2D, Dockview, recherche rapide, inspecteur, layouts privés, PWA, tablette/téléphone, popout bureau et réglages modèle | Revue humaine continue sur appareils physiques |
| Planification D06 candidate | Structure/version, sous-tâches, jalons, dépendances, calendrier de travail, récurrences virtuelles, CPM, replan preview/apply, Liste/Kanban/Gantt/Calendrier et cohérence Today | PR #90 non fusionnée ; production reste D05 |
| Langues D06 candidate | Provider central FR/EN extensible, choix persistant, locale/ARIA/surfaces D06 et propagation Assistant/News | D13 reste la complétude FR/EN globale ; voix anglaise non qualifiée |

## Planification D06 qualifiée

D06 conserve `Task` comme objet canonique et ajoute, via `0016_planning_structure` et
`0017_project_work_calendar`, les informations nécessaires sans créer une vérité propre à chaque
vue. Les lectures sont owner-scoped et bornées ; les cycles hiérarchiques/de dépendances sont
refusés et les mutations de structure utilisent un verrou projet et des versions optimistes.

Le chemin critique est calculé côté Core et raccordé au calendrier de travail. Les récurrences sont
générées comme occurrences virtuelles paginées : le Web ne parse pas les RRULE et ne persiste pas
une Task par occurrence. La replanification sépare `preview` et `apply`; le digest et les versions
sont revérifiés sous verrou. Les contraintes invalides bloquent l'application et les effets aval
restent des suggestions tant que l'utilisateur ne les inclut pas explicitement dans un nouvel aperçu.

La même projection alimente Liste et Kanban. SVAR React Gantt reste un renderer/input : Nevolium
intercepte les gestes de date/progression et conserve Core comme autorité. Le Gantt est chart-only,
ce qui évite une seconde grille concurrente. Seules les tâches ayant des enfants rendus sont
`open`, après qu'un test tactile a découvert le comportement récursif de `DataTree` sur les feuilles.
Le calendrier qualifié est une surface Nevolium dédiée ; Schedule-X est installé mais non utilisé
comme preuve de cette capacité.

La qualification Chromium de la tête `9730e9c…` réussit avec :

- tablette 820 × 1180, tactile : Gantt visible et alternative non-glisser pour modifier un créneau ;
- téléphone 390 × 844, tactile : calendrier/agenda, édition, exactement un preview et un apply,
  rechargement Planning puis lecture de la Task canonique mise à jour dans Today ;
- artefact `d06-planning-browser-qualification` ID `10401197268`, digest
  `sha256:bcb91b747f8274649f83f810fbcce504062780d67f889f7f5f2fa9ef64ecd297`.

Le détail des contrats, de l'incident Gantt et du rollback est conservé dans le
[checkpoint D06](archive/d06-planning-workspace-progress-2026-09-15.md).

## Produit présent et fonctions futures

| Domaine | Présent / candidat qualifié | Suite planifiée |
|---|---|---|
| Cockpit | D05 intégré : Mycelium 2D, espaces réels, Dockview, clavier, PWA, responsive et popout bureau | Raffinement continu et fonctions spécialisées |
| Planification | D06 candidate : Liste/Kanban/Gantt/Calendrier, hiérarchie/jalons/dépendances, récurrences, work calendar, CPM et replanification | Fusion/déploiement D06 ; calendriers externes D11 ; offline D12 |
| Connaissances/graphes | Documents/chunks inspectables et relations canoniques | D07 édition ; D08 mindmap 2D ; D09 Mycelium 3D |
| Realtime/Desktop/voix | Scaffolds ou moteurs configurés | Parcours authentifiés, collaboration, permissions appareil et voix |
| Finance/Crypto/Home/Dev | Profils optionnels déclarés | Adaptateurs, policy, workspaces et parcours réels |
| Langues | Fondation FR/EN extensible dans D06 | D13 : complétude produit FR/EN puis langues supplémentaires |

## Limites de lecture

Une dépendance installée ou un mock vert ne vaut pas une fonction livrée. Les preuves D06 de
planification comprennent PostgreSQL réel et Chromium déterministe, mais aucune migration D06 n'a
été appliquée au pilote. La CI tactile ne remplace pas une revue ergonomique sur appareils physiques.
Schedule-X, Three, Tauri, Yjs et les moteurs optionnels conservent leur maturité propre tant qu'un
parcours Nevolium ne les qualifie pas explicitement.

[PROJECT_STATE](../PROJECT_STATE.md) reste le point de reprise opérationnel ; le
[plan exécutable](implementation-plan.md) définit l'ordre D01–D22.
