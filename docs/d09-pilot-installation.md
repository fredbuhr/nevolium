# D09 — installation pilote du modèle validé

Le 16 septembre 2026, l'utilisateur valide pour l'instant le modèle présenté dans
`nevolium-d09-tissu-vivant.html` et autorise son installation puis la poursuite du travail.
La référence visuelle est le code `48d7be9752424e8cd4c3793ee5da58225ab2069b` :
8/8 workflows PR réussis, 13 scénarios spatiaux et 16 contrôles du kit.
Le HTML vérifié porte le SHA-256
`48d7537f3e716f6d4135f473d2c1978c97a8fc4f1e8cef4438e6489150efbb59`.
Les membranes, noyaux et filaments de ce modèle sont conservés.

L'acceptation du design permet son intégration au dépôt et l'ouverture de l'installation
pilote. Elle n'invente pas une mesure mémoire ou une qualification physique de la nouvelle
matière. D09 reste le lot actif ; D10 n'est pas commencé.

## Point de départ à vérifier sur Netcup

Dernier état attesté : runtime D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`,
PostgreSQL `0015_model_configurations`, configuration OpenAI active et sauvegardée.
Le code D06–D09 utilise aussi `0016_planning_structure`, `0017_project_work_calendar`
et `0018_editable_knowledge`. Installer uniquement de nouveaux fichiers Web contre
l'ancien Core D05 ne constitue donc pas une mise à jour cohérente.

L'utilisateur exécute les commandes dans sa session SSH `nevolium-admin@node-01` ;
l'agent prépare les blocs et examine les sorties. Aucun accès SSH direct n'est établi
dans cette session de développement. La commande remise après intégration fige un SHA,
récupère le script depuis Git sans changer le checkout actif, et lance :

```sh
python3 /CHEMIN_TEMPORAIRE/d09_pilot_preflight.py \
  --source /opt/nevolium/source --target SHA_COMPLET_DE_LA_RELEASE
```

Le script requiert un ticket `sudo` déjà obtenu pour lire Docker. Il ne modifie ni les
conteneurs, ni le checkout, ni SQL, ni les secrets. Le JSON relève le projet Compose réel,
les identités d'images, les montages, les chemins de configuration, le schéma, les compteurs
d'activité et l'existence éventuelle des répertoires de releases. Il n'affiche ni les
environnements des conteneurs, ni les messages d'erreur pouvant contenir des secrets.
La requête SQL s'exécute dans une transaction en lecture seule avec délais bornés.

Le résultat reste `needs_review`, même lorsque l'inventaire réussit. Un checkout propre
n'atteste pas à lui seul la version exécutée par les conteneurs. Les réservations historiques
`uncertain` sont comptées séparément et conservées. Plusieurs Core actifs, une base absente
ou une lecture impossible arrêtent l'inventaire ; aucun service n'est démarré pour contourner
l'échec. Les tests à fixtures vérifient ces frontières, pas une installation sur Netcup.

## Séquence d'installation après examen de cet inventaire

1. **Figer la release et le retour.** Vérifier les références Git, les images actives, le
   schéma, le projet Compose et les montages. Conserver les images et sources D05, ainsi
   que les snapshots historiques et le matériel de récupération LiteLLM/OpenBao.
2. **Préparer la release séparément.** Préparer le commit validé dans un répertoire versionné
   et construire les images sans modifier les services actifs. Réutiliser le nom de projet
   Compose et les volumes existants ; résoudre explicitement les montages relatifs.
   Examiner la disposition réelle avant de créer ou de basculer un lien `current`.
3. **Sauvegarder avant migration.** Créer le snapshot Netcup convenu, puis une sauvegarde
   quiescente B2/Restic avec la configuration de restauration déjà qualifiée. Réutiliser
   `scripts/ops/backup.sh` et les overlays du pilote. Vérifier le snapshot obtenu et conserver
   son identifiant exact ; ne jamais considérer une sauvegarde historique comme le point
   de retour des données actuelles. Préserver les clés et le sel existants sans les afficher.
4. **Arrêter les écrivains et migrer.** Vérifier les travaux actifs, arrêter les anciens
   Core/Workers et autres écrivains concernés, puis appliquer les migrations nécessaires
   avec `nevolium-migrate`. Ne lancer aucune nouvelle Task ni appel fournisseur de validation
   implicite. Garder ingress et données sous contrôle pendant cette fenêtre.
5. **Activer l'ensemble compatible.** Activer Web, Core et Worker de la release préparée,
   avec les mêmes permissions et services utiles. Vérifier santé, confiance OpenBao,
   authentification et schéma avant l'ouverture aux écritures usuelles.
6. **Qualifier l'usage réel.** Vérifier FR/EN, Planning, Knowledge, passage 2D↔3D, sélection,
   sauvegarde du layout, reconnexion et usage tactile. Compléter fluidité/mémoire sur les
   appareils ; enregistrer la release effectivement activée et son snapshot de retour.

Ces étapes décrivent la suite à rendre concrète à partir du relevé. Aucun snapshot,
arrêt, migration ou déploiement n'est déclaré exécuté par ce document.

## Retour arrière

Le lien `current` sélectionne des sources, pas une version de la base. Après `0018`,
revenir aux seules images D05 ne restaure pas le schéma ni les données antérieures.
Le downgrade de `0018` refuse notamment certains documents rédigés sans Asset source.
Le retour doit donc utiliser les images compatibles et le snapshot quiescent identifié,
en protégeant les écritures postérieures à ce snapshot. `restore.sh` reste une opération
destructive distincte, jamais déclenchée automatiquement par l'inventaire ou un test échoué.

Les preuves de sauvegarde D05 sont conservées dans
[le suivi D05](archive/d05-connected-navigation-2026-09-14.md). La procédure générale reste
[le déploiement](deployment.md), et la campagne physique
[la qualification D09](qualification-d09-hardware.md).
