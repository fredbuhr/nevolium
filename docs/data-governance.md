# Nevolium — gouvernance et cycle de vie des données

Révision : 2026-09-16. Cadre adopté par [ADR-034](decisions/ADR-034-human-first-refoundation.md).
**Registre initial à qualifier, pas attestation de conformité.** DATA-01 reste ouvert : contrat,
configuration, finalités et preuves opérationnelles ne sont pas déduits de la documentation.
[Data-ownership](data-ownership.md) garde les magasins autoritaires ; le
[contrat de refondation](refoundation-contract.md) porte les exigences de produit.

Les contrats signés, registres nominatifs, demandes de droits, preuves d'incident et secrets restent
dans un espace privé contrôlé. Le dépôt public contient la méthode et des références non sensibles.

## 1. Offre et responsabilités

| Champ | État initial / information à établir |
|---|---|
| Périmètre produit retenu | Pilote privé, quelques adultes ; Recherche et création, Projets et activité, Vie personnelle |
| Entité éditrice, offre et marchés | À confirmer pour chaque offre ; le propriétaire du dépôt ne prouve pas la structure juridique |
| Opération technique connue | Pilote Netcup opéré par l'utilisateur ; version réellement déployée dans PROJECT_STATE |
| Responsable gouvernance et contact droits | À désigner ; ne pas inventer un DPO, un canal ou une disponibilité de support |
| Responsable incident et suppléant | À désigner avec canal privé joignable et procédure |
| Rôles par finalité | À qualifier : contenus confiés, comptes/sécurité, support, facturation éventuelle ; pas un rôle unique présumé |
| Périmètre non activé par le plan | Recrutement/évaluation sensibles, santé, mineurs, finance réglementée, écoute permanente ou publication automatique sans revue propre |
| Prochaine extension | Analyse d'applicabilité avant nouveaux publics, fournisseurs, finalités, effets ou distribution |

Le choix d'un pilote adulte ne supprime pas les obligations liées aux données de tiers ou aux flux
existants. Une base légale et, le cas échéant, une condition applicable aux données sensibles doivent
être qualifiées selon la finalité ; une permission technique ne suffit pas. [R1, R2, R3]

## 2. Premier repérage des flux — preuve documentaire seulement

Base documentaire lue : `e03546a34e502dda00274d4eef5fbc532052a636`, notamment
[architecture](architecture.md), [status](status.md), [component-matrix](component-matrix.md),
[security-model](security-model.md), [data-ownership](data-ownership.md) et le checkpoint.
Les lignes « attesté » ci-dessous rapportent leurs preuves antérieures, sans nouvelle inspection SSH.
**Aucune région fournisseur, durée de conservation, contrat ou base légale n'est déduite de ces lignes.**

| Flux | Chemin documenté et maturité rapportée | Qualification ouverte |
|---|---|---|
| F01 Identité | Web → Keycloak/OIDC → Core ; intégration antérieure qualifiée | Données exactes, rôles, journaux, durées, support et droits |
| F02 Contenus/fichiers | Core/PostgreSQL et Assets/SeaweedFS ; documents versionnés et parsing Docling | Original/versions/extraits/citations, périmètre d'export et effacement |
| F03 Index/mémoire | pgvector, Mem0, Graphiti/Neo4j dérivés ; preuve réelle bornée, inférence de liens non active dans le parcours D04 | Données réellement copiées, fournisseur d'embedding éventuel, provenance et purge |
| F04 Modèle | Worker → LiteLLM → OpenAI ; premier fournisseur qualifié, autres choix non qualifiés par leur présence | Organisation/compte API, endpoints, sous-traitants, région, rétention, transferts, contrats et options effectives |
| F05 Recherche Web | Research/lecteur Web-MCP et SearXNG documentés | Termes transmis, sources interrogées, logs, conservation et termes privés dans une requête |
| F06 Exécutions/audit | Temporal, PostgreSQL, outbox et NATS ; reprise et admission qualifiées | Payloads contenant du texte, historique, rétention/effacement, minimisation |
| F07 Observabilité | Langfuse/ClickHouse configurés, activation non déduite | Profil réellement démarré, contenu des traces, accès et durée |
| F08 Navigateur/PWA | Layouts privés et shell Web ; offline métier encore prévu | Caches exacts, compte/appareil, révocation, sauvegardes locales et exports téléchargés |
| F09 Sauvegardes | restic/B2 et snapshots Netcup ; restauration isolée antérieure attestée | Régions réelles, contrats, durées, clés, effacements/révocations après restauration |
| F10 Audio | Voix volontaire D10 et voix enrichie D15 prévues | Fournisseur, autorisation de capture, conservation, fermeture réelle du micro ; pas de réunion présumée autorisée |
| F11 Connecteurs | Comptes, calendrier, contacts et courrier prévus D11 | Scopes minimaux, contrats/destinataires, sync, caches, suppression et révocation |
| F12 Notifications/support/facturation | ntfy configuré ; offre commerciale non établie | Activation effective, données/traceurs, finalité propre, destinataires et conservation distincte |

