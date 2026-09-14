# D05 — matière organique, reprise du 14 septembre 2026

Travail sur la branche existante `feat/d05-coherent-cockpit`, PR #89, depuis la tête vérifiée
`b122a09d499506797735cbb121f6d5a3326fcf3c` (10/10 workflows réussis). Pas de nouvelle branche,
de fusion, de déploiement ou d'accès au serveur. Cette note décrit une proposition implémentée,
pas une acceptation du design par l'utilisateur ni une clôture D05.

## Constat et références réellement inspectées

L'utilisateur juge les lignes et les courbes précédentes trop parfaites. La palette seule ne
suffit pas : les références montrent des membranes fibreuses, des ramifications irrégulières,
une lumière localisée et un paysage détaillé sous des panneaux de verre sombre.

Huit pièces jointes ont été ouvertes : `ChatGPT Image 14 sept. 2026, 22_14_46 (5).png`,
`22_14_45 (1).png`, `22_14_45 (2).png`, `22_14_46 (3).png`, `22_14_46 (4).png`,
`15_26_18 (3)(1).png`, `15_26_17 (1)(2).png` et `15_26_18 (2)(2).png` (même préfixe).
Elles couvrent accueil, cockpit, téléphone et identité. Elles ne sont pas des captures de code
livré. Les anciens modules financiers dessinés ne deviennent pas des fonctionnalités D05.

Les archives du dépôt, le contrat visuel et le code courant ont été relus. La recherche ciblée
dans les discussions n'a renvoyé aucun contenu historique exploitable supplémentaire ; aucune
compréhension rétroactive n'est prétendue au-delà des échanges et images réellement accessibles.

## Réalisation

- `myceliumGeometry.ts` produit de façon déterministe des faisceaux ramifiés, jonctions, gaines
  translucides et membranes vectorielles irrégulières. Le même calcul place les vrais boutons ;
  `ResizeObserver` recalcule au redimensionnement, sans boucle par image ni dépendance nouvelle.
- `MyceliumField.tsx` enrichit les membranes d'une texture tissée en fusion éclaircissante
  (`screen`) ; le fond noir de l'image n'obscurcit pas le réseau. Les sept rotations limitent la
  répétition visible. Le SVG reste utilisable sans texture ; aucun libellé n'est dans l'image.
- `mycelium-organic.css` accorde paysage nocturne, verre sombre et lumière locale. L'introduction
  est séparée des nœuds pour préserver leurs cibles ; téléphone et tablette gardent les mêmes
  fonctions réelles. Le cockpit reçoit une atmosphère discrète derrière ses panneaux lisibles.
- Le logo SVG conserve les couleurs mais remplace les anneaux épais par des filaments fins,
  ouverts et inégaux. Les icônes PWA sont régénérées ; la version du cache shell est incrémentée.
- Aucune donnée, activité fictive, route métier, permission ou configuration fournisseur ajoutée.
  Pas de graphe 3D, Canvas, WebGL ou animation de particules permanente.

## Textures : provenance et instructions de génération

Deux textures ont été produites avec l'outil intégré de génération d'images à partir des pièces
jointes autorisées. Les conversions WebP et redimensionnements sont des opérations de format,
sans retouche artistique par script. Le logo est un asset vectoriel natif modifié dans le code.

| Asset livré | Poids | Rôle |
|---|---:|---|
| `apps/web/public/mycelium-landscape.webp` | 60 674 octets | Fond facultatif : lac, relief, végétation et horizon nocturne bas |
| `apps/web/public/mycelium-membrane.webp` | 59 006 octets | Matière poreuse des nœuds, réutilisée sans texte ni contrôle |

Instructions de génération conservées pour une nouvelle direction équivalente :

> Paysage — partir de la référence d'accueil `22_14_45 (1)` ; retirer toute l'interface,
> les panneaux, textes, logos, sphères et filaments. Reconstituer un lac alpin nocturne détaillé,
> des montagnes et des pins, un mince horizon pêche dans le quart inférieur, avec les 70 %
> supérieurs très sombres, bleu nuit/pétrole. Pas de relief polygonal, de géométrie ou d'élément UI.

> Membrane — reprendre la matière bioluminescente des sphères de la même référence : une
> membrane circulaire imparfaite, poreuse, faite de microfilaments entrelacés qui bifurquent,
> avec des dendrites courtes, de minuscules jonctions lumineuses, du cyan et bleu dominants,
> de l'émeraude et quelques touches violettes. Centre dégagé pour une icône ; aucun texte,
> symbole, anneau de néon lisse ou panneau. Conserver les détails fins du tissage.

La première sortie de membrane contenait un damier opaque malgré la demande de transparence.
Elle a été rejetée. Instruction corrective appliquée avec le même outil :

> Remplacer tout le damier gris à l'intérieur et à l'extérieur par du noir pur ; préserver
> exactement la membrane fibreuse cyan/bleu/émeraude/violet et ses minuscules ramifications.
> Fond noir opaque, sans damier ni fausse transparence, sans ajout de texte ou d'icône.

Les fichiers finaux sont les références reproductibles du dépôt ; une nouvelle génération ne
garantit pas des pixels identiques. Ce ne sont pas des maquettes prétendument exécutables.

## Qualification et limites

Contrôles locaux : TypeScript, build Vite, contrat statique D05, syntaxe du scénario navigateur,
`git diff --check` et nouveau test de géométrie. Celui-ci vérifie six tailles de scène, sept
cibles d'au moins 44 px sans chevauchement, déterminisme, bornes, nombres de fibres et poids
des textures. Les valeurs invalides sont refusées.

Le scénario Chromium conserve les dix captures Accueil/Cockpit et les parcours existants.
Il ajoute un essai réel de cliquabilité des sept nœuds, des redimensionnements à 320 px et en
tablette paysage, la limite de 2 000 éléments SVG et l'arrêt d'animation en mouvement réduit.
Ces contrôles sont des budgets vérifiables, pas une mesure de fluidité sur tous les appareils.

Le Chromium local s'arrête au lancement (`SIGTRAP`) dans cet environnement ; les captures
complètes doivent provenir de GitHub Actions. Le rendu isolé du composant SVG sert seulement à
inspecter la matière, jamais à attester les interactions du navigateur. Les résultats et artefacts
de la tête publiée sont consignés dans la [PR #89](https://github.com/fredbuhr/nevolium/pull/89).

Les API du parcours responsive sont déterministes et n'appellent aucun fournisseur payant.
Le vrai scénario OIDC/PKCE est conservé séparément. Aucun essai supplémentaire de fournisseur
réel ; aucune modification des secrets, snapshots B2, conteneurs, images de rollback, anciennes
Tasks ou réservations uncertain. La revue humaine du design et le test réel du fournisseur
choisi restent nécessaires avant la clôture D05.
