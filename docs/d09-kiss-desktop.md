# D09 — bureau Mycelium et continuité KISS

Code intégré par la [PR #97](https://github.com/fredbuhr/nevolium/pull/97), merge
`9a56ffe5d11c054ab5be6ef7af38f0df31759b0a`. Branche `fix/d09-kiss-desktop` retirée du
développement actif. Décision acceptée : [ADR-033](decisions/ADR-033-kiss-contextual-mycelium.md).
L'état opérationnel et la prochaine action restent dans [PROJECT_STATE](../PROJECT_STATE.md).

## Comportement livré dans le code

- Le renderer 3D partagé occupe tout le bureau, avec fond WebGL transparent. Le papier peint
  appartient à une couche indépendante ; aucun cadre opaque n'entoure le graphe d'accueil.
- Une couleur unie suffit. L'utilisateur peut choisir l'ambiance fournie ou charger une image
  PNG/JPEG/WebP, limitée à 8 Mo et 24 mégapixels, puis régler son assombrissement.
- Le fichier utilise l'API `Asset` existante et ses droits propriétaire. Le layout privé conserve
  uniquement son identifiant et les réglages, jamais un jeton, une URL externe ou les octets.
  Une image absente ou invalide laisse la couleur active et affiche un message explicite.
  Choisir une couleur ne supprime pas un fichier qui pourrait avoir d'autres usages.
- Les préférences schema-v1 existantes restent lisibles. Dossiers, épingles et ordre sont conservés.
  La personnalisation s'ouvre dans un dialogue avec les commandes de sauvegarde et de reprise.
- Sélectionner un objet montre sa fiche et ses relations canoniques paginées immédiatement.
  Le clavier arrive dans la fiche ; Échap la ferme et rend le focus au point de départ.
- Ouvrir un outil conserve la scène d'accueil montée, sa caméra, son voisinage et sa sélection.
  La scène passe en rendu à la demande, s'atténue et devient inerte derrière le contenu.
  Les mouvements effectués dans les outils ne déplacent pas ce réseau.
- Les réglages de qualité et de caméra sont regroupés ; les boutons 2D/3D restent directs.
  Le mode calme garde la rotation/zoom utilisables. Téléphone et WebGL indisponible disposent
  de la liste 2D, avec les mêmes objets et actions.

Le patch est Web uniquement : pas de migration, d'API supplémentaire, d'import d'exemples,
de changement Worker/Core ni d'appel IA. Les liens affichés sont les liens déjà enregistrés.
L'enrichissement automatique reste prévu dans D10 et ne doit pas être annoncé comme actif.

## Qualification

Les contrats locaux d'accueil, de locale, de cockpit et de mindmap passent ; TypeScript et
le build Vite réussissent. Le navigateur local s'arrête avant le chargement de l'application
(SIGTRAP de l'environnement). Les essais navigateur s'exécutent donc dans GitHub Actions.

Le scénario `d09_home_browser_qualification.mjs` vérifie sur trois tailles de fenêtre :
transversalité, clavier, fichiers originaux, aperçu SVG, personnalisation, reprise de sauvegarde,
rechargement et langue. Il ajoute le bureau plein écran et l'alpha réel du clear WebGL,
les relations dès la sélection, la conservation du renderer au retour d'un outil,
l'image privée persistée et le repli après disparition du fichier.

Ces essais simulent les réponses Core. Les contrats PostgreSQL réels de propriété, de projection
et de pagination s'exécutent séparément. Ils ne remplacent ni une session OIDC réelle,
ni l'appréciation du confort, du contraste et de la fluidité sur les appareils du pilote.
Le 16 septembre, la tête `1af538b53dfec6bb490625d7478330353e609599` passe **8/8 workflows** :
qualité, fondations, reproductibilité, isolation multi-utilisateur, ingestion, registre MCP,
recherche autonome et [UI workspace](https://github.com/fredbuhr/nevolium/actions/runs/35131493038).
Les parcours D05/D06/D07/D08 et le scénario spatial D09 passent sur cette même tête.
Le merge de test puis le merge effectif ont l'arbre identique
`186a80cb9423ef2420c382a94b2741e993e78565`.

Neuf captures de cette tête ont été inspectées : accueil, exploration transversale et fond personnel
en anglais, sur desktop 1440×1000, tablette 820×1180 et téléphone 390×844. Le cadrage initial sur
tablette montre tous les points d'entrée. Le téléphone garde la liste 2D par défaut : les champs
`transparentDesktop` et `toolReturnContext` à `false` dans son rapport indiquent ces contrôles 3D
non exercés sur ce format ; ils ne constituent pas une preuve négative de transparence.
Les titres et le contenu du corpus fictif gardent leur langue propre.

| Artefact CI final | Identifiant | SHA-256 |
|---|---|---|
| Accueil, rapport et 9 captures | `10461413366` | `ee22f0b70adbd242babcb9cd97941c991507399a615a8f37e6b1ea74e0f3a9f3` |
| Régressions spatiales D09 | `10461578544` | `72b12af96dc157d8ae99cf6d451cb0f5a0b63c045daad92de928e02e996956fd` |

La campagne a corrigé des problèmes constatés : débordement horizontal de 5 px, fiche téléphone
recouvrant les commandes, cadrage portrait incomplet et anciens sélecteurs visant un décor retiré.
Une injection de panne WebGL précédait parfois l'initialisation asynchrone de R3F ; le test attend
maintenant le renderer et son gestionnaire de perte de contexte avant d'injecter la panne. Le repli
2D reste vérifié. Les résultats antérieurs en échec ne sont pas utilisés comme preuve finale.

## Parcours d'acceptation sur le pilote après activation du Web

1. Recharger l'accueil, ouvrir un projet épinglé puis une idée reliée. La fiche et ses relations
   doivent être compréhensibles immédiatement ; vérifier aussi une source et un fichier.
2. Déplacer la caméra, sélectionner une idée, ouvrir son outil puis revenir à l'accueil.
   Vérifier le même voisinage, la même sélection et la même caméra. Échap ferme la fiche.
3. Dans « Personnaliser mon accueil », choisir une couleur puis une image personnelle,
   attendre la sauvegarde et recharger. Vérifier contraste et absence de cadre autour du réseau.
4. Essayer FR/EN, clavier, liste 2D, mode calme et un format téléphone/tablette. Les fonctions
   restent accessibles sans animation et sans manipuler une scène 3D.
5. Se déconnecter puis utiliser un autre compte de test : ni les épingles privées, ni l'image
   du premier compte ne doivent apparaître. Revenir au premier compte et retrouver ses réglages.

Le serveur connu reste sur `702c2a3…` tant qu'une sortie opérateur n'atteste pas la nouvelle
activation. Les points de retour et le corpus importé restent ceux du checkpoint.

## Préparation Web sur le serveur, après intégration de la PR

Le bloc ci-dessous construit uniquement le Web et préserve son image de retour. Il refuse
un runtime différent des quatre images attestées. Il vérifie que le commit testé appartient
à main ; aucun service n'est arrêté ou recréé, aucune migration ni import n'est exécuté.
L'image utilise un tag propre à cette release et ne remplace pas le tag `latest`.
Transmettre la sortie finale `IMAGE_WEB_KISS_PREPAREE` et `PREPARATION_WEB_KISS_REUSSIE`.
L'activation sera adaptée à cette image réellement construite et à l'état constaté.

```bash
(
set -Eeuo pipefail
stage='initialisation'
build_override=''
trap 'if [ -n "$build_override" ]; then rm -f -- "$build_override"; fi' EXIT
trap 'echo "PREPARATION_WEB_KISS_INTERROMPUE : etape=$stage ligne=$LINENO. Transmettre la sortie." >&2' ERR

target='1af538b53dfec6bb490625d7478330353e609599'
source_dir='/opt/nevolium/source'
current='/opt/nevolium/current'
previous='/opt/nevolium/releases/702c2a3de4b4bd2219e27bf12c5b5286624d4bd8'
release_dir="/opt/nevolium/releases/$target"
env_file='/etc/nevolium/production.env'
rollback='nevolium-rollback-web:d09-702c2a3d'

declare -A expected_images=(
  [nevolium-core]='sha256:454e44a27cc95540db4abe0f83b56b3c05d2ae6507fcd2d962ab5576d5051f69'
  [nevolium-web]='sha256:85cf94464781356b1aa96ca43c9fb01e62693455e04089f0e97fbe2906c7032a'
  [nevolium-worker]='sha256:dcbc682b00ed1292bfb00c81ae1fad6638f47423f465d6511b5602cc6cf5fbf7'
  [nevolium-web-mcp]='sha256:125dc53d049c6a6337c73c3fe6e403208967bfee680c87815d98a35e2e4b1840'
)

check_runtime() {
  test -L "$current"
  test "$(readlink -f "$current")" = "$previous"
  for service in "${!expected_images[@]}"; do
    container="nevolium-${service}-1"
    test "$(sudo docker inspect --format '{{.State.Status}}' "$container")" = running
    test "$(sudo docker inspect --format '{{.Image}}' "$container")" = "${expected_images[$service]}"
    echo "RUNTIME_INCHANGE $service"
  done
}

sudo -v
stage='verification-runtime'
check_runtime

stage='recuperation-code-integre'
git -C "$source_dir" fetch --no-tags origin main
git -C "$source_dir" cat-file -e "${target}^{commit}"
git -C "$source_dir" merge-base --is-ancestor "$target" FETCH_HEAD
if [ ! -e "$release_dir" ]; then
  git -C "$source_dir" worktree add --detach "$release_dir" "$target"
fi
test "$(git -C "$release_dir" rev-parse HEAD)" = "$target"
test -z "$(git -C "$release_dir" status --porcelain)"

stage='preservation-image-web'
if sudo docker image inspect "$rollback" >/dev/null 2>&1; then
  test "$(sudo docker image inspect --format '{{.Id}}' "$rollback")" = "${expected_images[nevolium-web]}"
else
  sudo docker image tag "${expected_images[nevolium-web]}" "$rollback"
fi
echo "IMAGE_WEB_RETOUR_PRESERVEE $rollback"

stage='configuration'
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
)

stage='construction-web'
candidate="nevolium-web:kiss-${target:0:12}"
build_override="$(mktemp /tmp/nevolium-kiss-web-build.XXXXXX.yaml)"
printf 'services:\n  nevolium-web:\n    image: %s\n' "$candidate" > "$build_override"
"${compose[@]}" -f "$build_override" build nevolium-web
image_id="$(sudo docker image inspect --format '{{.Id}}' "$candidate")"
echo "IMAGE_WEB_KISS_PREPAREE $candidate $image_id"

stage='controle-final'
check_runtime
test -z "$(git -C "$release_dir" status --porcelain)"
df -h /
echo "PREPARATION_WEB_KISS_REUSSIE $release_dir"
echo 'AUCUNE_ACTIVATION_EFFECTUEE'
)
```

## Reprise dans une nouvelle discussion

Demander : « Reprends Nevolium depuis GitHub : lis `AGENTS.md`, `PROJECT_STATE.md` et
`docs/product-memory.md`. Vérifie les références live et continue la prochaine action enregistrée. »
La PR #97 est une preuve intégrée, pas une branche à reprendre. Si une nouvelle PR est ouverte
et plus récente que le checkpoint main, lire aussi son checkpoint avant de créer une branche.
