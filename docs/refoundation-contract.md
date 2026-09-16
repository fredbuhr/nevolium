# Nevolium — contrat de refondation accepté

Révision : 2026-09-16. Adopté par [ADR-034](decisions/ADR-034-human-first-refoundation.md),
en complément d'[ADR-033](decisions/ADR-033-kiss-contextual-mycelium.md).

Ce document applique les amendements du dossier accepté aux documents ci-dessous. Il porte
les précisions transversales communes pour éviter de copier le même contrat dans chaque page.
Les modèles, frontières, preuves et lots existants restent valides hors des précisions explicites.
Une exigence écrite ici n'est **pas** une fonction implémentée : [status](status.md) porte l'état
fonctionnel et [PROJECT_STATE](../PROJECT_STATE.md) le seul point de reprise opérationnel.

## 1. Philosophie — complément de vision et identité

Nevolium rassemble les idées, les connaissances et les projets dans un espace qui préserve leurs
liens et leur contexte. Une personne peut réfléchir librement, organiser ce qui devient utile et
confier certaines tâches à une IA. Elle distingue ses informations, les sources et les propositions
de l'assistant. Elle garde la maîtrise de ses données, de ses intentions et de ses décisions.

Le Mycélium est la signature visuelle et relationnelle du produit. Une idée peut rester ouverte.
Une tâche simple ne demande pas de maîtriser une scène 3D, une taxonomie ou un modèle d'IA.
Ne pas remplacer cette raison d'être par « OS de la pensée », une liste de moteurs, « tout est
automatique » ou des garanties non prouvées de localisation et de chiffrement.

Trois contextes d'entrée sont retenus : **Recherche et création**, **Projets et activité**,
**Vie personnelle**. Ils apportent des exemples, des vues épinglées et, plus tard, des modèles de
missions adaptés. Ils ne créent ni applications séparées, ni schémas concurrents, ni permissions.
Le choix d'un contexte est facultatif et réversible ; les repères ne bougent pas silencieusement.
Les métiers spécialisés ne deviennent pas tous des engagements de livraison du pilote.

## 2. Interaction — complément de design-mycelium

Le bureau porte le réseau transparent sur un fond choisi. Les panneaux de contenu conservent leur
contraste. Les raccourcis sont distincts des relations métier ; une proximité spatiale n'a pas
de conséquence sur le planning. Réutiliser le renderer adopté et Dockview.

Les commandes courantes se trouvent dans une barre compacte et la fiche de l'objet. Les réglages
de rendu et diagnostics sont secondaires. Chaque action essentielle a une entrée visible et
utilisable au clavier et au tactile. Le clic droit est un raccourci, jamais l'unique moyen.

Une entrée commune distingue **Chercher**, **Demander**, **Ajouter**. Une recherche locale ne
transmet rien à un modèle ou moteur Web par défaut et ne lance pas de calcul payant silencieux.
Une demande ne démarre pas une mission récurrente sans délégation.

Navigation : préserver sélection, contexte, lecture, caméra et brouillon ; ouvrir une source et
revenir ne réinitialise pas le travail. Les panneaux côte à côte sont facultatifs ; sur téléphone,
priorité à la tâche active. Le choix 3D/2D/liste reste accessible et persistant. Mode calme et panne
WebGL ne retirent pas les fonctions essentielles. Une fiche accessible restitue les libellés longs.

Dans leur périmètre, Gantt, calendrier, Kanban et mindmap doivent permettre création, édition et
liaison **manuelles**. Les actions passent par les mêmes API et invariants que les autres vues.
Ne pas simplement réactiver les mutations internes de SVAR : une tâche du widget n'est pas une
Task canonique. Ne pas confondre lien sémantique et dépendance de planification.

Recette FR/EN sur ordinateur et téléphone : créer, suivre une source, relier, changer de vue,
revenir, recharger. Vérifier une erreur serveur, un conflit, les brouillons, le clavier et une
alternative au glisser-déposer. Les images de référence ne remplacent pas cette recette.

