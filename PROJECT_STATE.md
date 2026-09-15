# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D07 candidat final — connaissances éditables, recherche et provenance

| Champ | État attesté |
|---|---|
| Base vérifiée | `main` `958f440183c5d0051d869474784251eb20bd8fb4`, D06 intégré par #90 |
| Branche / PR active | `feat/d07-editable-knowledge` · PR #91, encore draft au moment de ce checkpoint |
| Objectif D07 | Documents/notes riches éditables et versionnés, restauration, recherche owner-wide, sources/citations, idées/décisions + statuts épistémiques minimaux, pièces jointes/whiteboards liés, import/export documenté |
| Réalisé | Migration `0018_editable_knowledge`, canon authored sur `Document`/`DocumentVersion`, provenance/citations, liens Asset, recherche universelle, import/export documenté, éditeur Lexical, navigation cross-project et nouvelles surfaces FR/EN |
| Architecture retenue | `Document` reste canonique ; une sauvegarde/restauration crée une génération immuable ; Lexical sérialise dans `content_json`, `content_text` reste projection lisible ; chunks/recherche restent reconstruisibles |
| Validation fonctionnelle | Head `01c035ec7e7fae01513788d04695fcff63a075fe` : **9/9 workflows PR verts**, PostgreSQL D07 réel, ingestion Docling historique, TypeScript/Vite et Chromium D07 verts |
| Preuve navigateur | Artefact D07 `10405706103`, digest `sha256:97c73911dd15945eb80fa18dde5c3f2c8dbb9c9ce7463c36232cbe84e1bbcc6a` |
| Production | Inchangée : runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations` ; D06/D07 non déployés |
| Hors scope | Coédition D12 ; mindmap D08 ; Mycelium 3D D09 ; traduction historique complète D13 ; modèle conceptuel spéculatif complet |
| Rollback / données | `0018` est additive mais son downgrade refuse de restaurer `asset_id NOT NULL` tant que des Documents authored sans Asset existent ; exporter/préserver ou migrer ces données avant rollback réel |
| Prochaine action | Requalifier **9/9** la tête documentaire finale de #91 ; si verte, passer la PR en ready, fusionner, vérifier `main`, puis ouvrir D08 sur une branche fraîche |

## Principes D07 verrouillés

Une connaissance éditable reste un `Document` canonique. Une sauvegarde, une modification de
métadonnées ou une restauration crée une nouvelle `DocumentVersion`; l'historique n'est jamais
réécrit. Les chunks et l'état de recherche sont des projections reconstruisibles. Une panne de
projection ne doit pas perdre la version canonique ni ses permissions.

Les citations sont liées à une version cible. Les citations inter-projets ne sont autorisées qu'entre
objets du même propriétaire. La recherche est owner-wide par défaut avec filtre projet optionnel ;
inspecter un résultat situé ailleurs change explicitement projet + document sans exposer un autre
propriétaire.

Les pièces jointes et whiteboards réutilisent `Asset`; les sources importées conservent leur Asset
canonique et restent relues par le pipeline Docling. `nevolium-json` est le format d'échange lossless ;
Markdown et texte sont des projections non-lossless. Les nouvelles chaînes visibles D07 utilisent la
fondation i18n FR/EN de D06.

[Checkpoint D07](docs/archive/d07-editable-knowledge-progress-2026-09-15.md) ·
[Inspection D07](docs/archive/d07-entry-inspection-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [Workflow](docs/development-workflow.md) ·
[État produit](docs/status.md)
