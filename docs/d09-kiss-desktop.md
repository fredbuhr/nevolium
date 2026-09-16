# D09 — bureau Mycelium et continuité KISS

Lot actif : [PR #97](https://github.com/fredbuhr/nevolium/pull/97), branche
`fix/d09-kiss-desktop`. Décision acceptée : [ADR-033](decisions/ADR-033-kiss-contextual-mycelium.md).
L'état opérationnel et la prochaine action restent dans [PROJECT_STATE](../PROJECT_STATE.md).

## Comportement livré dans le code

- Le renderer 3D partagé occupe tout le bureau, avec fond WebGL transparent. Le papier peint
  appartient à une couche indépendante ; aucun cadre opaque n'entoure le graphe d'accueil.
- Une couleur unie suffit. L'utilisateur peut choisir l'ambiance fournie ou charger une image
  PNG/JPEG/WebP, limitée à 8 Mo et 24 mégapixels, puis régler son assombrissement.
- Le fichier utilise l'API `Asset` existante et ses droits propriétaire. Le layout privé conserve
  uniquement son identifiant et les réglages, jamais un jeton, une URL externe ou les octets.
  Une image absente ou invalide laisse la couleur active et affiche un message explicite.
  Choisir une couleur ne supprime pas un fichier qui pourrait avoir d'autres usages.
- Les préférences schema-v1 existantes restent lisibles. Dossiers, épingles et ordre sont conservés.
  La personnalisation s'ouvre dans un dialogue avec les commandes de sauvegarde et de reprise.
- Sélectionner un objet montre sa fiche et ses relations canoniques paginées immédiatement.
  Le clavier arrive dans la fiche ; Échap la ferme et rend le focus au point de départ.
- Ouvrir un outil conserve la scène d'accueil montée, sa caméra, son voisinage et sa sélection.
  La scène passe en rendu à la demande, s'atténue et devient inerte derrière le contenu.
  Les mouvements effectués dans les outils ne déplacent pas ce réseau.
- Les réglages de qualité et de caméra sont regroupés ; les boutons 2D/3D restent directs.
  Le mode calme garde la rotation/zoom utilisables. Téléphone et WebGL indisponible disposent
  de la liste 2D, avec les mêmes objets et actions.

Le patch est Web uniquement : pas de migration, d'API supplémentaire, d'import d'exemples,
de changement Worker/Core ni d'appel IA. Les liens affichés sont les liens déjà enregistrés.
L'enrichissement automatique reste prévu dans D10 et ne doit pas être annoncé comme actif.

## Qualification

Les contrats locaux d'accueil, de locale, de cockpit et de mindmap passent ; TypeScript et
le build Vite réussissent. Le navigateur local s'arrête avant le chargement de l'application
(SIGTRAP de l'environnement). Les essais navigateur s'exécutent donc dans GitHub Actions.

Le scénario `d09_home_browser_qualification.mjs` vérifie sur trois tailles de fenêtre :
transversalité, clavier, fichiers originaux, aperçu SVG, personnalisation, reprise de sauvegarde,
rechargement et langue. Il ajoute le bureau plein écran et l'alpha réel du clear WebGL,
les relations dès la sélection, la conservation du renderer au retour d'un outil,
l'image privée persistée et le repli après disparition du fichier.

Ces essais simulent les réponses Core. Les contrats PostgreSQL réels de propriété, de projection
et de pagination s'exécutent séparément. Ils ne remplacent ni une session OIDC réelle,
ni l'appréciation du confort, du contraste et de la fluidité sur les appareils du pilote.
Les résultats CI de la tête finale seront référencés dans le checkpoint après vérification.

## Parcours d'acceptation sur le pilote après activation du Web

1. Recharger l'accueil, ouvrir un projet épinglé puis une idée reliée. La fiche et ses relations
   doivent être compréhensibles immédiatement ; vérifier aussi une source et un fichier.
2. Déplacer la caméra, sélectionner une idée, ouvrir son outil puis revenir à l'accueil.
   Vérifier le même voisinage, la même sélection et la même caméra. Échap ferme la fiche.
3. Dans « Personnaliser mon accueil », choisir une couleur puis une image personnelle,
   attendre la sauvegarde et recharger. Vérifier contraste et absence de cadre autour du réseau.
4. Essayer FR/EN, clavier, liste 2D, mode calme et un format téléphone/tablette. Les fonctions
   restent accessibles sans animation et sans manipuler une scène 3D.
5. Se déconnecter puis utiliser un autre compte de test : ni les épingles privées, ni l'image
   du premier compte ne doivent apparaître. Revenir au premier compte et retrouver ses réglages.

Le serveur connu reste sur `702c2a3…` tant qu'une sortie opérateur n'atteste pas la nouvelle
activation. Les points de retour et le corpus importé restent ceux du checkpoint.

## Reprise dans une nouvelle discussion

Demander : « Reprends Nevolium depuis `AGENTS.md`, `PROJECT_STATE.md`, la PR #97 et
`docs/product-memory.md`. Vérifie les références GitHub live et continue la prochaine action
enregistrée. » Lire le checkpoint de la PR si celui de main lui est antérieur.
