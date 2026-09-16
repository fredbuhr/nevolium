# Nevolium — langage visuel Mycelium

Révision : 2026-09-15. Ce contrat traduit les références visuelles fournies pendant D05,
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
restent lents, localisés, réversibles et supprimés quand l'utilisateur réduit les animations.

Visuellement, « organique » désigne une matière fibreuse irrégulière, ramifiée, avec une lumière
localisée ; une courbe mathématique lisse et un halo uniforme ne suffisent pas. Dans l'usage,
on peut explorer puis faire évoluer son organisation. Les repères
doivent rester stables : l'adaptation ne justifie pas des déplacements imprévisibles de l'interface.
La densité des liens ne vaut pas leur pertinence ; un lien doit aider à comprendre quelque chose.
Une idée sans projet ni échéance garde sa place. L'ambiance visuelle ne doit ni imposer une
lecture scientifique du produit ni exercer une pression pour produire davantage.

Le produit conserve trois surfaces complémentaires, avec une continuité de navigation :

1. **Accueil Mycelium** — orientation et accès aux espaces réellement disponibles ;
2. **Cockpit** — activité centrale, fil contextuel et vues redimensionnables/détachables ;
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
- **Profondeur** : fond pétrole neutre, centre dégagé, ramifications cyan/émeraude en périphérie,
  conformément aux nouvelles références utilisateur. Le paysage nocturne précédent est retiré
  de l’interface ; sa preuve reste historique. Les surfaces de travail gardent un fond lisible.
- **Stabilité** : le dessin et les cibles partagent les mêmes coordonnées en pixels réels, recalculées
  au redimensionnement. Le mouvement éventuel change seulement l'intensité, jamais les positions.
- **Repli** : les textures WebP enrichissent le SVG, elles ne contiennent aucun texte ni contrôle.
  Sans image, le réseau vectoriel et les commandes restent utilisables. L'ambiance Minimale retire
  fond, tissus et textures ; les couleurs forcées donnent des boutons explicitement délimités.

## Le fil relié pendant le travail

Le retour utilisateur après déploiement précise que le réseau d’accueil seul ne suffit pas.
La correction D05 maintient un voisinage inspectable pendant l’activité :

- **Origine / vertical** : le parent canonique du projet ou le projet de l’action/document ;
- **Voisinage / horizontal** : documents et actions qui partagent réellement le projet ; ce lien
  d’appartenance est nommé et ne prétend pas démontrer une proximité sémantique ;
- **Connexions / transversal** : relations explicites entrantes et sortantes de l’élément,
  avec leur type. Une traversée vers un document d’un autre projet change le contexte selon
  son `project_id` canonique. Aucun lien supposé ou généré n’est ajouté pour remplir l’écran.

La boussole 2D fournit trois commandes clavier/tactiles, pas un graphe métier complet. Le chemin
parcouru permet de revenir ; le retour relit l’objet pour ne pas réouvrir un contenu devenu
inaccessible. Le document ouvert est transmis à l’inspecteur existant par la sélection partagée.
Les types sans vue livrée restent explicitement non ouvrables. L’absence et l’échec de lecture
ont des messages distincts ; les pages sont bornées et complétées à la demande.

Une nouvelle disposition de bureau commence sur l’activité centrée ; « Retrouver mes vues »
restaure les panneaux côte à côte sans les recréer. Les dispositions déjà sauvegardées ne sont
pas écrasées. Le fil est latéral sur bureau ; tablette et téléphone l’ouvrent à la demande, puis
reviennent à l’activité choisie. Les profils et le détachement multi-écran sont préservés.

Le fond bouge seulement par trois variations lentes d’opacité en périphérie. Ce mouvement ne
signale aucune activité métier et s’arrête en mode calme/minimal ou mouvement réduit.

La [note de réalisation](archive/d05-organic-material-2026-09-14.md) conserve les références,
la provenance des deux textures, les instructions de génération et les limites de qualification.
Une texture générée n'est jamais une preuve de fonctionnement de l'interface.

## Traduction spatiale D09

Le second retour du 16 septembre corrige la direction trop mate : une enveloppe translucide
aux lobes larges et irréguliers entoure un petit noyau lumineux. Les deux couches sont des volumes
3D, pas des panneaux orientés vers la caméra. Le noyau occupe environ un quart du rayon de
l'enveloppe ; les veinules interrompues et la lumière de bord laissent lire une matière fine.
La dominante revient au cyan et au vert menthe, avec quelques lueurs ambrées locales.

Les seuls prolongements sont les filaments des relations canoniques. Ils convergent dans le
petit noyau opaque, qui masque leurs extrémités par profondeur, à l'intérieur de l'enveloppe
transparente. Les fibres secondaires se resserrent à l'approche. Le raccord s'élargit doucement,
dans une largeur écran bornée ; il ne s'agit pas d'une fusion volumétrique anatomique.

Une respiration asynchrone déforme légèrement les enveloppes autour des centres fixes. Des
impulsions avec tête et traîne parcourent jusqu'à 32/48/72 relations selon le profil, en environ
3,4–5,5 secondes avec un bref repos. Leur alpha est composé séparément de celui de la trame,
après conversion colorimétrique : la densité atténue le fond sans effacer toute l'énergie. La
sélection conserve une faible circulation périphérique. Les courbes utilisent 18/40/52 segments et les noyaux un maillage adapté au profil. Les fibres secondaires ondulent en
lumière, sans déplacement des centres ni recalcul géométrique à chaque image. Le fond WebGL
reste opaque pour éviter les traits noirs de composition externe du canvas.

La circulation exprime une vitalité visuelle, **pas une exécution de tâche ou un transfert réel**.
Quelques têtes et zones de tissu portent une nuance ambrée décorative. L'activité réelle
queued/running et la sélection renforcent localement la chaleur ; les états textuels restent
l'autorité métier, jamais la couleur seule. La sélection rend ses voisins plus lisibles.

« Animer le réseau » fige les animations ; le mouvement réduit système les supprime. Le panneau
masqué démonte toujours le renderer. Centres, caméra et identités restent stables. Les cibles de
sélection englobent l'enveloppe irrégulière ; les étiquettes restent sous les volumes.

Les suivis de [première reprise](archive/d09-organic-revision-2026-09-15.md),
[reprise neuronale](archive/d09-neural-life-2026-09-15.md),
[raccords et lisibilité](archive/d09-smooth-junctions-2026-09-16.md) et
[matière translucide](archive/d09-translucent-tissue-2026-09-16.md) distinguent les rapports
matériels, l'implémentation, les preuves et l'acceptation visuelle encore attendue.

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
