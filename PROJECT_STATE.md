# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D07 actif — connaissances éditables, recherche et provenance

| Champ | État attesté |
|---|---|
| Base vérifiée | `main` `958f440183c5d0051d869474784251eb20bd8fb4`, D06 intégré par #90 |
| Branche / PR active | `feat/d07-editable-knowledge` · PR à ouvrir après le checkpoint d'entrée |
| Objectif D07 | Documents/notes riches éditables et versionnés, restauration, recherche owner-wide, sources/citations, idées/décisions + statuts épistémiques minimaux, pièces jointes/whiteboards liés, import/export documenté |
| Réalisé | Audit du modèle Documents/Assets/Knowledge/Web et du réservoir historique `ed12d503…`; aucune implémentation D07 encore déclarée validée |
| Réutilisation imposée | `Document`/`DocumentVersion`/`DocumentChunk` restent canoniques ; `Asset`/SeaweedFS pour fichiers ; Lexical déjà installé ; recherche/chunk inspector existants à étendre |
| Architecture retenue | Généraliser Document aux kinds source/note/idea/decision ; versions authored immuables JSON+texte ; restauration par nouvelle génération ; provenance structurée ; liens Document↔Asset ; recherche propriétaire globale avec filtre projet optionnel |
| Validation | D06 main reste la dernière base qualifiée ; aucun check D07 n'est encore revendiqué |
| Production | Inchangée : runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations` ; D06/D07 non déployés |
| Hors scope | Coédition D12 ; mindmap D08 ; Mycelium 3D D09 ; modèle conceptuel spéculatif complet |
| Rollback / données | Aucune mutation D07 de production. La future migration doit rester additive/réversible et préserver Documents/Assets historiques |
| Prochaine action | Implémenter `0018_editable_knowledge`, ORM et invariants/tests ; router les nouvelles APIs via Knowledge sans dupliquer `main.py` si possible |

## Principes D07

Une connaissance éditable reste un `Document` canonique. Une sauvegarde/restauration crée une
nouvelle `DocumentVersion`; l'historique n'est jamais réécrit. Les chunks et tout futur index sont
des projections reconstruisibles. Une panne d'index ne doit pas perdre la version canonique ni ses
permissions. Les citations inter-projets sont autorisées uniquement entre objets du même propriétaire.

Les pièces jointes et whiteboards réutilisent `Asset`; D07 ne crée pas de second stockage. La
recherche doit devenir universelle au propriétaire avec filtre projet optionnel, sans exposer les
données d'un autre propriétaire. Les nouvelles chaînes visibles passent par la fondation i18n FR/EN.

[Inspection D07](docs/archive/d07-entry-inspection-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [Workflow](docs/development-workflow.md) ·
[État produit](docs/status.md)
