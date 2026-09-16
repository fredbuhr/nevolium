# Nevolium — bilan produit et proposition KISS

**16 septembre 2026 · Étude du code, de la feuille de route et de références publiques officielles**

**Statut : proposition de réorientation.** Ce document décrit les changements recommandés ; il ne constitue pas une attestation de leur implémentation. La validation fonctionnelle D09 reste ouverte.

## 1. Décision recommandée

**Revoir le séquencement et le contrat d’usage, en conservant les fondations techniques déjà construites.** Nevolium doit permettre à une personne d’apporter une information, d’exprimer un objectif et de retrouver un résultat exploitable dans le même espace. L’organisation, les relations, les vues et les agents doivent servir ce parcours.

La promesse proposée : **« Dépose, dis ce que tu veux obtenir, Nevolium relie les informations et fait avancer le travail. »**

Mycelium devient la représentation interactive de ce contexte : sources, idées, projets, actions et résultats. La 3D garde un rôle central dans l’identité et la navigation. Son intérêt doit se mesurer à la compréhension des liens et au temps gagné. L’adoption massive reste une ambition à éprouver auprès d’utilisateurs ; une démonstration visuelle réussie ne permet pas de la prédire.

Les décisions prioritaires sont :

1. Un espace de travail commun, avec Mycelium transparent en fond interactif et des documents ou outils qui s’ouvrent au-dessus.
2. Une entrée permanente pour écrire, parler ou déposer un fichier ; aucune obligation de comprendre la structure des modules avant de commencer.
3. Une capture immédiate, puis une organisation automatique explicable et corrigeable.
4. Des agents présentés comme des missions avec un résultat attendu, un périmètre et un état clair.
5. La voix Web et les premières missions récurrentes rapprochées du premier assistant contextuel.
6. La simplicité, le français/anglais cohérent et l’accessibilité vérifiés à chaque livraison.
7. Une qualification sur des parcours complets et des données inconnues du système, en complément du corpus de démonstration déjà importé.

## 2. Périmètre et état réellement établi

### Sources internes

Le dépôt GitHub a été vérifié sur `main` : `0aa4908ce0d2deed88ca8060e89a4afe6f9881d9`, checkpoint de l’import pilote. L’arbre de travail audité correspond à cet arbre Git. Les différences depuis la release `702c2a3de4b4bd2219e27bf12c5b5286624d4bd8` portent sur la documentation.

L’audit couvre notamment `PROJECT_STATE.md`, les plans d’implémentation et d’architecture, la matrice des composants, l’accueil, la scène 3D, le navigateur Mycelium, les connaissances éditables, l’assistant et les projections mémoire. Les constats serveur proviennent des sorties SSH fournies dans cette conversation ; cette étude ne les remplace pas par une nouvelle observation directe.

