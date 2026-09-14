# D05 : cockpit cohérent — checkpoint du 14 septembre 2026

Cette livraison est publiée dans la [PR #89](https://github.com/fredbuhr/nevolium/pull/89) sur
`feat/d05-coherent-cockpit`, créée depuis le main live
`1896468513f92ee5c0d6a811301a1b898cc6abd2`. Son commit fonctionnel est
`73bba82be620a5e6f548e68fb3bbbfeb8836104a` ; le présent suivi documentaire ne change pas cet arbre.
Elle n'est ni intégrée ni déployée. Le checkout de
production attesté reste `61d7687088dcbb002febd4c5f1a97f33edcb1269` ; aucun conteneur, volume,
snapshot B2, image de rollback, réservation historique ou ancienne Task n'a été modifié.

## Résultat livré dans la branche

| Zone | Comportement |
|---|---|
| Cockpit | Langage sombre organique Mycelium en CSS, navigation tactile, accès rapide `Ctrl/Cmd+K`, activation d'un panneau déjà ouvert et inspecteur documentaire existant |
| États et accès | Chargement, vide, erreur, retry, synchronisation visible, boucle/restauration de focus clavier et `prefers-reduced-motion` |
| Layouts | Dockview conservé ; clés propriétaires côté Core et clés de présentation distinctes par appareil, classe téléphone/tablette/bureau et profil manuel équilibré/concentration/revue |
| Reprise sûre | Une erreur de lecture crée un layout utilisable mais suspend sa persistance : elle ne peut pas écraser silencieusement la disposition distante ; le retry réattache la sauvegarde sérialisée |
| Multi-appareil | Panneaux en onglets et glisser désactivé sur téléphone, contrôles tactiles, shell installable avec manifeste/icônes/service worker ; aucune donnée métier ni mutation `/v1/` mise en cache |
| Sans WebGL | Aucun import Three, React Three Fiber ou graphe 3D dans le chemin Web D05 ; aucun décor 3D permanent |
| Réglages d'instance | Route administrateur et panneau OpenAI/Anthropic/xAI/Moonshot ; clé masquée envoyée une fois au registre LiteLLM interne, jamais stockée par Core, le Web ou une réponse API, y compris une erreur de validation |
| Vérification | Alias candidat immuable, Task/Temporal canonique, appel réel de huit tokens de sortie maximum, budget/réservation/usage existants et correspondance obligatoire de `x-litellm-model-id` |
| Reprise du test | Un résultat de démarrage Temporal indéterminé conserve la candidate et propose de relancer le même workflow, sans redemander la clé ; une candidate définitivement refusée est retirée du registre LiteLLM après la transition canonique |
| Activation | Une seule configuration active en PostgreSQL ; appels en cours drainés sous le verrou d'admission ; test récent requis ; échec, timeout ou attribution divergente laisse la dernière configuration valide active |
| Workflows | Les nouvelles Tasks Research, News et routage sémantique figent l'alias actif ; les Tasks antérieures conservent leur alias, y compris après retraite d'une configuration |

LiteLLM utilise son registre dynamique en base et un sel dédié pour chiffrer les clés fournisseur.
Core accède uniquement à son endpoint interne ; seul LiteLLM possède l'egress fournisseur. Les
identifiants de modèle visibles dans l'interface sont explicitement des exemples non qualifiés :
une option affichée ne peut devenir active qu'après le test réel récent et une seconde action
administrateur. Une configuration retirée doit être retestée sous une nouvelle candidate.

## Validation exécutée dans cette session

- TypeScript et build Vite de production : réussis, 142 modules transformés. Le bundle principal
  produit un avertissement de taille d'environ 537 kB, sans échec de build.
- Compilation Python, rendu SQL Alembic jusqu'à `0015_model_configurations` et
  `git diff --check` : réussis.
- Contrats D05 cockpit/PWA/sans WebGL, configuration modèle, non-réflexion de la clé en `422`,
  reprise sûre du démarrage et identité de déploiement, gateway LiteLLM, binding de dispatch,
  layouts propriétaires : réussis.
- Régressions Assistant déterministe/propriétaire, Semantic Router, News et fins d'exécution : réussies.
- Contrats Settings/secret/routage LiteLLM exécutables sans Docker : réussis.

Le contrat PostgreSQL ajouté couvre migration, unicité de l'actif, échec sans perte de l'ancien,
refus pendant un appel actif et bascule après drainage. Il attend son exécution CI avec PostgreSQL.
La matrice Compose attend également la CI car Docker n'est pas installé dans cette session. Ruff
n'a pas pu être lancé localement à cause de l'environnement `uvx` sans `/proc/self/exe`. Les builds
de packages n'ont pas été rejoués sur la tête finale car le runtime local fournit uv 0.12.11 tandis
que le dépôt exige 0.12.13. Les gates Foundation et Code quality de la PR restent obligatoires.

Le navigateur cloud a refusé les deux URL loopback du serveur de prévisualisation avec
`ERR_BLOCKED_BY_CLIENT`. Aucun contrôle interactif ou rendu visuel n'est donc revendiqué, malgré le
build réussi. Les anciennes références visuelles ne sont pas accessibles ; la seule image jointe à
la reprise représente le dialogue système Debian de redémarrage de services et n'est pas une
référence de design Nevolium.

## Limites et prochaine action

Aucune nouvelle clé fournisseur n'était disponible et aucun appel réel supplémentaire n'a été
effectué. OpenAI `openai/gpt-4.1` reste le seul fournisseur déjà qualifié par D04 ; la présence des
trois autres choix ne prouve aucune compatibilité. Aucune migration n'est appliquée en production.

Prochaine action : vérifier tous les workflows de la tête courante de #89 et corriger les seuls
défauts démontrés, puis compléter la qualification interactive et le test fournisseur lors d'une
activation explicitement autorisée. Le rollback du code redescend la migration à
`0014_capacity_and_data` après arrêt/drainage normal ; il ne doit pas supprimer les configurations
ou secrets LiteLLM sans examen de leur usage par des Tasks historiques.
