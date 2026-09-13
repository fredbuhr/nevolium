# Nevolium : état fonctionnel vérifié

Révision : 2026-09-13. `main` porte D03 ; les réalisations D04 ci-dessous sont sur la branche de
[#88](https://github.com/fredbuhr/nevolium/pull/88), encore draft. Le seul point de reprise opérationnel
est [PROJECT_STATE](../PROJECT_STATE.md). Les observations cible sont des preuves opérateur conservées,
pas un contrôle en direct de cette session.

## Acquis canoniques

Reset R0–R7 et H1–H4 terminés dans leurs périmètres ; dernier jalon produit G51 Daily Spine.
D01 (#84) borne le Worker et le parsing ; D02 (#85–#86) apporte admission, budgets, pagination et
rétention ; D03 (#87) durcit le déploiement, les droits et la reproductibilité.
[Preuves jusqu'à D03](archive/checkpoint-through-d03-2026-09-11.md). D04/H5 reste ouvert ; D05 non commencé.

## Capacités actuelles de la branche D04

| Domaine | Preuve disponible | Limite restante |
|---|---|---|
| Serveur et état durable | Debian 13 durci ; PostgreSQL jusqu'à `0014_capacity_and_data`, NATS/JetStream, SeaweedFS, Temporal et namespace actifs, réseaux internes | Charge/files mixtes et récupération applicative de la cible |
| Identité | Caddy/TLS, OIDC/PKCE, Today propriétaire, utilisateur et administrateur avec TOTP ; bootstrap Keycloak retiré et refus anonyme/faux jeton vérifiés | Ergonomie et extension des parcours utilisateur |
| Worker | Image complète confinée, bundle en lecture seule, traitement hors ligne et exécution Temporal réels | Mesure sous charge mixte sur le serveur retenu |
| Documents | PDF à couche texte parsé par Docling 2.126.0 ; source SHA-256, version échouée conservée, réingestion et chunk propriétaire | Scans/OCR complexes, tableaux et gros documents non qualifiés par cet essai |
| Mémoire | Mem0/embeddings et Graphiti prouvés sur cible ; scope étranger vide, génération 2 rejouée sans doublon | Qualité des usages produit ; projections dérivées, pas source de vérité |
| News | Dix sources propriétaire et briefing terminé avec fallback déterministe lors d'un timeout | Synthèse quotidienne non qualifiée ; réservation historique inconnue conservée |
| Modèle et comptabilité | `smart` configurable par fournisseur/modèle/clé ; OpenAI par défaut. Tokens, coûts reportés, réservations et rejeu restent canoniques ; production refuse le LLM local | Configuration API préparée sur la branche, aucun appel OpenAI cible encore attesté ; les preuves locales restent historiques |
| Routage | Command Center, propositions PydanticAI, garde Core et veto sans Task métier ; nouvelles routes Research et sémantiques sur `smart` | Pertinence et latence du pilote API à mesurer ; les alias des anciennes Tasks restent inchangés |
| Research | Context Pack, planning/synthèse bornés, deux outils Web A1 activés ; accès Web réel et refus loopback vérifiés ; schémas natifs ajoutés sur la branche | Parcours canonique complet non établi : COLD-05 a mal planifié la requête puis produit une synthèse non JSON avec le modèle 0.5B ; nouveau Worker non déployé |
| Unicité Research | Correctif de branche : liaison atomique d'un slot à un seul outil/entrée ; IDs existants conservés, scénario de concurrence Core/PostgreSQL ajouté | Activation cible après validation du head CI |
| Secrets/exploitation | OpenBao persistant, policy minimale, récupération des clés chiffrée et vérifiée hors serveur, root révoqué, renouvellement actif | Backup applicatif et restauration indépendante de la cible ; upgrade/rollback |
| Restauration CI | Restic chiffré transféré sur une seconde VM et relu : SQL, JetStream, objet filer, secret OpenBao | Ce résultat ne constitue pas la restauration du serveur utilisateur |

Les incidents, versions, empreintes et mesures sont dans les [preuves serveur](archive/server-foundation-2026-09-11.md)
et le [rapport moteurs CI](archive/qualification-d04-2026-09-11.md). La transition d'identité est documentée
par l'[ADR-030](decisions/ADR-030-nevolium-canonical-identity.md), sans alias antérieur.
Les essais interrompus et réservations inconnues restent intacts.

## Produit présent et fonctions futures

| Domaine | Présent | À livrer |
|---|---|---|
| Cockpit | Web publié, OIDC, panneaux persistés ; Command Center, Projects, Today, Research, News, Knowledge | Design Mycelium, cohérence quotidienne et sélecteur fournisseur/modèle D05 ; défauts d'affichage/d'erreurs partagées encore signalés |
| Planification | Priorité, dates, échéances, PATCH propriétaire, Today/fuseaux | Gantt, calendrier, dépendances/jalons, Kanban et récurrences D06 |
| Connaissances/graphes | Documents/chunks inspectables, relations canoniques et interfaces de graphe | Édition enrichie D07, mindmap 2D D08 et Mycelium 3D D09 |
| Realtime/Desktop/voix | Scaffolds ou moteurs configurés | Parcours authentifiés, collaboration/persistance, permissions appareil et voix |
| Finance/Crypto/Home/Dev | Composants déclarés et profils optionnels | Adaptateurs Nevolium, policy, workspaces et parcours réels |

La présence de Three, Tauri, Yjs ou d'un moteur optionnel ne vaut pas une fonctionnalité livrée.
L'[ADR-029](decisions/ADR-029-server-personal-and-offline-clients.md) conserve serveur prioritaire,
installation sur PC personnel et clients PC/téléphone/tablette. Offline, synchronisation et packaging
restent dans les lots produit/distribution du [plan D01–D22](implementation-plan.md).

## Portée des validations

Le parent `2556636…` avait 10/10 workflows réussis, dont la fixture Ollama réelle. Le pivot API
requiert sa propre CI avant activation. La fixture locale est désormais manuelle et normalement
ignorée ; ses preuves ne sont plus une condition de D04. Les contrats gardent la comptabilité,
l'anti-doublon et la reprise Research. Aucun résultat CI factice ne prouve l'accès réel à OpenAI.
L'[audit du 13 septembre](archive/d04-progress-audit-2026-09-13.md) distingue ces preuves du résultat
COLD-05. Le [protocole D04](qualification-d04.md) fixe
les seuils et quatre preuves de sortie encore ouvertes ; les acquis ne sont pas à recommencer.
Les anciens checkpoints et « prochaines actions » sont historiques, jamais une instruction de reprise.

Les tests ne prouvent ni 1 000 utilisateurs privés distincts, ni 1 000 générations simultanées.
Les budgets réservent des estimations, sans plafond fournisseur garanti en dollars. Un seul fournisseur
réel qualifié suffit pour le pilote ; tous les fournisseurs, le lancement commercial et tous les OS
ne sont pas des conditions de fermeture de H5.

L'[ADR-031](decisions/ADR-031-api-first-pilot.md) fixe les API pour le pilote. Claude, Grok et Kimi
peuvent être configurés derrière la même frontière ; leur exécution réelle n'est pas encore qualifiée.
Le sélecteur Web appartient à D05. Le LLM local n'a pas de date de retour imposée au plan.
