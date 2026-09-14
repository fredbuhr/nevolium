# Nevolium — langage visuel Mycelium

Révision : 2026-09-14. Ce contrat traduit les références visuelles fournies pendant D05,
y compris les huit images de la reprise « matière organique ».
Les images restent des inspirations de conversation ; elles ne sont pas attribuées au dépôt et
ne constituent pas des captures de l'interface livrée.

## Intention

La [charte d'identité et de langage](identite-nevolium.md) donne le sens de cette direction
visuelle : garder le fil, faire apparaître des liens compréhensibles et laisser la personne
choisir ce qu'elle veut approfondir ou construire.

Nevolium relie des objets de travail sous contrôle de l'utilisateur. Son interface évoque un
mycélium neural vivant sans transformer chaque écran en graphe ni masquer l'information utile.
La bioluminescence de fond appartient à la matière décorative, pas à un état métier. Un signal
d'activité, de sélection ou d'alerte reste distinct, explicite et compréhensible. Les mouvements
restent rares, réversibles et supprimés quand l'utilisateur réduit les animations.

Visuellement, « organique » désigne une matière fibreuse irrégulière, ramifiée, avec une lumière
localisée ; une courbe mathématique lisse et un halo uniforme ne suffisent pas. Dans l'usage,
on peut explorer puis faire évoluer son organisation. Les repères
doivent rester stables : l'adaptation ne justifie pas des déplacements imprévisibles de l'interface.
La densité des liens ne vaut pas leur pertinence ; un lien doit aider à comprendre quelque chose.
Une idée sans projet ni échéance garde sa place. L'ambiance visuelle ne doit ni imposer une
lecture scientifique du produit ni exercer une pression pour produire davantage.

Le produit conserve trois surfaces complémentaires :

1. **Accueil Mycelium** — orientation et accès aux espaces réellement disponibles ;
2. **Cockpit** — panneaux lisibles, redimensionnables et détachables pour travailler ;
3. **Explorateur** — relations canoniques 2D puis 3D en D08–D09, jamais décor permanent de D05.

## Implémentation D05

L'Accueil Mycelium est une carte d'orientation SVG 2D. Son noyau et ses six nœuds ouvrent les
espaces réels Assistant, Actualités, Recherche, Aujourd'hui, Projets et Documents dans le cockpit
Dockview existant. Le réseau exprime cette navigation ; il ne prétend pas représenter les relations
canoniques entre les données, qui restent du ressort des explorateurs D08–D09. Aucun compteur,
activité ou lien métier n'est inventé pour enrichir le décor.

Accueil et Cockpit sont deux présentations d'un même produit. Le retour vers l'une ou l'autre ne
duplique pas les données et la dernière surface choisie est conservée par compte sur l'appareil.
Sur bureau, la carte, les repères latéraux et les cartes d'accompagnement coexistent ; les colonnes
se resserrent sur bureau compact. Sur tablette, la scène précède les cartes. Sur téléphone, les
nœuds restent des cibles tactiles et le dock fixe devient opaque pour ne pas mêler le texte défilé
à la navigation. Le cockpit garde la disposition adaptée à chaque classe d'appareil.

## Identité et couleurs

| Rôle | Valeur de référence | Usage |
|---|---|---|
| Nuit | `#020b13` | fond principal |
| Pétrole | `#061725` / `#071b2a` | panneaux et barres |
| Cyan | `#2de7e0` | sélection, focus, relation active |
| Émeraude | `#78f0ad` | état sain ou progression |
| Bleu | `#5fcaff` | information et profondeur |
| Violet | `#9782ff` | contexte secondaire, jamais seul pour un état |
| Encre | `#edf9ff` | texte principal |

Les surfaces privilégient le contraste et une transparence modérée. Les filaments ne passent pas
devant les formulaires. Les états succès, avertissement et erreur ne reposent pas uniquement sur la
couleur. Le symbole principal est une sphère ouverte de filaments fins, inégaux et noués ; sa variante
maskable conserve le motif dans la zone sûre.

## Matière organique : contrat observable

- **Filaments** : faisceaux d'épaisseurs et d'intensités différentes, bifurcations, jonctions et
  quelques fils secondaires ; pas d'orbites parfaites, d'arcs parallèles uniformes ni de pointillés
  qui tournent pour simuler un réseau vivant.
- **Membranes** : contours fibreux poreux et irréguliers, petits points de lumière et centres
  sombres réservés aux icônes et aux libellés. Les commandes restent des boutons HTML réels.
- **Lumière** : cyan et bleu dominants, touches émeraude et violet, foyers lumineux localisés ;
  ni néon homogène autour de chaque rectangle ni pulsation de toute l'interface.
- **Profondeur** : paysage nocturne détaillé, eau, relief et végétation discrets, horizon bas ;
  abandon des montagnes polygonales. Les panneaux du cockpit conservent un fond suffisamment
  opaque pour lire et travailler, même quand le décor reste visible sur leurs marges.
- **Stabilité** : le dessin et les cibles partagent les mêmes coordonnées en pixels réels, recalculées
  au redimensionnement. Le mouvement éventuel change seulement l'intensité, jamais les positions.
- **Repli** : les textures WebP enrichissent le SVG, elles ne contiennent aucun texte ni contrôle.
  Sans image, le réseau vectoriel et les commandes restent utilisables. L'ambiance Minimale retire
  paysage, tissus et textures ; les couleurs forcées donnent des boutons explicitement délimités.

La [note de réalisation](archive/d05-organic-material-2026-09-14.md) conserve les références,
la provenance des deux textures, les instructions de génération et les limites de qualification.
Une texture générée n'est jamais une preuve de fonctionnement de l'interface.

## Personnalisation

Les profils `Équilibré`, `Concentration` et `Revue` organisent les panneaux. Les ambiances
`Neurale`, `Calme` et `Minimale` règlent uniquement l'intensité décorative. Ces préférences sont
scopées par compte sur l'appareil ; les layouts serveur restent scopés par propriétaire.

La disposition, le focus, la caméra et le rôle d'une fenêtre sont des préférences de présentation.
Ils ne modifient ni les données métier, ni les permissions, ni le fournisseur IA de l'instance.

## Appareils et écrans

| Cible | Contrat D05 |
|---|---|
| Bureau, un écran | panneaux Dockview, inspecteur et mode concentration |
| Bureau, plusieurs écrans | détachement manuel du panneau actif ; fermeture réintégrable ; chaque fenêtre principale garde une clé distincte |
| Tablette | une activité visible par défaut en onglets ; le glisser Dockview permet une seconde vue lorsque l'espace et l'orientation le permettent |
| Téléphone | une activité principale en onglets ; aucun glisser obligatoire ni popout |

Le placement automatique sur un moniteur précis reste optionnel : il dépend d'une API navigateur
expérimentale et d'une permission. Le repli universel est une fenêtre ouverte par geste utilisateur,
que la personne déplace elle-même. Les données d'un panneau détaché restent dans le même shell ;
ouvrir plusieurs applications complètes ne crée pas une nouvelle autorité métier.

## Performance et accessibilité

- Aucun WebGL n'est nécessaire au cockpit D05 ; les fonctions essentielles gardent une voie 2D/liste.
- Les animations sont décoratives, courtes et suspendues avec `prefers-reduced-motion`.
- Le focus clavier est visible dans les champs, panneaux et commandes.
- Les cibles tactiles importantes mesurent au moins 44 px sur téléphone et tablette.
- Les panneaux masqués ne doivent pas déclencher un moteur IA ou un rafraîchissement coûteux.
- La PWA D05 met en cache son shell, pas les réponses authentifiées ni les mutations `/v1/`.

## Évolution

D06–D10 ajoutent du contenu au langage visuel : mêmes tâches entre Today/Gantt/calendrier, même
provenance entre documents/idées/décisions, mêmes identités entre mindmap 2D et Mycelium 3D, puis
assistant opérant sur une sélection contrôlée. Une bibliothèque installée ou une bulle dessinée ne
vaut jamais une capacité disponible.
