# Nevolium : état fonctionnel vérifié

Révision : 2026-09-15.

D04 est intégré par #88 et ses preuves H5 restent acquises. D05 est intégré par #89 ; le pilote
exécute toujours le runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` avec le schéma
`0015_model_configurations` et OpenAI `openai/gpt-4.1` qualifié/activé. D06 est intégré par #90,
commit `20720774552418a6c9e7acbfbf069945ff0f57df`, mais n'est pas encore déployé sur le pilote.

D07 est intégré par la PR #91, merge GitHub vérifié
`f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4`. Sa tête finale
`0db6df6326b553136ab8a375b30fddbe5f6b27aa` passe **9/9 workflows PR**. D07 n'est pas encore
déployé sur le pilote.

D08 est intégré par la PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`.
Sa tête finale `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f` passe **9/9 workflows PR**,
avec un arbre identique au merge. Le handoff main `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`
passe **8/8 workflows push**. D08 n'est pas déployé sur le pilote.

D09 est implémenté sur la branche de la PR #93 draft, en qualification. La référence fonctionnelle `825cee775870cd97bc860e7d4ea63501f4cb07bb` passe **8/8 workflows PR**.
Ses preuves exactes et les limites matérielles restent dans [PROJECT_STATE](../PROJECT_STATE.md) et le
[suivi D09](archive/d09-spatial-progress-2026-09-15.md). Ce statut ne déclare pas D09 intégré.

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
| Connaissances D07 | Documents authored versionnés, notes/idées/décisions, provenance/citations, recherche universelle, import/export, Lexical et restauration | Intégré au code ; coédition D12 |
| Mindmap D08 | Vue 2D éditable sur identités D06/D07, liens typés, groupes/layouts, recherche, deep links, undo/redo, export et idée→Task | Intégré par #92 ; non déployé ; 3D en qualification D09 |
| Mycelium 3D D09 | Renderer interactif et persistance sur #93, 13 scénarios Chromium verts | Non intégré/déployé ; mesures physiques GPU intégré/tablette requises |
| Langues | Fondation FR/EN extensible ; nouvelles surfaces D06–D09 raccordées | D13 reste la complétude FR/EN globale ; voix anglaise non qualifiée |

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

## D08 — mindmap 2D intégrée

D08 ne crée aucun modèle de nœud parallèle. Le snapshot d'un projet regroupe les mêmes identités
`project`, `task` et `document`; `RelationshipRecord` reste le canon des liens. Les idées, décisions
et notes restent des Documents D07. Le snapshot est owner-scoped, borné et n'inclut une relation que
si ses deux extrémités appartiennent au périmètre visible autorisé.

Les liens D08 utilisent un vocabulaire explicite et les relations historiques restent lisibles. Une
provenance `converted_to` créée par la conversion idée→Task n'est pas supprimable depuis la carte.
La conversion crée une vraie Task D06 dans la même transaction que sa provenance, avec audit/outbox
corrélés ; une seconde conversion silencieuse de la même idée est refusée.

`@xyflow/react` reste un renderer/input non canonique. Le placement radial de secours est calculé par
`@nevolium/graph`; positions, viewport et groupes appartiennent uniquement à `WorkspaceLayout`.
Le Web couvre recherche, filtres, multi-sélection, groupes, liens explicites utilisables au tactile,
undo/redo, export JSON, deep links et FR/EN.

La persistance du layout sérialise les PUT par client/workspace, n'annonce `saved` qu'après
acquittement, conserve localement un snapshot non sauvé après erreur et fournit un retry explicite.
Un changement de session annule les écritures en attente de l'ancienne identité. Cela ne prétend pas
résoudre coédition/inter-onglets/offline durable, qui restent D12.

Le head fonctionnel `1576e8f73bc48b058ec0c7981853b80d40e7e93a` passe 9/9 workflows PR.
Le job PostgreSQL D08 couvre isolation, caps, mutations, provenance et raccord Planning. Le scénario
Chromium D08 couvre déplacement individuel et conjoint, historique après bascule de langue,
panne/retry/sérialisation du layout, export/reload, téléphone tactile, deep link dans un contexte neuf
et le scénario de sortie final : **deux idées liées → deux Tasks → replanification D06 `preview/apply`
→ deux tâches visibles dans le Gantt**.

Artefact navigateur final : `10413396962`, digest
`sha256:ca8364bd22bd05ba0aaf8b98e40632a8445b9ffff902675216a5771919f092ec`.
Le détail des preuves, limites et rollback est dans le
[checkpoint D08](archive/d08-editable-mindmap-progress-2026-09-15.md).