## 3. Domaine et architecture — complément des contrats existants

Conserver les types canoniques et leurs invariants. Une Task a plusieurs vues adaptées ; un PDF
est une source liée, pas une barre de planning. Les vues et les agents n'inventent ni identité
métier ni droits. Conserver Core/PostgreSQL, Assets/SeaweedFS, Temporal et les projections dérivées.
Aucun service par utilisateur, nouveau magasin de graphe ou ordonnanceur n'est requis.

Création, édition, liaison et planification utilisent des opérations Core typées : paramètres,
acteur, ressource, accès, version attendue si nécessaire et comportement de rejeu. Réemployer les
routes/commandes existantes, sans imposer un workflow lourd ou un appel LLM à toute petite édition.
Un résultat incertain doit être rapproché, jamais rejoué aveuglément pour afficher un succès.

La capture sans classement est une expérience utilisateur. Le schéma documentaire de départ
impose `project_id`. La première solution **à qualifier en D10** est un contenant privé par
propriétaire, géré par Core et réemployant Document/DocumentVersion. Ni valeur nulle arbitraire ni
projet global partagé. Un rattachement ultérieur conserve identité, versions et relations autorisées.
Une migration plus large exige un motif et une revue distincts.

Distinguer structure certaine, extraction sourcée/versionnée et rapprochement proposé. Une
suggestion ne devient ni permission, ni fait établi, ni dépendance de planning. Le refus durable
empêche une réintroduction silencieuse. Le corpus de démonstration prérelié ne valide pas l'inférence.

## 4. Missions et autorité — complément de security-model

Conserver A0–A5 et l'intersection des droits effectifs. Une mission décrit objectif, périmètre,
résultat, fréquence/durée, budget et conditions d'arrêt. Contexte visuel ou disponibilité d'un outil
ne valent pas permission. Une mission interne peut continuer sans navigateur ; sa pause empêche
les prochains effets non engagés, sans prétendre annuler un effet externe déjà reçu par un tiers.

Les permissions de **consultation**, de **traitement par un fournisseur** et de **transmission**
sont indépendantes. Elles sont contrôlées côté serveur avant assemblage du contexte et au moment
de l'effet, notamment après attente, suppression ou révocation. Partager en interne ne permet pas
automatiquement l'IA distante ; autoriser cette IA ne permet pas la publication.

Le repli de modèle, les embeddings, la transcription et les outils Web ne peuvent élargir les
destinataires autorisés. Les données importées et les paramètres du client/modèle ne changent pas
la politique. Une politique interne uniquement peut désactiver l'assistance distante : expliquer
la limite, ne pas la contourner.

Tester deux comptes avec noms identiques, fuite par titre/extrait/compteur, révocation en attente,
suppression entre recherche et action, repli interdit, injection dans une source, budget indisponible
et réponse perdue. Le jeton de service partagé ne devient pas par documentation une sandbox par tâche.

## 5. Cycle de vie — complément de data-ownership

Le [registre de gouvernance](data-governance.md) porte finalités, flux, conservation, droits et
applicabilité ; [data-ownership](data-ownership.md) garde les magasins autoritaires.
Les originaux ET les versions, extraits, citations, embeddings, mémoires, traces, historiques de
workflow, caches, exports et sauvegardes entrent dans le périmètre de qualification.

L'effacement doit être reprenable et vérifier les magasins concernés. Traiter explicitement
les contraintes référentielles ; ne pas promettre l'effacement en ne retirant qu'une ligne.
Une restauration se fait fermée et réapplique les effacements/révocations pertinents avant
réouverture. Une conservation légale justifiée est limitée, séparée des usages courants et de l'IA.
Ne pas inventer une durée unique pour toutes les données ou une capacité de purge fournisseur.

