# Nevolium — langage visuel Mycelium

Révision : 2026-09-14. Ce contrat traduit les trois références visuelles fournies pendant D05.
Les images restent des inspirations de conversation ; elles ne sont pas attribuées au dépôt et
ne constituent pas des captures de l'interface livrée.

## Intention

Nevolium relie des objets de travail sous contrôle de l'utilisateur. Son interface évoque un
mycélium neural vivant sans transformer chaque écran en graphe ni masquer l'information utile.
Une lueur correspond à une sélection, une activité ou une relation compréhensible. Les mouvements
restent rares, réversibles et supprimés quand l'utilisateur réduit les animations.

Le produit conserve trois surfaces complémentaires :

1. **Accueil Mycelium** — orientation et accès aux espaces réellement disponibles ;
2. **Cockpit** — panneaux lisibles, redimensionnables et détachables pour travailler ;
3. **Explorateur** — relations canoniques 2D puis 3D en D08–D09, jamais décor permanent de D05.

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
couleur. Le symbole principal est une sphère ouverte faite d'orbites et de nœuds ; sa variante
maskable conserve le motif dans la zone sûre.

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
| Tablette | un ou deux panneaux selon l'orientation, commandes tactiles explicites |
| Téléphone | une activité principale en onglets ; aucun glisser obligatoire ni popout |

Le placement automatique sur un moniteur précis reste optionnel : il dépend d'une API navigateur
expérimentale et d'une permission. Le repli universel est une fenêtre ouverte par geste utilisateur,
que la personne déplace elle-même. Les données d'un panneau détaché restent dans le même shell ;
ouvrir plusieurs applications complètes ne crée pas une nouvelle autorité métier.

## Performance et accessibilité

- Aucun WebGL n'est nécessaire au cockpit D05 ; les fonctions essentielles gardent une voie 2D/liste.
- Les animations sont décoratives, courtes et suspendues avec `prefers-reduced-motion`.
- Le focus clavier est visible dans les champs, panneaux et commandes.
- Les cibles tactiles importantes mesurent au moins 44 px sur téléphone.
- Les panneaux masqués ne doivent pas déclencher un moteur IA ou un rafraîchissement coûteux.
- La PWA D05 met en cache son shell, pas les réponses authentifiées ni les mutations `/v1/`.

## Évolution

D06–D10 ajoutent du contenu au langage visuel : mêmes tâches entre Today/Gantt/calendrier, même
provenance entre documents/idées/décisions, mêmes identités entre mindmap 2D et Mycelium 3D, puis
assistant opérant sur une sélection contrôlée. Une bibliothèque installée ou une bulle dessinée ne
vaut jamais une capacité disponible.
