# Inspection d'entrée D05 — 14 septembre 2026

Inspection de code, sans exécution ni rendu navigateur. Base consultée :
`ea2f3644ab19f2da2eedd2927cf7c0bedf2f9211`.
H5 reste ouvert pour deux opérations GitHub ; D05 n'est pas implémenté.
Cette note est une preuve datée ; [PROJECT_STATE](../../PROJECT_STATE.md) reste le point de reprise.

## Vérification GitHub

- Main : `ea2f364…`, enfant direct du merge #88 `db07f7a…` ; différence documentaire uniquement.
- Arbre du merge et de la tête D04 `2946df5…` identiques :
  `cc08dad4de36c9974dc44fc0527c3fd309ee54d6`.
- Dix workflows de la tête D04 réussis ; huit workflows exécutés sur le main consulté réussis.
  Le nombre de workflows sur main ne doit pas être présenté comme dix.
- Aucune PR ouverte, aucune branche D05. Branche D04 encore à `2946df5…`.
- Refs de tags : seulement `r7-baseline-2026-09-11` ; H5 absent.
- Les anciennes branches H/D et les deux réservoirs existent aussi ; aucune suppression élargie autorisée.

## Réutilisation et écarts observés

| Zone inspectée | Existant | Travail D05 à poursuivre après clôture |
|---|---|---|
| `apps/web/src/App.tsx`, `CockpitShell.tsx` | Six panneaux métier, Dockview et restauration JSON | Remplacer l'en-tête technique et la grille de modules futurs par une navigation utile ; activer un panneau déjà ouvert au lieu de simplement retourner |
| `CockpitShell.tsx`, Core `ui_layouts.py` / `ui_models.py` | GET/PUT authentifiés, unicité propriétaire + workspace, limite 256 000 octets | Distinguer appareils avec la clé existante ; préserver `cockpit.main`. Rendre erreurs/reprise visibles, sérialiser les sauvegardes et empêcher un fallback après erreur de lecture d'écraser le layout distant |
| `KnowledgeInspectorView.tsx`, `lib/projectSelection.tsx` | Inspection documents/versions/chunks et sélection de projet partagée en mémoire | Réutiliser ces vues pour l'inspecteur et l'accès rapide ; vérifier la reprise projet/conversation/document après rechargement |
| `styles.css`, `packages/ui/src/index.ts` | Palette sombre, styles par panneau ; package UI limité au catalogue d'espaces | Design partagé, focus clavier, états, contrastes et préférence de réduction du mouvement ; accès tactile sans glisser |
| `index.html`, `main.tsx`, arbre Web | Bootstrap OIDC et erreur de connexion ; aucune infrastructure PWA trouvée | Shell installable, état réseau, mobile/tablette/bureau ; aucun cache métier avant D12 |
| Core `auth.py`, Web `lib/authSession.ts` | Rôle `nevolium-admin`, garde serveur et snapshot de rôles | Réutiliser ces frontières pour les réglages d'instance |
| `infrastructure/litellm/config.yaml` | Alias `smart` et `alternative`, modèle et clé via environnement serveur | Aucun parcours de test puis bascule d'instance trouvé dans les fichiers inspectés ; intégrer configuration candidate, test borné et conservation de la version valide |
| Core `model_admission.py`, Worker `model_gateway.py` | Verrou d'admission PostgreSQL, réservations/usages, budgets, dispatch unique, attribution du modèle réel via LiteLLM | Coordonner vidage des appels et nouvelles admissions avant bascule ; comptabiliser le test via les primitives canoniques. Les cinq anciennes réservations uncertain ne sont pas des appels à rejouer ou supprimer |

Le CSS adapte certains formulaires à 850/560 px, mais les panneaux Dockview ont des minima
320/360 px et le shell une hauteur minimale de 620 px. Une utilisabilité téléphone n'est pas
prouvée par ces seules media queries. Aucun import de moteur 3D dans le shell canonique inspecté.

## Références effectivement accessibles

Les arbres récursifs non tronqués de main et du prototype
`ed12d503aa500a6e7700e9ac82d823e0e815f33d` ne contiennent aucun fichier
PNG/JPEG/WebP/GIF/SVG/FIG de référence. Les images des anciennes conversations sont absentes ici.

Le prototype a été inspecté dans les deux écrans d'entrée du répertoire `apps/web/src/app/`,
`apps/web/src/brand.css`, `AssistantDrawer.tsx` et `SecretVaultSettings.tsx`.
Il contient une marque organique CSS et une préférence de réduction du mouvement ; ses écrans
dépendent aussi de Mycelium 3D, de Brain et d'API historiques.
Le coffre de secrets générique n'est pas un réglage d'instance LiteLLM qualifié.
Aucun composant n'a été repris et aucun merge global n'est proposé.
Demander à l'utilisateur une ou deux captures validées du cockpit et le logo s'il existe.

