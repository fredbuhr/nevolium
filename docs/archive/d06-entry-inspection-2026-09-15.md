# D06 — audit d’entrée et fondation multilingue

Date : 2026-09-15

## Point de départ canonique

- `main` inspecté : `03a1fcf348361f870556e0c8808cae5d70970394` (`docs(d05): record branch cleanup`).
- D05 est intégré par la PR #89 ; sa branche de travail a été supprimée.
- Aucun pull request n’était ouvert au démarrage de D06.
- Branche D06 ouverte depuis ce `main` : `feat/d06-planning-workspace`.
- Le dernier checkpoint fonctionnel D05 `e66a22d01ce644f779c6eaf3c04d11ce25a47ac3` a 10/10 workflows GitHub Actions réussis. Les commits suivants jusqu’au point de départ D06 sont la fusion et la documentation de clôture de D05 ; ce constat ne prétend pas qu’un run CI distinct a été produit pour le commit documentaire `03a1fcf…`.

## Audit de reprise

L’audit a relu au minimum `AGENTS.md`, `PROJECT_STATE.md`, `docs/status.md`, `docs/implementation-plan.md`, l’arbre complet du dépôt, le shell Web D05, les workspaces Today/Projects, le navigateur de contexte, le modèle et l’API de planification ainsi que les contrats de fumée correspondants.

Aucun nouveau bloqueur P0/P1 n’a été identifié avant D06. Les frontières de sécurité et d’isolation qui ont été durcies jusqu’à D04 restent couvertes par les workflows verts du dernier checkpoint fonctionnel D05. Aucun `TODO` ou `FIXME` indexé ne cache un travail critique connu. Cela ne remplace pas les gates de tests à exécuter à chaque tranche D06.

## État réel de la planification avant D06

La source de vérité existe déjà sur `Task` pour :

- `priority` ;
- `planned_start_at` ;
- `planned_end_at` ;
- `due_at` ;
- `started_at` et `completed_at`.

La migration `0012_task_planning` impose une priorité bornée et une fenêtre planifiée cohérente. L’API `PATCH /v1/tasks/{task_id}` et `GET /v1/today` réutilise ces champs. Le contrat `daily_spine_contract.py` vérifie notamment les timestamps avec fuseau et le jour DST de 23 h à Paris. Today, Calendar et Gantt ont donc déjà le bon principe : une seule tâche canonique et non des copies spécifiques à chaque vue.

D06 doit encore modéliser explicitement les éléments demandés par le plan :

- sous-tâches ;
- jalons ;
- dépendances orientées entre tâches avec détection de cycles ;
- progression adaptée au Gantt sans dupliquer l’état d’exécution ;
- calendrier de travail ;
- récurrences idempotentes ;
- version/conflit de planification pour permettre aperçu, validation et annulation ;
- chemin critique déterministe sur un périmètre explicitement défini.

Ces informations ne doivent pas être cachées dans un JSON propre au Gantt ou au Kanban. Les vues list/table/Kanban/Gantt/calendrier doivent projeter les mêmes objets canoniques.

Le package `packages/gantt` est actuellement un contrat minimal (`ScheduledTask`, `PlanVersion`) et non un moteur métier. Il peut évoluer comme adaptateur de représentation, mais PostgreSQL/Core restent l’autorité métier.

## Réemploi UI déjà disponible

Le client Web possède déjà les dépendances nécessaires à D06 :

- `@tanstack/react-table` pour liste/table ;
- `@dnd-kit/core` pour les interactions Kanban ;
- `@schedule-x/calendar` et `@schedule-x/react` pour le calendrier ;
- `@svar-ui/react-gantt` pour la vue Gantt.

Aucune nouvelle librairie de planification ne doit être ajoutée sans besoin démontré.

## Audit FR/EN

Le Web n’a aujourd’hui aucune couche i18n. Le français est encodé en dur dans les composants et à plusieurs frontières fonctionnelles :

- chaînes visibles, messages d’erreur et attributs ARIA ;
- formatage de dates en `fr-FR` ;
- recherche locale utilisant `toLocaleLowerCase('fr')` ;
- Assistant avec `locale: 'fr-FR'` ;
- News avec `language: 'fr'` et voix française par défaut ;
- `index.html`, page hors-ligne et manifeste PWA déclarés en français.

Il serait donc incorrect de qualifier l’application de bilingue en traduisant seulement les boutons.

Le plan global garde « FR/EN de base » comme critère de complétude D13. Cependant, D06 va multiplier les surfaces et les libellés. La décision d’entrée D06 est donc de poser maintenant une fondation multilingue extensible, puis de conserver D13 comme gate de complétude du produit entier.

### Contrat multilingue D06

1. Langues initiales : `fr` et `en` ; aucune logique ne doit supposer qu’elles seront les seules langues futures.
2. Le choix utilisateur est explicite et persistant ; la langue du navigateur sert uniquement de valeur initiale lorsqu’aucun choix n’existe.
3. Une couche centrale fournit langue, locale BCP-47, formatage et catalogue ; les composants ne choisissent pas eux-mêmes `fr-FR` ou `en-*`.
4. `document.documentElement.lang` suit la langue active.
5. Assistant et News reçoivent la langue/locale active. Les voix audio doivent être choisies via une table de capacités réellement supportées, jamais déduites d’un nom de langue non vérifié.
6. Les textes ARIA, erreurs et états vides font partie de la traduction.
7. Les métadonnées statiques/PWA doivent être neutres ou cohérentes avec la stratégie multilingue ; elles ne doivent pas annoncer à tort un produit exclusivement français.
8. Les futures langues ajoutent un catalogue et une configuration de locale, sans réécrire les composants métiers.

## Ordre de réalisation D06

L’ordre retenu est :

1. fondation FR/EN et suppression des constantes de locale dans les surfaces touchées par D06 ;
2. modèle canonique D06 (hiérarchie, jalons, dépendances, récurrence/versionnement nécessaires) avec migrations et contrats ;
3. API de lecture/édition et aperçu de replanification, sans mutation implicite ;
4. liste/table et Kanban sur les mêmes tâches ;
5. calendrier et Gantt ;
6. détection de cycles, chemin critique et scénarios de replanification ;
7. qualification navigateur/appareils et documentation de clôture.

Chaque étape doit préserver l’isolation owner-scoped, la pagination, l’audit/outbox et les contraintes de tâches pilotées par workflow déjà présentes.

## Gate d’entrée

D06 peut démarrer sur cette base. Le lot ne doit pas réimplémenter Today ni créer un second modèle de tâches. La première modification fonctionnelle doit établir la fondation de locale avant l’ajout massif de nouvelles chaînes d’interface.
