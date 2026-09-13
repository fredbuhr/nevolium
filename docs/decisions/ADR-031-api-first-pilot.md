# ADR-031 : pilote par API, IA locale différée

Date : 2026-09-13. Statut : accepté, sur demande explicite de l'utilisateur.

## Contexte

D04 a accumulé des essais de petits modèles locaux : latence sous quota CPU, mauvaise planification,
synthèse non JSON puis échec DNS au téléchargement du candidat Qwen3. Ces essais ne servent plus
l'objectif du premier pilote. La présélection locale ne doit pas conditionner le passage à D05.

## Décision

- Le pilote utilise exclusivement des API pour la génération et le routage. Premier fournisseur :
  OpenAI. Le modèle initial `openai/gpt-4.1` conserve le transport Chat Completions et les sorties
  structurées utilisés par le gateway, sans changement de SDK, de schéma métier ni d'image LiteLLM.
  Ces capacités sont documentées par [OpenAI](https://developers.openai.com/api/docs/models/gpt-4.1) ;
  la qualité et la comptabilité restent à vérifier sur l'instance Nevolium.
- L'alias logique `smart` désigne l'API choisie. L'opérateur renseigne ensemble `NEVOLIUM_API_MODEL`
  et `NEVOLIUM_API_KEY`, uniquement côté LiteLLM. Changer vers Claude, Grok ou Kimi consiste à
  sélectionner le fournisseur/modèle et sa propre clé. Aucune clé OpenAI n'est réutilisée implicitement.
  L'alias explicite `alternative` reste compatible avec les routes existantes.
- Core choisit et persiste l'alias/estimation des nouvelles Tasks Research. Le Worker consomme ce
  contexte. Les usages, budgets, droits, citations et identifiants canoniques restent communs.
- D05 livrera le sélecteur de fournisseur et de modèle dans les réglages de l'instance, avec droits
  d'administration, état de connexion et secrets conservés côté serveur. D04 prépare le raccordement
  par configuration ; il ne déclare pas cette interface déjà livrée.
- Ollama/vLLM sont retirés du parcours de production. Leur qualification CI devient manuelle,
  isolée et facultative. Le code historique et les anciens usages `local-fast` sont conservés pour
  lecture et tests ; aucun nouvel essai local ne fait partie de D04, D05 ou D13.
- Le LLM local ne sera réintroduit qu'après une nouvelle décision et un matériel adapté. Les modèles
  techniques déjà qualifiés de parsing PDF/embeddings restent dans leurs adaptateurs existants ;
  ils ne sont pas le moteur conversationnel remplacé ici.

## Conséquences et limite de D04

Avant tout changement de modèle derrière un alias, vider les travaux en cours et conserver la
configuration précédente. Une requête déjà partie ne doit pas changer de fournisseur en reprise.
Aucun fallback payant automatique, contournement du budget, nouvel achat ou effacement d'incident.
Les clés ne sont ni renvoyées au navigateur ni présentes dans les rapports et commits.

D04 se termine avec un seul fournisseur réel qualifié, la charge bornée du pilote et les preuves
existantes complétées d'upgrade/rollback et de restauration indépendante. Les essais réels de tous les
fournisseurs, le benchmark de modèles et le sélecteur produit ne sont pas des gates supplémentaires.
Cette décision remplace les obligations locales des anciennes versions du plan D04/D13.