## Livraison et validation attendues

Conserver une seule branche/PR D05 depuis le main live après H5. Une livraison coordonnée :
shell/navigation/inspecteur, états et reprise des layouts par appareil, PWA, réglages API administrateur.
Gantt/calendrier, édition, mindmap et Mycelium 3D restent D06–D09.

La CI actuelle compile/typecheck le Web dans Foundation ; `ui-workspace.yml` vérifie les contrats
Core, pas les interactions d'un navigateur. Compléter la preuve par des comportements :
ouvrir/activer/réorganiser/recharger, changement d'appareil sans écrasement, erreur de sauvegarde,
clavier/tactile/réduction du mouvement et navigateur sans WebGL ; refus non-admin,
échec/timeout/concurrence du test API sans perte de configuration valide ni fuite de clé.
OpenAI reste le seul fournisseur qualifié par D04. Les options Anthropic/xAI/Moonshot ne valent
pas compatibilité ; toute sélection doit passer son propre test réel borné.
Aucun test fournisseur ni aucun nouveau test navigateur n'a été exécuté pendant cette inspection.

## Blocage et commande opérateur préparée

Cette session ne dispose d'aucun outil terminal. Le connecteur GitHub expose lecture, fichiers,
commits, branches et PR, mais aucune action de création de tag ou de suppression de branche.
Ce n'est pas un manque d'autorisation utilisateur. Aucun contournement via workflow CI n'est ajouté.

Bloc Bash préparé, relu, **non exécuté**. À lancer dans un terminal déjà authentifié pour pousser
sur ce dépôt. Il relève le checkout serveur, conserve ses fichiers, vérifie le merge et son arbre,
crée H5 seulement s'il est absent, contrôle sa cible même pour un tag annoté, puis supprime
uniquement la branche D04 avec comparaison de sa tête au moment du push.
Un tag différent ou une branche avancée entraîne un arrêt. Aucune commande Docker, checkout,
Task, migration ou sauvegarde ; les fetch ne changent que les références et objets Git locaux.

```bash
(
set -Eeuo pipefail
trap 'echo "CLOTURE_H5_INTERROMPUE : transmettre la sortie sans jeton." >&2' ERR
cd /opt/nevolium/source
h5_checkout="$(git rev-parse HEAD)"
printf 'CHECKOUT_SERVEUR=%s\n' "$h5_checkout"
test -z "$(git status --porcelain)"
h5_origin="$(git remote get-url origin)"
case "$h5_origin" in
  https://github.com/fredbuhr/nevolium|https://github.com/fredbuhr/nevolium.git|git@github.com:fredbuhr/nevolium.git) ;;
  *) echo "ORIGIN_INATTENDU : arrêt sans modification." >&2; exit 1 ;;
esac
test "$(git remote get-url --push origin)" = "$h5_origin"
h5_merge="db07f7a90cc406ddc80683521bbf1744e3a2b668"
h5_tested="2946df59664c01d77abc3b5720fff1dbbf96cb4c"
h5_ref="refs/heads/hardening/d04-real-engine-qualification"
git fetch --no-tags origin refs/heads/main
git merge-base --is-ancestor "$h5_merge" FETCH_HEAD
test "$(git rev-parse "$h5_merge^2")" = "$h5_tested"
test "$(git rev-parse "$h5_merge^{tree}")" = "$(git rev-parse "$h5_tested^{tree}")"
h5_existing="$(git ls-remote --refs origin refs/tags/H5)"
if [ -z "$h5_existing" ]; then
  git push origin "$h5_merge:refs/tags/H5"
fi
git fetch --no-tags origin refs/tags/H5
test "$(git rev-parse 'FETCH_HEAD^{commit}')" = "$h5_merge"
h5_branch="$(git ls-remote --refs origin "$h5_ref")"
if [ -n "$h5_branch" ]; then
  h5_branch_sha="$(printf '%s\n' "$h5_branch" | cut -f1)"
  test "$h5_branch_sha" = "$h5_tested"
  git push --force-with-lease="$h5_ref:$h5_tested" origin ":$h5_ref"
fi
h5_remaining="$(git ls-remote --refs origin "$h5_ref")"
test -z "$h5_remaining"
git fetch --no-tags origin refs/tags/H5
test "$(git rev-parse 'FETCH_HEAD^{commit}')" = "$h5_merge"
test "$(git rev-parse HEAD)" = "$h5_checkout"
printf 'H5_OK=%s\nBRANCHE_D04_ABSENTE\nCHECKOUT_INCHANGE=%s\n' "$h5_merge" "$h5_checkout"
)
```

Après sortie `H5_OK` : revérifier refs/main/CI depuis GitHub, actualiser le checkpoint de clôture,
puis créer l'unique branche D05 depuis ce main. Ne pas enregistrer H5 terminé sur la seule
présence de cette commande.
