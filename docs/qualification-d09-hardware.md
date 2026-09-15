# D09 — essai du moteur 3D sur les appareils physiques

Télécharger l’artefact `d09-hardware-kit` du workflow UI de la PR #93, le décompresser,
puis ouvrir **nevolium-d09-hardware.html** dans un navigateur. Le fichier contient son code
et ses styles : aucune installation Nevolium, clé API, connexion ou donnée personnelle du
pilote n’est nécessaire. Aucune requête réseau n’est autorisée par cette page.

Sur PC, ouvrir le fichier directement dans Firefox, Chrome ou Edge. Sur tablette, l’aperçu
du gestionnaire de fichiers peut ne pas exécuter JavaScript : ouvrir dans le navigateur.
Si ce n’est pas proposé, servir uniquement le dossier décompressé depuis un PC du même réseau :

```sh
python -m http.server 8765 --bind 0.0.0.0 --directory CHEMIN_DU_DOSSIER_DECOMPRESSE
```

Sur la tablette, ouvrir `http://ADRESSE_LAN_DU_PC:8765/nevolium-d09-hardware.html`.
Arrêter le serveur avec Ctrl+C après les essais. Aucun déploiement sur le serveur pilote.
La version servie et la version ouverte comme fichier sont le même HTML.

## Campagne

1. Relever le modèle, l’OS, la version du navigateur, l’alimentation et le **GPU effectivement
   utilisé**. Un ordinateur portable hybride peut utiliser son GPU dédié : ne pas classer
   automatiquement sa mesure comme GPU intégré. Vérifier le GPU dans les diagnostics du
   navigateur et les réglages graphiques du système ; conserver cette indication avec le rapport.
2. Commencer avec **201 objets / 300 liens, économique, dix minutes**, scène visible. Réaliser
   orbite, sélection, centrage, zoom molette ou pincement et déplacement tactile. Le banc utilise
   `Mycelium3D/Scene.tsx` du dépôt, les profils réels, trois groupes et huit Tasks synthétiques actives.
3. Le banc démonte la scène deux secondes toutes les deux minutes mesurées, puis la remonte avec
   la caméra en mémoire. Essayer aussi « Masquer 2 s » et un changement d’onglet. Les périodes
   masquées ne comptent pas ; les longues interruptions entre fenêtres sont consignées séparément.
4. Relever la mémoire du processus avec l’outil système au début et à la fin, avec l’unité,
   l’outil, et si possible une capture. La mémoire JavaScript exposée par Chromium peut être
   approximative et n’inclut ni le processus entier ni la mémoire GPU. Sous Firefox/Safari,
   une valeur JSON `null` signifie « API non disponible », jamais « zéro mémoire ».
5. Après dix minutes mesurées, renseigner les observations et **Exporter le rapport JSON**.
   Exporter aussi tout essai interrompu ou en échec avant de démarrer une nouvelle mesure.
   Les résultats restent en mémoire jusqu’à l’export ; recharger la page les efface.
6. Refaire le cas en profil automatique, puis les cas 51/50 et 401/1000 selon le temps disponible.
   Répéter sur la tablette physique. 501/1500 est un stress supplémentaire dépassant les limites
   du snapshot produit ; il ne modifie pas la capacité annoncée du Core.

Le navigateur peut réduire ses informations GPU. Consigner les informations du système dans les
notes dans ce cas. Avec « mouvement réduit », le moteur rend à la demande : le chronomètre de
mesure peut ne pas avancer sans interaction. Le rapport conserve ce réglage et ses changements.

## Portée des preuves

Le rapport contient les SHA source et checkout, le statut de sources modifiées, les conditions
saisies au départ, le GPU annoncé par le navigateur pour chaque remontage, les fenêtres FPS,
les échantillons de heap JS disponibles, le viewport/DPR et les incidents. L’outil conserve au plus
1 000 échantillons et 200 événements ; sa propre mémoire est incluse dans le heap observé.

Les minimums et percentiles portent sur des **fenêtres FPS d’environ 1,5 seconde**, pas sur les temps
de frame individuels. `duration_complete` atteste seulement la durée. Le statut reste
`needs_review` : examiner fluidité, pauses, erreurs et évolution de mémoire avant acceptation.
Une hausse de heap ne prouve pas à elle seule une fuite ; un plateau de heap ne prouve pas
l’absence de fuite GPU. Le constructeur du kit n’altère pas le build produit.

Ce banc isole le **renderer réel sur graphe synthétique local**. Il ne qualifie pas l’authentification,
Core/PostgreSQL, les sauvegardes serveur, la conversion idée→tâche ou le passage réel entre les
workspaces 2D et 3D. Les scénarios logiciel D05–D09 couvrent les interactions du cockpit avec API
simulée ; les contrats PostgreSQL sont séparés. La campagne du cockpit complet sur les appareils,
décrite dans `docs/archive/d09-spatial-progress-2026-09-15.md`, reste à consigner avant clôture D09.

## Reproduction développeur

Depuis la racine du dépôt, checkout du head de la PR et dépendances verrouillées :

```sh
corepack pnpm install --frozen-lockfile
node apps/web/qualification.build.mjs
```

Sortie : `artifacts/d09-hardware-kit/`. `build.json` contient le SHA-256 du HTML.
La CI fournit un kit avec les références de son checkout et du head PR. Les checks sur le
kit testent ouverture `file://` hors ligne, mesure, pause/remontage, export incomplet,
absence WebGL et viewport tactile ; ils utilisent SwiftShader et ne remplacent pas ces essais physiques.