## D09 — Mycelium 3D en qualification

Le rendu R3F/Three est chargé à l'ouverture de la vue 3D. Il projette le snapshot D08 sur les mêmes
identités : nœuds instanciés, filaments batchés sur les relations existantes, groupes de présentation,
labels limités et activité issue des statuts des Tasks. Sélection, conversion idée→Task et navigation
vers Planning/Knowledge utilisent les actions et objets existants. Un rafraîchissement au retour au
panneau, au focus ou à la reconnexion relit le canon sans rejouer de mutation.

Caméra, choix 2D/3D et qualité sont sauvegardés sous `mycelium3d.project.{project_id}` via
`WorkspaceLayout`, avec la sérialisation/reprise D08 et les contrôles de session. Les positions 2D
restent séparées. La géométrie spatiale est déterministe et dérivée, sans nouvelle migration.
La scène est démontée lorsque son panneau, document ou viewport est masqué. Qualité adaptative,
profils économiques, mouvement réduit, commandes tactiles et fallback 2D sont implémentés.
Le téléphone commence en 2D même si une préférence 3D a été enregistrée sur bureau.

Les nouveaux scénarios Chromium utilisent une API simulée ; les contrats PostgreSQL existants sont
une preuve distincte. Ils ne constituent pas une preuve de déploiement, ni une mesure sur tablette
physique ou GPU intégré. Le head fonctionnel `825cee7` passe les 13 scénarios D09 ; le checkpoint documente son descendant
et le gate matériel encore ouvert. Mesures et captures sont conservées dans le suivi D09.

## Écarts à conserver dans la suite

- D06 : modèles/API de sous-tâches, jalons, dépendances, récurrences et calendrier de travail présents ;
  formulaires Web complets de création/édition de ces structures encore à livrer. Le Kanban manuel
  couvre `todo`↔`completed`; `queued`/`running` restent pilotés par les workflows.
- D07 : liens Asset/pièces jointes/whiteboards côté canon ; éditeur Excalidraw non intégré.
- Langues : fondation et nouvelles surfaces FR/EN ; plusieurs écrans historiques restent en français.
  La préférence de langue reste locale au navigateur ; complétude produit prévue en D13.
- PWA : shell installable ; données métier hors ligne et synchronisation restent D12.
- Exploitation : restauration et sauvegardes manuelles prouvées ; automatisation planifiée à qualifier.

## Produit présent et fonctions futures

| Domaine | Présent | Suite planifiée |
|---|---|---|
| Cockpit | D05 intégré : Mycelium 2D, espaces réels, Dockview, clavier, PWA, responsive et popout bureau | Raffinement continu et fonctions spécialisées |
| Planification | D06 intégré : Liste/Kanban/Gantt/Calendrier, hiérarchie/jalons/dépendances, récurrences, work calendar, CPM et replanification | Déploiement distinct ; calendriers externes D11 ; offline D12 |
| Connaissances/graphes | D07 et D08 intégrés : Documents authored/versionnés et mindmap 2D sur identités/relations canoniques | D09 Mycelium 3D implémenté sur #93, qualification en cours |
| Realtime/Desktop/voix | Scaffolds ou moteurs configurés | Parcours authentifiés, collaboration, permissions appareil et voix |
| Finance/Crypto/Home/Dev | Profils optionnels déclarés | Adaptateurs, policy, workspaces et parcours réels |
| Langues | Fondation FR/EN extensible, D06–D08 raccordés | D13 : complétude produit FR/EN puis langues supplémentaires |

## Limites de lecture

Une dépendance installée ou un mock vert ne vaut pas une fonction livrée. D07 possède des preuves
PostgreSQL et Chromium, mais `0018` n'a pas été appliquée au pilote. D08 combine lui aussi un job
PostgreSQL réel et un scénario Chromium à API simulée : cela ne constitue pas une session
Web→Core→PostgreSQL unique. La CI tactile ne remplace pas une revue ergonomique sur appareils physiques.
La coédition/offline reste D12 ; le Mycelium 3D reste D09. Le downgrade `0018` refuse de remettre
`documents.asset_id` à `NOT NULL` tant que des Documents authored sans Asset existent : préserver ou
migrer ces données avant un rollback réel.

[PROJECT_STATE](../PROJECT_STATE.md) reste le point de reprise opérationnel ; le
[plan exécutable](implementation-plan.md) définit l'ordre D01–D22.
