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

## Gate restant

1. Qualifier le head de cette livraison en CI, examiner captures et mesures, corriger les échecs.
2. Mesurer sur les appareils physiques visés, avec matériel/version navigateur/taille du graphe
   et profil enregistrés ; vérifier sélection, gestes, pause et stabilité mémoire.
3. Enregistrer le résultat final avant décision d'intégration. D10 n'est pas commencé.

Le pilote reste D05/0015. Revenir en 2D suffit à désactiver la fonctionnalité ; le rollback code reste
la base de PR ci-dessus, sans migration de données à annuler. Ne pas restaurer d'anciennes positions
2D à partir du document de présentation 3D.
