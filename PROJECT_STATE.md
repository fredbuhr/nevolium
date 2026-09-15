# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live.

## H5 et D05 intégrés ; D06 non commencé

| Champ | État attesté |
|---|---|
| Point de départ vérifié de ce checkpoint | `5dca7abf5ad3ae3b75b704681e782cc3dd50b54f` |
| D04 / H5 | #88 intégrée ; `H5` vise `db07f7a90cc406ddc80683521bbf1744e3a2b668` ; branche D04 fusionnée supprimée |
| D05 | [PR #89](https://github.com/fredbuhr/nevolium/pull/89) intégrée par `66f1e6991fb6df09bcb12678b8aadc007934f01a` ; arbre identique à la tête qualifiée `e66a22d01ce644f779c6eaf3c04d11ce25a47ac3` |
| Branche / PR active | Aucune ; branche D05 fusionnée retirée et aucune PR ouverte |
| Dernière tête qualifiée avant correction | `639b48f369cd5317aa98d0679ddf51fdf9766068` : 10/10 workflows réussis ; runtime `c17c7e24…` identique hors checkpoint |
| Production | Checkout `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` ; Core `sha256:6e1c2dee…` et Web `sha256:40df2609…` reconstruits et actifs. Worker, Web MCP et LiteLLM restent sur le runtime D05 précédent |
| Données | Migration `0015_model_configurations` ; une configuration OpenAI `openai/gpt-4.1` testée puis activée, Task et workflow terminés, un usage canonique à `0.000090 USD` ; aucune activité en cours et cinq réservations historiques `uncertain` conservées |
| Récupération | Anciens snapshots `cb069646…` et `71f19a46…` conservés ; snapshot post-activation `e374714cb3bc55b01b55ad6dc69411faec9a55d32602d9652285353f8d267cbc` et matériel LiteLLM chiffré `a3f6720d818ae659be2148ab301a9da156b67d23674fa015f87f697eea4b600e`, restauré à l’identique ; 33 515 561 octets relus intégralement |
| Correction implémentée | Fil contextuel parent / voisinage / relations transversales canoniques ; activité centrée réversible ; fond neutre issu de la nouvelle référence ; logo vectoriel ; reçu/test/activation IA explicites ; Task du test persistée avant sa configuration liée |
| Validation finale | Tête `e66a22d01ce644f779c6eaf3c04d11ce25a47ac3` : 10/10 workflows réussis ; commit de fusion signé, parents main/D05 et arbre exact vérifiés |
| Prochaine action | Après annonce explicite du lot, examiner D06 et ouvrir une seule branche fraîche depuis le `main` live. La revue ergonomique sur appareils physiques reste un suivi produit |

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

La mise à jour Core/Web vers `e275b7b` a réussi avant le second essai. Le premier essai utilisateur
avait produit un `500` avant LiteLLM/OpenAI, sans ligne persistée ; le correctif a supprimé ce défaut
d’ordre d’insertion. Le second essai borné a ensuite reçu une réponse réelle attribuée à
`openai/gpt-4.1`, comptabilisée `0.000090 USD`, puis l’utilisateur a explicitement activé cette
configuration. PostgreSQL confirme l’unique ligne active, sa Task et son workflow terminés, ainsi
qu’un usage canonique. La sauvegarde quiescente post-activation a créé `e374714c…`; le couple de
récupération LiteLLM a créé `a3f6720d…`, restauré à l’identique. `restic check --read-data` a relu les
12 packs sans erreur. OpenBao a été redéscellé et l’ingress final vaut `200|200|401|404`.

Cette preuve qualifie OpenAI seulement. Afficher Anthropic, xAI ou Moonshot ne prouve toujours pas
leur compatibilité. La revue sur appareils physiques reste distincte des captures CI. D05 est
intégré par #89. Gantt/calendrier, édition, mindmap et Mycelium 3D restent en D06–D09.

Le retour utilisateur rouvre la validation de navigation : les fenêtres classiques et le paysage
ne répondaient pas suffisamment au concept. La [correction reliée](docs/archive/d05-connected-navigation-2026-09-14.md)
est implémentée, qualifiée et déployée avec Core/Web sur la même PR, sans nouvelle migration.
L’inspecteur ne crée aucune relation et ne lance aucune IA. Les exemples du scénario navigateur
restent des fixtures ; le test fournisseur et l’activation du pilote sont consignés séparément.

## Exploitation à préserver

- Pilote API uniquement : LiteLLM `smart`, `openai/gpt-4.1`, sortie maximale 4096.
- Ne pas modifier ou perdre `LITELLM_SALT_KEY` ; elle forme avec la base LiteLLM le couple de récupération des futures clés gérées.
- Préserver les snapshots B2, les images de rollback et les cinq réservations historiques `uncertain`.
- Ne relancer ni Ollama, ni ancienne Task, ni campagne D04.
- Le serveur reste volontairement au checkout exécutable `e275b7b` et aux images qualifiées ; la fusion documentaire de `main` ne constitue pas un nouveau déploiement.

[État produit](docs/status.md) · [Plan](docs/implementation-plan.md) ·
[Workflow](docs/development-workflow.md) · [PR D05](https://github.com/fredbuhr/nevolium/pull/89)