Pour chaque flux, le registre privé doit contenir : origine, personnes concernées, données exactes,
finalité, base/condition, rôles, prestataires et pays d'accès/stockage, transferts, contrat, durée
motivée, déclencheur de fin, propriétaire du contrôle et preuve datée. La colonne inconnue est
bloquante pour une nouvelle utilisation qui dépend de cette garantie, pas une case « non applicable ».

## 3. Consultation, traitement, transmission

Trois axes séparés, contrôlés côté Core et revérifiés avant effet après attente/révocation.
Le client, un modèle ou une relation de graphe ne peuvent augmenter les droits. Les politiques
s'appliquent aux données dérivées et à la transcription/recherche/repli de fournisseur.
Leur implémentation transversale reste à qualifier ; l'adoption de ce document ne l'active pas.

Une politique interne uniquement peut désactiver une aide distante tant qu'aucun moteur interne
n'est qualifié. Expliquer cette limite sans repli caché. Hébergement UE, BYOK et non-entraînement
ne prouvent ni absence de transfert ni absence de conservation. Vérifier chaque fonction et option
fournisseur réellement utilisée. Les contrats et garanties de transfert restent à obtenir. [R1, R3]

## 4. Conservation et droits

| Classe de données | Contrôle attendu, non réputé implémenté |
|---|---|
| Originaux et pièces | Finalité/fin de conservation, suppression autorisée et contenu non récupérable par l'API ordinaire |
| Versions, citations et extraits | Dépendances et contraintes référentielles explicites, anciennes versions non fuyantes ; pas de suppression en cascade aveugle |
| Vecteurs, Mem0 et Graphiti | Dérivés repérables par source/version, purge reprenable et résultat vérifié |
| Workflows/audit/traces | Références minimales, durée motivée, contenu utilisateur non conservé indéfiniment par commodité |
| Caches/appareils | Révocation, changement de compte, expiration et reconnect ; pas de promesse d'effacement à distance d'une copie hors contrôle |
| Exports | Accès contrôlé et durée ; copie téléchargée par l'utilisateur distinguée |
| Sauvegardes | Conservation motivée, restauration fermée, réapplication des suppressions/révocations avant réouverture |
| Facturation éventuelle | Obligation de conservation qualifiée et stockage distinct des usages/mémoires IA |

Ne pas fixer une durée identique pour toutes les finalités. Documenter copies, méthode et
exceptions, sans promettre une purge fournisseur non disponible. Conserver seulement les preuves
nécessaires au traitement d'une demande, avec accès limité. [R1, R2]

Procédure à qualifier : réception par canal identifié, vérification proportionnée de l'identité,
répartition opérateur/client, classification des demandes et exceptions, échéance, exécution
reprenable, contrôle des magasins puis réponse. Les demandes sur des tiers ne justifient pas
l'export inutile de tout un espace. Le délai RGPD normalement d'un mois n'est pas une promesse
d'effacement immédiat ; ses conditions et prolongations sont à appliquer au cas réel. [R2]

L'analyse de nécessité d'AIPD doit être documentée. La réaliser si le traitement l'exige ;
ni toute IA automatiquement soumise, ni exemption automatique d'un petit pilote. [R3]

## 5. Incidents et restauration

Définir responsable et suppléant, qualification/confinement, conservation proportionnée des preuves,
contacts clients/autorités/personnes, correction et suivi. Une notification RGPD et un signalement
CRA ont des déclencheurs et délais distincts. Les fabricants entrant dans le champ du CRA ont des
obligations de signalement depuis le 11 septembre 2026 ; qualifier rôle et produit, ne pas classer
automatiquement tout SaaS ou dépôt public dans cette catégorie. [R3, R5]

