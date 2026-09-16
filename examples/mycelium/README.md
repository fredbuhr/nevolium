# Atelier Mycelium

Corpus **entièrement fictif**, commun aux essais du navigateur et à l’import par les API de Nevolium. Les noms, observations et conclusions ne décrivent aucun fait réel. Les contenus FR/EN sont volontaires ; la langue choisie traduit les commandes de l’interface, sans modifier les documents de l’utilisateur.

| Contenu | Nombre | Ce qu’il vérifie |
| --- | ---: | --- |
| Projets | 5 | Crypto, enquête, recherche, sous-projet Archives, projet vide |
| Idées, notes et décisions | 20 | Lecture, modification, homonymes, idée sans relation sémantique |
| Fichiers | 12 | Markdown, CSV, SVG et Mermaid ; upload, téléchargement et intégrité SHA-256 |
| Tâches | 12 | Travail manuel, sous-tâches et trois jalons |
| Dépendances | 9 | FS, SS et FF ; direction prédécesseur/successeur |
| Relations explicites | 32 | Appui, contradiction, référence, dérivation, liens transversaux |
| Citations | 12 | Versions initiales et trois nouvelles versions de décisions |
| Pièces jointes / diagrammes | 12 | Provenance des documents, aperçu SVG et source Mermaid |
| Accueils proposés | 3 | Crypto, journalisme ou recherche, avec dossiers de raccourcis |

Les appartenances aux projets sont projetées depuis les données existantes. Les dossiers de l’accueil regroupent des **raccourcis** ; ils ne sont pas de nouveaux conteneurs de données. L’idée isolée garde seulement son appartenance au projet. Aucune relation sémantique n’est calculée ou inventée.

## Utilisation

Depuis la racine du dépôt, avec l’environnement Python Core verrouillé :

```bash
uv run --locked --project services/core python scripts/examples/import_mycelium.py
```

Cette commande contrôle les fichiers et affiche l’inventaire, sans joindre de serveur.

Pour importer dans un compte de validation, fournir son jeton dans `NEVOLIUM_ACCESS_TOKEN`, puis :

```bash
uv run --locked --project services/core python scripts/examples/import_mycelium.py \
  --api-url https://ADRESSE_API \
  --state /CHEMIN_PERSISTANT/mycelium-exemples.json \
  --home-profile recherche \
  --apply
```

`--home-profile` est facultatif. Un accueil déjà enregistré est conservé. Le corpus est identique pour les trois profils : seul le choix des raccourcis diffère. Un serveur local avec authentification désactivée peut utiliser `--development` au lieu du jeton.

Conserver le journal au même emplacement et dans le même compte. Relancer la même commande réutilise les objets enregistrés, après vérification de leur accès. Une réponse perdue pendant une écriture bloque la reprise automatique : le journal identifie l’opération à vérifier sur le serveur avant de le réconcilier. Un changement de compte, serveur, corpus ou profil ne réutilise pas ce journal. Il ne contient aucun jeton.

L’import n’exécute aucune tâche et ne lance aucune ingestion, recherche externe ou appel de modèle. Il ajoute des données par les routes publiques existantes. Il ne s’exécute pas pendant le démarrage de l’application et ne supprime aucun contenu.

## Parcours de vérification

1. Ouvrir le projet du profil depuis l’accueil et explorer ses liens. La navigation doit montrer les objets existants et les libellés des relations.
2. Suivre l’hypothèse jusqu’au contre-exemple, puis traverser un lien vers un autre projet. Revenir sans perdre le contexte.
3. Ouvrir une idée, la modifier dans Documents, puis revenir dans Mycelium. La même identité doit être conservée.
4. Explorer une décision puis sa citation : distinguer la version citante, la source et sa version.
5. Ouvrir la carte des étapes, afficher le SVG et télécharger son fichier Mermaid. Télécharger le CSV et comparer ses octets au fichier du dépôt.
6. Personnaliser l’accueil : ajouter un projet, renommer un raccourci, créer un dossier, déplacer les raccourcis, annuler puis recharger. Les données restent dans leurs projets.
7. Ouvrir le projet vide, l’idée isolée et les quatre documents nommés « Synthèse ». Ne pas confondre leurs identifiants.
8. Comparer FR/EN, animation active/pause, 2D/3D et petits écrans. Les contenus d’exemple restent inchangés.

L’importateur vérifie aussi les fichiers relus, les objets accessibles et les relations paginées avec une limite volontairement réduite à trois liens. Pour répéter uniquement ces lectures, reprendre les mêmes paramètres et remplacer `--apply` par `--verify-only`.

Les conversations, exécutions, résultats et approbations sont couverts par la fixture d’intégration du backend. Le corpus utilisateur ne fabrique pas d’historique d’exécution ni d’approbation.
