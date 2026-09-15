# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-15. Lire `AGENTS.md`, puis vérifier GitHub live avant toute action.

## D08 actif — revue finale de la mindmap 2D

| Champ | État attesté |
|---|---|
| Base intégrée | `main` = `a9edcd96b6227fe362765863aabbcacbbc53fa4f` ; D07 intégré par #91 |
| Branche / PR | `feat/d08-editable-mindmap`, **#92 ouverte et draft** ; ne pas recréer de branche |
| Dernier point entièrement qualifié avant le garde de session | `373635ebb377ca4615b1d08d84b62c581ab82296` : **9/9 workflows PR réussis**, dont UI `35005655461`. Artefact `10411308084`, SHA256 `3c90cb415062034cd3c4b2af72ef71ce539e0a4b8c77f2751e875088b1a1d8e6`, ZIP téléchargé et vérifié |
| Corrections validées à ce point | Langue sans relecture/restauration du workspace ; brouillon, projet et historique conservés ; déplacement conjoint de deux nœuds avec undo/redo et rechargement ; échec de sauvegarde visible puis retry ; écritures sérialisées sans acquittement périmé |
| Captures vérifiées | `desktop.png`, `stability-en.png` et captures du canevas : carte et contexte du projet visibles, aucun panneau vide en restauration. Ne pas réutiliser la capture défectueuse de `eaa2f3d…` comme preuve actuelle |
| Garde ajouté ensuite | `cc8615588f4a554d6e993f1b64f943dd6e372233` lie les PUT en attente à la session d'origine ; changement de sujet ou déconnexion interrompt la requête avant qu'un nouveau jeton transmette l'ancien contenu |
| Tests supplémentaires de ce checkpoint | `d08_layout_persistence_unit.mjs` exécute le vrai module de persistance transpilé avec hooks/session/transport simulés : dernière révision, snapshot immuable, retry, changement de compte pendant attente du jeton, ancienne session exclue, nettoyage des listeners et déconnexion. Importé par le scénario D08 existant |
| État de la tête courante | Le présent checkpoint descend du garde de session. **Consulter les neuf workflows de la tête live et le dernier bilan de #92** ; les résultats de `373635e…` ne qualifient pas les descendants |
| Prochaine action immédiate | Vérifier le résultat exact-head du scénario D08, y compris `D08 LAYOUT UNIT PASS` et son artefact. Si rouge, corriger seulement la cause identifiée dans le log/failure.json ; ne pas déclarer le lot clos sur un succès historique |
| Prochaine étape fonctionnelle si vert | Prouver l'ouverture d'un lien profond dans un contexte neuf, puis la conversion d'une branche d'idées en tâches explicitement planifiées et réellement visibles au Gantt. La conversion individuelle vers la liste Planning ne couvre pas ces critères |
| Portée des preuves | Chromium avec API simulée ; PostgreSQL réel dans un job séparé. Tests de session isolés avec doubles, pas session Keycloak réelle ni preuve Web→Core→PostgreSQL complète. Pas de validation sur matériel physique |
| Limite de persistance | Un PUT à la fois par client/workspace, pas résolution inter-onglets/coédition. Brouillon retenu et retry tant que le workspace reste monté ; ne pas promettre une sauvegarde offline durable. D12 porte les garanties offline/multi-appareils |
| Production / rollback | Production inchangée : aucune commande serveur, migration ou déploiement. Dernier runtime attesté D05 `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5`, schéma `0015_model_configurations` ; D06/D07/D08 non déployés. Correctifs Web/tests/documentation réversibles sans toucher aux données |
| Hors scope | D09 3D, D10 assistant opérant, D12 coédition/offline ; complétude FR/EN historique globale en D13. Pas de fusion implicite |

Les identités ne changent pas : liens dans `RelationshipRecord`, idées/notes/décisions dans les
`Document` D07, positions/viewport/groupes seulement dans `WorkspaceLayout`. La file de
persistance reste un adaptateur Web, pas un nouveau modèle métier.

Les tests du scénario initial sont conservés : provenance de conversion individuelle, liens,
undo/redo, groupes, exports FR/EN/reload téléchargés et relus, création de lien tactile sur
 téléphone émulé. Le scénario de stabilité ajoute de vraies interactions et assertions, pas des
sleeps ou une suppression des contrôles existants.

## D07 intégré et verrouillé

Head final qualifié `0db6df6326b553136ab8a375b30fddbe5f6b27aa` : 9/9 workflows PR verts ;
merge `f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4`, arbre
`ecd1947a1cf7f2adf2f6583b54748fdd62289e98` identique à l'arbre qualifié.

Une connaissance éditable reste un `Document` canonique. Chaque sauvegarde/restauration crée
une nouvelle `DocumentVersion`. Les chunks et l'index restent des projections reconstruisibles.
Les citations et la recherche cross-project restent owner-scoped. Lexical sérialise son état
dans `content_json`, le texte est une projection ; `nevolium-json` est l'échange lossless.

[PR D08 #92](https://github.com/fredbuhr/nevolium/pull/92) ·
[Checkpoint D07](docs/archive/d07-editable-knowledge-progress-2026-09-15.md) ·
[Plan](docs/implementation-plan.md) · [Workflow](docs/development-workflow.md) ·
[État produit](docs/status.md)
