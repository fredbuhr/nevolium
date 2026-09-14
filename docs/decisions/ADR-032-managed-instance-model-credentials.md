# ADR-032 : configurations modèle d'instance et clés gérées par LiteLLM

Date : 2026-09-14. Statut : accepté pour D05.

## Contexte

Le bootstrap du pilote lie l'alias `smart` à un modèle et une clé dans l'environnement protégé de
LiteLLM. D05 doit permettre à un administrateur de tester puis d'activer un autre couple
fournisseur/modèle sans modifier les workflows, exposer la clé au stockage Web ou donner un accès
Internet à Core. La policy OpenBao actuelle donne volontairement à Core un accès en lecture seule ;
la transformer en capacité générale d'écriture élargirait inutilement son autorité.

Le registre dynamique LiteLLM sait conserver une configuration de modèle et chiffrer ses paramètres
sensibles dans sa base. Cette donnée n'est donc pas une simple projection reconstructible depuis les
métadonnées Nevolium : sa frontière d'autorité doit être explicite.

## Décision

- PostgreSQL Nevolium conserve uniquement les métadonnées non secrètes : fournisseur, modèle,
  alias et identifiant de déploiement immuables, Task de test, état de vérification et activation.
- La clé saisie transite une seule fois, sous TLS, du formulaire administrateur vers Core. Core la
  transmet au endpoint de gestion LiteLLM sur le réseau interne `models`. Elle n'entre ni dans une
  table Nevolium, une Task, un événement, un audit, une réponse API, le cache du service worker ou
  un stockage navigateur. Le formulaire l'efface après toute tentative.
- LiteLLM est le magasin faisant autorité pour la valeur chiffrée de cette clé. Sa base et le secret
  stable `LITELLM_SALT_KEY` forment un couple de récupération : perdre l'un des deux impose de
  ressaisir les clés. Le sel est distinct de la master key, n'est jamais committé et sa rotation
  exige une migration LiteLLM revue.
- Core possède la master key LiteLLM uniquement pour cette gestion interne. Il rejoint `models`
  sans rejoindre `egress` ; seul LiteLLM contacte les fournisseurs. Le Worker conserve sa voie
  d'exécution existante et ne reçoit jamais les clés fournisseur.
- Un candidat obtient un alias propre. Une Task/Temporal bornée utilise le gateway, l'admission,
  les budgets et les usages canoniques, puis exige l'identifiant `x-litellm-model-id` attendu avant
  de rendre le candidat activable. Un démarrage Temporal indéterminé reprend le même workflow sans
  retransmettre la clé.
- Une activation est explicite, récente et sérialisée avec le drainage des appels. Les nouvelles
  Tasks figent l'alias actif ; les anciennes continuent d'utiliser leur alias retiré. Les
  déploiements vérifiés ou retirés restent donc enregistrés. Une candidate refusée est supprimée
  au mieux après sa transition terminale ; un échec de nettoyage doit être traité comme une dette
  d'exploitation, jamais en supprimant aveuglément un alias historique.

## Conséquences

La sauvegarde PostgreSQL de LiteLLM contient des clés chiffrées, mais ne suffit pas sans le sel
protégé correspondant. Les exercices de restauration futurs doivent inclure cette dépendance sans
imprimer sa valeur. Le rollback du code ou de la migration Nevolium ne supprime pas les entrées du
registre LiteLLM : leur usage par les Tasks historiques doit d'abord être examiné.

OpenBao reste le magasin des références de secrets génériques et des valeurs provisionnées par
l'opérateur. D05 ne lui accorde aucune écriture runtime. Le BYOK par compte, la rotation automatisée
et les politiques de rétention avancées restent hors de ce lot.
