# D05 — fil connecté, fond neutre et retour fournisseur

Base vérifiée : main `1896468513f92ee5c0d6a811301a1b898cc6abd2`, PR #89 à
`639b48f369cd5317aa98d0679ddf51fdf9766068`, dix workflows réussis. Travail sur la même branche.

## Retour et réponse

L’utilisateur juge la navigation encore trop classique et la validation de sa clé peu claire.
Les deux nouvelles images de fond montrent des fibres cyan/émeraude périphériques sur pétrole,
sans paysage ; la planche de marque montre une sphère ouverte aux jonctions lumineuses.
Les trois pièces jointes ont été réellement inspectées. Leurs dates de nommage ne constituent
ni un horodatage de déploiement, ni une preuve de fonctionnement.

- `mycelium-quiet.webp` reprend la seconde composition (référence `01_26_37 (1)(1)`) sans
  retouche de composition, convertie PNG → WebP qualité 88 avec Sharp : 1672 × 941, 77 640 octets.
  Pas de nouvelle génération d’image. Le fond n’intègre aucun texte ni commande.
- `icons/nevolium.svg` est adapté directement dans son format vectoriel natif : sphère plus
  ouverte, deux grands vides, jonctions localisées, filaments inégaux. Les PNG 192/512 et la
  variante maskable sont rendus depuis ce même SVG ; pas d’ancien slogan de la planche recopié.
- Trois halos périphériques à intensité très faible respirent sur 17 secondes ; ils sont sans
  signification métier et arrêtés en mode calme/minimal et mouvement réduit.
- Le cockpit garde Dockview mais ouvre les nouvelles dispositions sur l’activité centrée.
  Les vues antérieures restent récupérables et les layouts sauvegardés ne sont pas écrasés.
- Le fil inspecte l’origine, le voisinage de projet et les relations transversales existantes.
  La lecture `/v1/relationships` est authentifiée, filtrée par propriétaire et élément, bornée
  par le curseur existant ; les deux extrémités sont revérifiées avant exposition. Aucune migration,
  projection ou écriture de relation n’est ajoutée. L’édition et les explorateurs D08/D09 restent différés.
- Les réglages séparent reçu, test et activation. Le dernier échec d’action n’est plus effacé
  par un polling réussi. La lecture en erreur signale un état potentiellement ancien ; actualiser
  l’état n’effectue pas de POST, ni de nouveau test fournisseur.

## Validation et limites au checkpoint de préparation

TypeScript, Vite (148 modules, bundle principal environ 577 ko non compressé), contrat D05,
géométrie, identité, compilation Python et vérification de diff passent localement. Le lanceur
pnpm de l’environnement a tenté une installation automatique puis refusé des scripts de build :
aucune approbation de script ni modification de dépendance conservée. Les outils TypeScript/Vite
déjà présents ont été utilisés directement. Les bibliothèques Core ne sont pas installées localement.

Le Chromium local s’arrête au lancement avec SIGTRAP. Les scénarios bureau/tablette/téléphone
existants sont conservés ; le nouveau scénario connecté teste parent, voisinage, transversal
interprojet, ouverture du document canonique, erreur de test conservée, actualisation sans
resoumission, test/activation distincts, blocage pendant un appel et réduction des animations.
Il utilise des fixtures API et ne qualifie aucun fournisseur réel. Les tests Core ajoutent lecture
entrante/sortante, refus anonyme/autre propriétaire, bornes et curseur invalide à l’intégration
multi-utilisateur. La CI et ses captures doivent être relues avant validation de cette correction.

Production inchangée sur `c17c7e24…`. La clé saisie par l’utilisateur n’a pas été examinée et son
acceptation reste inconnue. Lire le badge actuel dans les réglages administrateur sans retransmettre
la clé. Préserver snapshots B2, images de rollback, sel LiteLLM et cinq réservations historiques.

## Relecture CI

