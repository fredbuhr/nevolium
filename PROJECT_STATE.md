# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D08 actif — mindmap 2D éditable

| Champ | État attesté |
|---|---|
| Base vérifiée | D07 intégré par PR #91, merge vérifié `f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4` |
| Intégration D07 | Head final qualifié `0db6df6326b553136ab8a375b30fddbe5f6b27aa`, **9/9 workflows PR verts** ; arbre du merge `ecd1947a1cf7f2adf2f6583b54748fdd62289e98` identique à l'arbre qualifié |
| Objectif D08 | Mindmap 2D éditable sur les mêmes idées/décisions/notes/projets/tâches, liens typés, groupes, multi-sélection, positions/layouts, filtres, recherche, undo/redo et liens profonds |
| Invariant principal | La mindmap est une vue/édition des identités canoniques D06/D07 ; elle ne copie pas le métier dans un modèle parallèle |
| Conversion | Idée → tâche doit conserver la référence/provenance et devenir visible dans les vues de planification sans duplication silencieuse |
| Réutilisation | Inspecter les primitives graphe/layout déjà présentes et le prototype historique `ed12d503…` sélectivement ; ne jamais le fusionner en bloc |
| Sortie D08 | Construire une carte, convertir une branche en tâches visibles au Gantt ; rechargement/export préservent identités/liens ; isolation et chargement borné par périmètre testés |
| Production | Inchangée : runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations` ; D06/D07 non déployés |
| Hors scope | Mycelium 3D D09 ; assistant opérant D10 ; coédition/offline D12 ; complétude FR/EN globale D13 |
| Prochaine action | Vérifier le `main` live post-handoff, annoncer D08, créer une branche fraîche `feat/d08-editable-mindmap`, puis auditer relations/layouts/@xyflow avant toute migration ou API nouvelle |

## D07 intégré et verrouillé

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

[Checkpoint D07](docs/archive/d07-editable-knowledge-progress-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [Workflow](docs/development-workflow.md) ·
[État produit](docs/status.md)
