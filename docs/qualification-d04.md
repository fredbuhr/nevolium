# D04 : protocole de sortie du pilote par API

Révision : 2026-09-13. Une branche et une PR : `hardening/d04-real-engine-qualification`,
[#88](https://github.com/fredbuhr/nevolium/pull/88). [PROJECT_STATE](../PROJECT_STATE.md) est le point
opérationnel courant. H5 reste ouvert tant que les quatre preuves ci-dessous ne sont pas acquises.

## Périmètre fixé

OpenAI est le seul fournisseur à qualifier maintenant, via l'alias LiteLLM `smart`.
La [décision API](decisions/ADR-031-api-first-pilot.md) retire Ollama, vLLM, les benchmarks et la
présélection Qwen du chemin de sortie. Le sélecteur d'API appartient à D05. Aucun essai de Claude,
Grok ou Kimi n'est nécessaire pour fermer D04.

Les preuves acquises sur cible restent valides dans leur périmètre : durcissement/TLS/OIDC/MFA,
OpenBao et renouvellement, PDF Docling propriétaire, Mem0/Graphiti, rejeu sans doublon.
Les modèles techniques de PDF/embeddings restent dans les adaptateurs existants.
Les [preuves serveur](archive/server-foundation-2026-09-11.md), le
[rapport CI](archive/qualification-d04-2026-09-11.md) et l'[audit D04](archive/d04-progress-audit-2026-09-13.md)
conservent mesures et limites. Le [protocole local remplacé](archive/qualification-d04-local-protocol-2026-09-13.md)
est historique ; ne pas exécuter ses prochaines actions.

## Quatre preuves restantes

| Preuve | Scénario et seuil fixé avant mesure | Fin de vérification |
|---|---|---|
| Research via OpenAI | Deux nouvelles Tasks séquentielles ; chacune termine dans la borne existante de 600 s, fait `web.search` puis `web.fetch`, produit une synthèse factuelle citée ; deux usages modèle avec tokens/coût reportés et réservations réglées | Deux résultats canoniques consultables, sans nouvel état financier inconnu ni doublon |
| Charge du pilote | Lectures 1/10/100/1 000 clients virtuels, concurrence 20, zéro erreur, p95 ≤2 s et 180 s maximum par palier ; puis un Research + un PDF + une projection mémoire sous les quotas existants | Pas d'OOM, dépassement de quota ni travail oublié ; PDF ≤210 s, mémoire ≤240 s et Research ≤600 s hors attentes d'admission mesurées séparément |
| Upgrade et rollback | Garder les anciennes images/configurations ; activer Core/Worker/Web/LiteLLM cohérents, contrôler santé et frontières, revenir aux images précédentes puis au candidat, sans rétrograder le schéma ni exécuter d'ancienne Task | Données/IDs inchangés, services prêts, OIDC/accès propriétaire et refus anonyme corrects |
| Restauration indépendante | Backup Restic chiffré de la cible, transfert hors serveur, restauration en environnement isolé sur volumes neufs avec les procédures existantes | Lecture SQL, message JetStream, objet SeaweedFS et secret OpenBao attendus ; rapport identifiant source/destination et versions |

Ce sont des critères de pilote, pas une certification commerciale ni 1 000 générations simultanées.
La restauration de deux VM CI prouve le mécanisme, pas encore la récupération du serveur utilisateur.

## Activation cohérente, une seule fois

1. Vérifier le head de #88 et ses workflows requis. Le job local optionnel est normalement `skipped`.
   Conserver images de rollback, configuration protégée et identifiant de snapshot avant activation.
2. Dans `/etc/nevolium/production.env`, préparer le couple `NEVOLIUM_API_MODEL=openai/gpt-4.1` et
   `NEVOLIUM_API_KEY` avec la clé OpenAI. Conserver `smart` pour Research, News et routage sémantique,
   et `NEVOLIUM_RESEARCH_MODEL_ESTIMATED_COST_USD=0.10`. La clé reste sur le serveur, jamais dans la
   commande partagée, le navigateur ou le rapport. Le [guide](deployment.md#selection-du-fournisseur-api)
   décrit la configuration. Cette préparation seule ne prouve pas l'accès au fournisseur.
3. Construire Core, Worker et Web avant leur remplacement. Ne pas lancer de Task pendant cette opération.
   Relever l'état des workflows, documents/projections, invocations et réservations avant la bascule.
   `/v1/work-capacity` seul ne prouve pas l'absence d'appels modèle : vérifier aussi les réservations
   `reserved`/`started` et les exécutions. Conserver les cinq historiques `uncertain` sans les effacer.
4. Après inactivité, arrêter l'ancien Ollama et recréer seulement les services concernés avec le
   profil `ai`, sans `local-ai`/`gpu`. Utiliser les overlays production/Web MCP déjà actifs. Conserver
   le volume Ollama sans télécharger ni supprimer de modèle. La procédure de rollback conserve les
   données ; elle ne doit pas rouvrir l'usage local pour le pilote.
5. Vérifier santé, authentification, Web MCP et présence des pollers. Noter le SHA réellement installé
   pour chaque composant ; un checkout Git à jour ne prouve pas qu'un conteneur est à jour.

Le garde `scripts/ops/production.py check --profile memory --profile ai --web-mcp` analyse la topologie
sans révéler les secrets. Il refuse les routes locales, les identifiants de modèle non pris en charge
et une clé manquante/placeholder. Il ne vérifie ni la validité de la clé chez le fournisseur ni son crédit.

## Research : résultat observable, sans nouvelle boucle de présélection

Employer l'interface ou l'endpoint existant `POST /v1/research/runs` avec un projet appartenant au compte,
`model_alias=smart`, `max_tool_calls=2` et `estimated_model_cost_usd=0.10`. Question fixe :

> Recherche les informations officielles sur Debian 13. Utilise web.search, puis web.fetch pour lire
> une source officielle trouvée. Donne le nom de code et la date de publication initiale avec les citations.

Enregistrer immédiatement le nouvel UUID et l'heure avant d'attendre le résultat. Le nom de l'essai
reste dans le rapport, jamais ajouté à la question. Vérifier la requête de recherche, le contenu fetché,
la correspondance des affirmations avec les sources et les liens de citation dans l'artefact.
Le second essai est une nouvelle Task ; aucun rejeu de COLD-03, COLD-04 ou COLD-05.

Relever les phases planning/synthèse, appels MCP, latence, modèle réellement reporté, tokens, coût,
réservations, IDs d'artefacts et état terminal. Les clés d'outil nommées explicitement dans la question
sont obligatoires et ordonnées ; leur omission invalide le plan avant tout outil et toute synthèse.
Si le plan ne connaît pas encore l'URL de `web.fetch`, le Worker la lie sans nouvel appel modèle à la
première URL HTTP(S) du dernier `web.search` terminé. L'entrée canonique de fetch doit contenir cette
URL résolue, jamais le marqueur de dépendance proposé par le modèle.
Une recherche Web générale n'est ni limitée aux actualités ni à une période implicite. Une demande de
source officielle doit planifier un filtre `site:` explicite ; le Worker refuse le plan avant tout outil
si ce filtre manque et retire toute période que la demande n'a pas explicitement requise. La liaison
respecte le domaine et échoue avant Fetch si Search ne renvoie aucun résultat correspondant. Une erreur
MCP déjà retournée est terminale pour cette tentative et ne déclenche pas dix lectures identiques.
Les deux usages par Task doivent être réglés une seule
fois ; l'absence d'en-tête de coût pour `smart` ne vaut pas un coût nul. Les estimations/bornes de tokens
ne garantissent pas un plafond fournisseur en dollars ; conserver les limites canoniques existantes.
La réponse publique de LiteLLM peut conserver l'alias dans son champ `model` ; l'attribution canonique
préfère donc son en-tête de déploiement `x-litellm-model-name`. Le plafond de sortie du pilote API est
`4096`, conformément à la configuration documentée, et non l'ancienne valeur `256` du modèle local.

Un échec arrête cette paire : garder toutes les preuves, ne pas rejouer automatiquement un appel dont
l'issue est inconnue. Corriger seulement le défaut observé puis refaire le scénario affecté.
Ne pas ajouter de modèle candidat, de retry silencieux, de réparateur de prompts ou de nouveau runner.

## Mesure de charge et récupération

Réutiliser `scripts/qualification/target.py` : `inventory` sur le serveur, `preflight` puis `load`
depuis un générateur identifié. Utiliser des chemins de rapport distincts pour ne pas écraser les preuves.

```bash
python scripts/qualification/target.py preflight \
  --core https://api.example.org --tokens-file /chemin/prive/access-tokens.json \
  --output .nevolium-qualification/evidence/api-access.json
python scripts/qualification/target.py load \
  --core https://api.example.org --tokens-file /chemin/prive/access-tokens.json \
  --concurrency 20 --p95-seconds 2 --stage-timeout 180 \
  --output .nevolium-qualification/evidence/api-read-load.json
```

Le fichier privé est un tableau JSON de jetons d'accès. TLS reste vérifié. Le rapport sépare comptes
réels, clients virtuels, requêtes et concurrence. Une erreur de frontière arrête le test avant charge.
Pour la séquence mixte, utiliser les parcours existants, relever attentes d'admission et durée d'exécution
séparément ; aucun élargissement de délai après mesure pour transformer un échec en succès.

L'[exploitation](operations.md#restore) et le
[déploiement](deployment.md) portent les procédures de sauvegarde, d'activation et de retour arrière.
Les scripts CI destructifs `recovery.py`/`local_services.py` restent réservés aux projets jetables.
Ne jamais superposer un overlay de qualification et la production existante.

## Règle de clôture

Une fois ces quatre preuves acquises et les workflows requis verts, consigner versions/matériel,
résultats/limites et anomalies sans P0/P1 bloquant le pilote ; finaliser #88, intégrer D04 et marquer H5.
D05 commence alors par le cockpit et ses réglages d'API. Aucun nouveau sous-lot D04, benchmark local,
requalification de tous les OS ou test de tous les fournisseurs ne s'ajoute à cette liste.