Avant réouverture d'une restauration : vérifier migrations, intégrité et droits, réappliquer les
révocations et effacements pertinents, empêcher une réingestion qui ressuscite le contenu supprimé.
Cette exigence dépasse la preuve historique d'une restauration technique ; elle reste à qualifier.

## 6. Registre d'applicabilité

Chaque ligne opérationnelle exige responsable, date, texte/version, rôle/offre/finalité, décision
motivée, pièces privées, limitations et prochain déclencheur de revue. Les règles ci-dessous sont
un registre de questions, pas une conclusion d'applicabilité universelle ou une certification.

| Régime | Question/déclencheur à qualifier | Avant extension |
|---|---|---|
| RGPD / Informatique et Libertés | Données personnelles, finalités, rôles et territoires | Bases, information, droits, sécurité, prestataires, transferts et nécessité AIPD [R1–R3] |
| AI Act | Fournisseur/déployeur, finalité et catégorie de chaque fonction, obligations déjà applicables | Transparence/maîtrise/provenance et revue des usages sensibles ; revérifier le calendrier officiel [R4] |
| CRA | Distribution, activité commerciale, produit et rôle ; services distants à examiner | Versions/licences/SBOM, support et incidents ; ne pas différer une obligation déclenchée [R5] |
| Data Act | Offre de traitement de données entrant dans le champ | Contrat de sortie, export et changement de fournisseur |
| Consommation/accessibilité | Offre, contrat à distance, service, bénéficiaires et exemptions | Information, réclamation, résiliation et parcours accessibles |
| FTC / États-Unis | Marché, pratiques, engagements et lois étatiques selon leurs critères | Promesses vérifiables, droits et prestataires ; CCPA conditionnelle, pas seuil universel présumé [R6–R7] |
| Mineurs / COPPA | Public visé, connaissance d'âge, données et juridiction | Revue propre avant élargissement du pilote adulte |
| Santé / HDS / HIPAA / santé des consommateurs | Contexte, données, finalités et relation contractuelle | Revue sectorielle ; aucune exemption générale déduite de l'absence de HIPAA |
| Finance / MiCA / autres régimes | Service réellement rendu, conseil, exécution ou conservation | Séparer veille et services réglementés ; absence de signature ne prouve pas exemption |
| Audio | Paroles privées/confidentielles, participants et juridictions | Dictée personnelle distincte de réunion ; information, autorisations et durée |
| Traceurs | Accès/stockage terminal, nécessité et finalité | Minimisation, consentement si requis ; CGU ne le remplacent pas |
| Facturation électronique | Offre de facturation et entreprises concernées | Solution adaptée et calendrier applicable plutôt qu'un moteur juridique maison |
| NIS2 / DSA | Activité, taille, rôle, catégorie de service et partage public | Analyse propre et procédure avant extension |
| Propriété intellectuelle | Import, collecte, reproduction, entraînement éventuel et diffusion | Droits, versions/licences des composants, conditions API et provenance |

DATA-01 et DIST-01 restent ouverts. Les lignes sans référence juridique détaillée ici reprennent
les questions du dossier adopté : **sources primaires et droit actuel à vérifier avant décision**.
La dépendance de backlog ne retarde jamais un traitement légalement requis sur les flux existants.

## 7. Sources primaires relues pour cette adoption

Consultation : 16 septembre 2026. Ces pages ne prouvent pas la configuration du pilote.

- R1 : [CNIL — RGPD chapitre II, principes et licéité](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre2).
- R2 : [CNIL — RGPD chapitre III, information et droits](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3).
- R3 : [CNIL — RGPD chapitre IV, rôles, sécurité, incidents et AIPD](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre4).
- R4 : [Commission européenne — AI Act et calendrier](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai).
- R5 : [Commission européenne — signalements CRA](https://digital-strategy.ec.europa.eu/en/policies/cra-reporting).
- R6 : [FTC — Privacy and Security](https://www.ftc.gov/business-guidance/privacy-security).
- R7 : [California DOJ — CCPA](https://oag.ca.gov/privacy/ccpa).
