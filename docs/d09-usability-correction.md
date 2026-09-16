# D09 — correction du parcours réel

16 septembre 2026. Base de travail : main `d345294b50aee93e57f3316821bfd8e6c97f21cc`.
Branche unique : `fix/d09-guided-workspace`, [PR #96 en brouillon](https://github.com/fredbuhr/nevolium/pull/96). Release pilote inchangée : `69f5926be72227a5fc1c4e3dff7c0e436099e51c`.

## Gate

Pilote techniquement stable, acceptation fonctionnelle bloquée par le retour utilisateur.
Pas de D10, de nouveau déploiement, de migration, de redémarrage ni de nettoyage Docker.
Le modèle translucide validé n’est pas remplacé.

## Constats et causes

- Les captures affichent EN alors que le cockpit, le contexte et des inspecteurs restent
  français. Le code confirme des libellés FR en dur à côté des catalogues bilingues :
  ce n’est pas une installation de langue manquante ni une erreur de l’utilisateur.
- La création ne demandait qu’un titre/type/statut, créait une entrée vide puis exigeait
  une seconde édition. La source importée sélectionnée et ses outils occupaient le même écran.
- Le snapshot Core expose les objets du projet mais ne fournit comme arêtes que les
  RelationshipRecords explicites. Le renderer ne crée aucun filament sans arête.
  Le banc synthétique très relié ne couvrait pas ce cas. Le nombre réel d’arêtes et le
  réglage de mouvement du navigateur du pilote ne sont pas connus ; une capture fixe
  seule ne prouve pas une panne d’animation.
- La navigation, la boussole de contexte, les actions de mise en page, la recherche et
  les outils de provenance/relations rivalisaient avec l’action principale.

## Correctif de présentation

- Titre et contenu enregistrés ensemble par le POST canonique existant ; Idée par défaut,
  statut non défini valide, choix de type/statut facultatifs repliés. Un projet est choisi
  directement dans Documents ; les documents existants restent sélectionnables.
- Recherche, import/source/versions, métadonnées/citations/export et édition avancée du graphe
  restent disponibles sous des sections dépliables. L’inspection d’un résultat ouvre
  automatiquement ses outils. Contexte latéral facultatif, options de disposition repliées.
- Catalogue typé FR/EN pour chrome cockpit, titres d’onglets, contexte, capture et inspecteurs.
  Une langue change les titres sans remonter l’espace ni recharger son état.
- `withProjectMembership` dérive au plus une liaison projet→membre depuis le projectId
  canonique, seulement si la racine existe et sans doublon avec une relation explicite.
  Les deux vues utilisent cette présentation. En 2D, les appartenances sont pointillées
  et non éditables ; la légende distingue appartenance et lien sémantique.
- Le renderer existant anime ces filaments. Il respecte toujours le mouvement réduit
  et la pause ; une indication explique pourquoi l’animation est suspendue.

Ces liaisons ne sont pas des relations de sens inventées entre idées. Aucun
RelationshipRecord, export canonique, permission, API, migration, shader ni palette 3D
n’est modifié. Une future suggestion sémantique devra être sourcée et acceptée, pas décorative.

## Validation

Acquis localement : TypeScript, build Vite (avertissements de taille de chunks conservés),
contrats D05 cockpit, D06 locale, D07 éditeur, D08 Web, D09 spatial/présentation/mesures/matière,
et nouveau contrat de projet sans relations (scope, idempotence, absence de mutation, filaments
avec circulation dans les trois profils).

Tests navigateur étendus mais **pas encore exécutés avec succès** : capture d’idée sans
ouvrir les options, contenu initial persistant, ancien parcours décision/citation/restauration,
inspection inter-projets, chrome/contexte EN, téléphone, options avancées D05/D08 accessibles,
projet sans relations en 2D/3D, différence de pixels caméra fixe, pause et mouvement réduit.
Le navigateur local est absent ; l’installation du binaire a échoué dans cet environnement.
Les suites Chromium GitHub et l’inspection de leurs captures sont obligatoires avant merge.

La complétude FR/EN des anciens modules (notamment Accueil/Projets/réglages métier) n’est pas
revendiquée : elle reste à auditer. Les données réelles, l’authentification, le tactile physique
et la lisibilité du pilote ne sont pas qualifiés par une API simulée.

Premier run GitHub `35097464192`, tête `64311f9…` : contrats et intégrations PostgreSQL
verts, kit graphique vert (3 186 pixels modifiés en animation, 0 en pause). Les captures
cockpit bureau/téléphone sont produites ; le scénario connecté s’arrête en cherchant le
panneau latéral fermé par défaut. Le test est adapté pour ouvrir les options puis le
contexte et les sources. Les autres suites navigateur n’avaient pas été exécutées à cause
de cet arrêt ; elles deviennent indépendantes de l’échec d’une suite précédente, sans
masquer aucun échec ni retirer de contrôle. Nouvelle tête complète à requalifier.

## Reprise

Deuxième tête `26b9ccd…`, UI run `35098342681` : D05 bureau/tablette/téléphone et parcours
connectés verts ; D06 planning vert ; D08/3D et leur persistance/FR-EN/tactile verts.
Le cas sans relations affiche trois appartenances et anime 379 pixels à caméra fixe,
contre 0 en pause. Les sept autres workflows PR sont verts. D07 reste rouge : après une
sauvegarde, le rafraîchissement des documents démontait l’éditeur et refermait le volet
des sources, masquant la restauration. Le correctif maintient l’éditeur pendant une
relecture du même projet déjà chargé et filtre ses versions par document ; un test garde
un brouillon de l’idée suivante pendant cette sauvegarde. Requalification requise.

Lancer/inspecter UI workspace validation sur la tête de cette branche, traiter les échecs,
inspecter les captures d’idée et de graphe peu relié. Ne proposer une activation qu’après
qualification cohérente et conservation des protections de reprise du pilote.
