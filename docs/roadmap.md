# Nevolium — ordre des livraisons

Révision : 2026-09-16. Le [plan détaillé](implementation-plan.md) porte périmètres, dépendances
et critères de sortie. Les [amendements acceptés](refoundation-contract.md) précisent les parcours,
les contrôles de données et l'ordre interne ; ils ne renumérotent aucun lot.
[PROJECT_STATE](../PROJECT_STATE.md) seul indique le travail actif et ses preuves.

**D01–D09 et H5 sont intégrés au dépôt**, y compris le bureau KISS #97. L'acceptation D09 reste
ouverte. Le dernier runtime attesté est `702c2a3…` (#96), distinct du Web KISS à préparer/activer.
D10 est planifié mais non commencé. L'adoption documentaire DOC-01 selon
[ADR-034](decisions/ADR-034-human-first-refoundation.md) reste rattachée à D09, sans changement de
code applicatif. Le détail opérationnel demeure dans le checkpoint, pas dans le backlog.

Décision du 13 septembre : génération et routage par API, OpenAI en premier. La qualification locale
est retirée du chemin actif. D04 a acquis les quatre preuves H5 : Research via OpenAI, charge bornée
du pilote, upgrade/rollback et restauration indépendante. D05 livre le sélecteur
fournisseur/modèle dans les réglages du cockpit ; D13 complétera le BYOK par compte.
Le LLM local attend une nouvelle décision et un meilleur matériel, sans échéance imposée à ces lots.
Voir l'[ADR-031](decisions/ADR-031-api-first-pilot.md).

| Phase | Lots, dans l'ordre nominal | Résultat |
|---|---|---|
| A — fiabilité | D01 Worker borné → D02 admission/budgets/données → D03 déploiement/topologie → D04 preuves réelles H5 | Socle utilisable et récupérable, limites connues |
| B — parcours cohérent | D05–D08 existants → D09 réception KISS et gestes manuels → D10 commandes/données, capture/liens, assistant, voix Web et première mission interne | Capturer, comprendre et travailler dans le même contexte, manuellement ou par délégation |
| C — vie quotidienne | D11 fournisseur connecté complet → D12 continuité limitée → D13 pilote personnel | Usage autonome, deux comptes isolés au moins, export/effacement/restauration ; FR/EN et accessibilité dès chaque parcours |
| D — présence/autonomie étendue | D14 Desktop → D15 voix enrichie → D16 automatisations/browser avancés → D17 agent dev | Accès locaux et capacités supplémentaires sous permissions |
| E — extensions/exploitation | D18 finance/crypto lecture → D19 simulations → D20 maison/cartes → D21 capacité/coûts → D22 distribution | Modules utiles puis lancement maîtrisé |

## Précisions acceptées et critères

Les [24 éléments d'acceptation](refoundation-backlog.md) conservent les identifiants du dossier
validé. Un seul Dxx reste actif ; ces éléments ne sont pas des sous-lots par fichier.

D09 reçoit la correction déjà intégrée avant diagnostic final des manques. L'extension explicitement
acceptée couvre la création/liaison dans les vues et la continuité sur API existantes. Un nouveau
modèle serveur nécessite un rattachement motivé ; ne pas rouvrir toutes les fondations D04–D08.
Les exemples complètent des manques observés, sans rejouer aveuglément le corpus importé.

D10 commence par contrats de commandes et contraintes consultation/traitement/transmission avant
nouveaux flux personnels. Capture privée, cycle de vie, liens sourcés/corrigibles et évaluation sur
corpus brut précèdent l'assistant opérant. Voix volontaire et première mission interne utilisent
ces opérations. La mission n'attend pas un outil de publication ni l'agent de navigateur D16.

D11 livre un fournisseur réellement utile : lecture/préparation, scopes, révocation et cycle de vie.
Un premier effet externe suit sa qualification/autorisation propre ; un second fournisseur valide
ensuite la réutilisation du contrat. D12–D13 n'attendent pas l'offline total, la coédition avancée ou
les agents d'appareil pour qualifier le pilote quotidien retenu.

DATA-01 couvre aussi les flux IA/recherche déjà actifs. Le [registre de gouvernance](data-governance.md)
maintient les inconnues et déclencheurs. Les obligations juridiques effectivement applicables se
traitent immédiatement : D22 n'est pas une permission de différer une échéance. Les dépenses et
estimations de durée seront recalibrées après deux tranches réellement observées.

La [cible multi-appareil retenue](decisions/ADR-029-server-personal-and-offline-clients.md) privilégie
le serveur et permet le même backend sur PC personnel. D05 prépare le Web/PWA adaptatif, D12 porte
le hors ligne borné et la synchronisation, D13 le pilote PC/mobile/tablette, D14 l'enveloppe Desktop
et D22 les installateurs/matrices de compatibilité. Aucun nouveau lot n'est créé.

## Jalons

1. **Socle post-audit :** D04 terminé, tag H5 et rapport de vrais moteurs/récupération.
2. **Premier assistant utile :** D10 terminé, capture et relations explicables, planification,
   voix Web et mission interne récurrente sur les mêmes données ; parcours manuels et contrôles de données qualifiés.
3. **Pilote personnel :** D13 terminé, comptes isolés, usage quotidien, export/effacement/restauration.
4. **Assistant étendu :** D17 terminé, appareils/voix/automatisations sous permissions.
5. **Offre distribuable :** D22 terminé pour un périmètre et une capacité explicitement validés.

Les dépendances précises du plan permettent de déplacer un module optionnel si l'utilisateur
le priorise, sans sauter ses prérequis ni laisser deux branches de développement actives.
La totalité des modules spécialisés n'est pas nécessaire au pilote D13. La 3D fait partie
du produit visé, mais une voie 2D accessible reste disponible. Recherche et création,
Projets et activité, Vie personnelle sont trois contextes d'un seul produit.

## Passage depuis l'ancien plan

- R0–R7 : reset terminé. Ne plus le reprendre comme prochaine étape.
- H1–H3 : intégrés ; le P0 de dispatch H4 est corrigé par #83.
- H4 affecté à D01–D03 : terminé ; H5 affecté à D04 : terminé et tagué.
- G51 : base de planification présente, reprise dans D06.
- Anciens blocs 0–2 : fondations présentes, intégrations optionnelles encore à finir.
- Ancien bloc 3 : D05–D13 ; bloc 4 : D11–D16 ; bloc 5 : D17–D20 ; bloc 6 : D01–D04/D21–D22.

Le registre des composants reste plus large que le runtime nécessaire. Déclarer un moteur
n'impose pas de le démarrer ni de lui fabriquer un consommateur. Les décisions KISS de l'audit
priment sur une conservation historique sans usage.
