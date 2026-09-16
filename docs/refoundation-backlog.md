# Nevolium — backlog d'acceptation de la refondation

Adopté le 2026-09-16 par [ADR-034](decisions/ADR-034-human-first-refoundation.md).
Source : les 24 identifiants du `03_Backlog_acceptation.yaml` du dossier accepté.
Les critères ci-dessous en conservent le périmètre ; cette présentation ne crée aucun nouveau lot.
Le [contrat](refoundation-contract.md) fixe les exigences communes. **Ce backlog est un référentiel
planifié, pas un état de livraison** : preuves et travail courant dans [PROJECT_STATE](../PROJECT_STATE.md)
et [status](status.md). Une dépendance indique l'ordre de qualification, pas une branche parallèle.

## Adoption et D09

### DOC-01 — Adopter les amendements sans écraser le dépôt

Prérequis : aucun. Lot : transversal rattaché au D09 ouvert. Priorité : P0.
PR documentaire après décision utilisateur et lecture du live. Distinguer décisions et réalisation,
conserver D01–D22 et un seul checkpoint. Aucun code applicatif, import ou déploiement dans cette PR.

### D09-REC-01 — Constater la version et recevoir le correctif KISS

Prérequis : DOC-01. Priorité : P0.
Utiliser la procédure existante ; consigner main, image Web et runtime. Qualifier OIDC, retour au
contexte et absence de régression sur les API réelles. Ne pas réimporter le corpus ni nettoyer les
données ou réservations pour simplifier les compteurs. Une préparation d'image n'est pas une activation.

### D09-UX-01 — Bureau compact et continuité de navigation

Prérequis : D09-REC-01. Priorité : P1.
Réemployer renderer et Dockview. Fiche/source/liens/outil/retour conservent sélection, lecture,
caméra et brouillon. Vérifier contraste, longs libellés FR/EN, ordinateur/téléphone, fond privé
supprimable, mode calme et repli 2D sans perte de fonction. La suppression du fond respecte ses autres usages.

### D09-UX-02 — Création et liaison depuis les vues de travail

Prérequis : D09-REC-01. Priorité : P0.
Créer une Task canonique depuis Gantt et calendrier. Créer ou rattacher un élément et un lien
depuis mindmap ; préserver droits et contraintes. Tester le Kanban réel, le clavier et le tactile.
Échec serveur visible et rechargement cohérent ; aucune mutation autonome du widget SVAR.
Un besoin de nouveau modèle serveur exige un rattachement au lot responsable, pas une dérive de D09.

### D09-UX-03 — Unifier les accès et compléter FR/EN

Prérequis : D09-UX-01. Priorité : P1.
Entrée commune avec intentions distinctes, essentiels toujours accessibles. Recherche locale sans
transmission IA par défaut. Libellés, erreurs et exemples FR/EN ; clic droit, bouton, clavier et
tactile aboutissent à la même commande.

### D09-DEMO-01 — Compléter les exemples par manques observés

Prérequis : D09-REC-01. Priorité : P1.
Relire le manifeste déjà importé. Exemples fictifs identifiables et effaçables sans données réelles.
Import répété/repris sans doublon ni appel IA induit. Couvrir sources contradictoires, inter-projets,
planification et relations lisibles. Ne pas confondre démonstration préreliée et évaluation IA.

## Données et D10

### DATA-01 — Cartographier les flux déjà actifs et futurs

Prérequis : DOC-01. Lot : transversal. Priorité : P0.
Commencer la qualification dès adoption et avant de nouveaux flux personnels réels. Inventorier
modèles, dérivés, fournisseurs, pays, durées et rôles, y compris recherche/IA actives. Inconnues
explicitement ouvertes. Documenter la nécessité d'AIPD, désigner son responsable et la réaliser si
requise. Contrats et registres privés hors GitHub. La trame ne clôt pas ce contrôle.

### D10-CMD-01 — Catalogue de commandes commun

Prérequis : D09-UX-02, DATA-01. Priorité : P0.
Réemployer Core, sans nouveau moteur. Paramètres, ressource, acteur, version et effet validés.
Rejet sans mutation, rejeu sans duplication, conflit visible ; manuel sans LLM et sans autorité
spéciale aux agents.

### D10-DATA-01 — Contrôler les sorties vers les modèles et outils

Prérequis : DATA-01, D10-CMD-01. Priorité : P0.
Séparer consultation, traitement externe et transmission côté serveur. Fournisseur interdit refusé,
y compris repli, embeddings et transcription. Un document partagé mais interdit à l'IA reste bloqué.
Révocation après attente appliquée avant l'effet. Faux succès et fuite bloquent la qualification.

### D10-CAP-01 — Capture sans choix de projet

Prérequis : D10-CMD-01, D10-DATA-01. Priorité : P0.
Qualifier le contenant privé respectant `project_id`. Saisie sans choix de projet, séparation des
comptes, rattachement préservant identité/versions/liens et rejeu sans double Document.

### D10-DATA-02 — Cycle de vie et effacement des flux du lot

Prérequis : DATA-01, D10-CMD-01. Priorité : P0.
Dérivés repérables par source/version, purge reprenable via les primitives existantes. Traiter
RESTRICT et extraits ; distinguer corbeille/effacement. Export testé, limites fournisseur et
sauvegardes expliquées, couverture par magasin annoncée sans exagération.

### D10-LINK-01 — Relations explicables et corrigibles

