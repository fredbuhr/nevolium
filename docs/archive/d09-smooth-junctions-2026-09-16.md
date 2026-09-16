# D09 — corps arrondis, raccords continus et hiérarchie lumineuse

Archive de la reprise du 16 septembre 2026. Gate : revue visuelle et matérielle D09 ;
aucun passage à D10 ou déploiement. Refs live relues avant rédaction : `main`
`b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`, branche existante
`feat/d09-mycelium-3d` à `f6912bd6440e9287f1a36eaa84d685b47571fbd0`,
[PR #93](https://github.com/fredbuhr/nevolium/pull/93).

Ce document conserve le retour et les choix de cette reprise. Le checkpoint opérationnel reste
`PROJECT_STATE.md` ; les preuves du descendant doivent être rattachées à son SHA exact dans #93.

## Retour et captures reçus

L'utilisateur indique que le résultat se rapproche enfin de l'identité souhaitée. Il demande des
objets plus harmonieux : les liaisons doivent venir se souder à leur surface, sans cônes ou pointes
directement portés par le corps. Il propose d'améliorer matière et contraste, et d'ajouter quelques
lueurs orange/rouge. La fonctionnalité, la lisibilité et l'efficacité priment sur l'effet graphique.

Quatre captures accompagnent le retour :

- `504ee0bd-4d1a-445d-a9f1-131fcdb0cabe.png` : sélection locale, corps sombres et silhouettes
  prolongées de pointes ; des traits très sombres traversent le fond.
- `efcea9e8-e41e-424d-a652-7cfa775f812b.png` : vue éloignée, réseau compact dont les connexions
  lumineuses dominent la perception des objets.
- `941f9293-6330-4d7c-8c8d-9a0edf2c8bd2.png` : vue dense où l'accumulation des fibres presque
  blanches réduit la séparation des volumes ; grandes nervures régulières visibles sur les corps.
- `74cc08d9-13d9-4767-bd9e-9d2384f08101.png` : gros plan montrant particulièrement les cônes
  effilés et leur rupture avec la forme centrale.

Ces observations portent sur des images fixes. Elles ne prouvent ni l'absence d'animation,
ni la stabilité de la mémoire, ni la qualité du futur rendu.

## Rapport physique conservé

Fichier original laissé intact : `nevolium-d09-default-2026-09-16T00-02-21.127Z.json`.
SHA-256 calculé lors de la lecture :
`c174b7666c5d97458f4a2318c85bedd9dd54f829b25911298da393abe8fc4312`.

| Observation | Valeur vérifiée dans le rapport |
|---|---|
| Source du kit | `f6912bd6440e9287f1a36eaa84d685b47571fbd0` |
| Checkout de construction | `8a4547a9eba9a2b4022895aaa805e0e35d3cbed2`, `dirty: false` |
| Périmètre | Renderer Scene réel ; graphe local synthétique ; aucune API Core, authentification, vue 2D ou persistance serveur |
| Jeu et profil | 201 objets / 300 relations ; `balanced` ; mouvement réduit désactivé, animation ambiante activée initialement |
| Durée mesurée | 600 881 ms ; campagne terminée ; 408 fenêtres |
| FPS par fenêtre | Médiane 165 ; p10 165 ; minimum 37 |
| Fenêtres basses | 1 fenêtre sous 60 FPS ; aucune sous 30 FPS |
| Ressources observées | 5 géométries, 0 texture ; 5 ou 6 appels ; 350 020 ou 350 026 triangles |
| Résolution déclarée | 1 132 × 455 pixels CSS ; DPR appareil 1,25 ; tampon 1 413 × 566 pixels |
| Environnement | Firefox 155 / Windows ; 32 processeurs logiques annoncés ; aucun point tactile |
| GPU | Chaîne AMD/Radeon R9 200 Series suivie de « or similar » ; modèle matériel exact non attesté |
| Mémoire | Mémoire JS, appareil et GPU inconnue ; champs heap à `null` |
| Journal | 200 événements conservés ; 927 événements caméra regroupés ; 18 événements perdus déclarés |
| Interruptions et animation | 9 segments de rendu ; 4 pauses demandées ; 4 masquages document ; 2 changements d'animation conservés, arrêt puis reprise |
| Statut de l'export | `needs_review` ; modèle, classe GPU et alimentation non renseignés |

La médiane et le p10 portent sur des fenêtres du renderer, pas sur les temps de chaque image.
Les deux changements d'animation imposent aussi de distinguer l'arrêt volontaire du rendu continu.
Le compteur de gaps vaut zéro, mais les interruptions consignées et les 18 pertes du journal
empêchent d'en déduire une session entièrement continue ou sans incident. La durée totale écoulée
est distincte des 600 881 ms mesurées.

Ce rapport est une preuve matérielle de **la version f6912bd uniquement**. Il n'atteste pas la
fluidité du descendant, la mémoire longue durée, le cockpit complet ou les autres appareils.
Les valeurs 165 FPS ne doivent pas être reprises comme performances de la nouvelle matière.

## Références consultées et portée

Les références servent à choisir une grammaire visuelle ; aucune ressource graphique externe
n'est importée par cette recherche et aucune exactitude anatomique n'est promise.

| Source vérifiée | Apport retenu |
|---|---|
| [MouseLight — Janelia](https://www.janelia.org/project-team/mouselight) | Reconstructions neuronales issues de microscopie : continuité des ramifications et diversité des trajectoires |
| [Allen Brain Atlas — Cell Types](https://celltypes.brain-map.org/) | Morphologies cellulaires et reconstructions 3D : distinguer un corps lisible des prolongements qui le relient |
| [A travelling-wave strategy for plant–fungal trade — Nature, 2025](https://www.nature.com/articles/s41586-025-08614-x) | Observation de réseaux fongiques, fusions de filaments et flux cytoplasmiques ; inspiration pour raccords et circulation interne |
| [W3C — contraste non textuel](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | Contraste des repères graphiques nécessaires à la lecture, avec attention à la perte de visibilité des traits fins anticrénelés |
| [W3C — usage des couleurs](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | Ne pas faire dépendre la compréhension d'un état uniquement de sa teinte |

Les choix ci-dessous sont des décisions de design pour Nevolium, pas des conclusions biologiques
de ces travaux. La bioluminescence reste une métaphore graphique, distincte des états métier.

## Direction retenue pour le descendant

- **Retirer la géométrie des cônes.** Le soma conserve un volume arrondi, irrégulier avec mesure,
  sans pointes liées à ses connexions. Sa silhouette et sa cible de sélection restent cohérentes.
- **Faire porter les raccords par les relations réelles.** Les filaments sont prolongés à
  l'intérieur du corps opaque, où ils sont masqués. Leur émergence donne une continuité de matière
  sans jour visible lorsque la caméra zoome ou que le soma respire. Aucun nouveau lien métier,
  objet décoratif sélectionnable ou relation implicite n'est ajouté.
- **Rendre la matière plus lisible.** Le modelé large du volume doit précéder les veinules et
  le grain. Les variations de surface restent assez discrètes pour éviter l'effet de carte
  topographique, le mouchetage et la confusion des petites silhouettes.
- **Réduire la saturation du réseau.** L'objet sélectionné et ses voisins doivent émerger
  avant les connexions secondaires. Le contraste est redistribué entre objets et fibres,
  sans éclaircir toute la scène ni laisser les croisements former une masse blanche.
- **Employer l'ambre avec parcimonie.** Les accents soutiennent la sélection et l'activité
  réelle déjà disponible. Ils ne créent pas de faux statut d'alerte, de travail ou de transfert.
  Les indications textuelles et les autres repères de sélection restent disponibles.
- **Rendre le fond WebGL opaque.** Cette correction vise les traits noirs observés lors de la
  composition du canvas transparent avec les filaments additifs. Son résultat doit être contrôlé
  dans les captures du descendant, en particulier sur les portions de réseau atténuées.
- **Conserver la vie sans déplacer les repères.** Respiration désynchronisée, circulation
  décorative bornée, commande calme, préférence système de mouvement réduit et arrêt hors écran
  restent des exigences de la proposition.

Le masquage des parties internes par un soma opaque est un compromis maîtrisable en temps réel :
il évite une fusion volumétrique complète, coûteuse, mais demande de vérifier la profondeur,
les tangentes d'émergence et l'absence de coupures dans les angles défavorables. La texture seule
ne doit pas porter le relief. Les touches chaudes et les pics lumineux restent rares pour
préserver la lecture. Les géométries et shaders restent bornés selon les profils de qualité.

## Validation du descendant à renseigner

Premier descendant `748755ed7adaa1a7bacac9e5457d3e103376b24b`, UI run `35040770233` :
les 13 scénarios spatiaux ont passé après une relance. La première tentative s'était arrêtée
dans une capture D08 : les requêtes montrent un changement desktop→phone→desktop et la capture
finale l'onglet Projets actif. Le code préexistant remonte le cockpit au changement de classe et
réouvre l'espace initial. L'origine exacte de ce redimensionnement transitoire n'est pas attestée ;
un vrai redimensionnement franchissant les seuils mérite également une reproduction ciblée.

Le nouveau test du kit a ensuite révélé une mauvaise hypothèse de test : Three 0.180 crée un
contexte capable de transparence même avec le paramètre constructeur `alpha:false`
(`WebGLRenderer.js`, `contextAttributes.alpha: true`). Le fond `Color` de la scène est toutefois
effacé avec alpha=1 (`WebGLBackground.js`). Le contrôle est corrigé pour vérifier le résultat
visible : un fond CSS magenta ne doit pas apparaître derrière le rendu. Il conserve la vérification
de l'opacité sans confondre capacité du contexte et pixels rendus. Aucun changement du renderer
n'est nécessaire pour cette correction du test.

La qualification complète du descendant suivant reste à vérifier. Après
publication sur #93, consigner son SHA exact, ses workflows, les identifiants et
empreintes des artefacts, les captures/vidéo examinées et les limites constatées.

Le descendant `11b138672a9ee5a48d757ce971fb53576bdcb991` passe **8/8 workflows**, UI run
`35041792533`, 13 scénarios spatiaux et 16 contrôles du kit. L'animation change 1 134 pixels
entre deux images à caméra fixe, le mode calme zéro. Les captures rapprochées montrent les
corps arrondis et les raccords continus ; la vue 501/1500 reste trop brillante au centre et
ses liens hors sélection trop présents. Cette observation motive le dernier ajustement :
appliquer aussi le budget de densité à l'**opacité**, après conversion des couleurs, et atténuer
davantage les relations hors sélection. Baisser leur RGB linéaire seul ne suffit pas à limiter
l'accumulation additive après encodage sRGB. Requalifier ce descendant avant livraison.

La revue doit couvrir la vue générale dense, la sélection locale, le gros plan à plusieurs angles
et le téléphone. Vérifier particulièrement l'absence de cônes, de jours aux raccords pendant la
respiration, de traits noirs et de saturation blanche ; la sélection doit rester fidèle au volume.
Les contrôles du mouvement, du mode calme, du mouvement réduit, du démontage/remontage et du
fallback WebGL restent à exécuter sur le descendant, avec les régressions D05–D09 applicables.

Les mesures CI en rendu logiciel devront rester séparées des futurs rapports physiques du kit.
Le retour visuel de l'utilisateur, la qualification mémoire et le cockpit matériel complet
restent des points de sortie D09 ; cette reprise ne vaut ni clôture ni déploiement.