Le premier candidat `1582021` a révélé que Dockview conservait les vues de taille nulle accessibles
au navigateur pendant le centrage. Le correctif masque les conteneurs non visibles et leurs commandes,
sans détruire leur disposition. Le candidat `36a153a797c1a350dda43cbd56935bf8a6ba8b31` passe ensuite
la suite responsive et le scénario connecté, ainsi que la vraie isolation entre comptes et le parcours
OIDC. L’artefact UI `10374019474` du run `34910993667` a été téléchargé et son SHA-256 revérifié :
`be9af5f7bb4b4e41b8f5ca9db62fe0af2652445bd40ee008c697d85a535c1caf`.
Les quatre captures connectées/connexion IA ont été relues. Elles n’attestent aucune validation
de la clé du pilote : les états de fournisseur y sont des fixtures explicites.

Cette relecture conduit à regrouper Profil/Ambiance sous « Personnaliser » sur tablette/téléphone,
à traduire les statuts du contexte et à recadrer les captures après défilement. L’état de connexion
est annoncé aux lecteurs d’écran à son changement, sans relire toute la carte à chaque horodatage.
Ce dernier ajustement doit passer sa propre CI avant remise du rendu.

## Qualification de la correction — 15 septembre 2026

La tête `d431a7427e0efc4cfe0b8734a3ce10926bbee4bc` corrige les noms accessibles explicites
de Profil/Ambiance, après l’échec du dernier contrôle de personnalisation de `ced7b9e…`.
Les assertions ne sont pas retirées : la nouvelle suite passe intégralement.