Prérequis : D10-CAP-01, D10-DATA-02. Priorité : P1.
Structure certaine, extraction sourcée et hypothèse distinctes. Origine/version/statut/portée
consultables, refus durable, pas de réintroduction silencieuse ni de modification de planning ou
de permissions par similarité. Pas de pourcentage de vérité non calibré présenté comme preuve.

### D10-EVAL-01 — Corpus brut d'évaluation indépendant

Prérequis : D10-LINK-01. Priorité : P0.
Attentes hors contexte du modèle ; mesurer faux liens, liens manqués, contradictions et coût.
Source malveillante sans changement de droits ; pas de fuite par titre, extrait, compteur ou cache.
Les liens de la démonstration ne servent pas de preuve d'inférence.

### D10-AST-01 — Assistant avec sources et plan inspectable

Prérequis : D10-EVAL-01. Priorité : P1.
Demande sur sélection autorisée, réponse reliée aux versions et limites. Rejet sans mutation,
approbation une seule fois par commandes canoniques ; modification concurrente invalide l'aperçu
ou impose une revalidation explicite.

### D10-VOICE-01 — Voix volontaire en français et anglais

Prérequis : D10-AST-01. Priorité : P1.
Push-to-talk, sans écoute permanente ni enregistrement de réunion. Micro inactif hors capture,
indicateur/arrêt clairs, transcription modifiable ; ambiguïté résolue avant effet sensible.
Mêmes droits/commandes que le texte, fournisseur et conservation audio explicités.

### D10-MIS-01 — Première mission récurrente interne

Prérequis : D10-AST-01, D10-DATA-02. Priorité : P0.
Synthèse des nouvelles sources d'un projet, résultat interne. Objectif/sources/fréquence/modèle/
plafond/résultat visibles. Continuité après fermeture du navigateur et redémarrage ; pause,
révocation, incident et rejeu sans double effet. Budget indisponible bloque sans dépense cachée.
Historique et résultat retrouvables ; la voix n'est pas un prérequis de la mission.

## Connecteurs et pilote quotidien

### D11-CON-01 — Un fournisseur connecté complet

Prérequis : D10-MIS-01. Priorité : P0.
Choix par usage réel ; OAuth limité, lecture/préparation avant effets. Scopes, finalité, contrat,
régions et rétention documentés. Pagination, suppressions, déduplication, versions et fuseaux testés.
Révocation effective sur cache, mission et nouvel accès ; pas d'usage hors périmètre.

### D11-CON-02 — Qualifier un premier effet externe si retenu

Prérequis : D11-CON-01. Priorité : P1. Activation : scénario nécessaire et autorisation séparée.
Contenu/destinataire/compte/pièce jointe liés à l'approbation. Réponse perdue sans second envoi
aveugle ; résultat incertain rapproché. Annuler ne prétend pas effacer un message reçu.
Ce travail n'est pas une dépendance obligatoire de la première mission interne.

### D12-CONT-01 — Continuité limitée entre appareils

Prérequis : D11-CON-01. Priorité : P1.
Données préparées et conflits visibles, sans seconde autorité. Lecture hors réseau et brouillon
local distingués ; stockage plein, révocation, changement de compte traités. Ni effet externe ni
approbation définitive hors serveur.

### D13-DATA-01 — Qualifier export, effacement et restauration du pilote

Prérequis : D10-DATA-02, D11-CON-01, D12-CONT-01. Priorité : P0.
Export documenté avec pièces et relations ; effacement dans bases/objets/dérivés/caches/traces
concernés. Restauration fermée puis réapplication des effacements. Exceptions justifiées hors
contexte IA courant ; aucune promesse au-delà des flux testés.

### D13-USE-01 — Essai quotidien et comparaison des modes

Prérequis : D13-DATA-01, D09-UX-03, D10-MIS-01. Priorité : P0.
Quelques adultes, mêmes tâches 3D/2D/liste, résultats non préjugés. Note/source/tâche/rappel/mission
retrouvés sans aide constante. Mesurer temps, hésitations, erreurs et compréhension coût/données.
Deux comptes au moins, ordinateur et smartphones réels. Corriger les régressions ; ne pas présenter
cette petite étude comme une validation de marché.

### D13-COST-01 — Mesurer l'exploitation et recalibrer l'effort

Prérequis : D10-MIS-01, D11-CON-01. Priorité : P1.
Distinguer serveur, sauvegardes, API, stockage et administration. Rapprocher factures et usages,
préserver les réservations incertaines. Mesurer concurrence IA et ingestion séparément des comptes.
Recalibrer l'effort après deux tranches observées, sans promesse de date ou de capacité.

## Applicabilité et extensions

### DIST-01 — Qualifier l'offre et les obligations déclenchées

Prérequis : DATA-01. Lot : D22 / transversal. Priorité : P0.
Activation : dès qu'un régime s'applique ; ce contrôle n'attend pas D22 ni la clôture administrative
de DATA-01 pour une obligation déjà déclenchée. Qualifier rôle/offre/public, RGPD, AI Act, CRA,
Data Act, consommation et États-Unis. Revérifier le calendrier légal ; responsable joignable,
signalement de sécurité, licences exactes, support et contrats. Un pack n'active pas un usage sensible.

### EXT-01 — Extensions par demande et qualification propres

Prérequis : D13-USE-01, DIST-01. Lots : D14–D20. Priorité : P2.
Voix avancée, navigateur/code, métiers, finance et maison restent distincts du pilote.
Usage et résultat observés avant moteur ; droits/sandbox/coûts/conservation/régime sectoriel revus.
Mettre à jour le lot responsable sans gonfler D10.
