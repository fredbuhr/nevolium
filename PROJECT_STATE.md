# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-14. Lire `AGENTS.md` puis vérifier GitHub live.

## H5 clôturé ; D05 actif

| Champ | État attesté |
|---|---|
| Base main vérifiée | `1896468513f92ee5c0d6a811301a1b898cc6abd2` |
| D04 / H5 | D04 intégré par #88 ; tag `H5` sur `db07f7a90cc406ddc80683521bbf1744e3a2b668` |
| Nettoyage | `hardening/d04-real-engine-qualification` supprimée après vérification de sa tête fusionnée |
| CI | 10/10 workflows réussis sur `73b07f5204fa5446ecd663ce90d68c5175a73e3e`, dont les deux surfaces D05 dans cinq formats, vrai OIDC/PKCE, isolation des rôles et restauration D04 entre deux hôtes |
| Branche / PR active | `feat/d05-coherent-cockpit` · [PR #89](https://github.com/fredbuhr/nevolium/pull/89) · dernier checkpoint de code complet vérifié : `73b07f5204fa5446ecd663ce90d68c5175a73e3e` ; relire la tête live |
| Cible | Checkout serveur vérifié inchangé à `61d7687088dcbb002febd4c5f1a97f33edcb1269` |
| Prochaine action | Faire la revue utilisateur manuelle et tester réellement la configuration fournisseur choisie avant la clôture D05 |

La sortie opérateur `H5_OK`, l'absence de la branche D04 et la cible du tag ont été
revérifiées depuis GitHub. Aucun checkout, conteneur ou service de production n'a été modifié.
Le dépôt serveur reste volontairement sur son code qualifié ; une mise à jour de checkout ne
constituerait pas un déploiement.

## Preuves et exploitation à préserver

Le [rapport final D04](docs/archive/d04-pilot-qualification-2026-09-14.md) conserve les quatre
preuves et leurs limites : deux Research OpenAI, 3 333 lectures avec concurrence 20 et zéro erreur,
charge mixte et rollback Worker, deux snapshots Restic B2 chiffrés relus et restauration de
PostgreSQL, JetStream, SeaweedFS et OpenBao dans un Compose isolé du même serveur.
La restauration entre deux VM est une preuve CI distincte. Aucune sauvegarde automatique attestée.

- Pilote API : LiteLLM `smart`, `openai/gpt-4.1`, sortie maximale 4096 (ADR-031).
- Schéma `0014_capacity_and_data` ; comptes `52|52|25|30|16|39|5`, travaux/outbox `0|0|0|0`.
- Conserver les cinq réservations historiques uncertain, snapshots B2 et images de rollback.
- Ne relancer ni Ollama, ni ancienne Task, ni campagne D04.
- Clés exclusivement côté serveur ; aucun secret ou jeton dans Git ou les sorties.
- Images attestées : Core `69453e7b1348…`, Worker `cb9b73de908…`, Web MCP `fcfba65ffada…`.

## D05 : livraison cohérente en cours

L'utilisateur autorise la poursuite, avec une étape préalable exclusivement éditoriale.
La [charte d'identité](docs/identite-nevolium.md) consigne philosophie, nom, parcours utilisateur,
valeurs, définitions, signatures proposées, manifeste et règles de ton. README, vision et intention
visuelle sont alignés. Les signatures restent des propositions ; l'ambition ne vaut pas une
fonction livrée. Cette étape ne modifie ni code, ni serveur, ni architecture, ni roadmap et ne
clôture pas la qualification D05. Relecture, longueurs des définitions et liens locaux vérifiés ;
aucune nouvelle preuve interactive ou fournisseur.

[Inspection datée](docs/archive/d05-entry-inspection-2026-09-14.md) : Dockview, layouts
propriétaires, panneaux métier, inspecteur documentaire, rôles administrateur, LiteLLM,
workflows, budgets et usages canoniques ont été réutilisés. Le
[checkpoint de livraison](docs/archive/d05-coherent-cockpit-progress-2026-09-14.md) décrit le
shell, le registre de modèle candidat, les preuves exécutées et les limites restantes.

La branche rassemble un Accueil Mycelium fonctionnel séparé du cockpit de travail, design partagé,
navigation/recherche rapide/inspecteur, états et accessibilité, layouts par appareil/fenêtre,
panneau détachable pour plusieurs écrans, PWA et réglages administrateur de l'API. L'accueil SVG 2D
ouvre uniquement les six espaces réellement disponibles ; le choix Accueil/Cockpit est persisté par
compte sur l'appareil. Le [contrat visuel](docs/design-mycelium.md) traduit les trois références
utilisateur en palette nuit/pétrole, cyan, émeraude, bleu et violet, sans WebGL. Une configuration
candidate reçoit un alias immuable, passe un appel réel borné via le gateway canonique et doit
correspondre à l'identifiant de déploiement LiteLLM avant une activation récente et explicite.
Un démarrage Temporal indéterminé reprend le même test sans retransmettre la clé et les réponses de
validation ne la reflètent pas. La dernière configuration valide reste active lors d'un échec.
D06–D09 gardent planification,
édition et graphes ; aucun graphe 3D décoratif permanent n'entre dans D05.

L'interface emploie désormais les repères Assistant, Actualités, Recherche, Aujourd'hui, Projets
et Documents. Les noms d'infrastructure et le vocabulaire de stockage restent dans les diagnostics
et la documentation technique. Les identifiants internes, routes, états et contrats métier ne sont
pas renommés. TypeScript, build Vite, contrat D05 et `git diff --check` réussissent localement.
Le workflow UI exécute désormais Chromium et conserve dix captures, Accueil puis Cockpit pour
bureau, administration, bureau compact, tablette et téléphone. La revue de ces captures a conduit à faire de la tablette
une surface à activité visible unique par défaut, avec navigation par onglets et séparation
Dockview volontaire toujours possible ; le détachement multi-écran reste réservé au bureau.
Le scénario vérifie aussi la recherche « documents », le retour du focus, le passage réel entre
onglets compacts, le popout bureau, les classes d'appareil, l'absence de débordement de page et le
chemin sans Canvas/WebGL. Une première géométrie compacte masquait partiellement le nœud Assistant ;
le test a échoué, le nœud a été rendu atteignable, puis le workflow UI et les neuf autres workflows
ont réussi sur `73b07f5204fa5446ecd663ce90d68c5175a73e3e`.

Validations locales du commit fonctionnel réussies : compilation Python, TypeScript, build Web,
SQL Alembic hors ligne, contrats cockpit/PWA,
gateway/configuration modèle, dispatch, Assistant, News, Semantic Router et layouts. Les 10
workflows GitHub de `9c1c0a53…` réussissent, dont PostgreSQL réel, matrice Compose et contrôles de
non-régression D04. Deux premières tentatives ont rencontré un téléchargement Docker `502` et une
disponibilité PostgreSQL trop précoce ; les relances ciblées ont réussi sans changement de code.
La qualification responsive isolée est acquise avec des réponses API déterministes. Son artefact
`d05-browser-qualification` (`10368003873`, digest
`sha256:87598d51b8fe42b4d1bf065d727c9b3b5fc338ce4d2b8d2c9910b2bfae291cd1`) contient les dix
captures et le rapport JSON. Une seconde
preuve Chromium traverse réellement Keycloak, PKCE, le Web et Core : l'administrateur voit la
configuration active, l'utilisateur standard ne reçoit pas le panneau, et l'API répond
`401/200/403`. Elle ne remplace pas un essai de fournisseur réel. Aucun test avec une nouvelle clé
fournisseur ni déploiement n'a été effectué.

Les références visuelles n'existent pas dans les arbres Git : les trois images accessibles dans
la conversation ont été inspectées comme inspirations et ne sont pas attribuées au dépôt.

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [Rapport D04](docs/archive/d04-pilot-qualification-2026-09-14.md)