- [UI workspace](https://github.com/fredbuhr/nevolium/actions/runs/34911818001) : contrat, géométrie,
  cinq formats, détachement bureau, centrage réversible, parcours relié bureau/téléphone,
  sélection canonique de document, retour d’erreur conservé et activation distincte réussis.
- [Isolation et OIDC](https://github.com/fredbuhr/nevolium/actions/runs/34911818090) : vrais comptes
  distincts, lecture des relations entrantes/sortantes, refus anonyme/autre propriétaire,
  bornes/curseur et parcours administrateur/utilisateur réussis.
- [Captures UI](https://github.com/fredbuhr/nevolium/actions/runs/34911818001/artifacts/10374354225) :
  artefact `10374354225`, archive téléchargée et SHA-256 revérifié
  `9f9bffefa9803664391da09094324f020e34aa84c4f357f9a01eb7125a0543ba`.
  Relecture du nouvel accueil, du fil relié bureau et du volet mobile sur cette tête exacte.
- TypeScript, Vite, contrats D05/identité, géométrie et vérification de diff repassent localement.
  Le bundle principal reste à environ 577 ko non compressé ; l’avertissement n’est pas masqué.

Les dix workflows de cette tête sont réussis, y compris Foundation et D04 ; le job optionnel
de services LLM locaux reste ignoré conformément au pilote API. Aucune campagne D04 du serveur n’a été rejouée.
Les captures UI utilisent des exemples et des réponses fournisseur simulés : aucune preuve
d’acceptation de la clé du pilote, aucun appel payant ni test fournisseur relancé. Le retour
sur l’intuitivité, la revue sur appareils physiques et la lecture du badge réel restent nécessaires.
La correction est publiée dans la PR #89, sans fusion ni déploiement ; le serveur n’a pas été modifié.

## Incident du premier essai fournisseur — 15 septembre 2026

L’utilisateur a soumis OpenAI `openai/gpt-4.1` depuis le pilote. Core a répondu `500` et l’ancienne
interface a effacé rapidement le message. La lecture directe a montré zéro ligne dans
`model_configurations`; la trace Core établit une violation de la clé étrangère
`model_configurations_test_task_id_fkey` pendant le premier `flush`. La configuration était insérée
avant la Task désignée par `test_task_id`. Le registre LiteLLM et OpenAI n’ont donc pas reçu la clé,
et la configuration serveur précédente est restée active.

Le correctif persiste explicitement la Task, vérifie son insertion, puis ajoute la configuration dans
la même transaction. Le contrat PostgreSQL appelle maintenant le véritable endpoint HTTP avec les
transports LiteLLM/Temporal neutralisés, et exige la réponse `202` ainsi que la présence des deux lignes.
Aucune migration, donnée de production ou relance fournisseur n’est incluse dans ce changement.

Le correctif `e275b7bb860dccb0ab02c1ae0ee0c549f69e10d5` passe ensuite les dix workflows.
Le job `capacity-and-data-integration` exécute le nouvel appel HTTP sur PostgreSQL réel et atteste
explicitement la Task avant sa clé étrangère, puis la conservation de la configuration valide et
l’activation après drainage. Core et Web sont les seuls services de production dont le code change
depuis `c17c7e24`; la mise à jour préparée les reconstruit avec des images de retour dédiées et ne
modifie ni le schéma, ni les données, ni les snapshots existants.

## Déploiement du correctif sur le pilote

Le déploiement limité à Core et Web depuis e275b7b a réussi.
Le script de déploiement porte le SHA-256 22259920fdce633f6458bb116fe112b54a8ac7f76fdfa78eb55e442a047078fb.
Le préflight a retrouvé le schéma 0015, zéro configuration et cinq réservations uncertain.
Les images Core/Web précédentes ont été étiquetées pour retour avant reconstruction.
Le résultat atteste les nouvelles images Core 6e1c2dee et Web 40df2609.
Ingress répond 200, 200, 200, 401, 401 et 404 ; les compteurs finaux restent inchangés.
Les snapshots B2 et images historiques sont conservés. Aucun test fournisseur ni migration.

## Qualification réelle et sauvegarde post-activation — 15 septembre 2026

Après rechargement du Web corrigé, l’utilisateur a soumis une nouvelle fois la clé OpenAI. Le test
borné a réussi : le modèle demandé et le modèle retourné valent tous deux `openai/gpt-4.1`, et
l’usage canonique enregistré coûte `0.000090 USD`. L’utilisateur a ensuite activé explicitement la
configuration. Le contrôle direct de PostgreSQL atteste `0015_model_configurations`, une seule
configuration créée et active, Task et workflow terminés, un seul usage correspondant, aucune
Task, exécution, réservation courante ou sortie en attente, et cinq réservations historiques
`uncertain`. Cette preuve réelle remplace l’incertitude du premier essai ; elle ne qualifie aucun
autre fournisseur affiché.

Une sauvegarde quiescente a ensuite arrêté puis repris uniquement les écrivains durables déjà
actifs. Restic a créé le snapshot de données
`e374714cb3bc55b01b55ad6dc69411faec9a55d32602d9652285353f8d267cbc`, avec PostgreSQL — donc
la base LiteLLM et sa clé fournisseur chiffrée — JetStream, SeaweedFS et OpenBao. Le matériel de
récupération LiteLLM, limité à sa master key et à son sel stable sans clé fournisseur en clair, est
conservé dans le snapshot chiffré séparé
`a3f6720d818ae659be2148ab301a9da156b67d23674fa015f87f697eea4b600e` puis restauré et comparé
à l’identique. Les fichiers temporaires ont été supprimés.

`restic check --read-data` a relu les 12 packs sans erreur, pour 33 515 561 octets bruts. Les
snapshots `cb069646…` et `71f19a46…`, les images de retour et les cinq réservations historiques sont
conservés. OpenBao a été redéscellé depuis son précédent matériel chiffré, tous les services
initialement actifs ont repris, l’état final vaut `0015_model_configurations|1|0|0|0|0|5` et
l’ingress `200|200|401|404`. Cette opération n’a lancé ni nouvelle Task, ni campagne D04, ni Ollama,
ni appel fournisseur supplémentaire.
