# D07 — connaissances éditables, recherche et provenance — checkpoint du 15 septembre 2026

## État d'intégration

D07 a été ouvert depuis `main` `958f440183c5d0051d869474784251eb20bd8fb4` sur
`feat/d07-editable-knowledge`, PR #91. La tête fonctionnelle candidate
`01c035ec7e7fae01513788d04695fcff63a075fe` passe **9/9 workflows PR**. Le checkpoint et les
fichiers d'état sont ensuite mis à jour sur la branche ; cette nouvelle tête documentaire doit elle
même être requalifiée avant passage de la PR en ready et avant fusion.

Le serveur pilote reste inchangé sur le runtime D05
`e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` et le schéma `0015_model_configurations`. Les
migrations D06 `0016`/`0017` et D07 `0018_editable_knowledge` n'ont été appliquées qu'en CI. D07
n'a donc modifié aucune donnée, aucun secret, aucun snapshot B2 et aucun conteneur du pilote.

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

Artefact navigateur du run UI exact-head : ID `10405706103`, digest
`sha256:97c73911dd15945eb80fa18dde5c3f2c8dbb9c9ce7463c36232cbe84e1bbcc6a`.

## Validation de la tête fonctionnelle

Sur `01c035ec7e7fae01513788d04695fcff63a075fe` :

- **9/9 workflows PR réussis** : Code quality, UI workspace, MCP registry, Document ingestion,
  Baseline reproducibility, Foundation, Multi-user isolation, Autonomous research et D04 real engine ;
- migration Alembic complète jusqu'à `0018_editable_knowledge` sur PostgreSQL réel ;
- scénario D07 PostgreSQL réel vert et ingestion Docling historique verte sur le même head ;
- TypeScript/Vite, contrat Web D07 et contrats Core réussis ;
- Chromium D05, D06 et nouveau D07 réussis sur la même tête ;
- sauvegarde/restauration B2, moteurs réels D04, Research crash/replay et isolation OIDC restent verts.

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

D07 peut être intégré seulement après requalification **9/9** de la tête documentaire finale. Après
fusion, vérifier le commit de merge et son arbre sur `main`, puis mettre à jour l'état opérationnel
pour ouvrir **D08 — mindmap 2D éditable** sur une branche fraîche. Ne pas commencer D08/D09 sur la
branche D07.
