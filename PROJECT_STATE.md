# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live.

## H5 clôturé ; D05 : navigation reliée à présenter à l’utilisateur

| Champ | État attesté |
|---|---|
| Base main vérifiée | `1896468513f92ee5c0d6a811301a1b898cc6abd2` |
| D04 / H5 | #88 intégrée ; `H5` vise `db07f7a90cc406ddc80683521bbf1744e3a2b668` ; branche D04 fusionnée supprimée |
| Branche / PR unique | `feat/d05-coherent-cockpit` · [PR #89](https://github.com/fredbuhr/nevolium/pull/89) |
| Dernière tête qualifiée avant correction | `639b48f369cd5317aa98d0679ddf51fdf9766068` : 10/10 workflows réussis ; runtime `c17c7e24…` identique hors checkpoint |
| Production | `c17c7e24cee60432275bb021c389bad481e3f4ff` réellement déployé sur le serveur pilote ; Core, Worker, Web, Web MCP et LiteLLM en exécution sans redémarrage après contrôle |
| Données | Migration `0015_model_configurations` ; cinq réservations historiques `uncertain` conservées. Le premier essai utilisateur a échoué avant LiteLLM/OpenAI sur l’ordre d’insertion Task/configuration ; table toujours vide, configuration serveur conservée |
| Récupération | Sel LiteLLM stable provisionné sans affichage ; snapshot de récupération `cb0696461e1bc6a3cad54260dccd7b564e2d6d5c684c9f7174a0fd091a623bc5` et snapshot quiescent pré-D05 `71f19a4691a6a45891aa0d59dfcd8237b58eaf2aaa738608e3f8e21facf5a524`, tous deux chiffrés sur B2 et relus |
| Correction implémentée | Fil contextuel parent / voisinage / relations transversales canoniques ; activité centrée réversible ; fond neutre issu de la nouvelle référence ; logo vectoriel ; reçu/test/activation IA explicites ; Task du test persistée avant sa configuration liée |
| Tête de code vérifiée | `d431a7427e0efc4cfe0b8734a3ce10926bbee4bc` : 10/10 workflows réussis. UI responsive/connectée et isolation/OIDC réussies ; captures UI téléchargées, empreinte vérifiée et rendu relu. Le compte rendu suivant ne change que la documentation et ne remplace pas cette preuve exact-head |
| Prochaine action | Qualifier le correctif de clé sur PostgreSQL réel avec la CI, puis préparer une mise à jour pilote contrôlée avant un unique nouvel essai utilisateur. Aucun déploiement ni fusion effectué |

## Livraison D05 et limite de clôture

D05 fournit l'Accueil Mycelium fonctionnel et le cockpit Dockview modulable, la navigation et
l'accès rapide, l'inspecteur, les états et l'accessibilité, les layouts privés par appareil/fenêtre,
le détachement multi-écran sur bureau, l'activité unique par défaut sur tablette/téléphone et le
shell PWA sans dépendance WebGL. La [charte d'identité](docs/identite-nevolium.md), le
[contrat visuel](docs/design-mycelium.md) et le
[checkpoint détaillé](docs/archive/d05-coherent-cockpit-progress-2026-09-14.md) conservent le
périmètre et les preuves.

Le déploiement a vérifié le schéma `0015`, les frontières Core, la confiance
Keycloak/OpenBao/SeaweedFS, LiteLLM, les cinq services remplacés et l'ingress
Web/PWA/Auth/API : `200|200|200|401|404`. Les images de rollback antérieures restent
étiquetées localement ; les snapshots D04 et D05 n'ont pas été remplacés. OpenBao a été
redéscellé depuis son matériel de récupération chiffré. Aucune ancienne Task, campagne D04 ou
instance Ollama n'a été relancée.

Le déploiement lui-même n’a effectué aucun test fournisseur. Le premier essai utilisateur a produit
un `500` : PostgreSQL a refusé la configuration parce que sa Task référencée n’avait pas encore été
insérée. La transaction a été annulée, la table reste vide et l’ancienne configuration serveur reste
active ; la clé n’a atteint ni LiteLLM ni OpenAI. Ne pas relancer le test avant qualification et
déploiement du correctif. Afficher OpenAI, Anthropic, xAI ou Moonshot ne prouve
pas leur compatibilité. La clôture D05 exige le test réel borné du fournisseur choisi, la
vérification de l'identité retournée et l'activation explicite ; tout échec doit conserver la
configuration serveur actuelle. La revue sur appareils physiques reste distincte des captures CI.
D05 n'est ni clos ni intégré. Gantt/calendrier, édition, mindmap et Mycelium 3D restent en D06–D09.

Le retour utilisateur rouvre la validation de navigation : les fenêtres classiques et le paysage
ne répondaient pas suffisamment au concept. La [correction reliée](docs/archive/d05-connected-navigation-2026-09-14.md)
est implémentée et en revue sur la même PR, sans migration ni déploiement. L’inspecteur ne crée aucune
relation et ne lance aucune IA. Les exemples du scénario navigateur sont des fixtures, pas des données du pilote.

## Exploitation à préserver

- Pilote API uniquement : LiteLLM `smart`, `openai/gpt-4.1`, sortie maximale 4096.
- Ne pas modifier ou perdre `LITELLM_SALT_KEY` ; elle forme avec la base LiteLLM le couple de récupération des futures clés gérées.
- Préserver les snapshots B2, les images de rollback et les cinq réservations historiques `uncertain`.
- Ne relancer ni Ollama, ni ancienne Task, ni campagne D04.
- Un checkout différent des conteneurs ne prouve jamais leur déploiement ; la version runtime attestée reste `c17c7e24…` jusqu'à une nouvelle opération explicite.

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [PR D05](https://github.com/fredbuhr/nevolium/pull/89)
