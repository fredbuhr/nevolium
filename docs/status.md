# Nevolium : état fonctionnel vérifié

Extension d’usage D09 publiée et qualifiée dans la PR #96 : accueil utilisant le Mycelium
3D partagé, raccourcis et dossiers privés, navigation transversale soumise aux droits et
corpus fictif importable. Le code `9b6b01075fdc8b47e3f9a3eb14f6f3b14e71ffba` passe
**9/9 workflows**, dont PostgreSQL réel et les parcours navigateur D05–D09.
Neuf captures d’accueil et les captures Knowledge ont été inspectées. Cette extension
n’est ni intégrée à main ni déployée sur le pilote ; les exemples n’y sont pas importés.

Révision : 2026-09-16.

D04–D09 sont intégrés sur la ligne canonique. Le pilote a activé la release
`69f5926be72227a5fc1c4e3dff7c0e436099e51c` le 16 septembre 2026, avec le schéma
`0018_editable_knowledge`. La stabilisation opérateur après 6–7 minutes atteste les quatre
images applicatives exactes, zéro redémarrage, les services de stockage sains, Core
live/ready/trust et Web à 200, ainsi que des compteurs SQL inchangés.

Cette stabilité technique **ne vaut pas acceptation produit**. L’utilisateur signale dans le
pilote des langues mélangées, un formulaire d’idée ambigu, des objets sans liens visibles et
une animation non perceptible, ainsi qu’une surcharge de commandes. Le gate D09 est rouvert
pour correction d’usage ; D10 ne commence pas. Voir [le diagnostic et le correctif](d09-usability-correction.md).

Le contrôle UI `35112551196` valide les trois formats d’accueil, les raccourcis privés,
les dossiers, l’ordre, l’annulation, la reprise après erreur de sauvegarde, le rechargement,
les commandes FR/EN, la navigation entre projets, le téléchargement des octets d’origine
et l’aperçu SVG. Le renderer occupe la largeur centrale ; les commandes FR/EN ne recouvrent
plus l’en-tête. Sur téléphone, la liste 2D reste le défaut et la 3D un choix explicite.
Le corpus contient 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances et
32 relations explicites, avec citations versionnées et trois accueils métier.

Les parcours navigateur utilisent des réponses Core simulées à partir du corpus ; le
contrat de projection est testé séparément sur PostgreSQL réel. Il reste à qualifier
l’import sur le pilote et les interactions/fluidité sur les appareils de l’utilisateur.
La traduction exhaustive des écrans historiques reste en D13.

Le modèle visuel `48d7be9` reste la référence adoptée. Les preuves antérieures du banc
synthétique (13 scénarios spatiaux, 16 contrôles kit et mesures physiques des parents)
restent historiques : elles ne qualifient ni le graphe réel peu relié ni ce correctif.
La restauration B2 et le snapshot Netcup pré-migration sont conservés ; aucun nettoyage
Docker ou rollback n’est autorisé par ce constat.

## Acquis canoniques

| Domaine | État vérifié | Limite actuelle |
|---|---|---|
| Serveur et données | PostgreSQL/pgvector, Temporal, JetStream, SeaweedFS ; production `0018`; restauration B2 acquise | Premier serveur Linux x86_64 ; stabilité observée distincte du go fonctionnel |
| Identité | TLS, OIDC/PKCE, comptes nominatifs/TOTP et isolation owner-scoped vérifiée | Requalifier les nouveaux parcours à chaque lot |
| Worker / documents | Confinement, Temporal réel, Docling 2.126.0 et parsing borné ; ingestion historique verte avec `0018` en CI | Scans complexes/gros documents hors campagne |
| Mémoire / graphe | Mem0/Graphiti réels, scope propriétaire et rejeu sans doublon | Qualité quotidienne à mesurer ; projections dérivées |
| Modèle / coûts | LiteLLM, OpenAI `openai/gpt-4.1`, usages/budgets canoniques | Un fournisseur qualifié ; pas de garantie de plafond fournisseur |
| Research | Recherche sourcée, crash/replay et ownership qualifiés | Pertinence générale non déduite des scénarios |
| Secrets / reprise | OpenBao persistant, snapshots et matériel LiteLLM chiffré restaurés | Préserver snapshots et réservations historiques |
| Cockpit D05 | Mycelium 2D, Dockview, recherche rapide, inspecteur, layouts privés, PWA, responsive et popout bureau | Revue humaine continue sur appareils physiques |
| Planification D06 | Structure/version, sous-tâches, jalons, dépendances, calendrier de travail, récurrences virtuelles, CPM, replan preview/apply, Liste/Kanban/Gantt/Calendrier et cohérence Today | Déployé dans D09 ; acceptation d’usage à terminer |
| Connaissances D07 | Documents authored versionnés, notes/idées/décisions, provenance/citations, recherche universelle, import/export, Lexical et restauration | Intégré au code ; coédition D12 |
| Mindmap D08 | Vue 2D éditable sur identités D06/D07, liens typés, groupes/layouts, recherche, deep links, undo/redo, export et idée→Task | Déployé ; appartenance au projet absente du rendu initial, correctif en qualification |
| Mycelium 3D D09 | Renderer interactif et persistance intégrés par #93 ; enveloppes translucides irrégulières, petits noyaux cyan/menthe, raccords continus et circulation lumineuse après retours utilisateur | Pilote installé ; lisibilité du graphe réel et animation à requalifier, mémoire/GPU intégré/cockpit physique à compléter |
| Langues | Fondation FR/EN extensible mais cockpit et inspecteurs encore partiellement français en production | Correction ciblée D09 en cours ; complétude globale D13 et voix anglaise non qualifiées |

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

## D09 — Mycelium 3D intégré, qualification pilote ouverte

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
physique ou GPU intégré. La tête finale `7d748797` passe les 13 scénarios D09 et les 16 contrôles
du kit (UI run `35047879779`). Son inventaire serveur en lecture seule passe trois tests à fixtures
dans Foundation ; il n'a pas été exécuté sur Netcup. Mesures, captures et limites restent archivées.

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
| Connaissances/graphes | D07–D09 intégrés : Documents authored/versionnés, mindmap 2D et Mycelium 3D sur identités/relations canoniques | Installation pilote et qualification physique D09 ; assistant D10 ensuite |
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

Reprise visuelle du 16 septembre : [corps arrondis et raccords](archive/d09-smooth-junctions-2026-09-16.md). Le relevé matériel f6912bd (201/300 balanced, médiane/p10 165 FPS sur 600,881 s) concerne le parent ; il ne qualifie pas les changements suivants. Les preuves du descendant sont rattachées au head exact de #93.

Second retour du 16 septembre : [matière translucide et énergie](archive/d09-translucent-tissue-2026-09-16.md). Le rapport d5c438e (401/1000 high, médiane 136 FPS sur 60,281 s, mémoire inconnue) décrit la version jugée trop mate ; il ne mesure pas le descendant. Le modèle visuel 48d7be9 est ensuite accepté pour l’instant ; l’installation et les mesures physiques restent distinctes.
