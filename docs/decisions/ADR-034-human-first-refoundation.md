# ADR-034 — refondation centrée sur les parcours et la maîtrise des données

Date : 2026-09-16. Statut : **accepté par l'utilisateur**.

## Décision et portée

Après le dossier de refondation du 16 septembre, l'utilisateur a demandé :
« parfait, commence le travail dans la nouvelle direction souhaitée ».
Cette décision adopte la direction produit, les amendements et leurs critères de sortie.
Elle ne transforme ni une capacité prévue en capacité livrée, ni une revue juridique en
certification. Elle ne vaut pas nouvelle autorisation implicite de déploiement ou d'effets externes.

[ADR-033](ADR-033-kiss-contextual-mycelium.md) reste valide : Mycelium comme bureau transparent,
repères stables, sources et contrôle utilisateur, réemploi de Core et des moteurs existants.
Le [contrat de refondation](../refoundation-contract.md) précise les parcours, les publics,
les frontières de données et l'ordre des travaux. Il complète les documents existants sans
remplacer leurs preuves. Les D01–D22 gardent leurs identifiants ; un seul gate reste actif.

## Choix acceptés

1. **Un espace de pensée et d'action.** Préserver le contexte des idées, connaissances et projets.
   Une pensée peut rester ouverte. L'IA aide à réfléchir et exécute un travail explicitement délégué ;
   elle ne décide pas des intentions ni du jugement à la place de la personne.
2. **Le manuel d'abord.** Créer, éditer, relier et planifier doit être possible dans les vues de
   travail sans appel LLM. Geste, texte, voix et agent utilisent les opérations canoniques ;
   aucune voie d'écriture ou permission spéciale n'est accordée au modèle.
3. **La 3D est une représentation, pas une obligation.** Bureau organique transparent conservé,
   panneaux lisibles, contexte au retour, clavier/tactile et 2D/liste équivalents. Son utilité se
   mesure sur les mêmes tâches ; une capture d'écran ne prouve pas une meilleure facilité d'usage.
4. **Trois contextes initiaux.** Recherche et création, Projets et activité, Vie personnelle.
   Exemples et vues d'un même produit, pas trois applications ni des packs qui accordent des droits.
   Le pilote d'usage vise quelques adultes ; les usages sectoriels sensibles attendent une revue propre.
5. **Des objets typés reliés.** Conserver les modèles canoniques ; ne pas tout migrer en nœuds
   génériques. Les vues adaptées partagent l'identité ; une source n'est pas automatiquement une tâche.
6. **Des missions explicites.** Objectif, périmètre, résultat, fréquence/durée, budget, arrêt et
   historique. Première récurrence à résultat interne, sans publication, envoi, transaction ou action
   locale. Une question simple ne crée pas un engagement permanent.
7. **Trois axes de permission.** Consultation, traitement par un fournisseur et transmission à un
   tiers sont séparés. Sources, extraits, mémoire, index, traces, audio et sauvegardes sont concernés.
   Les flux déjà actifs entrent dans l'inventaire ; BYOK et serveur UE ne prouvent pas leur conformité.
8. **Les preuves déterminent la livraison.** Code intégré, test simulé, intégration réelle,
   déploiement, appareil physique et acceptation utilisateur sont des états distincts.
   Les exigences juridiques déclenchées se traitent sans attendre un lot commercial futur.

## Séquence autorisée, sans nouvelle numérotation

Le point de départ est **DOC-01**, travail documentaire rattaché au D09 ouvert. Il ne contient
ni modification applicative, ni migration, import, appel IA ou activation serveur. La revue
juridique d'applicabilité et l'inventaire DATA-01 sont des contrôles transversaux, pas des branches
de fonctionnalités parallèles. Les inconnues restent ouvertes jusqu'à preuve.

Ensuite D09-REC-01 : recevoir la version KISS déjà intégrée selon la procédure existante.
Les correctifs d'usage D09-UX et les exemples répondent aux manques constatés sur cette version.
**Extension de périmètre D09 explicitement adoptée :** gestes manuels manquants et continuité,
en réutilisant les API existantes. Un nouveau modèle serveur exige une décision de rattachement,
pas une extension silencieuse. Les preuves D04–D08 ne sont pas rouvertes en bloc.

D10 commence seulement après sortie D09. Contrats de commandes et contrôles des flux avant
nouveaux traitements personnels ; capture, liens corrigibles et évaluation indépendante ;
assistant sourcé ; voix volontaire et mission interne. D11 raccorde un fournisseur complet.
D12–D13 qualifient continuité limitée, export/effacement/restauration et usage quotidien.
Les extensions D14–D22 restent conditionnelles. Les estimations de délai sont à recalibrer.

## Matériaux et limites

Le PDF utilisateur « Design Interface », quatre pages, signale surcharge d'interface,
ruptures de navigation, fonctions manuelles difficiles à découvrir ou absentes, agents invisibles
et exemples insuffisants. Il reste privé : ni les captures ni un export des conversations ne sont
publiés. Les amendements et le backlog du dossier sont repris sous forme de contrats versionnés.
La mémoire conversationnelle sert aux intentions ; GitHub live reste la vérité du code.

Instantané de départ lu : `e03546a34e502dda00274d4eef5fbc532052a636`. PR #97 intégrée ; son Web
reste à préparer/activer selon les preuves opérateur. Le runtime et la prochaine action ne sont
pas figés par cette ADR : relire [PROJECT_STATE](../../PROJECT_STATE.md).
