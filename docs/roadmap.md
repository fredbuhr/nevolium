# Nevolium — ordre des livraisons

Révision : 2026-09-16. Le [plan détaillé](implementation-plan.md) porte périmètres, dépendances
et critères de sortie. [PROJECT_STATE](../PROJECT_STATE.md) seul indique le lot actif et les preuves.
La table donne le séquencement ; elle ne déclare pas tous les lots livrés. **D01–D09 et H5 sont
intégrés au dépôt**, avec correctif Accueil #96. **Lot actif : complément D09 KISS**,
bureau transparent et navigation simplifiée selon l'[ADR-033](decisions/ADR-033-kiss-contextual-mycelium.md).
D10 est planifié mais non commencé. Le dernier runtime attesté est le correctif `702c2a3` :
stabilisation et import du corpus réussis, acceptation produit encore ouverte.
Le détail opérationnel et les preuves restent dans le checkpoint.

Décision du 13 septembre : génération et routage par API, OpenAI en premier. La qualification locale
est retirée du chemin actif. D04 a acquis les quatre preuves H5 : Research via OpenAI, charge bornée
du pilote, upgrade/rollback et restauration indépendante. D05 livre le sélecteur
fournisseur/modèle dans les réglages du cockpit ; D13 complétera le BYOK par compte.
Le LLM local attend une nouvelle décision et un meilleur matériel, sans échéance imposée à ces lots.
Voir l'[ADR-031](decisions/ADR-031-api-first-pilot.md).

| Phase | Lots, dans l'ordre nominal | Résultat |
|---|---|---|
| A — fiabilité | D01 Worker borné → D02 admission/budgets/données → D03 déploiement/topologie → D04 preuves réelles H5 | Socle utilisable et récupérable, limites connues |
| B — parcours cohérent | D05–D08 existants → D09 bureau Mycelium transparent → D10 capture/liens, assistant/planning, voix Web et première mission récurrente | Capturer, relier et obtenir un résultat dans le même contexte |
| C — vie quotidienne | D11 connecteur complet → D12 continuité/synchronisation → D13 pilote personnel à deux | Usage autonome quotidien ; simplicité et FR/EN déjà travaillés dès D09 |
| D — présence/autonomie étendue | D14 Desktop → D15 voix enrichie → D16 automatisations/browser avancés → D17 agent dev | Accès locaux et capacités supplémentaires sous permissions |
| E — extensions/exploitation | D18 finance/crypto lecture → D19 simulations → D20 maison/cartes → D21 capacité/coûts → D22 distribution | Modules utiles puis lancement maîtrisé |

La [cible multi-appareil retenue](decisions/ADR-029-server-personal-and-offline-clients.md) privilégie
le serveur et permet le même backend sur PC personnel. D05 prépare le Web/PWA adaptatif, D12 porte
le hors ligne borné et la synchronisation, D13 le pilote PC/mobile/tablette, D14 l'enveloppe Desktop
et D22 les installateurs/matrices de compatibilité. Aucun nouveau lot n'est créé.

## Jalons

1. **Socle post-audit :** D04 terminé, tag H5 et rapport de vrais moteurs/récupération.
2. **Premier assistant utile :** D10 terminé, capture et relations explicables, planification,
   voix Web et mission récurrente sur les mêmes données ; simplicité vérifiée par parcours.
3. **Pilote personnel :** D13 terminé, deux comptes et parcours quotidien sur installation privée.
4. **Assistant étendu :** D17 terminé, appareils/voix/automatisations sous permissions.
5. **Offre distribuable :** D22 terminé pour un périmètre et une capacité explicitement validés.

Les dépendances précises du plan permettent de déplacer un module optionnel si l'utilisateur
le priorise, sans sauter ses prérequis ni laisser deux branches de développement actives.
La totalité des modules spécialisés n'est pas nécessaire au pilote D13. La 3D fait partie
du produit visé, mais une voie 2D accessible reste disponible.

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
