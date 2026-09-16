# Mémoire de projet Nevolium

Mémoire durable pour toute nouvelle discussion. Les décisions ci-dessous sont stables ; l'état
d'exécution se lit dans [PROJECT_STATE](../PROJECT_STATE.md), puis dans GitHub live.

## Vision utilisateur acceptée

- Nevolium facilite la pensée, la créativité et l'action : cerveau personnel relié, connaissances,
  projets, Gantt, agents à la demande ou récurrents, puis commande vocale des mêmes fonctions.
- **KISS backend et frontend.** Capturer sans devoir choisir des catégories ; organiser et relier
  automatiquement avec sources, explication et correction. Les agents travaillent sur des objectifs
  et rendent des résultats réutilisables. L'utilisateur garde la maîtrise des effets importants.
- Mycelium commence dès l'accueil et sert à naviguer entre tous les éléments. Réseau 3D organique,
  bioluminescent, sur une couche transparente couvrant le bureau. Fond personnel facultatif dessous,
  panneaux lisibles au-dessus ; liste/clavier/tactile et mode calme pleinement fonctionnels.
- Accueil personnalisable simplement, sans menu imposé identique pour crypto, journalisme,
  recherche ou autre activité. Épingles stables ; dossiers/profils facultatifs ; pas de déplacement
  silencieux des repères par l'IA. Les objets et relations restent communs à toutes les vues.
- FR/EN cohérents dans chaque parcours. La langue des sources n'est pas celle de l'interface.
- Bilan du 16 septembre accepté, démarrage explicitement autorisé. Voir
  [ADR-033](decisions/ADR-033-kiss-contextual-mycelium.md) et [plan](implementation-plan.md).

## Précisions de la refondation acceptées le 16 septembre

Après le PDF « Design Interface » et le dossier de refondation, l'utilisateur demande de commencer
la nouvelle direction. [ADR-034](decisions/ADR-034-human-first-refoundation.md) et le
[contrat](refoundation-contract.md) rendent ces précisions indépendantes des conversations.

- **Espace de pensée et d'action**, pas obligation de convertir toute pensée en tâche. Le produit
  doit soulager l'organisation sans prendre l'intention ou le jugement à la place de la personne.
- Les fonctions manuelles sont utilisables dans mindmap/Kanban/Gantt/calendrier, sans LLM. Les
  gestes et agents passent par les mêmes opérations canoniques ; une vue n'est pas une base séparée.
- Recherche et création, Projets et activité, Vie personnelle : trois contextes facultatifs d'un
  même produit. Les métiers restent extensibles sans lancer vingt produits ou accorder des droits.
- Chercher, Demander, Ajouter sont des intentions distinctes même dans une entrée commune. La
  recherche locale ne transmet pas silencieusement les données à un modèle ou à un moteur Web.
- Une mission possède objectif, périmètre, résultat, fréquence/durée, budget et arrêt. Première
  récurrence à résultat interne ; ni effets externes ni écoute permanente impliqués par ce choix.
- Consultation, traitement par un fournisseur et transmission à un tiers sont trois axes distincts.
  Sources, versions, index, mémoire, audio, traces, caches et sauvegardes entrent dans le cycle de vie.
  [Gouvernance](data-governance.md) : inventaire des flux déjà actifs, inconnues et preuves à compléter.
- D09 reçoit KISS puis corrige les gestes/continuité sur les API existantes. D10 attend la sortie
  D09 ; commandes et contrôles des données précèdent l'extension des flux personnels. Garder D01–D22.
- Le pilote vise quelques adultes, au moins deux comptes isolés ; comparer 3D/2D/liste sans préjuger
  du résultat. Les [24 critères](refoundation-backlog.md) sont planifiés, pas vingt-quatre gates actifs.
- Adoption du plan ≠ fonctions livrées ≠ conformité attestée ≠ nouvelle autorisation de déploiement.
  Les obligations effectivement déclenchées ne sont pas repoussées à un lot commercial futur.

## Fondations et preuves à préserver

- Core/PostgreSQL sont le métier canonique, SeaweedFS conserve les fichiers, Temporal les exécutions.
  Graphiti/Mem0 sont dérivés ; leur présence ne prouve pas l'organisation sémantique automatique.
- API IA en premier ; modèle local différé selon ADR-031. Budgets, provenance, versions,
  autorisations et reprise restent obligatoires dans les parcours exposés.
- Le pilote est chez Netcup, opéré par l'utilisateur en SSH. Aucun accès SSH direct de l'agent
  n'est établi. Les commandes serveur doivent être bornées, adaptées au live et accompagnées
  de leurs critères de réussite. Une fusion GitHub n'active pas une release serveur.
- Le corpus `mycelium-example-v1` est déjà importé et relu. Ne pas le réimporter aveuglément.
  Ses liens ont été préparés ; il prouve navigation/persistance, pas inférence IA.
- Le détail des images, sauvegardes, compteurs et points de retour est dans le checkpoint et
  [la preuve pilote](d09-home-pilot-update.md). Préserver les données post-migration.

## Reprise fiable

1. Lire `AGENTS.md`, le checkpoint live et cette mémoire ; comparer branche, PR et checks GitHub.
2. Si le checkpoint main est antérieur à une PR ouverte, lire celui de cette PR et résoudre
   l'écart avant de créer une branche. Les archives sont des preuves historiques.
3. Continuer le gate et la prochaine action réellement enregistrés ; ne pas rouvrir un travail
   déjà livré, ne pas annoncer une fonction prévue comme implémentée.
4. Publier un checkpoint à chaque résultat significatif, avec limites et prochaine action.

Cette mémoire versionnée est utilisable même si la mémoire conversationnelle n'est pas disponible.
Elle ne contient ni secrets ni jetons. Aucun SHA futur n'est à déduire de son texte.
