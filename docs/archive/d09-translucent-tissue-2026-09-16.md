# D09 — matière translucide et circulation lumineuse

Archive du retour utilisateur et de la direction de révision du 16 septembre 2026.
Gate : revue visuelle et matérielle D09, sans clôture, passage à D10 ou déploiement.
Références de départ vérifiées par la session principale : `main`
`b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`, branche existante
`feat/d09-mycelium-3d`, tête `d5c438e4348b9e804ffd47f289c77181b5f6d9cb`,
[PR #93](https://github.com/fredbuhr/nevolium/pull/93) ouverte en draft.

Ce document conserve les observations et les intentions de cette reprise. Le checkpoint
opérationnel reste `PROJECT_STATE.md`. Les validations du descendant devront être rattachées
à son SHA exact ; aucune performance du nouveau rendu n'est attestée ici.

## Retour utilisateur et références fournies

L'utilisateur constate une amélioration des formes après la suppression des pointes, mais les
objets paraissent désormais trop réguliers, comme des galets mats. Il décrit un rendu évoquant
une maquette 3D dont la matière manque de naturel. Les chemins sont insuffisamment animés à ses
yeux. La révision précédente a aussi perdu la palette cyan/verte, le jeu de transparence et les
touches ambrées lumineuses qu'il souhaite conserver. L'objectif reste un mycélium neuronal
fonctionnel, lisible et efficace, avec une sensation de vie.

Deux images accompagnent ce retour ; leurs originaux ne sont pas modifiés ni incorporés au dépôt :

| Fichier | Observation ou rôle | SHA-256 |
|---|---|---|
| `6370a091-513b-4321-9c73-41a59dd5a158.png` — 1 387 × 542 | Capture du résultat : nombreux volumes verts/violets assez uniformes et opaques, modelé de surface dominant, réseau de lignes fines ; les effets lumineux sont discrets | `08c6fb84c57914abf2b4680692553f923408208a2faa01c42cd9a68ac6214a0e` |
| `exemple.png` — 1 672 × 941 | Référence fournie par l'utilisateur : noyaux lumineux cyan/verts, enveloppes translucides, membranes et filaments continus, intensité localisée et profondeur ; guide de matière et de lumière à adapter aux contraintes interactives | `e2bc1e25514d28e7525eb77512782f2c1f42c554f7f06eebc1f006f13e361f83` |

Une capture fixe ne mesure pas le mouvement. Le manque d'animation est un retour de perception
de l'utilisateur, à traiter séparément de l'existence technique d'un shader animé. La profondeur,
le flou et les zones vides de l'image de référence ne sont pas une promesse de reproduction
photographique dans un graphe dense sélectionnable. Les touches ambrées demandées viennent du
brief utilisateur ; elles ne doivent pas remplacer la dominante cyan/verte.

## Rapport matériel de la version de départ

Original lu sans modification : `nevolium-d09-maximum-2026-09-16T01-13-19.341Z.json`.
SHA-256 : `dd5db0c0af605a7f4faaecda642e51455cb2e7caf3469cda5dcd33675ef21268`.

| Observation | Valeur vérifiée |
|---|---|
| Source du kit | `d5c438e4348b9e804ffd47f289c77181b5f6d9cb` |
| Checkout de construction | `2adc76d2fb63c58d42345c92e05e84c1de9b644b`, `dirty: false` |
| Construction | `2026-09-16T01:03:06.638Z` |
| Périmètre | Renderer Scene réel, graphe local synthétique ; aucune API Core, authentification, vue 2D ou persistance serveur |
| Jeu et profil | `maximum`, 401 objets / 1 000 relations, qualité `high` |
| Mouvement | Animation ambiante active, réduction du mouvement désactivée ; aucune bascule d'animation consignée |
| Durée mesurée | 60 281 ms ; objectif 60 000 ms atteint ; 41 fenêtres |
| Temps écoulés distincts | Arrêt à 62 063 ms après lancement ; export à 77 611 ms après lancement ; 15 548 ms entre arrêt et export |
| FPS par fenêtre | Médiane 136 ; p10 125 ; minimum 116 ; maximum 165 |
| Fenêtres basses | Aucune sous 30, 60 ou 90 FPS ; 2 sous 120 FPS |
| Ressources | 5 appels, 0 texture et 762 490 triangles sur chaque fenêtre ; 4 géométries sur 39 fenêtres, 2 géométries sur 2 fenêtres |
| Résolution | 1 132 × 455 pixels CSS ; DPR appareil 1,25 ; tampon 1 413 × 566 pixels, identiques sur les 41 fenêtres |
| Environnement | Firefox 155 sous Windows ; 32 processeurs logiques annoncés ; aucun point tactile |
| GPU annoncé | `ANGLE (AMD, Radeon R9 200 Series Direct3D11 vs_5_0 ps_5_0), or similar` ; identification approximative |
| Mémoire | Champs heap à `null` sur les 41 fenêtres ; mémoire appareil inconnue ; mémoire du processus et du GPU non mesurée |
| Journal | 54 événements conservés ; 191 changements de caméra comptés, dont 34 conservés et 157 regroupés ; aucun événement perdu déclaré |
| Interactions et interruptions | 15 sélections ; 1 segment ; aucune pause, aucun masquage ou basculement d'animation consigné ; aucun intervalle long mesuré |
| Statut | `needs_review` ; modèle de l'appareil, classe GPU et alimentation non renseignés |

Les 60 281 ms correspondent à la plage mesurée entre la première et la dernière fenêtre,
de 1 782 à 62 063 ms après lancement. Le délai jusqu'à l'export n'est pas du temps de rendu
mesuré. La médiane et le p10 décrivent des fenêtres de rendu, pas les percentiles du temps
individuel de chaque image. Le nombre de géométries n'est pas strictement constant.

Ce rapport est favorable pour **la version d5c438e, ce graphe et cet appareil pendant environ
une minute**. Il ne prouve ni l'absence de fuite mémoire, ni la stabilité de longue durée, ni
les performances du cockpit complet ou d'un autre appareil. Il ne qualifie pas la révision
translucide en cours. Les 136 FPS de médiane ne doivent pas être attribués au futur descendant.

## Direction de révision en cours

- **Redonner une irrégularité douce aux enveloppes.** Développer une silhouette 3D variable,
  avec des volumes larges et asymétriques, sans revenir aux cônes ou aux pointes portés par les
  objets. Les centres et les repères spatiaux restent stables.
- **Distinguer enveloppe et noyau.** Étudier une enveloppe irrégulière translucide à composition
  additive autour d'un petit noyau lumineux opaque qui conserve une profondeur lisible. La
  matière doit laisser percevoir des épaisseurs et des continuités internes, en limitant l'aspect
  de galet peint, le grain uniforme et les nervures topographiques.
- **Rétablir la dominante cyan/verte.** Employer l'ambre en accents lumineux locaux ; éviter les
  gros corps peints orange. Les couleurs et l'intensité ne doivent pas rendre la compréhension
  d'un état dépendante de la seule teinte.
- **Rendre la circulation perceptible.** Séparer son budget lumineux de celui des connexions
  de fond et raccourcir les traversées, afin que les flux restent visibles sans éclaircir
  uniformément le réseau. Une animation techniquement présente doit aussi être perceptible
  aux échelles de lecture utiles.
- **Conserver la continuité des relations.** Les connexions réelles viennent se fondre dans les
  enveloppes. Vérifier leur traversée et leur émergence avec la respiration, la profondeur et le
  zoom ; la transparence ne doit pas révéler de coupures ou de géométrie parasite.
- **Séparer transparence de matière et transparence du canvas.** L'enveloppe peut être translucide
  dans la scène 3D, tandis que le fond du canvas reste opaque. Ce fond opaque est conservé pour
  éviter le retour des stries noires observées lors de la composition externe du canvas transparent.
- **Préserver le canon et l'usage.** Aucun changement des identités, des relations métier, des
  centres, des positions 2D ou de la persistance. La circulation décorative n'indique pas une
  exécution réelle ; les états métier restent portés par les données et leurs repères existants.

Ces points décrivent la direction du travail, pas des résultats déjà validés. L'addition des
enveloppes et des flux introduit un risque concret de saturation aux recouvrements ; leur
budget devra être contrôlé sur les vues denses et à différentes échelles. L'opacité du noyau,
la visibilité des filaments internes et la cible de sélection demandent une revue conjointe.

## Contrôles du descendant à venir

La qualification devra nommer le SHA exact testé, les workflows et artefacts correspondants,
et distinguer le rendu logiciel CI des rapports matériels. Elle devra couvrir :

1. **Vue dense** : séparation des objets, contraste de la palette cyan/verte, intensité limitée
   des accents ambrés, absence de centre uniformément blanc ou de stries noires.
2. **Zoom et orbite** : silhouette irrégulière à plusieurs angles, noyau et enveloppe cohérents
   en profondeur, raccords continus pendant la respiration, absence de réapparition des pointes.
3. **Sélection** : volume visible et cible cohérents, liens utiles distinguables et libellés
   lisibles, sans changement du canon ni ajout de faux objets métier.
4. **Mouvement des liens** : progression lumineuse perceptible à caméra fixe, évaluée aussi
   hors des corps ; un changement de pixels limité à la respiration des somas ne suffit pas.
5. **Téléphone** : lecture des volumes et des connexions, sélection et focus, résolution réelle
   du profil, interface utilisable et conservation de la 3D facultative.
6. **Calme et mouvement réduit** : arrêt effectif du mouvement décoratif, respect de la préférence
   système, reprise cohérente, démontage hors écran et fallback WebGL préservés.

La revue visuelle, les régressions fonctionnelles applicables et les mesures du futur kit
restent à exécuter. La qualification mémoire, la durée longue, le GPU intégré/tablette et le
cockpit complet demeurent des limites D09 distinctes de cette correction de matière.

## Implémentation soumise à qualification

Le descendant sépare deux couches instanciées : noyau opaque à environ 26 % du rayon,
enveloppe additive avec lobes larges, respiration, filigrane discontinu et alpha faible.
La palette cyan/menthe et les accents chauds restent locaux. Une passe géométrique
supplémentaire pour les noyaux conserve les deux passes de lignes et les fibres groupées.

Les impulsions ont leur propre contribution alpha après conversion colorimétrique, une tête
et une traîne sur 3,4–5,5 s, un repos bref et un plafond 32/48/72 selon profil. La circulation
périphérique sélectionnée reste à 0,18 maximum contre un pic incident de 0,9 ; la borne du
contrat évolue de 0,036 à 0,181 pour vérifier ce choix explicite. L'attribut d'attention reste
strictement l'incidence des relations réelles. Les coordonnées de lumière des fibres sont
vérifiées finies et bornées, sans nouveau sommet ni faux lien canonique.

La capture vidéo du renderer réel passe de 7 à 10 secondes pour voir plusieurs traversées.
Le workflow publie les preuves du kit avant les autres scénarios navigateur pour accélérer
la revue visuelle ; aucun contrôle D05–D09 n'est supprimé et tous restent requis au gate.
Les validations locales et distantes de ce descendant doivent encore être consignées avec
leur SHA exact dans la PR #93.

Contrôles locaux du lot : build web (`tsc -b` et Vite), contrat géométrique organique,
vérification syntaxique du runner navigateur et `git diff --check` réussis. La revue statique
croisée ne trouve pas de blocage GLSL/lifecycle ; la vraie compilation des shaders et le jugement
de matière restent à faire dans le navigateur CI.

## Première qualification et affinage après captures

Le candidat `3cf5c9fa3a7cad39e5bb541d4faf35842c7b4aa8` passe **8/8 workflows PR**.
UI run [35045011382](https://github.com/fredbuhr/nevolium/actions/runs/35045011382) :
13 scénarios spatiaux, 16 contrôles du kit ; 3 007 pixels changés entre images animées,
0 en calme. Les shaders compilent réellement, sélection au volume, masquage/remontage,
réduction du mouvement, téléphone et fallback passent. Le fond reste opaque.

| Preuve | Référence | SHA-256 vérifié |
|---|---|---|
| Kit ZIP | `10426068713` | `8349100e0e5329cb4d206afd397c1520731c3a70f7c6b8bee1ea52d7ea8f62e1` |
| Navigateur ZIP | `10427185081` | `22c021e1b0b8ba3d61308f95bf281b9d8ae7d7a07cc0b7907426c12c239f806b` |
| Spatial ZIP | `10426737424` | `641f3212e9ae8e71a6fbdac72cc48d0e1ca26a7f6b86617493edb29121d39c4f` |
| HTML | checkout `387ae72b6e44ff443c18ac3c2b4c68a0ff02e3e0`, dirty false | `2fd4348907c6a83a98a92098ecbf856779a2aea4a23ee060921a9a82004abf4b` |

Gros plan, zoom proche, téléphone, réseau stress et images successives du film ont été examinés.
La membrane laisse voir les raccords convergeant au noyau ; les pointes ne reviennent pas.
Les impulsions changent de position sur les liaisons, notamment entre l'objet au bas-gauche
et l'objet sélectionné puis sur la relation qui remonte vers la gauche : le mouvement ne se
limite plus aux corps. Le réseau dense garde du contraste. Cette observation n'est pas une
acceptation visuelle de l'utilisateur ni une preuve de fluidité physique.

La revue relève des côtés de traits crénelés sur téléphone, quelques courbes polygonales,
des noyaux encore trop cristallins et des fibres secondaires trop effacées en focus. Le
présent affinage conserve les enveloppes, adoucit le noyau seul (déformation réduite, maillage
18×12, lumière plus large), ajoute une couverture latérale analytique des lignes, affine leur
échantillonnage à 28/40/52 segments et rétablit une faible opacité propre aux fibres incidentes.
Les têtes ambrées deviennent plus distinctes localement. Aucune hausse globale du fond.
Ces ajustements réclament leur propre nouvelle capture et qualification du head descendant.

SwiftShader ponctuel du candidat 3cf5c9f : 51/201/501 objets, 50/200/500 liens, eco, 1280×900,
19/14/12 FPS ; heap 17,1/20,5/50,4 Mo, 4 géométries, 5 appels, 0 texture. Le court parcours
kit 201/300, comprenant pauses, interactions et calme, mesure 44,862 s sur 26 fenêtres,
médiane 3/minimum 1 FPS et 2 longues interruptions ; export incomplet. Ce parcours ne permet
pas une comparaison matérielle avec les 136 FPS du relevé physique d5c438e. La mémoire et
les performances du futur affinage restent à mesurer sur appareil réel.
