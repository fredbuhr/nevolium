# Nevolium : checkpoint de reprise

Dernière revue : 2026-09-16. Lire `AGENTS.md`, vérifier GitHub live, puis [mémoire produit](docs/product-memory.md).

## D09 ouvert — refondation adoptée, réception du Web KISS à constater

| Champ | État attesté |
|---|---|
| Base vérifiée | Main après intégration `c8c41dbc5ff494b3b7f3573daa56337e589023f3`, arbre `63b03610bc86369e4dc7a08568e8b832640935e3` identique à la tête qualifiée. Le présent checkpoint post-fusion ne change que la documentation |
| Branche / PR | [PR #98](https://github.com/fredbuhr/nevolium/pull/98) fusionnée ; `docs/d09-refoundation-adoption` retirée du développement actif. Aucune branche normale active. Son éventuelle référence distante ne doit pas être réutilisée |
| Gate autorisé | Dossier de refondation accepté et démarrage demandé. [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) précise ADR-033. **DOC-01 terminé**, rattaché à D09 ; D09 reste ouvert, D10 non commencé |
| Réalisé | Contrat des parcours manuels, trois contextes, missions, consultation/traitement/transmission et preuves ; [24 critères](docs/refoundation-backlog.md) transposés et [gouvernance](docs/data-governance.md) initialisée. Neuf fichiers documentaires dans #98 ; aucun changement applicatif, migration, import ou appel IA |
| Validation | Tête `9ae00e57b0abb615ddca277441d50a623dcd036f` : **8/8 workflows réussis**, dont [UI 35150084122](https://github.com/fredbuhr/nevolium/actions/runs/35150084122). Arbre fusionné revérifié. Contrôle local du backlog : mêmes 24 identifiants/ordre/priorités et 35 dépendances que le YAML accepté, sans cycle. [Revue et preuves](https://github.com/fredbuhr/nevolium/pull/98#issuecomment-5704546025) |
| Prochaine action exécutable | **D09-REC-01 : faire exécuter le contrôle serveur ci-dessous**, sans construction/activation, et recueillir toute la sortie. Comparer release/images actives et présence de la candidate KISS avant de décider si sa préparation est nécessaire. Une image présente n'est pas automatiquement qualifiée |
| Réception KISS en attente | #97 intégrée, cible Web `1af538b53dfec6bb490625d7478330353e609599`. La [procédure de préparation](docs/d09-kiss-desktop.md#préparation-web-sur-le-serveur-après-intégration-de-la-pr) reste valable sous ses préconditions ; attendre les preuves `IMAGE_WEB_KISS_PREPAREE` et `PREPARATION_WEB_KISS_REUSSIE` avant activation adaptée. Ne pas reconstruire aveuglément une image déjà préparée |
| Production attestée | Dernière preuve : `/opt/nevolium/current` → `702c2a3de4b4bd2219e27bf12c5b5286624d4bd8`, schéma `0018_editable_knowledge`. Aucun nouveau déploiement ou contrôle SSH reçu pendant DOC-01 |
| Images actives attestées | Core `454e44a27cc9…`, Web `85cf94464781…`, Worker `dcbc682b00ed…`, Web-MCP `125dc53d049c…`. Digests complets dans la [preuve pilote](docs/d09-home-pilot-update.md) |
| Corpus et données attestés | `mycelium-example-v1` déjà importé/relu : 5 projets, 20 contenus, 12 fichiers, 12 tâches, 9 dépendances, 32 relations, 112 opérations. Après import : 12 projets, 69 tâches, 22 documents. Aucune activité non terminale/outbox/réservation active ; 5 réservations historiques `uncertain` et 1 configuration modèle active conservées |
| Limites | Adoption documentaire ≠ fonction livrée ≠ conformité attestée. DATA-01/DIST-01 restent ouverts : cartographie de 12 flux documentaire, contrats/configurations à qualifier. KISS intégré ≠ installé ≠ accepté ; navigateur Core simulé distinct de PostgreSQL réel, appareil/OIDC/usage ouverts. Liens automatiques non actifs |
| Points de retour | Images D05, tags Core/Web `d09-69f5926b`, snapshot Netcup et snapshots B2 conservés. Aucune purge Docker, aucun retour aveugle à D05, aucune réimportation de démonstration |
| Accès et autorisations | Aucun accès SSH direct établi ; opérations serveur par l'utilisateur avec commandes bornées. L'adoption ne crée pas d'autorisation nouvelle d'activation ou d'effet externe ; appliquer les autorisations déjà enregistrées à leur périmètre exact |
| Hygiène | Reset R0–R7 terminé. Ne pas réutiliser les branches retirées `fix/d09-kiss-desktop` et `docs/d09-refoundation-adoption`. Le connecteur ne fournit pas leur suppression distante. PDF privé, captures, contrats signés, registres nominatifs et secrets hors dépôt public |

## Contrôle de réception KISS — à exécuter par l'opérateur

Dans la session SSH existante sur le serveur Netcup, pas dans le terminal local du PC.
Ce contrôle consulte les références et images ; il ne construit rien, ne recrée aucun service,
ni n'importe ou supprime de données. Il ne lit pas les secrets du fichier d'environnement.
Syntaxe vérifiée localement par `bash -n` ; exécution serveur **non effectuée**.
Le contrôle de présence préalable évite de répéter aveuglément une préparation réalisée ailleurs.

```bash
(
set -Eeuo pipefail
trap 'echo "CONTROLE_RECEPTION_KISS_INTERROMPU : ligne=$LINENO. Transmettre la sortie sans relancer." >&2' ERR

current='/opt/nevolium/current'
source_dir='/opt/nevolium/source'
target='1af538b53dfec6bb490625d7478330353e609599'
candidate="nevolium-web:kiss-${target:0:12}"

sudo -v
test -L "$current"
printf 'RELEASE_ACTIVE '
readlink -f "$current"
printf 'COMMIT_RELEASE_ACTIVE '
git -C "$current" rev-parse HEAD
printf 'COMMIT_CHECKOUT_SOURCE '
git -C "$source_dir" rev-parse HEAD
echo 'ETAT_CHECKOUT_SOURCE'
git -C "$source_dir" status --short

for service in nevolium-core nevolium-web nevolium-worker nevolium-web-mcp; do
  sudo docker inspect --format \
    'SERVICE {{.Name}} | {{.State.Status}} | {{.Image}} | restarts={{.RestartCount}}' \
    "nevolium-${service}-1"
done

candidate_id="$(sudo docker image ls --no-trunc --quiet "$candidate")"
if [ -n "$candidate_id" ]; then
  printf 'IMAGE_WEB_KISS_EXISTANTE %s %s\n' "$candidate" "$candidate_id"
else
  printf 'IMAGE_WEB_KISS_ABSENTE %s\n' "$candidate"
fi

df -h /
echo 'CONTROLE_RECEPTION_KISS_REUSSI'
echo 'AUCUNE_CONSTRUCTION_ACTIVATION_OU_IMPORT_EFFECTUE'
)
```

Transmettre toute la sortie, y compris en cas d'interruption, sans relancer une construction.
Le marqueur de réussite signifie seulement que ces lectures ont abouti : il n'atteste ni santé
complète du produit, ni provenance de la candidate, ni acceptation utilisateur. Adapter la suite
aux valeurs réelles, sans ignorer un écart au runtime antérieurement attesté.

Preuves antérieures : [checkpoint pilote archivé](docs/archive/d09-pilot-checkpoint-2026-09-16.md),
[preuve pilote](docs/d09-home-pilot-update.md), [KISS et réception](docs/d09-kiss-desktop.md).
Le backlog ne constitue pas une liste de lots actifs. Le code, le live et la preuve opérateur
priment sur les résumés ; reprendre selon [development-workflow](docs/development-workflow.md).
