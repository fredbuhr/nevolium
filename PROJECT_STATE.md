# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live.

## H5 clôturé ; D05 : navigation reliée à présenter à l’utilisateur

| Champ | État attesté |
|---|---|
| Base main vérifiée | `1896468513f92ee5c0d6a811301a1b898cc6abd2` |
| D04 / H5 | #88 intégrée ; `H5` vise `db07f7a90cc406ddc80683521bbf1744e3a2b668` ; branche D04 fusionnée supprimée |
| Branche / PR unique | `feat/d05-coherent-cockpit` · [PR #89](https://github.com/fredbuhr/nevolium/pull/89) |
| Dernière tête qualifiée avant correction | `639b48f369cd5317aa98d0679ddf51fdf9766068` : 10/10 workflows réussis ; runtime `c17c7e24…` identique hors checkpoint |
| Production | Checkout `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` ; Core `sha256:6e1c2dee…` et Web `sha256:40df2609…` reconstruits et actifs. Worker, Web MCP et LiteLLM restent sur le runtime D05 précédent |
| Données | Migration `0015_model_configurations` ; cinq réservations historiques `uncertain` conservées. Le premier essai utilisateur a échoué avant LiteLLM/OpenAI sur l’ordre d’insertion Task/configuration ; table toujours vide, configuration serveur conservée |
| Récupération | Sel LiteLLM stable provisionné sans affichage ; snapshot de récupération `cb0696461e1bc6a3cad54260dccd7b564e2d6d5c684c9f7174a0fd091a623bc5` et snapshot quiescent pré-D05 `71f19a4691a6a45891aa0d59dfcd8237b58eaf2aaa738608e3f8e21facf5a524`, tous deux chiffrés sur B2 et relus |
| Correction implémentée | Fil contextuel parent / voisinage / relations transversales canoniques ; activité centrée réversible ; fond neutre issu de la nouvelle référence ; logo vectoriel ; reçu/test/activation IA explicites ; Task du test persistée avant sa configuration liée |
| Tête vérifiée | Code `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` et compte rendu `d09158ff59b20cd0035ee3aae608b6b69bd85a42` : chacun 10/10 workflows réussis. Le véritable endpoint HTTP persiste la Task avant sa configuration dans PostgreSQL |
| Prochaine action | Recharger fortement l’application, effectuer un unique nouvel essai OpenAI, lire jusqu’au bout reçu/test/activation et contrôler ensuite la ligne canonique et le snapshot chiffré. PR #89 toujours ouverte et non intégrée |

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

La mise à jour Core/Web vers `e275b7b` a ensuite réussi : ingress `200|200|200|401|401|404`,
état final `0015_model_configurations|0|0|0|0|0|5`, images précédentes étiquetées pour retour,
snapshots inchangés. Elle n’a effectué aucun test fournisseur. Le premier essai utilisateur a produit
un `500` : PostgreSQL a refusé la configuration parce que sa Task référencée n’avait pas encore été
insérée. La transaction a été annulée, la table reste vide et l’ancienne configuration serveur reste
active ; la clé n’a atteint ni LiteLLM ni OpenAI. Le correctif est maintenant qualifié et actif ;
un unique nouvel essai utilisateur peut être effectué. Afficher OpenAI, Anthropic, xAI ou Moonshot ne prouve
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
- Le checkout et les images attestent ici le nouveau Core/Web ; Worker, Web MCP et LiteLLM n’ont pas été reconstruits pendant ce correctif.

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [PR D05](https://github.com/fredbuhr/nevolium/pull/89)
