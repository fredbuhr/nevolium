# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-14. Lire `AGENTS.md`, puis vérifier GitHub live.

## H5 clôturé ; D05 déployé, qualification fournisseur restante

| Champ | État attesté |
|---|---|
| Base main vérifiée | `1896468513f92ee5c0d6a811301a1b898cc6abd2` |
| D04 / H5 | #88 intégrée ; `H5` vise `db07f7a90cc406ddc80683521bbf1744e3a2b668` ; branche D04 fusionnée supprimée |
| Branche / PR unique | `feat/d05-coherent-cockpit` · [PR #89](https://github.com/fredbuhr/nevolium/pull/89) |
| Implémentation qualifiée | `c17c7e24cee60432275bb021c389bad481e3f4ff` : 10/10 workflows réussis ; captures responsive/authentifiées relues ; direction visuelle retenue comme base de poursuite |
| Production | `c17c7e24cee60432275bb021c389bad481e3f4ff` réellement déployé sur le serveur pilote ; Core, Worker, Web, Web MCP et LiteLLM en exécution sans redémarrage après contrôle |
| Données | Migration `0015_model_configurations` appliquée ; aucune configuration gérée ni activité en cours ; cinq réservations historiques `uncertain` conservées |
| Récupération | Sel LiteLLM stable provisionné sans affichage ; snapshot de récupération `cb0696461e1bc6a3cad54260dccd7b564e2d6d5c684c9f7174a0fd091a623bc5` et snapshot quiescent pré-D05 `71f19a4691a6a45891aa0d59dfcd8237b58eaf2aaa738608e3f8e21facf5a524`, tous deux chiffrés sur B2 et relus |
| Prochaine action | Depuis le compte administrateur sur l'interface déployée, revoir le rendu sur les appareils disponibles puis tester réellement `openai/gpt-4.1` avec la clé OpenAI ; n'activer qu'après le badge « Test réussi » |

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

Le parcours de réglage administrateur n'a encore appelé aucun fournisseur depuis ce déploiement :
la table `model_configurations` reste vide et la configuration serveur
`smart → openai/gpt-4.1` reste active. Afficher OpenAI, Anthropic, xAI ou Moonshot ne prouve
pas leur compatibilité. La clôture D05 exige le test réel borné du fournisseur choisi, la
vérification de l'identité retournée et l'activation explicite ; tout échec doit conserver la
configuration serveur actuelle. La revue sur appareils physiques reste distincte des captures CI.
D05 n'est ni clos ni intégré. Gantt/calendrier, édition, mindmap et Mycelium 3D restent en D06–D09.

## Exploitation à préserver

- Pilote API uniquement : LiteLLM `smart`, `openai/gpt-4.1`, sortie maximale 4096.
- Ne pas modifier ou perdre `LITELLM_SALT_KEY` ; elle forme avec la base LiteLLM le couple de récupération des futures clés gérées.
- Préserver les snapshots B2, les images de rollback et les cinq réservations historiques `uncertain`.
- Ne relancer ni Ollama, ni ancienne Task, ni campagne D04.
- Un checkout différent des conteneurs ne prouve jamais leur déploiement ; la version runtime attestée reste `c17c7e24…` jusqu'à une nouvelle opération explicite.

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [PR D05](https://github.com/fredbuhr/nevolium/pull/89)
