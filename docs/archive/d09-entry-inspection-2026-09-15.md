# D09 — inspection d'entrée Mycelium 3D

Date : 2026-09-15

## Base vérifiée

- `main` de départ : `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`.
- D08 est intégré par PR #92, merge `2ded338ed4e0b619a7b2bae4d732e56771151e3c`.
- Le head D08 final `b4d9db62bf2b3e4891bcc7699a23b81bddeb452f` et le merge D08 ont le même arbre `6d8c80e1feca5c01bf67794d7ee3b36ed87f9694`.
- Les neuf workflows PR D08 et les neuf workflows push du merge D08 sont verts.
- Le handoff documentaire `b68e1e8b…` est qualifié par les huit workflows push applicables.
- Production/pilote inchangé : dernier runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations`; D06–D08 ne sont pas déployés.

## Contrat D09 du plan

D09 doit fournir une vue Mycelium 3D interactive : caméra, focus, zoom, sélection, filaments/groupes, labels limités, activité et liens vers le cockpit. Les identités 2D/3D doivent être les mêmes ; les positions spatiales restent de la présentation, jamais une relation métier. Le rendu est client-side, borné au visible, arrêté quand masqué, avec qualité adaptative, fallback 2D et préférences persistantes. La 3D est facultative sur mobile. Le scénario de sortie exige notamment la bascule 2D↔3D, la cohérence d'un objet édité, une reconnexion sans doublons et des mesures explicites de fluidité/mémoire sur des tailles déclarées.

## Réemploi canonique disponible

### Identités et relations

D08 expose déjà un snapshot owner-scoped et borné par projet via `/v1/projects/{project_id}/mindmap` :

- nœuds `project`, `task`, `document` avec clé stable `type:uuid` ;
- relations canoniques basées sur `RelationshipRecord` ;
- caps/troncature explicites ;
- relation incluse seulement si ses deux extrémités sont dans le périmètre visible autorisé.

D09 n'a donc pas besoin d'un modèle de nœud, d'une table de relation ni d'une migration pour sa première tranche. Le même snapshot doit alimenter 2D et 3D afin d'empêcher une seconde vérité métier.

Le package `@nevolium/graph` contient déjà les types légers `NevoliumGraphNode`, `NevoliumGraphEdge`, `NevoliumGraphSnapshot` et le placement radial 2D déterministe. Il peut recevoir des fonctions/projections 3D pures, mais ne doit pas devenir une base de données ou un store métier.

### Layout et préférences

`WorkspaceLayout` est déjà owner-scoped et qualifié. D08 y stocke positions 2D, viewport et groupes ; les relations restent en Core. D09 doit utiliser une clé/espace de layout distinct pour caméra/positions spatiales/préférences, sans réutiliser ou écraser les coordonnées 2D. Le nom définitif de la clé 3D sera fixé avant la première persistance et verrouillé par contrat.

### Dépendances installées

Le Web verrouille déjà :

- `@react-three/fiber ^9.7.0` ;
- `three ^0.180.0` ;
- `react-force-graph-3d ^1.29.0` ;
- `@xyflow/react ^12.11.5` pour D08.

Leur installation ne vaut pas preuve produit. Aucun usage `ForceGraph3D` ni composant R3F 3D produit n'est présent dans la ligne `main` inspectée.

## Prototype historique `ed12d503…`

Réservoir inspecté sélectivement, jamais candidat à une fusion globale.

Briques potentiellement récupérables après adaptation Nevolium :

- `MyceliumViewport.tsx` : Canvas R3F, OrbitControls, caméra/focus, bandes sémantiques et composition des champs ;
- `InstancedNodeField.tsx` : rendu instancié des nœuds ;
- `BatchedFilamentField.tsx` : filaments batchés ;
- `NodeLabelField.tsx` : limitation/sélection de labels ;
- `ClusterField.tsx` : groupes/agrégats visuels ;
- `ActivityPulseField.tsx` + `activityStore.ts` : activité visuelle ;
- `adaptiveQuality.ts` : heuristique matériel + fenêtres FPS, downgrade plus rapide que l'upgrade, pause de mesure quand `document.hidden` ;
- `layout.worker.ts` / warm start : idée d'un layout hors thread principal.

Éléments à ne pas reprendre tels quels :

- types et noms historiques `Kairo*` ;
- modèles de projection anciens plus larges que le snapshot D08 ;
- état de layout/cache local non raccordé à `WorkspaceLayout` ;
- hypothèses de navigation/identité antérieures à D05–D08 ;
- tout couplage faisant de la 3D une autorité métier.

Le prototype utilise `@react-three/fiber` et `three`, pas `react-force-graph-3d`. Le choix final du renderer D09 doit donc être motivé par les besoins de lifecycle, instancing, perte WebGL et contrôle du rendu, pas par la simple présence d'une dépendance.

## Architecture d'entrée retenue

1. **Source de données unique** : réutiliser le snapshot D08/Core pour les identités et liens.
2. **Projection 3D pure** : transformer ce snapshot en poses/LOD dans `@nevolium/graph` ou un worker sans persistance métier.
3. **Présentation persistée séparément** : caméra, qualité préférée et éventuellement poses utilisateur dans un `WorkspaceLayout` 3D distinct.
4. **Renderer non autoritaire** : la sélection/focus 3D transporte uniquement les clés canoniques et ouvre les mêmes surfaces cockpit que D08.
5. **Fallback obligatoire** : si WebGL est indisponible/perdu, revenir à la vue 2D D08 sans perte de sélection ni mutation métier.
6. **Lifecycle** : aucune boucle de rendu/mesure active quand le panneau est masqué ; reprise bornée quand il redevient visible.
7. **Qualité** : profils `eco`, `balanced`, `high`, `auto`; le mode auto peut reprendre l'idée du prototype, mais avec tests déterministes et préférence persistée.
8. **Mobile** : la 3D reste optionnelle ; D08 2D demeure le fallback produit.
9. **Pas de migration initiale** : une migration ne sera ajoutée que si une donnée canonique réellement nouvelle est démontrée, ce qui n'est pas le cas à l'entrée.

## Première tranche proposée

Avant les effets visuels avancés :

- créer une projection 3D pure/déterministe sur les clés D08 ;
- monter un renderer 3D dans une surface cockpit sans remplacer la Mindmap 2D ;
- offrir un toggle 2D/3D et conserver sélection/focus ;
- gérer `document.visibilityState`, panneau masqué et perte WebGL ;
- fournir un fallback 2D explicite ;
- définir/persister qualité + caméra via `WorkspaceLayout` 3D ;
- ajouter des contrats statiques et un test navigateur WebGL/fallback avant d'ajouter activité, filaments complexes ou animation riche.

Cette tranche ne doit pas encore introduire de mutation métier, d'événement temps réel nouveau ni de nouvelle API Core.

## Risques à qualifier tôt

- perte/restauration du contexte WebGL ;
- boucle de rendu continu lorsque le panneau est caché ;
- taille mémoire/GPU sur graphes plus grands ;
- coût des labels et géométries par nœud ;
- cohérence de sélection lors du switch 2D↔3D ;
- divergence de positions 2D/3D présentée à tort comme divergence métier ;
- mobile/touch : pas d'obligation de forcer WebGL ;
- préférences/layout d'un propriétaire qui fuitent vers un autre ;
- worker/layout qui duplique ou réordonne de façon non déterministe les identités.

## Conditions avant implémentation lourde

- PR D09 draft ouverte après ce premier commit ;
- `PROJECT_STATE.md` de branche mis à jour avec PR/head et prochaine action ;
- premier contrat D09 interdit toute copie de `RelationshipRecord`/Task/Document dans un store canonique Web ;
- le scénario navigateur minimal prouve 2D↔3D, sélection conservée, fallback WebGL et pause hidden avant ajout d'effets avancés.

D10, collaboration/offline D12 et complétude FR/EN D13 restent hors scope.
