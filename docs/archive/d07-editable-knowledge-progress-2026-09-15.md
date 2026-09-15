# D07 — connaissances éditables, recherche et provenance — checkpoint du 15 septembre 2026

## Intégration

D07 a été ouvert depuis `main` `958f440183c5d0051d869474784251eb20bd8fb4` sur
`feat/d07-editable-knowledge`, PR #91. La tête finale qualifiée de la PR est
`0db6df6326b553136ab8a375b30fddbe5f6b27aa` et passe **9/9 workflows PR**. La PR #91 est intégrée
par le merge GitHub vérifié `f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4`.

Le merge a pour parents l'ancien `main` `958f440183c5d0051d869474784251eb20bd8fb4` et la tête finale
D07 `0db6df6326b553136ab8a375b30fddbe5f6b27aa`. Son arbre
`ecd1947a1cf7f2adf2f6583b54748fdd62289e98` est exactement identique à l'arbre qualifié de la
branche. L'intégration a donc préservé byte-for-byte le contenu validé.

Le serveur pilote reste inchangé sur le runtime D05
`e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` et le schéma `0015_model_configurations`. Les
migrations D06 `0016`/`0017` et D07 `0018_editable_knowledge` n'ont été appliquées qu'en CI. D07 n'a
modifié aucune donnée, aucun secret, aucun snapshot B2 et aucun conteneur du pilote.

## Résultat D07

| Zone | Comportement qualifié |
|---|---|
| Canon éditable | `Document` reste l'agrégat canonique. Les entrées authored `note`, `idea` et `decision` peuvent exister sans Asset source ; les sources importées conservent leur Asset canonique |
| Versions | Chaque sauvegarde, changement de métadonnées ou restauration crée une nouvelle `DocumentVersion`; aucune génération historique n'est réécrite |
| Rich text | Lexical 0.35 sérialise son `EditorState` JSON dans `content_json`; `content_text` reste la projection lisible/recherchable |
| Concurrence | `expected_generation` refuse une sauvegarde/restauration obsolète avec conflit explicite |
| Provenance | Citations liées à la version cible, vers URL ou Document/version/chunk ; citations inter-projets autorisées uniquement pour le même propriétaire |
| Idée/décision | kinds minimaux `note/idea/decision` et statuts `hypothesis/supported/contested/verified`, sans étendre le domain-model spéculatif |
| Pièces jointes | `DocumentAssetLink` réutilise `Asset` avec rôles `attachment` et `whiteboard`; aucun second stockage de fichier |
| Recherche | Recherche universelle owner-scoped par défaut, filtre projet optionnel ; inspection d'un résultat cross-project bascule projet + document sans fuite propriétaire |
| Projection | Les chunks et l'état de recherche sont dérivés et reconstruisibles ; `search_status=failed` exclut une projection défaillante sans supprimer le contenu canonique |
| Import/export | `nevolium-json` est lossless pour contenu riche + texte + métadonnées + citations ; Markdown et texte sont explicitement des projections non-lossless |
| Sources importées | Le pipeline Docling historique reste inchangé/vert ; ouvrir/re-ingérer n'est proposé qu'aux vrais documents `source` possédant un Asset |
| Web | Éditeur Lexical intégré à Documents, toolbar minimale, création/version/restauration/citations/import-export, recherche globale et responsive téléphone |
| FR/EN | Toutes les nouvelles surfaces D07 utilisent la fondation de langue D06 ; D13 reste responsable de la complétude des surfaces historiques |

## Scénario de sortie prouvé

La preuve PostgreSQL D07 exécute un parcours réel sur base migrée jusqu'à `0018` : import d'une
source Markdown, création d'une décision sourcée dans un autre projet du même propriétaire,
recherche owner-wide, version suivante, conflit de génération, changement de métadonnées,
restauration, lien Asset, refus d'un Asset étranger, panne volontaire de projection puis récupération
à partir du canon. L'isolation d'un autre propriétaire est également vérifiée.

La qualification Chromium D07 exécute la surface Web réelle : création d'une décision, édition
Lexical, ajout de citation, sauvegarde en génération 2, restauration d'une ancienne version en
nouvelle génération, recherche universelle d'une connaissance située dans un autre projet,
inspection avec changement de contexte, puis bascule de la nouvelle surface en anglais. Un second
contexte téléphone tactile vérifie l'absence de débordement horizontal et l'édition utilisable.

Artefact navigateur du run UI de la tête fonctionnelle : ID `10405706103`, digest
`sha256:97c73911dd15945eb80fa18dde5c3f2c8dbb9c9ce7463c36232cbe84e1bbcc6a`.

## Validation finale

Sur la tête finale `0db6df6326b553136ab8a375b30fddbe5f6b27aa` :

- **9/9 workflows PR réussis** : Code quality, UI workspace, MCP registry, Document ingestion,
  Baseline reproducibility, Foundation, Multi-user isolation, Autonomous research et D04 real engine ;
- migration Alembic complète jusqu'à `0018_editable_knowledge` sur PostgreSQL réel ;
- scénario D07 PostgreSQL réel vert et ingestion Docling historique verte sur le même head ;
- TypeScript/Vite, contrat Web D07 et contrats Core réussis ;
- Chromium D05, D06 et D07 réussis sur la même tête ;
- sauvegarde/restauration B2, moteurs réels D04, Research crash/replay et isolation OIDC restent verts.

Le merge `f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4` a été revérifié sur `main` : second parent exact,
merge signé/vérifié et arbre identique à la tête qualifiée.

## Données, rollback et limites

`0018_editable_knowledge` est additive. Elle rend `documents.asset_id` nullable, ajoute les kinds et
statuts épistémiques, le contenu authored des versions, l'état de projection, les citations et les
liens Asset. Le downgrade refuse explicitement de remettre `asset_id NOT NULL` tant que des Documents
authored sans Asset existent : il faut donc exporter/préserver ou migrer ces connaissances avant un
rollback réel, puis seulement revenir de `0018` vers `0017`. Aucun rollback production n'est requis
tant que D07 n'est pas déployé.

D07 ne livre pas la coédition (D12), un éditeur whiteboard dédié, la mindmap 2D (D08), le Mycelium
3D (D09), ni la traduction complète de toutes les surfaces historiques (D13). Le JSON Nevolium est
le format d'échange lossless ; Markdown/texte ne prétendent pas restaurer la mise en forme riche.
La CI Chromium ne remplace pas une revue ergonomique sur appareils physiques.

## Handoff

D07 est intégré. La prochaine tranche produit est **D08 — mindmap 2D éditable**. D08 doit démarrer
sur une branche fraîche depuis le `main` live après vérification du commit de handoff. La mindmap doit
réutiliser les identités D06/D07, les relations typées et les primitives de layout présentes ; elle ne
doit pas devenir une seconde source de vérité. Le prototype historique `ed12d503…` peut être inspecté
sélectivement, jamais fusionné en bloc. D09 ne doit pas commencer en parallèle.
