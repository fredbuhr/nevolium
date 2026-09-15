# D09 — corps neuronaux et circulation lumineuse

Base live vérifiée : main `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d` ; branche existante
`feat/d09-mycelium-3d`, PR #93 draft. Tête d'entrée `0fa97e6a5a35cd5c4ba1d967665ba21fa420f369`,
8/8 workflows PR verts, UI run `35033102993`. Aucun passage à D10 ou déploiement.

## Retour et preuve reçus

L'utilisateur trouve le résultat correct et fonctionnel, mais encore immobile et trop circulaire.
Il demande des neurones ou sphères irrégulières en volume, des connexions naturelles et une énergie
visible entre les éléments, pour une identité propre à Nevolium. Cette instruction fait évoluer
la première matière D09 ; elle n'est pas interprétée comme une acceptation finale du dessin.

Rapport `nevolium-d09-default-2026-09-15T23-01-36.410Z.json` laissé intact, SHA-256
`dced4e0d4bc4f54e5df92d6bdaf1dfddc59c77c614aa8c49f524c47cd6a240e9`.

| Observation | Valeur du rapport |
|---|---|
| Build | 0fa97e6, sources propres |
| Jeu et profil | 201 objets / 300 liens, économique, mouvement réduit désactivé |
| Durée | 601 216 ms mesurées, 401 fenêtres, campagne terminée |
| FPS par fenêtre | médiane 151, p10 41, minimum 1 ; 80 fenêtres sous 60 FPS, 24 sous 30 |
| Ressources WebGL | 4 géométries, 1 texture, 5 appels, 65 208 triangles dans les échantillons consultés |
| Interruptions | 6 segments, 4 pauses demandées, 1 masquage document ; aucun événement perdu annoncé |
| Mémoire | JS, processus et GPU inconnus ; pas de preuve de stabilité mémoire |
| Environnement | Firefox/Windows ; AMD annoncé avec « or similar », modèle exact et alimentation non renseignés |

La médiane est élevée, mais les chutes sont réelles dans les fenêtres exportées. Ce rapport seul
n'isole pas leur cause et ne justifie pas de promettre une fluidité identique avec une matière
nouvelle. Le journal corrigé conserve 77 événements, regroupe 248 événements caméra et annonce
zéro perte. Le budget de rendu reste un critère de revue.

## Direction et réalisation

Le composant historique `ed12d503:packages/graph/src/ActivityPulseField.tsx` a été examiné :
il déplace des billes sur des courbes et ne répond pas à cette direction. Il n'est pas importé.

- Corps neuronaux 3D instanciés, lobés et asymétriques, avec normales de surface déformée,
  lumière directionnelle, nervures et profondeur. Pas de nouvelle illustration plaquée.
- Dendrites en volume effilées, orientées par les départs des relations, avec fourches locales.
  Leur dessin appartient au soma ; aucun faux objet ou lien n'entre dans le canon.
- Respiration locale désynchronisée, y compris au repos. Centres et identités fixes ; cibles
  de sélection englobant le corps et libellés sous le volume. Pas de rotation de caméra automatique.
- Vagues lumineuses intégrées au matériau des filaments existants, avec front et sillage,
  48/80/128 liens animés au maximum selon le profil. Pas de particules déplacées par une boucle CPU.
- Circulation explicitement décorative ; aucune activité de travail ou livraison de données
  n'est inventée. Les états queued/running modulent séparément le corps.
- Bouton FR/EN pour figer le réseau et respect du mouvement réduit système. Le kit journalise
  les changements d'animation et déclare son état initial. Le mode fixe rend à la demande :
  il n'est pas une mesure de FPS continus.

La géométrie reste instanciée/batchée, sans post-traitement plein écran. Le soma utilise un
maillage réduit en mode économique ; les dendrites ont un nombre de segments et de côtés borné.
La texture D05 reste disponible pour D05, mais les objets D09 ne l'utilisent plus comme disque.

## Validation et reprise

Les contrats vérifient la borne des vagues et leur appartenance aux seules relations canoniques.
Le parcours hors ligne ajoute une comparaison de pixels à caméra fixe : mouvement visible en
mode vivant, image fixe en mode calme et priorité du mouvement réduit système. Il enregistre
une vidéo WebM du vrai canvas sur 51 objets, en plus des captures et du clic sur le volume.
Les scénarios D05–D09, contrats PostgreSQL, coûts mesurés et artefacts du head exact sont consignés
dans #93 après vérification. Les mesures CI restent du rendu logiciel, distinct des appareils.

Prochaine action : examiner la silhouette, la matière et la circulation sur les captures/vidéo,
corriger tout défaut observé puis remettre le HTML. L'avis utilisateur sur cette proposition,
la mémoire longue durée et les essais physiques du cockpit restent nécessaires à la clôture D09.
