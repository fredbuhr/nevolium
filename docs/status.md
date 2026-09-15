# Nevolium : état fonctionnel vérifié

Révision : 2026-09-15.

D04 est intégré par #88 et ses preuves H5 restent acquises. D05 est intégré par #89 ; le pilote
exécute toujours le runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` avec le schéma
`0015_model_configurations` et OpenAI `openai/gpt-4.1` qualifié/activé. D06 est intégré par #90,
commit `20720774552418a6c9e7acbfbf069945ff0f57df`, mais n'est pas encore déployé sur le pilote.

D07 est désormais **intégré par la PR #91**, merge GitHub vérifié
`f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4`. La tête finale qualifiée
`0db6df6326b553136ab8a375b30fddbe5f6b27aa` passe **9/9 workflows PR**. Le merge a pour parents
l'ancien `main` `958f440183c5d0051d869474784251eb20bd8fb4` et cette tête D07 ; son arbre
`ecd1947a1cf7f2adf2f6583b54748fdd62289e98` est identique à l'arbre qualifié. D07 n'est pas encore
déployé sur le pilote.

## Acquis canoniques

| Domaine | État vérifié | Limite actuelle |
|---|---|---|
| Serveur et données | PostgreSQL/pgvector, Temporal, JetStream, SeaweedFS ; production jusqu'à `0015`; restauration B2 acquise | Premier serveur Linux x86_64 ; migrations D06/D07 non déployées |
| Identité | TLS, OIDC/PKCE, comptes nominatifs/TOTP et isolation owner-scoped vérifiée | Requalifier les nouveaux parcours à chaque lot |
| Worker / documents | Confinement, Temporal réel, Docling 2.126.0 et parsing borné ; ingestion historique verte avec `0018` en CI | Scans complexes/gros documents hors campagne |
| Mémoire / graphe | Mem0/Graphiti réels, scope propriétaire et rejeu sans doublon | Qualité quotidienne à mesurer ; projections dérivées |
| Modèle / coûts | LiteLLM, OpenAI `openai/gpt-4.1`, usages/budgets canoniques | Un fournisseur qualifié ; pas de garantie de plafond fournisseur |
| Research | Recherche sourcée, crash/replay et ownership qualifiés | Pertinence générale non déduite des scénarios |
| Secrets / reprise | OpenBao persistant, snapshots et matériel LiteLLM chiffré restaurés | Préserver snapshots et réservations historiques |
| Cockpit D05 | Mycelium 2D, Dockview, recherche rapide, inspecteur, layouts privés, PWA, responsive et popout bureau | Revue humaine continue sur appareils physiques |
| Planification D06 | Structure/version, sous-tâches, jalons, dépendances, calendrier de travail, récurrences virtuelles, CPM, replan preview/apply, Liste/Kanban/Gantt/Calendrier et cohérence Today | Intégré au code ; déploiement pilote distinct |
| Connaissances D07 | Documents authored versionnés, notes/idées/décisions, provenance/citations, recherche universelle, import/export, Lexical et restauration | Intégré au code ; coédition D12, mindmap D08, Mycelium 3D D09 |
| Langues | Fondation FR/EN extensible ; nouvelles surfaces D06/D07 raccordées | D13 reste la complétude FR/EN globale ; voix anglaise non qualifiée |

## Planification D06 intégrée

D06 conserve `Task` comme objet canonique et ajoute, via `0016_planning_structure` et
`0017_project_work_calendar`, les informations nécessaires sans créer une vérité propre à chaque
vue. Les lectures sont owner-scoped et bornées ; les cycles hiérarchiques/de dépendances sont
refusés, et les mutations structurelles utilisent verrou projet et versions optimistes.

Le chemin critique est calculé côté Core et raccordé au calendrier de travail. Les récurrences sont
des occurrences virtuelles paginées : le Web ne parse pas les RRULE et ne persiste pas une Task par
occurrence. La replanification sépare `preview` et `apply`; digest et versions sont revérifiés sous
verrou. Les contraintes invalides bloquent l'application et les effets aval restent des suggestions
tant que l'utilisateur ne les inclut pas explicitement dans un nouvel aperçu.

La même projection alimente Liste et Kanban. SVAR React Gantt reste un renderer/input : Nevolium
intercepte les gestes de date/progression et conserve Core comme autorité. Le Gantt est chart-only.
Le calendrier qualifié est une surface Nevolium dédiée ; Schedule-X est installé mais non utilisé
comme preuve de cette capacité.

## D07 — connaissances éditables intégrées

D07 généralise le canon Documents sans créer une seconde base Knowledge. Les sources importées
conservent leur `Asset`; les entrées authored `note`, `idea` et `decision` peuvent exister sans Asset.
Chaque sauvegarde, changement de métadonnées ou restauration crée une nouvelle `DocumentVersion`.
Lexical stocke son `EditorState` dans `content_json`; `content_text` sert de projection lisible et de
matière pour la recherche.

Les citations sont versionnées et peuvent référencer URL ou Document/version/chunk. Une citation
cross-project est admise uniquement entre objets du même propriétaire. Les pièces jointes et
whiteboards réutilisent `Asset` via des liens explicites ; le stockage fichier n'est pas dupliqué.

La recherche est owner-wide par défaut et accepte un filtre projet optionnel. Un résultat situé dans
un autre projet transporte son `project_id`, de sorte que l'inspection bascule explicitement le
contexte projet + document. Les versions avec `search_status=failed` ne sont pas servies par la
recherche ; le contenu canonique reste présent et permet de reconstruire la projection.

L'échange `nevolium-json` conserve contenu riche, texte, métadonnées et citations. Markdown et texte
sont documentés comme projections non-lossless. L'ingestion Docling historique reste qualifiée à côté
des connaissances authored.

La preuve PostgreSQL D07 couvre import, décision sourcée inter-projets, recherche universelle,
conflit de génération, métadonnées versionnées, restauration, Asset links, isolation propriétaire et
perte volontaire des chunks suivie d'une récupération. La preuve Chromium couvre création, Lexical,
citation, version suivante, restauration, recherche cross-space, inspection, bascule FR/EN et
utilisation téléphone tactile. Artefact navigateur : `10405706103`, digest
`sha256:97c73911dd15945eb80fa18dde5c3f2c8dbb9c9ce7463c36232cbe84e1bbcc6a`.

Le détail des preuves et du rollback est dans le
[checkpoint D07](archive/d07-editable-knowledge-progress-2026-09-15.md).

## Produit présent et fonctions futures

| Domaine | Présent | Suite planifiée |
|---|---|---|
| Cockpit | D05 intégré : Mycelium 2D, espaces réels, Dockview, clavier, PWA, responsive et popout bureau | Raffinement continu et fonctions spécialisées |
| Planification | D06 intégré : Liste/Kanban/Gantt/Calendrier, hiérarchie/jalons/dépendances, récurrences, work calendar, CPM et replanification | Déploiement distinct ; calendriers externes D11 ; offline D12 |
| Connaissances/graphes | D07 intégré : Documents authored, versions, provenance, recherche universelle, Lexical, import/export | **D08 mindmap 2D** ; D09 Mycelium 3D |
| Realtime/Desktop/voix | Scaffolds ou moteurs configurés | Parcours authentifiés, collaboration, permissions appareil et voix |
| Finance/Crypto/Home/Dev | Profils optionnels déclarés | Adaptateurs, policy, workspaces et parcours réels |
| Langues | Fondation FR/EN extensible, D06/D07 raccordés | D13 : complétude produit FR/EN puis langues supplémentaires |

## Limites de lecture

Une dépendance installée ou un mock vert ne vaut pas une fonction livrée. D07 possède des preuves
PostgreSQL et Chromium, mais `0018` n'a pas été appliquée au pilote. La CI tactile ne remplace pas une
revue ergonomique sur appareils physiques. La coédition reste D12 ; le whiteboard dédié n'est pas
livré par le simple rôle de lien Asset. Le downgrade `0018` refuse de remettre `documents.asset_id`
à `NOT NULL` tant que des Documents authored sans Asset existent : préserver/migrer ces données avant
un rollback réel.

[PROJECT_STATE](../PROJECT_STATE.md) reste le point de reprise opérationnel ; le
[plan exécutable](implementation-plan.md) définit l'ordre D01–D22.
