# D09 — préparer le correctif Accueil sur le pilote

PR #96 intégrée le 16 septembre 2026 au commit
`702c2a3de4b4bd2219e27bf12c5b5286624d4bd8`. Son arbre
`53f204d33f828274bc16dd85a856105f272d358b` est identique à la tête PR
`d9eff70dbcea3c40f0513fabfeee35b5eaf63e07`, qualifiée par neuf workflows verts,
dont [UI 35113871065](https://github.com/fredbuhr/nevolium/actions/runs/35113871065).

Le dernier runtime attesté est `69f5926`, schéma `0018_editable_knowledge`.
Le correctif concerne Core et Web ; aucune migration, aucun changement Compose,
Worker ou Web-MCP. Les preuves CI ne valent pas installation ni acceptation pilote.

## Préparation opérateur

Exécuter dans la session SSH habituelle `nevolium-admin@node-01`. Ce bloc conserve
les images actuelles Core/Web, construit les deux nouvelles images et recueille
l'inventaire actuel. Il ne remplace aucun conteneur, ne change pas `current` et
n'importe aucun exemple. Les anciens points de retour D05, Netcup et B2 restent intacts.
En cas d'arrêt, transmettre la sortie avant toute reprise.

```bash
(
set -Eeuo pipefail
stage='initialisation'
trap 'echo "PREPARATION_ACCUEIL_D09_INTERROMPUE etape=$stage ligne=$LINENO ; transmettre la sortie avant toute reprise" >&2' ERR

target='702c2a3de4b4bd2219e27bf12c5b5286624d4bd8'
previous='69f5926be72227a5fc1c4e3dff7c0e436099e51c'
source_dir='/opt/nevolium/source'
release_dir="/opt/nevolium/releases/$target"
old_release="/opt/nevolium/releases/$previous"
env_file='/etc/nevolium/production.env'

sudo -v
stage='verification-release-active'
test -L /opt/nevolium/current
test "$(readlink -f /opt/nevolium/current)" = "$old_release"
test "$(git -C "$old_release" rev-parse HEAD)" = "$previous"
test -z "$(git -C "$old_release" status --porcelain)"
test -z "$(git -C "$source_dir" status --porcelain)"

stage='verification-images-actives'
declare -A expected=(
  [nevolium-web]='sha256:79e606139f59f603da5f626badea439d62778c13cc586b59bd024eeb38441eec'
  [nevolium-core]='sha256:d69c565761f6f4f2e504a19b815c689e89a7d9d3f52fc38fb5fe4877df2bc004'
  [nevolium-worker]='sha256:dcbc682b00ed1292bfb00c81ae1fad6638f47423f465d6511b5602cc6cf5fbf7'
  [nevolium-web-mcp]='sha256:125dc53d049c6a6337c73c3fe6e403208967bfee680c87815d98a35e2e4b1840'
)
declare -A original_ids=()
for service in "${!expected[@]}"; do
  container="nevolium-${service}-1"
  test "$(sudo docker inspect --format '{{.State.Status}}' "$container")" = running
  test "$(sudo docker inspect --format '{{.Image}}' "$container")" = "${expected[$service]}"
  original_ids[$service]="$(sudo docker inspect --format '{{.Id}}' "$container")"
done

stage='preservation-images-core-web'
for service in nevolium-core nevolium-web; do
  rollback="nevolium-rollback-${service#nevolium-}:d09-69f5926b"
  if sudo docker image inspect "$rollback" >/dev/null 2>&1; then
    test "$(sudo docker image inspect --format '{{.Id}}' "$rollback")" = "${expected[$service]}"
  else
    sudo docker image tag "${expected[$service]}" "$rollback"
  fi
  echo "IMAGE_D09_ORIGINALE_PRESERVEE $service $rollback"
done

stage='creation-release-corrective'
git -C "$source_dir" fetch --no-tags origin main
git -C "$source_dir" cat-file -e "${target}^{commit}"
git -C "$source_dir" merge-base --is-ancestor "$target" FETCH_HEAD
git -C "$source_dir" merge-base --is-ancestor "$previous" "$target"
test ! -e "$release_dir"
test ! -L "$release_dir"
git -C "$source_dir" worktree add --detach "$release_dir" "$target"
test "$(git -C "$release_dir" rev-parse HEAD)" = "$target"
test -z "$(git -C "$release_dir" status --porcelain)"

stage='validation-configuration'
cd "$release_dir"
sudo python3 -B scripts/ops/production.py check \
  --env-file "$env_file" --profile memory --profile ai --web-mcp

compose=(
  sudo docker compose --project-name nevolium
  --project-directory "$release_dir" --env-file "$env_file"
  -f "$release_dir/compose.yaml"
  -f "$release_dir/compose.production.yaml"
  -f "$release_dir/compose.web-mcp.yaml"
  -f "$release_dir/compose.web-mcp.production.yaml"
  --profile ops
)

stage='construction-core-web'
"${compose[@]}" build nevolium-core nevolium-web

stage='verification-runtime-inchange'
for service in "${!expected[@]}"; do
  container="nevolium-${service}-1"
  test "$(sudo docker inspect --format '{{.Id}}' "$container")" = "${original_ids[$service]}"
  test "$(sudo docker inspect --format '{{.State.Status}}' "$container")" = running
  test "$(sudo docker inspect --format '{{.Image}}' "$container")" = "${expected[$service]}"
  echo "CONTENEUR_INCHANGE $service"
done
test "$(readlink -f /opt/nevolium/current)" = "$old_release"
test -z "$(git -C "$release_dir" status --porcelain)"

stage='inventaire-pour-activation'
python3 -B "$release_dir/scripts/ops/d09_pilot_preflight.py" \
  --source "$source_dir" --target "$target"
for service in nevolium-core nevolium-web; do
  image="nevolium-${service}:latest"
  image_id="$(sudo docker image inspect --format '{{.Id}}' "$image")"
  echo "IMAGE_ACCUEIL_D09_PRETE $service $image_id"
done
df -h /
echo "PREPARATION_ACCUEIL_D09_REUSSIE $target"
echo 'AUCUN_CONTENEUR_REMPLACE_AUCUNE_MIGRATION_AUCUN_IMPORT'
)
```

Le script d'inventaire est pris dans la nouvelle release mais reçoit
`--source /opt/nevolium/source` : son calcul de `current` utilise le parent de
ce chemin. La source de travail historique reste inchangée. Le rapport
`needs_review` est normal : il contient les faits à contrôler, pas un échec ni
une autorisation automatique d'activation. Aucun secret de l'environnement
de production n'est affiché. La syntaxe Bash du bloc est vérifiée localement ;
son exécution serveur reste à attester par la sortie opérateur.

## Reprise après la sortie opérateur

### Activation attestée — 16 septembre 2026

La préparation puis l'activation opérateur ont réussi. Les images actives sont
Core `sha256:454e44a27cc95540db4abe0f83b56b3c05d2ae6507fcd2d962ab5576d5051f69`
et Web `sha256:85cf94464781356b1aa96ca43c9fb01e62693455e04089f0e97fbe2906c7032a`.
Worker `dcbc682b00ed…` et Web-MCP `125dc53d049c…` sont restés inchangés.
`/opt/nevolium/current` désigne désormais le merge `702c2a3…`.

Core live/ready/trust et Web internes ont répondu ; PostgreSQL, NATS, Temporal et
OpenBao étaient sains. L'état SQL est strictement identique avant/après :
`0018_editable_knowledge|7|57|2|0|0|0|0|5|1`. Aucune migration et aucun import
d'exemple. Les images Core/Web précédentes sont conservées sous les tags de retour
`d09-69f5926b`.

Après huit minutes, Core/Web n'avaient aucun redémarrage ; Worker/Web-MCP étaient
toujours sur leurs digests attendus. Core live/ready/trust, Web interne et public
répondaient à 200, l'API sans jeton était refusée à 401, les quatre santés critiques
étaient vertes et le SQL restait identique. Le corpus local a validé son inventaire
5/20/12/12/9/32 en mode aperçu, sans écriture. L'import réel reste à effectuer.

Vérifier les nouveaux digests, les santés, le schéma `0018`, les compteurs actuels
et l'absence d'activité en cours. Ne pas imposer les anciens compteurs 7/57/2
si l'utilisateur a créé des données depuis la dernière mesure. Préparer ensuite
le remplacement Core/Web avec `--no-build --no-deps`, les vérifications avant/après,
puis la désignation atomique de la release. Les images Worker et Web-MCP restent
issues de `69f5926`, ce qui est attendu ; leurs étiquettes de répertoire ne doivent
pas être faussement exigées égales à celles des deux services mis à jour.

Après stabilisation, utiliser [l'importateur documenté](../examples/mycelium/README.md)
avec un compte de validation et un journal persistant. Ne pas transmettre son jeton
dans le chat. Vérifier la lecture des fichiers, diagrammes et relations via l'API
réelle, puis les parcours et la fluidité sur ordinateur/tablette/téléphone.
L'import n'entraîne aucun appel IA. Le go fonctionnel D09 demeure ouvert.

### Import réel attesté — 16 septembre 2026

Le corpus `mycelium-example-v1` a été importé dans le compte de validation avec
le profil d'accueil `crypto`. Résultat : cinq projets, vingt contenus, douze fichiers,
douze tâches, neuf dépendances et trente-deux relations explicites. Le journal persistant
0600 contient 112 opérations et aucune mutation en attente. Une seconde passe
`--verify-only` a relu les fichiers, les objets owner-scoped, toutes les relations
canoniques et leur pagination.

Le jeton a été saisi hors historique shell dans un fichier éphémère sous `/dev/shm`,
puis supprimé. Les compteurs sont passés exactement de
`0018_editable_knowledge|7|57|2|0|0|0|0|5|1` à
`0018_editable_knowledge|12|69|22|0|0|0|0|5|1`. Aucun workflow, Task, appel modèle
ou réservation n'a été lancé ; l'outbox est revenue à zéro. Il reste le parcours
fonctionnel et visuel sur les appareils réels avant le go D09.
