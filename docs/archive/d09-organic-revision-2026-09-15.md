# D09 — retour matériel et reprise organique

Base intégrée vérifiée : main `b68e1e8b15577c4b80e98c9431713bdcaf6fdd3d`.
Branche existante `feat/d09-mycelium-3d`, PR #93 draft, tête d'entrée
`81f4cf2f163dd314684dc312d90ab5dbba749315`, 8/8 workflows PR verts.

## Retour reçu

L'utilisateur indique un très bon fonctionnement sur tablette, ordinateur et téléphone,
mais juge le dessin trop technologique, sans l'aspect mycélium attendu. Ce retour positif
concerne le banc fourni ; il ne constitue pas un compte rendu du cockpit déployé.

Rapport joint `nevolium-d09-stress-2026-09-15T21-58-23.473Z.json`, SHA-256
`abc416ff48c0ccce3e19fd58e6bd09edf36912229752471016a441b71fea21da`.
Le fichier original reste inchangé. Synthèse de ses valeurs :

| Mesure | Valeur rapportée |
|---|---|
| Build source | `81f4cf2f163dd314684dc312d90ab5dbba749315`, sources propres |
| Charge | 501 objets / 1 500 liens synthétiques, profil équilibré, mouvement réduit désactivé |
| Durée mesurée | 600 869 ms, 408 fenêtres, durée atteinte |
| FPS fenêtre | minimum 163, p10 165, médiane 165 |
| Géométries | 14 dans tous les échantillons ; huit segments de rendu observés |
| Résolution | viewport 1 132 × 455 CSS ; DPR appareil 1,25 ; buffer WebGL 1 130 × 453 |
| Mémoire | heap JS non disponible dans ce rapport Firefox ; aucune mesure processus/GPU jointe |
| Identification | Windows/Firefox ; renderer AMD/ANGLE annoncé avec « or similar » ; modèle et classe GPU non renseignés |

Ce rapport atteste une campagne de rendu fluide sur l'ordinateur testé, à la résolution
effectivement indiquée. Il n'identifie pas un GPU intégré précis, ne mesure pas la mémoire
et ne fournit pas les mesures chiffrées des autres appareils. Le journal atteint 200 entrées
avant la fin : on ne peut pas conclure à l'absence d'incident sur toute la durée à partir de
ce journal tronqué. Les compteurs et le regroupement des événements caméra sont corrigés
dans le nouveau banc afin de préserver les changements de visibilité et les erreurs.

## Direction et réalisation

La charte `docs/design-mycelium.md`, le générateur SVG D05 et le réservoir historique
`ed12d503…` ont été inspectés. Le champ historique fournit aussi des courbes régulières et
ne résout pas le défaut ; aucun composant divergent n'est fusionné. La texture D05
`apps/web/public/mycelium-membrane.webp` a été ouverte et réutilisée sans retouche ni nouvelle
génération. Elle est importée uniquement avec la scène différée et intégrée en data URL au kit.

- Membranes poreuses au lieu des polyèdres pleins et cages filaires ; rendu instancié orienté
  vers la caméra sur les positions 3D réelles, raycast conservant l'identité sélectionnée.
- Rayon/élongation/rotation varient de façon déterministe. Le repère projet reste à l'origine ;
  les autres positions quittent les coquilles sphériques parfaites sans animation de placement.
- Les relations canoniques partagent un départ puis se ramifient : gaine effilée et fibres
  irrégulières qui se séparent et se rejoignent. Aucun objet ou lien métier supplémentaire.
- Hiérarchie lumineuse : armature plus lisible, traversées secondaires atténuées, voisinage
  sélectionné mis en valeur. La densité du stress ne devient pas un grillage d'intensité uniforme.
- Groupes en voiles diffus ; activité réelle des Tasks en respiration locale de la membrane.
  La réduction du mouvement supprime cette modulation. Pas de post-traitement plein écran.
- Trois géométries de base (membranes, gaines, fibres), une supplémentaire pour les groupes,
  une texture partagée. Libération des géométries lors des changements et démontages.

Le rapport a aussi montré que le buffer restait au DPR 1 : le `dpr={1}` de Canvas réappliquait
la valeur initiale après la consigne impérative de qualité. Canvas reçoit désormais directement
le DPR plafonné du profil, vérifié sur appareil émulé DPR 2 / profil équilibré à 1,35. Les futures
mesures doivent tenir compte de cette résolution corrigée ; les 165 FPS ne sont pas promis pour
un rendu plus grand ni transférés automatiquement à la nouvelle matière.

## Validation et suite

Build produit et kit autonome compilent. Les contrats ciblés vérifient déterminisme, absence de
mutation métier, correspondance des liens, volumes/tailles des buffers et graphe vide. Les parcours
navigateur D05–D09 restent les gates ; le kit ajoute clic direct sur membrane et DPR effectif.
Les captures utilisent le viewport réel, afin de ne pas provoquer un démontage hors champ pendant
une capture pleine page sur téléphone. Résultats exacts et artefacts du nouveau head dans #93.

Le retour matériel favorable est conservé. La présente révision ne déclare ni acceptation du
nouveau dessin ni clôture D09. Prochaine action : examiner les captures, remettre le kit organique,
puis recueillir le retour visuel et compléter les preuves matérielles/manquantes selon le plan.

### Première revue des captures

Head `7bac00bbc0cba0a457c990ddac6f8c6a435f6ebd` : 8/8 workflows PR verts, UI run `35031292487`.
Les 13 scénarios spatiaux et les neuf contrôles du kit passent, notamment le clic sur membrane
et le DPR effectif. La vue rapprochée montre toutefois des gaines qui deviennent de larges bandes
quand la caméra traverse le réseau : cette première proposition n'est pas retenue comme finale.

La correction borne l'épaisseur en pixels avec `LineSegments2`/`LineMaterial` de Three, inspectés
dans leur version installée, tout en gardant les trajectoires 3D, la variation d'épaisseur et le
faisceau. La lueur réutilise la géométrie, sans post-traitement. Le voisinage sélectionné reste
visible ; les autres fibres et membranes reculent. Le diamètre apparent des membranes est borné
près de la caméra, avec le même calcul pour le raycast. Les géométries restent bornées et libérées.

Pour le premier rendu organique, les mesures SwiftShader éco 51/201/501 sont 25/20/16 FPS, heap
17,1/19,3/24,5 Mo, 3 géométries et 1 texture. Elles ne qualifient pas la correction suivante ni le
matériel utilisateur. Le coût du rendu et la disparition des bandes doivent être examinés sur leur propre
head ; la PR conserve les captures et mesures finales.
