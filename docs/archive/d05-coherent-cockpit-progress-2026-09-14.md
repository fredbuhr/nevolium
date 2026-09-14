# D05 : cockpit cohérent — checkpoint du 14 septembre 2026

Cette livraison est publiée dans la [PR #89](https://github.com/fredbuhr/nevolium/pull/89) sur
`feat/d05-coherent-cockpit`, créée depuis le main live
`1896468513f92ee5c0d6a811301a1b898cc6abd2`. Le socle fonctionnel est
`73bba82be620a5e6f548e68fb3bbbfeb8836104a`, le contrat Compose a été corrigé sur
`48210102a9814a30ef1c35f1245d693c126c5bd0` et l'itération visuelle/multi-écran est
`47cee6ef1245af70d52279b26ad9c321f698a883`. La charte éditoriale est publiée sur
`1f5db08c7b52502443fa0d5eae754c1801c8d471`, tête validée par 10/10 workflows.
Elle n'est ni intégrée ni déployée. Le checkout de
production attesté reste `61d7687088dcbb002febd4c5f1a97f33edcb1269` ; aucun conteneur, volume,
snapshot B2, image de rollback, réservation historique ou ancienne Task n'a été modifié.

## Résultat livré dans la branche

| Zone | Comportement |
|---|---|
| Cockpit | Identité Mycelium nuit/pétrole, cyan/émeraude/bleu/violet, logo neural original, navigation tactile, accès rapide `Ctrl/Cmd+K` et inspecteur documentaire existant |
| États et accès | Chargement, vide, erreur, retry, synchronisation visible, boucle/restauration de focus clavier et `prefers-reduced-motion` |
| Layouts | Dockview conservé ; clés propriétaires côté Core et clés de présentation distinctes par appareil, fenêtre, classe téléphone/tablette/bureau et profil manuel équilibré/concentration/revue ; migration des anciennes clés |
| Reprise sûre | Une erreur de lecture crée un layout utilisable mais suspend sa persistance : elle ne peut pas écraser silencieusement la disposition distante ; le retry réattache la sauvegarde sérialisée |
| Multi-appareil | Panneaux en onglets et glisser désactivé sur téléphone ; panneau actif détachable sur bureau dans une page hôte neutre et déplaçable vers un autre écran ; shell installable sans cache métier ni mutation `/v1/` |
| Sans WebGL | Aucun import Three, React Three Fiber ou graphe 3D dans le chemin Web D05 ; aucun décor 3D permanent |
| Réglages d'instance | Route administrateur et panneau OpenAI/Anthropic/xAI/Moonshot ; clé masquée envoyée une fois au registre LiteLLM interne, jamais stockée par Core, le Web ou une réponse API, y compris une erreur de validation |
| Vérification | Alias candidat immuable, Task/Temporal canonique, appel réel de huit tokens de sortie maximum, budget/réservation/usage existants et correspondance obligatoire de `x-litellm-model-id` |
| Reprise du test | Un résultat de démarrage Temporal indéterminé conserve la candidate et propose de relancer le même workflow, sans redemander la clé ; une candidate définitivement refusée est retirée du registre LiteLLM après la transition canonique |
| Activation | Une seule configuration active en PostgreSQL ; appels en cours drainés sous le verrou d'admission ; test récent requis ; échec, timeout ou attribution divergente laisse la dernière configuration valide active |
| Workflows | Les nouvelles Tasks Research, News et routage sémantique figent l'alias actif ; les Tasks antérieures conservent leur alias, y compris après retraite d'une configuration |

Les textes visibles utilisent les mêmes repères en français dans la navigation, les panneaux et
l'accès rapide : Assistant, Actualités, Recherche, Aujourd'hui, Projets et Documents. Les messages
d'attente et d'erreur décrivent ce que la personne peut comprendre ou faire. Les noms Core, Worker,
Temporal, Knowledge et les « chunks » restent disponibles dans le code et les diagnostics, sans
être nécessaires au parcours quotidien. Cette évolution ne renomme aucun identifiant interne,
statut, endpoint ou contrat métier.

LiteLLM utilise son registre dynamique en base et un sel dédié pour chiffrer les clés fournisseur.
Core accède uniquement à son endpoint interne ; seul LiteLLM possède l'egress fournisseur. Les
identifiants de modèle visibles dans l'interface sont explicitement des exemples non qualifiés :
une option affichée ne peut devenir active qu'après le test réel récent et une seconde action
administrateur. Une configuration retirée doit être retestée sous une nouvelle candidate.

## Validation exécutée dans cette session

- TypeScript et build Vite de production : réussis, 142 modules transformés. Le bundle principal
  produit un avertissement de taille d'environ 540 kB, sans échec de build. Ces contrôles ont aussi
  été rejoués après l'alignement des textes d'interface.
- Compilation Python, rendu SQL Alembic jusqu'à `0015_model_configurations` et
  `git diff --check` : réussis. Le contrat statique D05 passe aussi après l'alignement des textes.
- Contrats D05 cockpit/PWA/sans WebGL, configuration modèle, non-réflexion de la clé en `422`,
  reprise sûre du démarrage et identité de déploiement, gateway LiteLLM, binding de dispatch,
  layouts propriétaires : réussis.
- Régressions Assistant déterministe/propriétaire, Semantic Router, News et fins d'exécution : réussies.
- Contrats Settings/secret/routage LiteLLM exécutables sans Docker : réussis.
- GitHub CI sur `47cee6ef1245af70d52279b26ad9c321f698a883` : 10/10 workflows réussis. Cela inclut
  Foundation, PostgreSQL réel, rendu Compose, UI workspace, isolation multi-utilisateur,
  Autonomous Research et le garde-fou D04.
- GitHub CI sur la tête fonctionnelle et éditoriale `b3dfbb53a1f22d7e0aba8304d1690f8f1a0bf632` :
  10/10 workflows réussis. Le premier run UI sur `ba337443…` avait révélé une assertion liée au
  texte « Temporal » ; la correction vérifie le verrou fonctionnel des tâches en cours et le même
  workflow réussit sur `b3dfbb53…`.

Le contrat PostgreSQL prouve en CI migration, unicité de l'actif, échec sans perte de l'ancien,
refus pendant un appel actif et bascule après drainage. La matrice Compose réelle passe également ;
la comparaison d'identités LiteLLM est évaluée dans le profil `ai` qui instancie ce service. Docker
reste absent localement. Ruff n'a pas pu être lancé localement à cause de l'environnement `uvx`
sans `/proc/self/exe`, mais le gate Code quality réussit. Les builds de packages n'ont pas été
rejoués localement avec uv 0.12.13, mais les gates verrouillés de la CI réussissent.

Le navigateur cloud a refusé les deux URL loopback du serveur de prévisualisation avec
`ERR_BLOCKED_BY_CLIENT` et aucun navigateur exécutable n'est présent dans ce conteneur. Aucun
contrôle interactif du cockpit n'est donc revendiqué, malgré le build réussi. Les deux vues de
cockpit et l'identité sphérique fournies pendant D05 ont été inspectées directement ; elles servent
d'inspiration au [contrat visuel](../design-mycelium.md), pas de captures à reproduire à l'identique.

## Limites et prochaine action

Aucune nouvelle clé fournisseur n'était disponible et aucun appel réel supplémentaire n'a été
effectué. OpenAI `openai/gpt-4.1` reste le seul fournisseur déjà qualifié par D04 ; la présence des
trois autres choix ne prouve aucune compatibilité. Aucune migration n'est appliquée en production.

Prochaine action : qualifier le rendu et le détachement dans un navigateur authentifié, puis tester
le fournisseur choisi lors d'une activation explicitement autorisée. Le rollback du code redescend la migration à
`0014_capacity_and_data` après arrêt/drainage normal ; il ne doit pas supprimer les configurations
ou secrets LiteLLM sans examen de leur usage par des Tasks historiques.
