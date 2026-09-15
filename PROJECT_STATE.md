# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D08 actif — qualification de la mindmap 2D éditable

| Champ | État attesté |
|---|---|
| Base vérifiée | `main` = `a9edcd96b6227fe362765863aabbcacbbc53fa4f` ; D07 intégré par #91, merge `f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4` |
| Branche / PR | `feat/d08-editable-mindmap`, **PR #92 ouverte et draft** ; ne pas recréer de branche |
| Dernier correctif de qualification | `3f381cecd28fe13813ce38205979e2d1530d96b1` ; le présent checkpoint est un commit documentaire descendant. Vérifier le head live et ses propres checks avant toute décision |
| Réalisé dans la branche | Projection Core bornée et owner-scoped, liens canoniques typés, conversion individuelle idée → tâche ; vue XYFlow, groupes/layouts, recherche/filtres, historique, export et chaînes FR/EN |
| Invariant | `RelationshipRecord` reste le canon des liens ; idées/notes/décisions restent des `Document` D07 ; `WorkspaceLayout` contient seulement positions/viewport/groupes |
| Dernière preuve navigateur inspectée | `18558610fe6c678a90d1889e988d1c24b068f6fb`, run `35000922268` : déplacement/persistance, liens/undo/redo, groupe à deux membres et contenu de l'export FR passent ; arrêt avant conversion, deux nœuds encore sélectionnés. Aucun crash React dans ce diagnostic |
| Correction suivante | Le scénario désélectionne par un clic réel sur le canevas puis choisit l'idée seule. Il attend la fin du refresh canonique avant de vérifier le lien profond. Les assertions de conversion ne sont pas retirées |
| Vérification de l'export | Le bouton réel est `Exporter JSON` / `Export JSON`. Clic et attente de téléchargement sont traités ensemble ; JSON relu et comparé aux identités/liens/positions/groupes/viewport. Export FR, EN et après rechargement sont exigés |
| Diagnostics reproductibles | Artefact `d08-mindmap-browser-qualification` : résultat ou failure.json, captures, exports, preview Web isolée et scénario exact. Jamais une capture générée ni une preuve de production |
| Validation finale | Consulter les **9 workflows PR sur le head live**. Les résultats d'un ancien head ne qualifient pas les commits descendants. Le dernier état CI doit être recoupé avec les artefacts et les commentaires de #92 |
| Limite des preuves | Le scénario Chromium utilise une API simulée ; le job PostgreSQL D08 est réel et distinct. Ce ne sont pas une session Web→Core→PostgreSQL de bout en bout ni une qualification sur appareils physiques |
| Sortie encore à vérifier avant clôture | Ne pas assimiler le smoke à toute la sortie D08 : vérifier déplacement conjoint d'une multi-sélection, panne/reprise de sauvegarde, ouverture d'un lien profond dans un contexte neuf et branche d'idées → tâches effectivement visibles au Gantt |
| Point de vigilance de code | `commitDraggedNode` n'enregistre que `dragged.id` alors que le renderer permet la multi-sélection. Reproduire un déplacement à deux nœuds et leur rechargement ; corriger dans cette même PR si une position est perdue |
| Prochaine action | Lire le résultat navigateur du head live de #92 ; traiter l'étape exacte si rouge. Si vert, ajouter la preuve comportementale de déplacement conjoint/reload et corriger sa cause avant la revue de sortie D08 |
| Production | Aucun déploiement ni commande serveur dans cette reprise. Dernier runtime attesté : D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations` ; D06/D07/D08 non déployés |
| Reprise / rollback | Changements de cette reprise limités au scénario navigateur et au checkpoint ; aucune migration ni donnée de production modifiée, aucune ref forcée |
| Hors scope | D09 Mycelium 3D, D10 assistant opérant, D12 coédition/offline ; complétude FR/EN historique globale en D13. Aucune fusion ou activation implicite |

L'échec historique `9f39106…`, run `34999634903`, venait d'un sélecteur `Exporter` au lieu de
`Exporter JSON` et d'une promesse de téléchargement non prise en charge immédiatement. Il
n'avait **pas** produit l'artefact D08 annoncé dans la conversation. Le diagnostic de
`1855861…` a bien été téléchargé et son digest vérifié : artefact `10409139506`,
`sha256:7e01da08f4a1b36c2f965747bdcd7cd95660a49dc4f9dce42039fa99fcff5763`.

## D07 intégré et verrouillé

Head final qualifié `0db6df6326b553136ab8a375b30fddbe5f6b27aa` : **9/9 workflows PR verts** ;
arbre du merge `ecd1947a1cf7f2adf2f6583b54748fdd62289e98` identique à l'arbre qualifié.

Une connaissance éditable reste un `Document` canonique. Une sauvegarde, une modification de
métadonnées ou une restauration crée une nouvelle `DocumentVersion`; l'historique n'est jamais
réécrit. Les chunks et l'état de recherche sont des projections reconstruisibles. Une panne de
projection ne perd ni version canonique ni permissions.

Les citations sont liées à une version cible et les citations inter-projets sont limitées au même
propriétaire. La recherche est owner-wide par défaut avec filtre projet optionnel ; inspecter un
résultat cross-project change explicitement projet + document. Les pièces jointes/whiteboards
réutilisent `Asset`; les sources importées conservent leur Asset et le pipeline Docling.

Lexical sérialise son `EditorState` dans `content_json` et `content_text` reste la projection lisible.
`nevolium-json` est le format d'échange lossless ; Markdown et texte sont des projections non-lossless.
Les nouvelles chaînes D07 utilisent la fondation FR/EN de D06 ; D13 reste la complétude historique.

Preuve navigateur D07 : artefact `10405706103`, digest
`sha256:97c73911dd15945eb80fa18dde5c3f2c8dbb9c9ce7463c36232cbe84e1bbcc6a`.

[PR D08 #92](https://github.com/fredbuhr/nevolium/pull/92) ·
[Checkpoint D07](docs/archive/d07-editable-knowledge-progress-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [Workflow](docs/development-workflow.md) ·
[État produit](docs/status.md)
