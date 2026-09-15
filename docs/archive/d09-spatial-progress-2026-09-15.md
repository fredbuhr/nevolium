# D09 — livraison spatiale et qualification du 15 septembre 2026

Ce document conserve les preuves de travail ; `PROJECT_STATE.md` indique la prochaine action.
Base main : `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d` ; branche existante
`feat/d09-mycelium-3d`, PR #93 draft, entrée `3c80857647723085612f1f4e51b1e84568009d6a`.

## Implémentation

- `packages/graph/src/spatial.ts` : projection déterministe préexistante à cette livraison,
  conservée ; mêmes identifiants, cycles/orphelins traités sans altérer le snapshot.
- `Mycelium3D` : chargement différé R3F, nœuds instanciés, courbes batchées sur les seuls liens
  canoniques visibles, groupes bornés (24), labels bornés (3/5/7), activité queued/running (24).
- Caméra OrbitControls, boutons tactiles/clavier, sélection partagée 2D/3D, accès Planning/Knowledge.
- Préférences de présentation validées et persistées via `WorkspaceLayout` distinct ; dernière
  écriture sérialisée, reprise sur erreur, garde de session et alerte avant fermeture si non sauvé.
- Démontage du canvas masqué et fallback 2D à l'indisponibilité/perte WebGL. Profil automatique
  avec hystérésis, DPR/détail/filaments réduits, mouvement réduit, téléphone explicitement en 2D.
- Actualisation du canon à la reconnexion/retour au panneau sans rejouer les mutations ; sélection
  des objets conservés maintenue. Aucune migration, API ni graphe métier supplémentaire.
- React/DOM fixés à 19.2.8 : le lock précédent utilisait 19.3.0, hors de la plage `>=19 <19.3`
  déclarée par R3F 9.7.0. La qualification doit donc conserver tous les parcours D05–D08.

## Preuves et limites

Les contrats purs de projection/présentation D09, le contrat Web D08 et le contrat de locale passent
localement. Le build final passe avec React 19.2.8 (396 modules). Bundle principal 1 259 kB, gzip 382 kB ;
chunk 3D différé 889 kB, gzip 239 kB. Le warning de taille Vite reste visible ; ne pas assimiler
ce build à une mesure réseau ou de performance physique. Les résultats exacts restent à renseigner après CI.

Le runner Chromium D08 appelle le scénario D09 : switch/sélection, orbite/caméra séparée, erreur de
sauvegarde/retry/sérialisation, conversion/navigation, panneaux/document masqués, reconnexion,
mouvement réduit, perte WebGL et indisponibilité à l'entrée, FR/EN/reload, téléphone tactile.
Il produit `d09-spatial-browser-qualification` avec captures et `result.json` ; benchmarks synthétiques
51/201/501 nœuds, qualité économique, viewport 1280×900, FPS/heap/géométries/draw calls/renderer.
Le scénario utilise une **API simulée** et Chromium **SwiftShader logiciel**. Les contrats PostgreSQL
D06/D08 sont exécutés séparément. Ni ces fixtures ni l'émulation tactile ne prouvent une expérience
physique tablette/GPU intégré ou une chaîne navigateur→Core→PostgreSQL complète.

## Première exécution CI

Head `db346a826f00ba45d86816ce0d2741611573072a`, workflow UI `35022007030` :
build, parcours navigateur D05–D07 et contrats PostgreSQL D06/D08 verts. Deux corrections observées :
le contrôle statique D05 interdisait toute source 3D au lieu du seul graphe d'import initial ;
le wrapper spatial privait React Flow d'une hauteur définie et empêchait la sélection D08.
Le contrôle suit désormais les imports statiques du point d'entrée (scène différée exclue), et le
canvas 2D conserve une hauteur explicite. Aucun clic forcé ni scénario D08 supprimé.

Les jeux 51/201/501 sont des charges synthétiques du renderer. Le Web réel charge par défaut au plus
100 Tasks + 100 Documents + 1 Project / 300 relations ; le Core autorise explicitement jusqu'à
200 + 200 + 1 / 1 000 relations. Le jeu 501 ne constitue donc pas une capacité produit servie par l'API.

Le head `78d506bde7627cf234935e626b0744e45d2de8ff` passe les contrats UI/PostgreSQL et tous
les scénarios navigateur D05–D08. L'entrée du nouveau scénario D09 cherchait le bouton français
avec un navigateur par défaut anglais : locale du fixture fixée à `fr-FR`, puis bascule EN explicite
conservée. Aucun changement de traduction produit nécessaire.

