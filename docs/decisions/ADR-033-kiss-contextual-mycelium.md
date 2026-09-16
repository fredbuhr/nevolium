# ADR-033 — Mycelium comme bureau et parcours KISS

Date : 2026-09-16. Statut : **accepté par l'utilisateur** après le bilan comparatif,
avec instruction de commencer et de rendre la reprise indépendante de la conversation.

## Contexte

D09 est déployé avec un corpus réel, mais son acceptation produit reste ouverte : navigation
complexe, classement préalable des idées, langues inégales et réseau dans un cadre opaque.
Le [bilan sourcé](../archive/nevolium-kiss-bilan-2026-09-16.md) distingue les preuves techniques
de la facilité d'usage et des capacités IA encore absentes. Son statut de proposition est historique ;
les décisions ci-dessous ont depuis été acceptées. Le checkpoint décrit leur implémentation réelle.

## Décisions

1. **Promesse :** capturer, comprendre/relier, préparer/agir, retrouver un résultat dans un même contexte.
   L'utilisateur peut commencer par une phrase, une parole ou un fichier sans construire son système.
2. **Mycelium est le fond interactif du bureau.** Une couche transparente porte le réseau, au-dessus
   d'une couleur ou image choisie ; les contenus lisibles s'ouvrent au-dessus. Conserver contexte,
   sélection et orientation au retour. Les gestes sur les panneaux ne déplacent pas le réseau.
3. **Afficher progressivement.** Voisinage borné, recherche/liste/clavier/tactile équivalents,
   repères épinglés stables et personnalisation directe. Dossiers et profils restent facultatifs.
   L'ambiance animée s'atténue pendant le travail ; réduction du mouvement et WebGL indisponible
   doivent préserver les fonctions. Aucun chargement de tout le compte dans une scène.
4. **Relations automatiques explicables en D10.** Séparer structure certaine, extraction sourcée
   et rapprochement probable. L'enrichissement réversible suit la portée autorisée de l'espace,
   avec correction/refus durable ; une similarité ne crée pas une dépendance de planning.
   PostgreSQL/Core restent canoniques ; Graphiti/Mem0 restent des projections avec provenance.
5. **Agents présentés comme missions.** Objectif, périmètre, résultat, fréquence, budget,
   pause et historique ; même API de commandes pour texte, voix et gestes. Réutiliser Temporal,
   Workers et policy. Les conséquences externes suivent les autorisations et confirmations utiles.
6. **Réordonner sans renuméroter les lots.** D09 simplifie le bureau ; D10 livre progressivement
   capture/liens, assistant/planning, voix Web puis première mission récurrente et attention minimale.
   D11 raccorde un fournisseur complet. D12–D13 consolident continuité et pilote quotidien.
   D14–D16 gardent accès locaux, voix enrichie et automatisations complexes. FR/EN, onboarding
   et accessibilité s'appliquent dès chaque parcours, puis D13 consolide l'ensemble.
7. **KISS technique.** Réemployer modèles, Assets, WorkspaceLayout, moteurs et contrats existants.
   Aucun nouveau magasin de graphe, moteur de workflow ou service par utilisateur pour cette décision.

## Validation et limites

D09 : parcours accueil → source → fiche/liens → outil → retour, fond personnel conservé,
contraste, trois formats d'écran et interactions sans débordement ; tests de persistance et de session.
D10 : données brutes dont les liens attendus sont gardés hors du contexte du modèle ; provenance,
correction, contradictions, permissions et coût mesurés. Le corpus importé avec ses liens prédéfinis
ne prouve pas l'inférence. Le bilan propose des objectifs d'usage, pas des résultats atteints.

Cette décision ne démarre pas automatiquement D10. `PROJECT_STATE.md` nomme le seul gate actif.
Un succès CI ou un moteur configuré ne vaut ni déploiement ni acceptation utilisateur.
