# D05 — fil connecté, fond neutre et retour fournisseur

Base vérifiée : main `1896468513f92ee5c0d6a811301a1b898cc6abd2`, PR #89 à
`639b48f369cd5317aa98d0679ddf51fdf9766068`, dix workflows réussis. Travail sur la même branche.

## Retour et réponse

L’utilisateur juge la navigation encore trop classique et la validation de sa clé peu claire.
Les deux nouvelles images de fond montrent des fibres cyan/émeraude périphériques sur pétrole,
sans paysage ; la planche de marque montre une sphère ouverte aux jonctions lumineuses.
Les trois pièces jointes ont été réellement inspectées. Leurs dates de nommage ne constituent
ni un horodatage de déploiement, ni une preuve de fonctionnement.

- `mycelium-quiet.webp` reprend la seconde composition (référence `01_26_37 (1)(1)`) sans
  retouche de composition, convertie PNG → WebP qualité 88 avec Sharp : 1672 × 941, 77 640 octets.
  Pas de nouvelle génération d’image. Le fond n’intègre aucun texte ni commande.
- `icons/nevolium.svg` est adapté directement dans son format vectoriel natif : sphère plus
  ouverte, deux grands vides, jonctions localisées, filaments inégaux. Les PNG 192/512 et la
  variante maskable sont rendus depuis ce même SVG ; pas d’ancien slogan de la planche recopié.
- Trois halos périphériques à intensité très faible respirent sur 17 secondes ; ils sont sans
  signification métier et arrêtés en mode calme/minimal et mouvement réduit.
- Le cockpit garde Dockview mais ouvre les nouvelles dispositions sur l’activité centrée.
  Les vues antérieures restent récupérables et les layouts sauvegardés ne sont pas écrasés.
- Le fil inspecte l’origine, le voisinage de projet et les relations transversales existantes.
  La lecture `/v1/relationships` est authentifiée, filtrée par propriétaire et élément, bornée
  par le curseur existant ; les deux extrémités sont revérifiées avant exposition. Aucune migration,
  projection ou écriture de relation n’est ajoutée. L’édition et les explorateurs D08/D09 restent différés.
- Les réglages séparent reçu, test et activation. Le dernier échec d’action n’est plus effacé
  par un polling réussi. La lecture en erreur signale un état potentiellement ancien ; actualiser
  l’état n’effectue pas de POST, ni de nouveau test fournisseur.

## Validation et limites au checkpoint de préparation

TypeScript, Vite (148 modules, bundle principal environ 577 ko non compressé), contrat D05,
géométrie, identité, compilation Python et vérification de diff passent localement. Le lanceur
pnpm de l’environnement a tenté une installation automatique puis refusé des scripts de build :
aucune approbation de script ni modification de dépendance conservée. Les outils TypeScript/Vite
déjà présents ont été utilisés directement. Les bibliothèques Core ne sont pas installées localement.

Le Chromium local s’arrête au lancement avec SIGTRAP. Les scénarios bureau/tablette/téléphone
existants sont conservés ; le nouveau scénario connecté teste parent, voisinage, transversal
interprojet, ouverture du document canonique, erreur de test conservée, actualisation sans
resoumission, test/activation distincts, blocage pendant un appel et réduction des animations.
Il utilise des fixtures API et ne qualifie aucun fournisseur réel. Les tests Core ajoutent lecture
entrante/sortante, refus anonyme/autre propriétaire, bornes et curseur invalide à l’intégration
multi-utilisateur. La CI et ses captures doivent être relues avant validation de cette correction.

Production inchangée sur `c17c7e24…`. La clé saisie par l’utilisateur n’a pas été examinée et son
acceptation reste inconnue. Lire le badge actuel dans les réglages administrateur sans retransmettre
la clé. Préserver snapshots B2, images de rollback, sel LiteLLM et cinq réservations historiques.

## Relecture CI

Le premier candidat `1582021` a révélé que Dockview conservait les vues de taille nulle accessibles
au navigateur pendant le centrage. Le correctif masque les conteneurs non visibles et leurs commandes,
sans détruire leur disposition. Le candidat `36a153a797c1a350dda43cbd56935bf8a6ba8b31` passe ensuite
la suite responsive et le scénario connecté, ainsi que la vraie isolation entre comptes et le parcours
OIDC. L’artefact UI `10374019474` du run `34910993667` a été téléchargé et son SHA-256 revérifié :
`be9af5f7bb4b4e41b8f5ca9db62fe0af2652445bd40ee008c697d85a535c1caf`.
Les quatre captures connectées/connexion IA ont été relues. Elles n’attestent aucune validation
de la clé du pilote : les états de fournisseur y sont des fixtures explicites.

Cette relecture conduit à regrouper Profil/Ambiance sous « Personnaliser » sur tablette/téléphone,
à traduire les statuts du contexte et à recadrer les captures après défilement. L’état de connexion
est annoncé aux lecteurs d’écran à son changement, sans relire toute la carte à chaque horodatage.
Ce dernier ajustement doit passer sa propre CI avant remise du rendu.
