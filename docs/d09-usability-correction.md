# D09 — correction du parcours réel

16 septembre 2026. Base de travail : main `d345294b50aee93e57f3316821bfd8e6c97f21cc`.
Branche unique : `fix/d09-guided-workspace`, [PR #96 en brouillon](https://github.com/fredbuhr/nevolium/pull/96). Release pilote inchangée : `69f5926be72227a5fc1c4e3dff7c0e436099e51c`.

## Gate

Correctif publié `9b6b010` : neuf workflows verts, captures inspectées. Voir la
qualification finale en fin de document ; les sections intermédiaires conservent
la chronologie des diagnostics et corrections.

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
- La capture du cas peu relié montrait un réseau trop petit : le cadrage initial et
  « Vue d’ensemble » utilisent son étendue organique avec un plancher de quatre unités,
  au lieu de dix. Les caméras enregistrées et déplacées par l’utilisateur restent préservées.

Ces liaisons ne sont pas des relations de sens inventées entre idées. Aucun
RelationshipRecord, export canonique, permission, API, migration, shader ni palette 3D
n’est modifié. Une future suggestion sémantique devra être sourcée et acceptée, pas décorative.

## Validation

Acquis localement : TypeScript, build Vite (avertissements de taille de chunks conservés),
contrats D05 cockpit, D06 locale, D07 éditeur, D08 Web, D09 spatial/présentation/mesures/matière,
et nouveau contrat de projet sans relations (scope, idempotence, absence de mutation, filaments
avec circulation dans les trois profils).

Tests navigateur étendus, **suite complète verte sur `f7c4d04`** : capture d’idée sans
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

Tête `2911d5d…`, UI run `35099526070` : D05/D06/D08/3D restent verts, sept autres workflows
verts ; cadrage corrigé, 489 pixels animés et 0 en pause pour le projet sans relations.
D07 passe création avec contenu, sauvegarde en conservant le brouillon suivant, citations,
restauration et inspection inter-projets. Il s’arrête ensuite sur le repérage exact de
« Your context » : les sélecteurs de projet reçoivent un aria-label explicite identique
à leur libellé visible, sans relâcher l’assertion. Une capture sur échec est ajoutée.
La capture FR d’idée et le graphe peu relié ont été inspectés ; le navigateur complet
reste à requalifier sur la nouvelle tête, y compris la fin du scénario anglais/téléphone.

## Reprise après interruption — 16 septembre

La cause de l’interruption de la réponse ChatGPT n’est pas établie : aucun journal de session
ne l’atteste. Les changements ont été conservés dans la branche et les cinq commits de la PR #96.
Les erreurs historiques ci-dessus ont retardé la qualification ; elles ne prouvent pas la cause
de l’interruption de conversation. Aucun redémarrage ni nouvelle activation de production.

La tête `f7c4d04033a52e267aaa0e839286387bd7d9661e` passe les **8 workflows PR déclenchés**.
Le workflow D04 à filtrage de chemins n’est pas déclenché pour ces changements Web ; ne pas
annoncer 9/9. Le [run UI `35101172713`](https://github.com/fredbuhr/nevolium/actions/runs/35101172713)
est vert dans ses quatre jobs, avec les suites D05, D06, D07 et D08/D09 toutes exécutées.
Le cas sans relations affiche trois appartenances, 478 pixels animés et zéro en pause.
Les 16 scénarios spatiaux et les 16 contrôles du kit passent ; le kit détecte 1 956 pixels
animés et zéro en pause. Ces mesures SwiftShader ne mesurent pas le GPU du pilote.

Archives récupérées et contrôlées :

| Preuve | Artefact | SHA-256 du ZIP |
|---|---|---|
| Capture d’idée, EN, téléphone | `10449070683` | `8b91593c9d9c13e474f8cc23c45e13ab4e29afeb8d0741b3d1b9b6b5b719c9a8` |
| Scènes spatiales dont projet peu relié | `10448587504` | `be57466f56cfec4f8a0212994f5f6cd8cd83e510a31d895107144e6e3f17ac4f` |

L’inspection des PNG confirme la capture directe et les filaments, mais relève encore deux
défauts réels : le sélecteur de langue fixé en surimpression masque le compte et la marque sur
téléphone ; la devise du cockpit demeure française en EN. Le complément replace le sélecteur
dans les en-têtes Accueil/cockpit, traduit la devise et réserve des cibles tactiles de 44 px.
Le texte destiné au lecteur d’écran reçoit aussi son style global manquant. Les contrôles
navigateur vérifient l’absence de recouvrement marque/compte/recherche et les cibles tactiles
de 320 px au bureau, ainsi que la devise anglaise. Nouvelle tête à qualifier avant intégration.

La traduction complète des contenus historiques d’Accueil, Projets et des réglages n’est
toujours pas acquise. Les titres et contenus rédigés par l’utilisateur conservent leur langue.

### Complément local et blocage de publication

Le complément est committé localement dans `f07918db907c1f03cb9c3354f0657dbb0652dbd4`.
TypeScript, build Vite, contrats D05/D06 locale, syntaxe des suites navigateur modifiées et
contrôle de diff passent. Le build signale toujours ses chunks volumineux. Le lanceur pnpm
local a d’abord refusé une réinstallation implicite sans TTY ; le build a ensuite utilisé
directement les binaires installés, sans purge de dépendances. Aucun Chromium local disponible.

L’auto-review a rejeté l’envoi Git du complément vers GitHub : destination jugée non vérifiée
et absence d’autorisation explicite de divulgation. La PR #96 a été relue après le rejet : elle
reste sur `f7c4d04`. Ce blocage observé pendant la reprise ne permet pas d’expliquer l’interruption
antérieure de la conversation. Aucun contournement par le connecteur GitHub ni tentative de
déploiement. Il faut l’autorisation explicite de pousser ces changements vers `fredbuhr/nevolium`
avant la CI du nouveau commit ; les preuves vertes du parent ne qualifient pas ce complément.

## Accueil Mycelium transversal — extension autorisée le 16 septembre

L’utilisateur précise que Mycelium commence dès l’accueil et sert à naviguer entre les objets.
Il autorise la poursuite, demande des exemples exploitables et impose KISS au backend et au
frontend. Le correctif reste sur la branche de la PR #96, sans engager D10.

L’ancien accueil fixe à six destinations et ses menus redondants sont remplacés par le renderer
organique D09 partagé. L’ancien composant SVG, son générateur et ses styles d’accueil sont
retirés ; leurs tests de géométrie historique sont remplacés par le contrat du modèle d’accueil
et les parcours de cibles tactiles, tandis que les contrats du renderer organique restent actifs.
La matière et les shaders adoptés sont conservés.

L’accueil permet d’épingler des outils ou des objets réels, renommer les raccourcis, les ordonner,
les regrouper dans des dossiers, retirer un raccourci et annuler la dernière modification.
Ces dossiers ne déplacent pas les contenus. `WorkspaceLayout` assure la persistance par compte
avec le writer sérialisé existant. L’accueil et ses caméras utilisent des clés distinctes des
cartes des projets. Une disposition illisible reste protégée contre l’écrasement. Les raccourcis
inaccessibles cachent leur ancien libellé ; le contexte est conservé à l’ouverture d’un espace.

Une seule projection en lecture est ajoutée : `GET /v1/mycelium/{entity_type}/{entity_id}`,
36 relations candidates par page, maximum 80, curseur lié au foyer. Elle relit PostgreSQL,
sans nouvelle table, migration ni second graphe. Chaque extrémité est soumise aux droits du
compte, y compris pour les relations devenues obsolètes et les citations historiques.

| Objets | Relations projetées |
| --- | --- |
| Projets et sous-projets | Parent, tâches, documents, fichiers et résultats du projet |
| Tâches | Hiérarchie, dépendances typées et décalages, exécutions, résultats, approbations |
| Documents et idées | Appartenance, fichiers sources, pièces jointes, diagrammes, traitements, citations de chaque version |
| Citations | Document citant, génération citante, document source et génération source |
| Fichiers | Projet, documents source et documents auxquels ils sont joints |
| Conversations | Tâches et exécutions liées par les commandes canoniques |
| Exécutions, résultats, approbations | Références canoniques associées à la tâche et au projet |
| Tous les types reconnus | `RelationshipRecord` explicites, aliases historiques normalisés, liens transversaux autorisés |

Les filaments de l’accueil expriment des raccourcis privés. Les filaments d’un voisinage
expriment les relations enregistrées, avec libellés et direction dans l’inspecteur. Le contrôle
2D accessible reste disponible ; le téléphone démarre en 2D, avec choix explicite de la 3D.
FR/EN couvre les nouvelles commandes. La langue d’un contenu rédigé reste inchangée.

### Corpus et validation

Le corpus versionné `examples/mycelium` contient 5 projets, 20 documents/idées/décisions,
12 fichiers, 12 tâches dont 3 jalons, 9 dépendances, 32 relations explicites, 12 citations
réparties sur les versions et 12 liens document/fichier. Trois accueils proposés correspondent
à la crypto, au journalisme et à la recherche. Toutes les données sont fictives. Les cas vides,
homonymes, sous-projet, idée sans lien sémantique et liens entre projets sont intentionnels.

`scripts/examples/import_mycelium.py` affiche d’abord un inventaire sans accès réseau.
L’import explicite passe par les API existantes, préserve un accueil déjà enregistré et relit
les fichiers et les liens paginés. Son journal est lié au compte, serveur, corpus et profil,
verrouillé contre les imports simultanés. Une écriture dont la réponse a été perdue reste
bloquée pour réconciliation, sans répétition automatique. Aucun Task dispatch ni appel de
modèle n’est émis par l’importateur. Aucune donnée d’exemple n’a été chargée dans le pilote.

Preuves locales de cette extension : TypeScript et build Vite passent ; contrats D05 cockpit,
D06 langue, matière organique D09, appartenance aux projets et modèle d’accueil passent ;
Ruff F/E9 et compilation des neuf projections PostgreSQL passent. Le test HTTP de l’import
valide les schémas canoniques des requêtes, les 12 fichiers relus, la pagination, une reprise
sans écriture supplémentaire, le refus d’un autre compte, une réponse perdue et la conservation
d’un accueil personnel. Ce test utilise un transport simulé ; ce n’est pas une preuve SQL.

La CI est étendue avec un contrat PostgreSQL transactionnel couvrant les neuf types, les familles
de relations, les aliases, les curseurs, les versions et les droits, et un parcours Chromium
sur ordinateur/tablette/téléphone utilisant le même corpus. Le parcours couvre 3D par défaut
sur grand écran, pause, traversée entre projets, téléchargement CSV, aperçu SVG, personnalisation,
ordre, annulation, reprise de sauvegarde, rechargement et FR/EN. Ces nouvelles suites n’ont pas
encore été exécutées : PostgreSQL absent localement ; les distributions officielles Chromium
et headless-shell ont été téléchargées mais s’arrêtent avec `SIGTRAP` au lancement dans cet
environnement. Aucun rendu final du nouvel accueil n’est encore visuellement attesté.

La qualification verte du parent `f7c4d04` ne qualifie pas cette extension. La prochaine étape
est la publication de la branche existante puis l’exécution et l’inspection de ces nouvelles
preuves. Le déploiement ultérieur concernera **Core et Web**, avec vérification de la compatibilité
de leurs versions. Les points de retour et le pilote restent inchangés.

### Publication de l’extension bloquée

Le développement Accueil/corpus est committé dans `1c00a18`. Une tentative d’envoi vers la même
branche, après le message autorisant la poursuite des travaux, est de nouveau rejetée par
l’auto-review : code, fixtures et documentation vers une destination GitHub classée non vérifiée ;
autorisation de développement jugée insuffisante pour cette divulgation. Aucun contournement.
La PR distante reste à `f7c4d04`. Il faut l’accord explicite de publication dans
`fredbuhr/nevolium` pour lancer les nouvelles preuves CI et inspecter les captures.

L’utilisateur a ensuite explicitement autorisé la publication et demandé de poursuivre.
La commande Git ne dispose pas d’identifiants dans cet environnement ; la connexion GitHub
authentifiée est utilisée pour publier le même arbre sur la même branche, sans forcer la ref.

## Première qualification de l’accueil publié — 16 septembre 2026

Publication explicitement autorisée, tête `6f20fdca42101d2798e547d47fcc7d91c9ae177b`,
arbre `130419107fad684e1dc01df3702133f7e0086f10`. Huit workflows non-UI verts.
UI run `35110283457` : PostgreSQL réel (neuf types, provenance, pagination et
isolation), import HTTP, modèle privé, Planning et kit matériel verts.
La qualification navigateur révèle quatre problèmes de contrôle : texte de
raccourci non isolé du sous-libellé, ancien sélecteur SVG dans le parcours
connecté, devise présente aussi dans l’accueil masqué, et attente du viewport
alors que le secours sans WebGL l’a déjà retiré. Correction des sélecteurs et
de cette attente, séparation du titre des raccourcis, boutons harmonisés,
hauteur de scène adaptée à l’écran et pagination limitée au contexte actif.
Les captures initiales montrent le renderer partagé ; elles ne valent pas
validation visuelle finale. Aucun import ni déploiement sur le pilote.

## Qualification finale du code publié — 16 septembre 2026

Code `9b6b01075fdc8b47e3f9a3eb14f6f3b14e71ffba`, arbre
`6e2e1c5aadd7e7b30919f5ff18767b49115d272b` : **9/9 workflows verts**.
[UI run 35112551196](https://github.com/fredbuhr/nevolium/actions/runs/35112551196),
quatre jobs réussis dont toutes les suites navigateur D05–D09. Les huit autres
workflows (Foundation, qualité, reproductibilité, ingestion, isolation, recherche,
registre MCP et moteurs D04) sont également réussis sur ce SHA.

La deuxième passe fonctionnelle avait réussi l’accueil, mais ses captures révélaient
un axe flex hérité comprimant le renderer à droite. L’axe est désormais explicite et
les tests vérifient la largeur centrale ainsi que la taille du canvas. Un scénario
historique de stabilité a aussi changé de disposition pendant une capture pleine page ;
sa capture utilise désormais le viewport fixe, avec contrôle qu’aucune lecture de
restauration supplémentaire n’a perturbé l’état testé. La passe finale est verte.

| Preuve | Résultat |
| --- | --- |
| Projection PostgreSQL | Neuf types, relations canoniques, citations historiques, pagination et isolation entre comptes |
| Importateur HTTP | Payloads validés par les schémas Core ; corpus complet, octets relus, reprise sans doublon, réponse perdue bloquée, accueil existant conservé |
| Accueil Chromium | Desktop et tablette 3D ; téléphone 2D par défaut ; liens transversaux, épinglage, dossiers, renommage privé, ordre, annulation, erreur/retry, reload, FR/EN, téléchargement et aperçu SVG |
| Régressions | Cockpit, clavier, écrans tactiles simulés, Planning, Knowledge, cartes 2D/3D, sauvegardes, caméra et secours sans WebGL |
| Animation petit réseau | Zéro relation sémantique ajoutée, trois appartenances, 443 pixels modifiés en animation, zéro en pause |
| Inspection visuelle | Neuf captures accueil FR/EN, traversée et personnalisation ; idée guidée FR, Knowledge EN/téléphone, petit réseau 3D |

Archives téléchargées et empreintes comparées aux métadonnées GitHub :

- Accueil `10453436354` : `dc12622044e2c3c50ec624cee8214cdbcd4f4c329dcc0f4a2e5ab0b165587df4`.
- Knowledge `10453576262` : `ea3738ce1718bb3ed21af76c4f621755988616df154a8b55a3084e8e6479b26a`.
- Spatial `10453536433` : `bcac3ae974dd1b17cf56800c8e8bd3a434a3d6c438ea15b3d17a878e1d17959a`.

Ces preuves qualifient le code de la PR, pas le pilote. Chromium utilise des API
simulées ; PostgreSQL réel est vérifié séparément. L’import complet dans un compte
pilote, le ressenti et la fluidité sur matériel physique restent à contrôler après
installation. Le suivi documentaire qui suit cette qualification ne modifie aucun
code, test, fichier d’exemple ni workflow. Aucun merge, déploiement, import pilote,
nettoyage Docker ou début de D10 n’a été effectué.