Le head `4dca4ed6910857f6825c8d7ba9546f41be2839ad` a révélé un fallback 2D prématuré :
R3F monte le contenu de la propriété `fallback` dans le DOM du canvas même lorsque WebGL fonctionne.
Un effet placé dans ce contenu signalait donc une indisponibilité à chaque ouverture. Cette
propriété est supprimée ; le test explicite WebGL2, la boundary d'erreur et la gestion de perte de
contexte restent les seules voies de secours. Les erreurs console du navigateur sont conservées
pour diagnostiquer les erreurs interceptées par une boundary.

## Qualification logicielle acquise

Head `825cee775870cd97bc860e7d4ea63501f4cb07bb` : **8/8 workflows PR success**.
UI run [35023375224](https://github.com/fredbuhr/nevolium/actions/runs/35023375224),
job navigateur `104564386555`. Les contrats UI/PostgreSQL et les parcours D05–D08 restent verts.

D09 passe ses 13 scénarios : sélection 2D↔3D, caméra séparée, erreur/retry/sérialisation,
conversion/navigation Planning, orbite, panneau masqué, document masqué, mouvement réduit,
reconnexion coalescée, perte WebGL, WebGL indisponible dès l'entrée, FR/EN/reload, téléphone facultatif.
Aucune erreur JavaScript non interceptée. Les 404 de layouts absents et la 503 injectée sont attendues
par le protocole ; les logs console sont conservés.

Artefact [D09 10418842039](https://github.com/fredbuhr/nevolium/actions/runs/35023375224/artifacts/10418842039),
ZIP SHA-256 `3e245fd234eb38975a2000351a13b4b6a78aa4d975bbf7ae34400736af0367aa` vérifié après téléchargement.
Captures `desktop-3d.png`, `graph-201.png`, `phone-3d.png` examinées ; `result.json` conserve les données.
La revue du graphe dense a repéré un chevauchement de labels : le descendant de ce head masque les
labels de priorité inférieure en collision, garde le label sélectionné et ajuste les bords.
Une assertion navigateur vérifie maintenant l'absence de chevauchement.

| Nœuds / liens synthétiques | FPS observés | Heap JS observé | Géométries | Draw calls |
|---|---:|---:|---:|---:|
| 51 / 50 | 32 | 15,2 Mo | 3 | 3 |
| 201 / 200 | 28 | 29,4 Mo | 3 | 3 |
| 501 / 500 | 23 | 44,7 Mo | 3 | 3 |

Environnement : HeadlessChrome 140.0.7339.16, Linux x86_64, ANGLE Vulkan SwiftShader/Subzero,
viewport 1280×900, profil économique. FPS sur une fenêtre d'environ 1,5 s ; heap JS ponctuel,
ni mémoire GPU/RSS ni preuve d'absence de fuite sur longue session. Aucun seuil de FPS matériel
n'est déduit de ces valeurs. Le jeu 501 est un stress synthétique au-delà du snapshot produit.

## Gate matériel restant et reprise

Le plan D09 demande des mesures sur **GPU intégré et tablette physique**. Le présent environnement
ne fournit pas ces appareils. La PR reste draft ; la clôture D09 et D10 ne sont pas déclarées acquises.

1. Vérifier main, le head live de #93 et ses checks, puis utiliser ce même build pour la campagne.
2. Pour chaque appareil, consigner modèle/GPU, OS, version navigateur, alimentation, taille du
   viewport, nombre d'objets/liens et profil 3D. Tester d'abord les graphes servis dans les limites Core.
3. Exécuter sélection 2D↔3D, orbite/zoom/tactile, modification d'un objet puis retour au graphe,
   sauvegarde/reload, panneau/onglet masqué et reconnexion. Vérifier le chemin 2D sur téléphone.
4. Mesurer FPS/temps de frame et mémoire au départ, pendant une session de 10 minutes et après
   plusieurs masquages/retours. Si l'API heap n'existe pas, consigner l'outil système utilisé et ne pas
   comparer sa mesure à `performance.memory` comme s'il s'agissait du même indicateur.
5. Ajouter les preuves et limites observées ici, puis décider de l'intégration conformément au plan.

Le pilote reste D05/0015. Revenir en 2D suffit à désactiver la fonctionnalité ; le rollback code reste
la base de PR ci-dessus, sans migration de données à annuler. Ne pas restaurer d'anciennes positions
2D à partir du document de présentation 3D.