Le correctif Accueil D09 est activé. Le schéma reste `0018_editable_knowledge`. Après import, les compteurs attestés sont **12 projets, 69 tâches et 22 documents**. Le corpus ajouté contient **5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances et 32 relations explicites**, avec 112 opérations journalisées et une relecture API. L’import n’a exécuté aucune tâche et n’a effectué aucun appel IA. [Checkpoint du dépôt](https://github.com/fredbuhr/nevolium/blob/0aa4908ce0d2deed88ca8060e89a4afe6f9881d9/PROJECT_STATE.md).

### Sources externes et limites

Les références ci-dessous ont été consultées le 16 septembre 2026. Elles décrivent des fonctionnalités documentées ou annoncées par leurs éditeurs. Les produits concurrents n’ont pas été testés dans leurs espaces authentifiés pendant cette étude. Aucune comparaison de vitesse, de fiabilité, de popularité ou de prix n’est déduite de leurs pages commerciales. Les adaptations proposées pour Nevolium sont des choix de conception, à valider expérimentalement.

## 3. Ce que les outils existants nous apprennent

| Référence | Fonctionnement documenté | Application proposée à Nevolium |
| --- | --- | --- |
| **Obsidian** | Notes reliées, graphe global ou centré sur la note active ; Canvas rassemble notes et ressources ; Bases propose des vues de fichiers et de leurs propriétés. | Garder les mêmes identités à travers les vues. Montrer d’abord le voisinage utile. Préserver export, sources et compréhension des liens. [Graphe](https://obsidian.md/help/plugins/graph), [Canvas](https://obsidian.md/help/plugins/canvas), [Bases](https://obsidian.md/help/bases). |
| **Heptabase** | Cartes et tableaux visuels associés aux sources, annotations PDF et liens ; l’IA aide à comprendre et organiser les connaissances. | Ouvrir une source et ses idées dans un même contexte ; faire de l’organisation spatiale un outil de réflexion accessible progressivement. [Présentation officielle](https://heptabase.com/). |
| **Capacities** | Objets comme personnes ou projets, journal quotidien pour capturer, liens retour et détection de mentions non reliées. | Autoriser la capture avant le classement. Employer des objets familiers et retrouver automatiquement les connexions déjà présentes dans les textes. [Présentation officielle](https://capacities.io/). |
| **TheBrain** | Réseau de pensées, notes et fichiers ; Cerebro propose recherche, synthèse, création et suggestions de liens ; plusieurs vues du même contenu. | Considérer « graphe + assistant » comme un terrain déjà occupé. Se différencier par la continuité jusqu’à l’exécution, la lisibilité et la facilité de correction. [Présentation officielle](https://thebrain.com/). |
| **Mem** | Capture de notes, réunions, pages et paroles ; mémoire visible et agent qui actualise son contexte et propose des suites. | Déplacer le travail d’organisation vers le système ; rendre la mémoire consultable et modifiable ; limiter les sollicitations. [Présentation officielle](https://get.mem.ai/). |
| **Tana** | La présentation actuelle privilégie les réunions : capture, décisions et livrables reliés dans un graphe, actions proposées puis acceptées. | Relier directement une conversation à des décisions, propriétaires et actions. Éviter que la parole aboutisse seulement à une transcription supplémentaire. [Présentation officielle](https://tana.inc/). |
| **Notion Custom Agents** | Instructions, contexte autorisé et déclencheurs horaires ou événementiels ; exécution en arrière-plan, activité et configuration consultables. | Créer une mission en langage naturel, montrer sa portée et sa prochaine exécution, permettre de la mettre en pause. [Documentation](https://www.notion.com/help/custom-agents), [création guidée](https://www.notion.com/help/guides/build-your-first-custom-agent). |
| **Claude Cowork** | Objectif donné à un agent qui agit sur des fichiers et outils, montre son activité et livre un résultat à examiner ; tâches récurrentes annoncées. | Évaluer la valeur sur le travail livré et la capacité de le réorienter. Rattacher durablement le résultat aux sources et au projet. [Présentation officielle](https://claude.com/product/cowork). |
| **ChatGPT agent** | La présentation de lancement de 2025 documente une exécution combinant navigation, code et outils, avec interruption et contrôle humain des actions importantes. | Une demande doit pouvoir traverser plusieurs outils sans obliger l’utilisateur à les orchestrer lui-même. Cette référence historique ne décrit pas toute l’offre actuelle. [Présentation de lancement](https://openai.com/index/introducing-chatgpt-agent/). |
| **Motion** | Planification à partir des priorités, durées, échéances et dépendances, avec placement des tâches dans le calendrier. | Faire produire un planning exploitable par Nevolium. Utiliser le Gantt pour comprendre et ajuster le plan. [Présentation officielle](https://www.usemotion.com/). |
| **Reclaim** | Réservation et déplacement de créneaux selon disponibilités et règles de planification. | Respecter les contraintes réelles de temps, expliquer les impossibilités et garder la main sur les créneaux protégés. [Réglages de planification](https://help.reclaim.ai/en/articles/10491907-customize-your-scheduling-settings-for-reclaim-events). |
| **Home Assistant Assist** | Pipeline séparant reconnaissance vocale, traitement de l’intention et synthèse vocale. | Faire de la voix une autre entrée vers les mêmes actions et permissions, avec états d’écoute et d’exécution distincts. [Pipeline officiel](https://developers.home-assistant.io/docs/voice/pipelines/). |

**Conclusion de cette comparaison :** l’association mémoire, liens et agents existe déjà sous plusieurs formes. La possibilité de Nevolium est une continuité particulièrement claire entre information, compréhension, décision et action, dans un espace personnel visible et maîtrisable. Il faut démontrer cette continuité sur quelques usages fréquents avant d’étendre les domaines.

Deux références de conception renforcent cette orientation. La divulgation progressive consiste à présenter d’abord les fonctions fréquentes et à rendre les fonctions spécialisées faciles à découvrir à la demande. Les recommandations HAX insistent notamment sur la correction, l’explication et l’adaptation prudente des systèmes IA. Ces principes guident la proposition ; ils ne constituent pas une preuve de son efficacité future. [NN/g](https://www.nngroup.com/articles/progressive-disclosure/), [Microsoft HAX](https://www.microsoft.com/en-us/haxtoolkit/library/).

## 4. Diagnostic de Nevolium

### Des fondations à conserver

Les données métier sont déjà séparées de leurs vues. Core centralise les mutations et les permissions ; PostgreSQL conserve le métier ; SeaweedFS les fichiers ; Temporal porte les exécutions durables. Les budgets, la provenance, les versions et les événements existent. Gantt, calendrier et listes utilisent les mêmes tâches. La 2D et la 3D réutilisent des données partagées. Cette structure convient au produit recherché. [Architecture](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/docs/architecture.md).

### Les écarts qui expliquent la complexité

| Constat vérifié | Conséquence pour l’utilisateur | Correction proposée |
| --- | --- | --- |
| L’accueil, le cockpit et les espaces spécialisés restent des surfaces distinctes. Le même moteur graphique est réutilisé, mais cela ne crée pas encore un espace continu. | Il faut apprendre où se trouve une opération et quand changer de surface. | Un contexte et une navigation communs ; les outils s’ouvrent autour de l’élément courant. |
| Le navigateur présente plusieurs gestes : sélectionner, explorer, ouvrir, épingler ; la personnalisation comprend plusieurs formulaires. | Le prochain geste utile est peu évident. | Un clic ouvre la fiche et les liens directs ; les actions avancées restent dans un menu contextuel. |
| La scène impose `alpha: false`, un fond Three.js coloré, puis un conteneur CSS bordé à hauteur limitée. | Mycelium demeure visuellement enfermé dans un cadre. | Canevas transparent à l’échelle du bureau, fond personnel séparé, panneaux superposés. |
| La création d’une connaissance exige un `project_id`. | Même une idée spontanée demande une décision de classement. | Capture personnelle immédiate ; rattachement proposé ensuite. |
| Le navigateur lit des relations canoniques. La projection Graphiti enregistre des épisodes avec `generative_extraction: False` ; Mem0 utilise également une projection sans inférence dans ce parcours. | Des moteurs mémoire installés ne produisent pas encore les relations automatiques attendues. | Chaîne explicite d’enrichissement et de rapprochement des informations, avec preuves et correction. |
| Le registre de capacités routables expose actuellement surtout `news.brief` et `research.autonomous`. | L’assistant dispose de capacités réelles, mais ne pilote pas encore tous les objets et vues du produit. | Étendre progressivement les commandes structurées : capturer, retrouver, relier, planifier, déléguer. |
| Le corpus a été importé avec ses liens définis à l’avance. | Il vérifie navigation et persistance, pas la découverte de relations pertinentes. | Ajouter un corpus brut avec résultats attendus conservés séparément. |
| Onboarding/FR-EN consolidé est en D13, voix en D15 après Desktop, routines en D16. | Des fonctions essentielles à la promesse arrivent après plusieurs lots d’interface. | Les introduire par petites tranches plus tôt. |

Preuves de code : [accueil](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/apps/web/src/MyceliumHome.tsx), [navigation de l’application](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/apps/web/src/App.tsx), [scène 3D](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/apps/web/src/Mycelium3D/Scene.tsx), [habillage 3D](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/apps/web/src/Mycelium3D/spatial.css), [création de connaissances](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/services/core/src/nevolium_core/editable_knowledge.py), [projection mémoire](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/services/worker/src/nevolium_worker/memory_projection.py), [capacités](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/services/core/src/nevolium_core/capabilities.py).

L’accueil personnalisable et ses dossiers existent déjà dans le correctif. Le travail restant consiste à simplifier leur usage et à les intégrer au contexte vivant. Les dossiers d’accueil sont des regroupements de raccourcis ; ils ne représentent pas un système complet de dossiers de fichiers. [Modèle de l’accueil](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/apps/web/src/MyceliumHome/model.ts).

Un problème de suivi doit aussi être corrigé : `docs/roadmap.md` et `docs/component-matrix.md` indiquent encore D05 comme dernier runtime attesté, alors que le checkpoint et les preuves récentes documentent le correctif D09. Ce décalage ne signale pas une régression serveur ; il rend les décisions de reprise moins fiables. Le plan doit distinguer systématiquement **prévu, implémenté, déployé et accepté par l’utilisateur**. [Feuille de route actuelle](https://github.com/fredbuhr/nevolium/blob/0aa4908ce0d2deed88ca8060e89a4afe6f9881d9/docs/roadmap.md), [matrice actuelle](https://github.com/fredbuhr/nevolium/blob/0aa4908ce0d2deed88ca8060e89a4afe6f9881d9/docs/component-matrix.md).

## 5. L’expérience cible proposée

### Un seul bureau, trois couches

| Couche | Rôle | Comportement attendu |
| --- | --- | --- |
| Fond choisi | Ambiance personnelle | Couleur unie par défaut ; image personnelle facultative ; luminosité ajustable. |
| Mycelium transparent | Navigation et compréhension du contexte | Occupe le bureau ; aucune bordure de panneau autour du réseau ; nœuds et filaments laissent voir le fond. |
| Outils et contenus | Lire, écrire, planifier, décider | Fiches et panneaux lisibles au-dessus ; ouverture et fermeture préservent la sélection, la caméra et le contexte. |

La transparence du réseau n’impose pas de rendre les textes transparents. Les documents et formulaires doivent garder un contraste stable, quel que soit le fond choisi. Les mouvements derrière une zone de lecture s’atténuent ; les clics et le défilement des panneaux ne déclenchent pas de rotation du réseau.

Le passage à la transparence demandera un test des matériaux lumineux, du mélange des couleurs et des fonds clairs/sombres. Modifier uniquement une propriété CSS ne suffit pas. La scène doit également suspendre son rendu lorsqu’elle est masquée et réduire son activité au repos. Un mode calme et le respect de la préférence système de réduction des animations doivent garder toutes les fonctions disponibles. [Recommandation W3C sur les animations d’interaction](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

### Le premier écran

Une entrée toujours visible : **« Que veux-tu faire avancer ? »**, avec texte, microphone et ajout de fichiers. Elle accepte aussi une recherche directe. Quelques éléments utiles apparaissent autour : travail à reprendre, projet épinglé, résultat prêt, prochaine action. Les réglages techniques, outils spécialisés et choix de moteur restent accessibles à la demande.

Un clic sur un élément ouvre sa fiche et révèle ses connexions directes. Le réseau reste orienté autour d’un point compréhensible. Un retour ramène au contexte précédent ; la recherche retrouve un objet sans nécessiter une exploration spatiale. Une commande comme « montre seulement les sources de cette idée » filtre le même réseau.

Un point de départ à tester serait six à dix éléments principaux, puis une expansion progressive. Ce nombre est une hypothèse de prototype, pas une règle cognitive démontrée. Tous les objets restent accessibles par recherche, liste ou navigation. Les limites de chargement et les filtres actifs sont explicites.

### Personnalisation simple

L’utilisateur doit pouvoir dire **« garde mes enquêtes, mes sources et mes échéances sur mon accueil »**, puis modifier la proposition. Les mêmes opérations restent possibles directement : épingler, déplacer, regrouper et retirer de l’accueil. Retirer un raccourci conserve l’objet.

Les profils crypto, journalisme ou recherche deviennent des points de départ facultatifs. Une personne peut mélanger plusieurs activités. Les éléments épinglés restent stables ; les suggestions nouvelles occupent une zone identifiable sans déplacer silencieusement les repères personnels.

### Les vues suivent la tâche

Une idée s’ouvre dans l’éditeur. Une pièce jointe s’ouvre dans une visionneuse. Un plan de projet peut s’ouvrir en Gantt ou calendrier. Le réseau continue de montrer le contexte et les résultats reliés. La sélection et les sources restent communes à ces vues.

Dockview peut être conservé pour un bureau avancé. Le parcours initial doit fonctionner sans apprendre à organiser des panneaux. La liste et la navigation clavier offrent un accès complet, notamment sur téléphone ou en cas d’indisponibilité WebGL. La 3D reste utilisable par choix et adaptée au contexte, sans imposer une manipulation de caméra pour toute action.

Le français/anglais doit couvrir commandes, formulaires, erreurs, aides et états. La langue d’interface est distincte de la langue des documents : un document anglais conserve sa langue dans une interface française, sauf demande de traduction.

## 6. Organiser et relier automatiquement

### Tous les éléments trouvent une place

| Élément utilisateur | Appui actuel ou évolution proposée | Relations utiles |
| --- | --- | --- |
| Idée, note, décision | Documents éditables et versions existants | Source, citation, idée développée, décision issue d’une discussion. |
| Fichier et document importé | Asset pour le fichier ; Document pour son contenu exploitable | Pièce jointe, provenance, version, résultat d’une tâche. |
| Dossier | Dossier source conservé comme provenance ; regroupement d’accueil déjà disponible ; collections transversales à préciser | Contenu du dossier, projet associé, vue personnelle. Le rangement physique et les liens de connaissance restent distincts. |
| Diagramme | Fichiers SVG/Mermaid et liens aux documents déjà utilisables ; édition plus riche à qualifier | Document expliqué, étapes représentées, sources. Les liens dessinés dans un SVG ne deviennent pas automatiquement des relations métier. |
| Projet | Project existant | Objectif, documents, tâches, livrables, projets liés. |
| Tâche et jalon | Task, hiérarchie et dépendances existantes | Parent, prédécesseur, blocage, résultat ; contraintes temporelles explicites. |
| Conversation | Conversation, messages et commandes existants | Sujet, sources consultées, décisions, demandes et exécutions. |
| Mission et agent | Réutiliser tâches, capacités et workflows ; ajouter la configuration durable nécessaire aux missions récurrentes | Objectif, ressources autorisées, déclencheur, exécutions et résultats. |
| Personne et concept | Mentions/extractions avec provenance ; objets dédiés seulement lorsque le produit en a besoin, notamment D11 pour les personnes | Mentionne, concerne, auteur, participant ; résolution des homonymes. |
| Résultat, approbation, événement | Artifacts, workflows et approbations existants ; événements externes via D11 | Produit par, approuve, déclenche, modifie. |

Le navigateur actuel couvre neuf types métier et cinq familles de liens : appartenance, relation explicite, provenance, planification et exécution. Les types visuels d’accueil complètent cette projection. Ce socle est à étendre avec des usages précis. [Navigateur canonique](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/services/core/src/nevolium_core/mycelium.py).

### Trois niveaux de relations

| Nature | Traitement proposé | Contrôle utilisateur |
| --- | --- | --- |
| **Lien structurel certain** | Création déterministe lors d’une action : fichier attaché, tâche du projet, source citée, résultat produit. | Afficher l’origine de l’action et permettre la modification métier appropriée. |
| **Relation extraite d’une source** | Extraire une relation typée avec passage justificatif, référence de version et date. L’identifier comme issue d’une extraction. | Correction ou refus en un geste ; priorité aux liens explicitement créés/corrigés par l’utilisateur. |
| **Rapprochement probable** | Proximité de sens, sujet commun ou contradiction possible ; apparition sélective comme suggestion. | Masquer, confirmer ou expliquer ; mémoriser le refus pour éviter les sollicitations répétées. |

Une politique choisie une fois peut autoriser l’enrichissement automatique et réversible dans un espace. L’utilisateur ne doit pas approuver chaque liaison de faible impact. Les modifications structurantes — fusion d’objets, nouvelle dépendance bloquante, réorganisation importante — demandent un aperçu des conséquences.

Une relation automatique doit pouvoir répondre à **« Pourquoi ces éléments sont-ils reliés ? »** avec la source et le sens du lien. Un score de similarité ou une confiance déclarée par le modèle ne constitue pas une preuve. Deux sources en désaccord doivent conserver leur contexte et leur date ; l’IA ne doit pas les fusionner en une certitude nouvelle.

### Chaîne minimale proposée

1. Enregistrer la capture immédiatement dans un espace personnel contrôlé par Core, sans demander un choix de projet. Réutiliser le modèle existant pour ce rangement initial.
2. Extraire le texte et les métadonnées utiles, puis rechercher doublons et références déjà connues dans le périmètre autorisé.
3. Rechercher un petit ensemble de candidats ; proposer ou établir les relations selon leur nature et la politique de l’espace.
4. Conserver source, version, origine et historique de correction ; rendre l’enrichissement visible dans Mycelium.
5. Actualiser seulement les éléments touchés lors d’un changement. Retirer ou marquer périmée une suggestion dont la source a changé.

Graphiti propose précisément des mécanismes de contexte temporel, de provenance et de construction incrémentale. Il peut contribuer à cette chaîne, mais la capacité de sa bibliothèque ne prouve pas que l’intégration Nevolium l’utilise. L’adaptateur verrouillé du projet, les coûts et la qualité d’extraction doivent être qualifiés avant activation. Les relations qui pilotent le produit restent sous le contrôle canonique de Core. [Graphiti, documentation du projet](https://github.com/getzep/graphiti).

## 7. Faire agir le « Jarvis »

### Une mission se formule par son résultat

Exemple cible : **« Chaque matin à 8 h, prépare une veille sur ce sujet, relie les nouveautés à mon projet et signale seulement ce qui change mes conclusions. »**

Nevolium prépare une fiche concise : objectif, sources autorisées, fréquence et fuseau, résultat attendu, limite de coût, prochaine exécution. L’utilisateur ajuste ce qui compte. Les choix techniques de modèle, outils et stratégie restent dans les détails avancés.

La mission devient un élément du réseau relié à ses sources et résultats. Ses états sont compréhensibles : prévue, en cours, attend une décision, terminée, interrompue. Pause, reprise et historique restent accessibles. Une récurrence signifie un déclenchement horaire ou événementiel ; elle n’exige pas une boucle de modèle permanente.

Les préparations et écritures internes réversibles suivent le périmètre déjà autorisé. Une action engageant l’utilisateur à l’extérieur présente son contenu et sa destination au moment utile. L’interface distingue l’arrêt d’une exécution et l’annulation de ses effets : un effet externe déjà réalisé n’est pas toujours réversible. Ces comportements s’appuient sur les politiques et reçus existants, avec des confirmations regroupées plutôt qu’une question à chaque outil.

### La voix arrive tôt

Le premier périmètre recommandé est un bouton pour parler dans le Web : transcription visible, correction possible, même interprétation et mêmes commandes que le texte. La capture vocale d’une idée peut être immédiate ; une commande engageante suit la même validation qu’au clavier. La voix doit aussi ouvrir une source, retrouver un projet, expliquer un lien et interrompre une mission.

Il n’existe pas de nécessité technique générale d’attendre Tauri pour ce premier usage : les navigateurs disposent d’un accès au microphone sous permission et contexte sécurisé. LiveKit documente le contrôle manuel des tours de parole, utilisable pour le push-to-talk. Le mot d’activation, l’écoute permanente et les contrôles système restent des extensions ultérieures. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [LiveKit](https://docs.livekit.io/agents/logic/turns/).

Les essais doivent mesurer la compréhension FR/EN, les noms propres, la latence et les faux déclenchements. « J’ai entendu » et « j’ai exécuté » sont deux états différents. Une transcription répétée ou une reconnexion ne doit pas doubler une action.

### Le Gantt devient une réponse utile

Exemple cible : **« Transforme ces notes en un plan réalisable avant vendredi ; j’ai deux heures par jour. »** Nevolium identifie les livrables, propose les tâches, expose les durées supposées et les dépendances, puis calcule les dates avec les règles de planning. Une échéance irréalisable doit être signalée.

Le modèle aide à interpréter et proposer ; le calcul des contraintes demeure déterministe. Le Gantt montre la proposition et ses modifications. Le calendrier présente son inscription dans le temps disponible, enrichie ensuite par les connecteurs D11. Toute suggestion de plan reste reliée à ses sources et à l’objectif.

## 8. KISS côté backend et frontend

### Réutiliser les responsabilités existantes

| Responsabilité | Support à privilégier | Extension bornée |
| --- | --- | --- |
| Identités, données, droits, liens ayant un effet métier | Core et PostgreSQL | Métadonnées de provenance/correction validées ; espace de capture personnel ; mutations idempotentes. |
| Fichiers, fonds personnels, résultats | SeaweedFS et Assets | Références d’assets autorisées dans les préférences ; mêmes règles d’accès que les fichiers. |
| Rapprochement sémantique et mémoire | Index existants, Graphiti/Neo4j, Mem0 selon leurs rôles | Extraction ciblée, résolution d’entités, filtrage par propriétaire, invalidation à la version. |
| Missions et récurrences | Temporal et Worker partagé | Déclencheurs persistants, budget, pause, reprise et prévention des doublons. |
| Coordination | Événements/outbox existants | Événement après validation d’une version ; traitement incrémental avec reprise. |
| Interaction | Même API de commandes pour texte, voix et gestes | Contexte sélectionné explicite ; quelques opérations stables plutôt qu’un langage général nouveau. |
| Affichage | R3F/Three, composants document/planning et préférences existants | Scène commune transparente ; panneaux contextualisés ; niveau de détail adapté. |

Il faut maîtriser l’extension du backend : aucun nouveau magasin de graphe ni ordonnanceur n’est justifié par ce bilan. Les nombreuses briques optionnelles de l’architecture peuvent rester hors du runtime jusqu’à un usage qualifié. Le corpus global ne doit pas être relu par un modèle à chaque interaction : traiter les changements, limiter les candidats, dédupliquer et respecter les budgets existants.

La table des relations possède déjà des métadonnées. On peut d’abord y formaliser les informations simples de provenance sous un contrat validé ; les champs nécessaires aux contraintes ou requêtes fréquentes mériteront des colonnes explicites. La projection dérivée ne devient pas un second référentiel indépendant. [Modèles canoniques](https://github.com/fredbuhr/nevolium/blob/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8/services/core/src/nevolium_core/models.py).

Le KISS frontend consiste à réduire les choix nécessaires au prochain geste : une entrée, une sélection, un panneau de travail principal, des détails à la demande. Le KISS backend consiste à garder une responsabilité claire par mécanisme, des objets réutilisés et des opérations explicites. La réduction du nombre de services ne doit pas casser les garanties de données déjà qualifiées.

## 9. Proposition de révision du plan

Le plan actuel est solide sur les fondations et ordonné principalement par composants. Je recommande de conserver les identifiants D01–D22 pour la traçabilité, puis de réviser les contenus et dépendances ci-dessous. Chaque tranche doit livrer un parcours complet et limité. D10 ne doit pas devenir un lot géant rassemblant toutes les promesses du produit. [Plan actuellement canonique](https://github.com/fredbuhr/nevolium/blob/0aa4908ce0d2deed88ca8060e89a4afe6f9881d9/docs/implementation-plan.md).

| Séquence proposée | Contenu | Critère de sortie proposé |
| --- | --- | --- |
| **Complément D09 : bureau simple** | Mycelium transparent en fond, choix du fond personnel, navigation commune, personnalisation directe, vocabulaire et FR/EN cohérents, interactions mobiles/clavier. | Une personne retrouve un fichier, comprend ses liens et personnalise l’accueil sans assistance ni perte de contexte. |
| **D10, première tranche : capturer et relier** | Capture sans classement préalable, premières commandes communes, enrichissement automatique borné, justification et correction des liens. | Déposer des sources nouvelles fait apparaître des connexions utiles ; un lien erroné se corrige et reste corrigé. |
| **D10, tranche suivante : comprendre et planifier** | Assistant sur le contexte, plan de tâches et dépendances, aperçu des conséquences, application contrôlée ; voix Web sur ces mêmes commandes. | Une demande textuelle ou vocale produit le même plan consultable et modifiable ; erreur/retry sans doublon. |
| **D10, tranche suivante : première mission récurrente** | Une mission interne utile, déclenchement horaire, pause, budget, historique et petite boîte d’attention. | Le résultat apparaît au bon endroit même après fermeture du navigateur ; reprise serveur sans effet répété. |
| **D11 : un connecteur complet** | Choisir le fournisseur réellement utilisé, ingestion incrémentale et traitement d’un événement ; brouillon ou agenda relié au contexte. | Un parcours réel couvre connexion, données nouvelles, résultat, révocation et reprise. Second fournisseur après validation du contrat. |
| **D12–D13 : continuité et pilote quotidien** | Consolider reprise multi-appareil, cache/hors ligne borné, isolation à deux comptes, coûts, export et restauration. L’onboarding et l’accessibilité commencent dès D09/D10. | Plusieurs jours d’usage indépendant sur ordinateur et mobile ; pas de formation longue. La collaboration avancée peut être une tranche séparée du premier pilote. |
| **D14–D16 : présence et autonomie étendues** | Desktop et accès locaux, voix conversationnelle enrichie, déclencheurs complexes et navigateur contrôlé. Les routines serveur simples ont déjà été livrées. | Valeur supplémentaire démontrée par rapport au Web ; limites d’autorisation et reprise vérifiées. |
| **D17–D22 : extensions et distribution** | Agent de développement, domaines spécialisés et commercialisation selon usage démontré. | Chaque extension répond à un besoin observé ; le produit central est utilisable avant leur achèvement. |

Cette révision avance une partie de D12, D13, D15 et D16 tout en gardant leur profondeur ultérieure. Le premier pilote quotidien devrait dépendre de l’ensemble des fonctions effectivement exposées, avec une continuité minimale fiable ; il ne devrait pas attendre toutes les fonctions de collaboration avancée.

Les livrables de cadrage à mettre à jour ensemble sont le contrat d’expérience Mycelium, `implementation-plan.md`, `roadmap.md`, `component-matrix.md` et `PROJECT_STATE.md`. Ils doivent refléter la distinction entre la release déployée et la prochaine orientation proposée. La nouvelle règle visuelle — Mycelium comme fond transparent — doit devenir un critère d’acceptation explicite.

## 10. Vérifier la valeur avec des exemples exploitables

### Utiliser le corpus existant pour ce qu’il prouve

Les projets crypto, journalisme et recherche, leurs fichiers Markdown/CSV/SVG/Mermaid, leurs connaissances et leurs dépendances sont une bonne base de navigation. Le projet vide, le brouillon et l’élément isolé sont utiles : un objet peut légitimement ne pas avoir encore de relation. Le système ne doit pas inventer un lien pour embellir la scène.

Pour mesurer l’intelligence automatique, préparer séparément un jeu de fichiers bruts, sans liens injectés. Conserver les relations attendues hors du contexte donné au modèle. Compléter avec : versions contradictoires, doublons, homonymes, sources FR/EN sur le même sujet, document sans rapport, lien devenu périmé et données appartenant à un autre compte.

| Parcours | Entrée | Résultat vérifiable |
| --- | --- | --- |
| Capturer une idée | Une phrase tapée ou dictée, sans projet sélectionné | Idée persistée, retrouvable, rattachement pertinent proposé sans formulaire préalable. |
| Importer et comprendre | Dossier de sources, PDF/notes, CSV et diagramme | Fichiers conservés, provenance lisible, connexions expliquées, diagramme accessible. |
| Retrouver transversalement | Question exprimée avec d’autres mots que le titre | Bon élément retrouvé avec sa source et son contexte, sans connaître le rangement. |
| Préparer un projet | Notes, échéance et disponibilité | Tâches et dépendances justifiées, dates cohérentes, Gantt et réseau portant les mêmes objets. |
| Déléguer une veille | Sujet, sources et cadence | Une mission, exécutions traçables, nouveautés reliées, résultats non dupliqués. |
| Corriger le système | Relation volontairement fausse, source remplacée | Correction simple, effet visible, absence de réapparition injustifiée. |
| Personnaliser l’accueil | Épingler une source, déplacer un projet, choisir un fond | Préférences restaurées après rechargement ; objets métier conservés. |
| Changer d’appareil | Travail commencé sur ordinateur, repris sur téléphone | Sélection ou contexte récupérable, commandes tactiles lisibles, information cohérente. |

### Critères à mesurer

Les valeurs suivantes sont des objectifs initiaux proposés, pas des résultats acquis :

- **Premier résultat utile en moins de trois minutes**, sans explication orale du concepteur, sur un parcours de capture puis récupération.
- **Au moins 80 % de réussite autonome** des parcours principaux dans une première étude formative de six à huit personnes. Ce petit échantillon sert à trouver les obstacles, pas à estimer l’adoption du marché.
- **Précision cible d’au moins 90 %** pour les liens sémantiques appliqués automatiquement sur un jeu annoté indépendant ; mesurer aussi les liens utiles manqués, le taux d’abstention et le temps de correction. Séparer relations structurelles et inférences.
- **Aucun effet métier dupliqué** dans les scénarios de retry/reconnexion ; aucune exposition entre comptes ; aucune modification de planning produite par un simple déplacement visuel.
- **Réactivité mesurée** sur ordinateur à GPU intégré et téléphone de référence ; pour l’interaction graphique, viser au moins 30 images/s durant le parcours testé, puis documenter les compromis d’énergie et de lisibilité. Vérifier 100 puis 1 000 objets stockés avec un voisinage visible borné.
- **Valeur quotidienne observée pendant une semaine** : temps gagné sur les tâches, nombre de classements manuels évités, corrections nécessaires et utilité des résultats d’agents.

Comparer les mêmes tâches avec navigation Mycelium, recherche et liste permet de savoir quand la 3D aide. Mesurer également le temps de lecture, les erreurs de sélection et le confort avec plusieurs fonds. Une préférence esthétique et une performance d’usage sont deux mesures complémentaires.

## 11. Première livraison recommandée

Après validation de l’orientation, réaliser une tranche limitée sur le corpus existant :

**Accueil transparent → sélection d’une source → ouverture de la fiche → lecture des relations → retour au même contexte**, avec personnalisation du fond et un chemin clavier/tactile équivalent.

Cette tranche éprouve immédiatement la nouvelle structure du bureau. Elle est suivie du parcours **capture brute → rapprochement utile → explication/correction**, qui vérifie la promesse d’organisation automatique. L’assistant, la planification et les missions s’appuient ensuite sur ces mêmes objets et commandes.

Le critère directeur de chaque décision devient : **combien de choix, de manipulations ou de répétitions cette fonction épargne-t-elle à l’utilisateur pour obtenir un résultat fiable ?**
