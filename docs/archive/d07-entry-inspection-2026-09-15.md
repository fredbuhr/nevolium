# D07 — inspection d'entrée du 15 septembre 2026

Base vérifiée : `main` `958f440183c5d0051d869474784251eb20bd8fb4`.
Branche : `feat/d07-editable-knowledge`.

## Périmètre du lot

D07 doit livrer les connaissances éditables, leur versionnement/restauration, la recherche universelle owner-scoped, les sources/citations, les objets idée/décision et uniquement les statuts épistémiques nécessaires, les pièces jointes/whiteboards liés, ainsi que des formats d'import/export documentés. Le scénario de sortie doit couvrir import → annotation → décision sourcée → récupération depuis un autre espace → restauration d'une version, plus une panne d'index sans perte de document ou de permissions.

Hors périmètre : coédition temps réel (D12), mindmap 2D (D08), Mycelium 3D (D09), matérialisation du modèle conceptuel spéculatif complet.

## Vérité existante à réutiliser

- `Document`, `DocumentVersion`, `DocumentChunk` et `Asset` sont déjà canoniques en PostgreSQL.
- `Document` pointe actuellement vers un `Asset` source non nul et unique ; cela convient aux imports mais pas encore aux notes rédigées directement dans Nevolium.
- Les versions d'ingestion sont immuables, numérotées par génération et reliées à des chunks avec SHA-256.
- Les endpoints Documents sont owner/project-scoped, paginés et audités ; la réingestion crée une nouvelle génération.
- `Asset` réutilise SeaweedFS, limite la taille, conserve hash/type/owner et préserve les métadonnées canoniques quand le stockage est indisponible.
- `/v1/knowledge/search` existe déjà, mais exige un `project_id` et ne recherche que les chunks de la dernière génération complétée de documents prêts.
- Le Web possède déjà `KnowledgeWorkspace`, ingestion, inspecteur versions/chunks et panneau de recherche.
- Lexical est déjà une dépendance Web, mais aucun `LexicalComposer` ni éditeur riche D07 n'existe sur la ligne canonique.
- La fondation FR/EN D06 est centralisée dans `apps/web/src/i18n.tsx`; les nouvelles surfaces D07 doivent l'utiliser.

## Réservoir historique inspecté

Le réservoir `ed12d503aa500a6e7700e9ac82d823e0e815f33d` contient un ancien `KnowledgeWorkspace` plus large : bibliothèque générale, recherche intégrée, versions, statut et navigation vers le graphe. Il n'apporte pas d'éditeur Lexical ni de modèle canonique D07 réutilisable. Ses idées UX peuvent être reprises ponctuellement, mais aucune migration ou arborescence de ce réservoir ne doit être fusionnée en bloc.

## Écarts D07 constatés

1. Pas de document authored sans Asset source.
2. Pas de contenu riche/plain-text canonique dans `DocumentVersion` pour une édition native.
3. Pas d'API de sauvegarde/restauration de version éditable.
4. Pas d'objet canonique idée/décision ni statut épistémique minimal.
5. Pas de provenance/citation structurée reliant une connaissance à un document/version/chunk ou une URL.
6. Pas de lien canonique Document ↔ Asset pour pièces jointes/whiteboards multiples.
7. Recherche limitée au projet courant, donc pas encore universelle au propriétaire.
8. Pas d'import/export natif documenté pour les notes éditables.
9. Pas de test de panne d'index garantissant que la connaissance canonique reste intacte.

## Architecture D07 retenue

- Étendre `Document`/`DocumentVersion` au lieu de créer une seconde base Knowledge.
- `Document.asset_id` devient nullable : un import conserve sa source Asset, un document authored peut exister sans fichier source.
- Ajouter un `kind` borné (`source`, `note`, `idea`, `decision`) et un statut épistémique minimal nullable. D07 ne matérialise pas un modèle conceptuel général.
- Ajouter dans `DocumentVersion` le contenu authored sous deux formes : JSON riche canonique et texte normalisé destiné à lecture/recherche/export. Une sauvegarde crée toujours une nouvelle génération immuable.
- Restaurer une ancienne version en créant une nouvelle génération copiée, jamais en réécrivant l'historique.
- Les chunks restent la projection textuelle commune des imports et contenus authored ; la recherche peut les réutiliser sans introduire une vérité parallèle.
- Ajouter une provenance structurée owner-scoped : cible Document, source optionnelle Document/Version/Chunk ou URL, avec libellé/citation. Les références inter-projets sont permises uniquement si le même propriétaire possède les deux côtés.
- Réutiliser `Asset` pour pièces jointes et whiteboards via une table de liens Document ↔ Asset avec rôle borné, ordre et libellé. Aucun second stockage binaire.
- Faire évoluer la recherche vers un scope propriétaire global avec `project_id` optionnel, résultats bornés et projet retourné.
- Formats authored initiaux : JSON Nevolium canonique + Markdown/plain-text pour import/export. Les imports de fichiers riches existants continuent de passer par Docling.
- L'index/recherche reste dérivé : une panne de projection ne doit jamais annuler ni supprimer la version canonique créée.

## Ordre interne du lot

1. Migration `0018` + ORM/schémas et invariants.
2. APIs authored/version/restore, provenance, attachments et recherche owner-wide.
3. Import/export et projection de recherche résiliente.
4. UI Lexical + idée/décision/citations/pièces jointes + recherche universelle en FR/EN.
5. Scénario PostgreSQL et Chromium D07, panne d'index, restauration, cross-space et clôture exact-head.

Prochaine action exécutable : construire `0018_editable_knowledge` et les modèles associés, sans modifier D08/D09 ni `main.py` tant qu'un routage via le router Knowledge existant suffit.