L'inventaire couvre les flux déjà actifs. Une région de serveur, BYOK ou l'absence d'entraînement
ne valent pas preuve de localisation, de non-conservation ou de conformité. Les contrats et les
registres nominatifs restent privés. Les inconnues ne sont jamais cochées comme conformes.

## 6. Séquence — amendement ciblé du plan D01–D22

Le [plan](implementation-plan.md) conserve les lots et les preuves historiques. Le
[backlog d'acceptation](refoundation-backlog.md) les précise sans devenir un second checkpoint.

| Lot | Précision acceptée | Ce qui ne doit pas être anticipé |
|---|---|---|
| DOC-01, rattaché à D09 | Adopter les contrats, gouvernance et critères ; conserver les preuves | Aucun changement applicatif, import ou déploiement dans ce travail documentaire |
| D09 | Recevoir KISS déjà intégré, puis corriger les gestes et la continuité sur API existantes ; exemples selon manques observés | Pas de nouveau modèle métier ni réimport aveugle ; D10 reste fermé |
| D10 | Contrats de commandes et contrôles de données avant nouveaux flux personnels ; capture, liens corrigibles, évaluation, assistant, voix volontaire et première mission interne | Pas de fournisseur nouveau ou de transmission non autorisée pour masquer une panne |
| D11 | Un fournisseur complet, scopes et cycle de vie ; lecture/préparation d'abord | Effet externe qualifié/autorisé séparément ; pas une collection de connecteurs incomplets |
| D12–D13 | Continuité préparée, conflits, export/effacement/restauration et quelques adultes sur deux comptes au moins | Pas de coédition avancée, offline total ou agents d'appareil imposés à ce pilote |
| D14–D22 | Extensions selon demande, risques, coûts et qualification propres | Pas de retard d'une obligation juridique déjà déclenchée au motif du numéro du lot |

DATA-01 qualifie les flux actifs dès adoption et avant leur extension. Les cas juridiques et
incidents dont les conditions sont réunies se traitent immédiatement, sans créer des branches
concurrentes ni attendre D22. Le rythme et les dépenses sont recalibrés après deux tranches
observées ; les estimations du rapport ne constituent ni date promise ni capacité commerciale.

## 7. Maturité et définition de terminé

Pour chaque capacité modifiée : scénario, code concerné, runtime concerné, type de preuve,
référence datée, acceptation manuelle et limites. Conserver distincts : lecture statique, test
unitaire, intégration, navigateur avec API simulée, services réels, appareil, acceptation utilisateur.
Ne pas recopier un succès ancien comme validation d'une nouvelle tête.

Un parcours livré est utilisable manuellement, cohérent entre vues et rechargements, FR/EN et
accessible ; erreurs, conflits, données et effets restent maîtrisés. Une fonction IA ajoute
sources, coût, portée et état réel. Un connecteur ajoute révocation et cycle de vie. Une offre
distribuée ajoute ses exigences légales, licences, sécurité et support qualifiés.

Fuite entre comptes, destinataire interdit, effet non autorisé, perte de données, faux succès et
double effet lors d'une reprise bloquent la livraison. Une revue de la proposition ne remplace
ni un audit d'intrusion ni une qualification juridique contractuelle.

## 8. Reprise et autorité documentaire

[AGENTS](../AGENTS.md) et [development-workflow](development-workflow.md) restent le protocole.
Le présent contrat précise vision/design/domaine/architecture/sécurité/plan ; il n'altère pas
rétroactivement leur état livré. Ne pas multiplier les copies de ses règles.

[PROJECT_STATE](../PROJECT_STATE.md) nomme une branche/PR active au plus, la validation exacte,
le runtime attesté et une seule prochaine action. L'adoption documentaire, la qualification du
code et l'activation sont trois actes distincts. Aucun contenu privé du PDF ou des conversations,
contrat signé, secret ou journal sensible ne doit être publié pour documenter cette continuité.
