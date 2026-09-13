#!/usr/bin/env bash
set -Eeuo pipefail

# Compare the fixed D04 Research candidates without exposing Ollama or changing canonical data.
# The production Core, Worker and Ollama containers are stopped only for the isolated measurement
# and are restarted by the EXIT trap. The existing Ollama image and model volume are reused.

EXPECTED_BRANCH="hardening/d04-real-engine-qualification"
ENV_FILE="/etc/nevolium/production.env"
MODEL_4B="qwen3:4b"
MODEL_8B="qwen3:8b"
MIN_FREE_KIB=$((20 * 1024 * 1024))
MIN_AVAILABLE_MEMORY_KIB=$((14 * 1024 * 1024))
QUALIFICATION_MEMORY="12g"
CLIENT_MEMORY="1g"
TEMP_OLLAMA="nevolium-d04-research-model-ollama"
TEMP_CLIENT="nevolium-d04-research-model-client"
EXPECTED_COMMIT=""
OUTPUT=""

usage() {
  cat <<'EOF'
Usage: research_model_target.sh --expected-commit SHA [--env-file PATH] [--output PATH]

The command pulls qwen3:4b and qwen3:8b into the existing Ollama volume, then compares them
offline with the fixed D04 Research prompts. It creates no Nevolium Task and performs no Web call.
EOF
}

while (($#)); do
  case "$1" in
    --expected-commit)
      EXPECTED_COMMIT="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ARRET : argument inconnu: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! "$EXPECTED_COMMIT" =~ ^[0-9a-f]{40}$ ]]; then
  echo "ARRET : --expected-commit doit etre un SHA Git complet." >&2
  exit 2
fi
sudo -v
if ! sudo test -f "$ENV_FILE"; then
  echo "ARRET : fichier d'environnement absent." >&2
  exit 2
fi

REPOSITORY_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPOSITORY_ROOT"
CURRENT_COMMIT="$(git rev-parse HEAD)"
if [[ "$(git branch --show-current)" != "$EXPECTED_BRANCH" ]]; then
  echo "ARRET : branche D04 attendue absente." >&2
  exit 2
fi
if [[ "$CURRENT_COMMIT" != "$EXPECTED_COMMIT" ]]; then
  echo "ARRET : le checkout ne correspond pas au commit attendu." >&2
  exit 2
fi
if [[ -n "$(git status --short)" ]]; then
  echo "ARRET : le checkout contient des modifications." >&2
  exit 2
fi

SUDO_KEEPALIVE_PID=""
compose=(
  sudo docker compose --env-file "$ENV_FILE"
  -f compose.yaml -f compose.production.yaml
  -f compose.web-mcp.yaml -f compose.web-mcp.production.yaml
  --profile ai --profile local-ai --profile memory --profile search
)

if [[ -z "$OUTPUT" ]]; then
  OUTPUT="$REPOSITORY_ROOT/.nevolium-qualification/evidence/research-model-$CURRENT_COMMIT.json"
elif [[ "$OUTPUT" != /* ]]; then
  OUTPUT="$REPOSITORY_ROOT/$OUTPUT"
fi
OUTPUT_DIRECTORY="$(dirname "$OUTPUT")"
mkdir -p "$OUTPUT_DIRECTORY"
OUTPUT_DIRECTORY="$(realpath "$OUTPUT_DIRECTORY")"
OUTPUT="$OUTPUT_DIRECTORY/$(basename "$OUTPUT")"
if [[ -e "$OUTPUT" ]]; then
  echo "ARRET : le rapport existe deja; conserver la preuve et choisir un autre --output." >&2
  exit 1
fi

query_count() {
  local statement="$1"
  printf '%s\n' "$statement" | "${compose[@]}" exec -T postgres \
    sh -c 'psql -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

require_idle_canonical_work() {
  local active_workflows active_reservations
  active_workflows="$(query_count \
    "SELECT count(*) FROM workflow_executions WHERE status NOT IN ('completed','failed','cancelled');")"
  active_reservations="$(query_count \
    "SELECT count(*) FROM model_reservations WHERE status IN ('reserved','started') AND expires_at > now();")"
  if [[ "$active_workflows" != "0" || "$active_reservations" != "0" ]]; then
    echo "ARRET : travail canonique actif; workflows=$active_workflows reservations=$active_reservations." >&2
    return 1
  fi
}

canonical_snapshot() {
  query_count "SELECT concat_ws('|',
    (SELECT count(*) FROM tasks),
    (SELECT count(*) FROM workflow_executions),
    (SELECT count(*) FROM model_usage_records),
    (SELECT count(*) FROM model_reservations),
    (SELECT count(*) FROM tool_invocations),
    (SELECT count(*) FROM artifacts));"
}

container_running() {
  [[ "$(sudo docker inspect --format '{{.State.Running}}' "$1")" == "true" ]]
}

wait_running() {
  local container_id="$1"
  local attempt
  for attempt in $(seq 1 60); do
    if container_running "$container_id"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

SERVICES_STOPPED=0
TEMP_STARTED=0
cleanup() {
  local exit_code=$?
  trap - EXIT HUP INT TERM
  set +e
  if [[ -n "$SUDO_KEEPALIVE_PID" ]]; then
    kill "$SUDO_KEEPALIVE_PID" >/dev/null 2>&1
    wait "$SUDO_KEEPALIVE_PID" >/dev/null 2>&1
    SUDO_KEEPALIVE_PID=""
  fi
  if ((TEMP_STARTED)); then
    sudo docker rm -f "$TEMP_CLIENT" "$TEMP_OLLAMA" >/dev/null 2>&1
    TEMP_STARTED=0
  fi
  if ((SERVICES_STOPPED)); then
    "${compose[@]}" start ollama nevolium-core nevolium-worker >/dev/null
    SERVICES_STOPPED=0
  fi
  exit "$exit_code"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
(while sleep 45; do sudo -n -v >/dev/null 2>&1 || exit; done) &
SUDO_KEEPALIVE_PID=$!

echo "SECTION=PREFLIGHT"
if (( $(df -Pk "$REPOSITORY_ROOT" | awk 'NR == 2 {print $4}') < MIN_FREE_KIB )); then
  echo "ARRET : moins de 20 Gio sont disponibles pour les deux modeles et l'image de qualification." >&2
  exit 1
fi

for service in postgres nevolium-core nevolium-worker ollama; do
  service_id="$("${compose[@]}" ps -q "$service")"
  if [[ -z "$service_id" ]] || ! container_running "$service_id"; then
    echo "ARRET : service requis indisponible: $service" >&2
    exit 1
  fi
done
require_idle_canonical_work
if "${compose[@]}" exec -T ollama ollama ps | tail -n +2 | grep -q '[^[:space:]]'; then
  echo "ARRET : un modele Ollama est deja charge." >&2
  exit 1
fi

OLLAMA_ID="$("${compose[@]}" ps -q ollama)"
CORE_ID="$("${compose[@]}" ps -q nevolium-core)"
WORKER_ID="$("${compose[@]}" ps -q nevolium-worker)"
OLLAMA_IMAGE="$(sudo docker inspect --format '{{.Image}}' "$OLLAMA_ID")"
OLLAMA_VOLUME="$(sudo docker inspect --format \
  '{{range .Mounts}}{{if eq .Destination "/root/.ollama"}}{{.Name}}{{end}}{{end}}' "$OLLAMA_ID")"
if [[ -z "$OLLAMA_VOLUME" ]]; then
  echo "ARRET : volume Ollama nomme introuvable." >&2
  exit 1
fi
if sudo docker container inspect "$TEMP_OLLAMA" >/dev/null 2>&1 \
  || sudo docker container inspect "$TEMP_CLIENT" >/dev/null 2>&1; then
  echo "ARRET : un ancien conteneur de qualification existe encore." >&2
  exit 1
fi

SHORT_COMMIT="${CURRENT_COMMIT:0:12}"
QUALIFICATION_IMAGE="nevolium-research-model-qualification:$SHORT_COMMIT"
echo "SECTION=BUILD_CLIENT"
sudo docker build --pull=false \
  --build-arg NEVOLIUM_WORKER_EXTRAS=intelligence \
  --file services/worker/Dockerfile \
  --tag "$QUALIFICATION_IMAGE" .

SOURCE_AGENT_SHA="$(sha256sum services/worker/src/nevolium_worker/research_agent.py | awk '{print $1}')"
IMAGE_AGENT_SHA="$(sudo docker run --rm --network none --read-only \
  --security-opt no-new-privileges:true --cap-drop ALL "$QUALIFICATION_IMAGE" \
  python -c 'import hashlib; from pathlib import Path; import nevolium_worker.research_agent as m; print(hashlib.sha256(Path(m.__file__).read_bytes()).hexdigest())')"
if [[ "$SOURCE_AGENT_SHA" != "$IMAGE_AGENT_SHA" ]]; then
  echo "ARRET : le module Research installe ne correspond pas au checkout." >&2
  exit 1
fi

echo "SECTION=PULL_CANDIDATES"
"${compose[@]}" exec -T ollama ollama pull "$MODEL_4B"
"${compose[@]}" exec -T ollama ollama pull "$MODEL_8B"
require_idle_canonical_work
if "${compose[@]}" exec -T ollama ollama ps | tail -n +2 | grep -q '[^[:space:]]'; then
  echo "ARRET : un modele Ollama est charge apres la preparation." >&2
  exit 1
fi
CANONICAL_BEFORE="$(canonical_snapshot)"

echo "SECTION=ISOLATE_SERVICES"
SERVICES_STOPPED=1
"${compose[@]}" stop nevolium-worker
"${compose[@]}" stop nevolium-core
"${compose[@]}" stop ollama
require_idle_canonical_work
if (( $(awk '/MemAvailable:/ {print $2}' /proc/meminfo) < MIN_AVAILABLE_MEMORY_KIB )); then
  echo "ARRET : moins de 14 Gio de RAM sont disponibles apres isolation." >&2
  exit 1
fi

TEMP_STARTED=1
sudo docker run --detach --rm --name "$TEMP_OLLAMA" \
  --network none --cpus 2 --memory "$QUALIFICATION_MEMORY" --memory-swap "$QUALIFICATION_MEMORY" \
  --pids-limit 256 --volume "$OLLAMA_VOLUME:/root/.ollama" "$OLLAMA_IMAGE" >/dev/null
for attempt in $(seq 1 60); do
  if sudo docker exec "$TEMP_OLLAMA" ollama list >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == "60" ]]; then
    echo "ARRET : Ollama ephemere ne repond pas." >&2
    exit 1
  fi
  sleep 1
done

echo "SECTION=QUALIFICATION"
set +e
sudo docker run --rm --name "$TEMP_CLIENT" \
  --network "container:$TEMP_OLLAMA" \
  --cpus 1 --memory "$CLIENT_MEMORY" --memory-swap "$CLIENT_MEMORY" --pids-limit 128 \
  --read-only --tmpfs /tmp:rw,nosuid,nodev,size=268435456 \
  --security-opt no-new-privileges:true --cap-drop ALL \
  --user "$(id -u):$(id -g)" --env HOME=/tmp \
  --volume "$REPOSITORY_ROOT/scripts/qualification:/qualification:ro" \
  --volume "$OUTPUT_DIRECTORY:/evidence" \
  --workdir /qualification "$QUALIFICATION_IMAGE" \
  python /qualification/research_model.py run \
    --model "$MODEL_4B" --model "$MODEL_8B" \
    --commit "$CURRENT_COMMIT" --scope private-target-cpu \
    --model-runtime-cpus 2 --model-runtime-memory-bytes 12884901888 \
    --output "/evidence/$(basename "$OUTPUT")"
QUALIFICATION_EXIT=$?
set -e

sudo docker rm -f "$TEMP_OLLAMA" >/dev/null
TEMP_STARTED=0
"${compose[@]}" start ollama nevolium-core nevolium-worker >/dev/null
SERVICES_STOPPED=0
wait_running "$OLLAMA_ID"
wait_running "$CORE_ID"
wait_running "$WORKER_ID"
if [[ "$("${compose[@]}" ps -q ollama)" != "$OLLAMA_ID" \
  || "$("${compose[@]}" ps -q nevolium-core)" != "$CORE_ID" \
  || "$("${compose[@]}" ps -q nevolium-worker)" != "$WORKER_ID" ]]; then
  echo "ARRET : l'identite d'un conteneur restaure a change." >&2
  exit 1
fi
for attempt in $(seq 1 60); do
  if "${compose[@]}" exec -T ollama ollama list >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == "60" ]]; then
    echo "ARRET : le service Ollama restaure ne repond pas." >&2
    exit 1
  fi
  sleep 1
done
if [[ "$(sudo docker inspect --format '{{.State.OOMKilled}}' "$OLLAMA_ID")" != "false" \
  || "$(sudo docker inspect --format '{{.State.OOMKilled}}' "$CORE_ID")" != "false" \
  || "$(sudo docker inspect --format '{{.State.OOMKilled}}' "$WORKER_ID")" != "false" ]]; then
  echo "ARRET : un service restaure porte un etat OOM." >&2
  exit 1
fi
require_idle_canonical_work
CANONICAL_AFTER="$(canonical_snapshot)"
if [[ "$CANONICAL_AFTER" != "$CANONICAL_BEFORE" ]]; then
  echo "ARRET : le snapshot canonique a change pendant la qualification." >&2
  exit 1
fi

kill "$SUDO_KEEPALIVE_PID" >/dev/null 2>&1
wait "$SUDO_KEEPALIVE_PID" >/dev/null 2>&1 || true
SUDO_KEEPALIVE_PID=""
trap - EXIT HUP INT TERM
echo "SECTION=RESTORED"
echo "COMMIT=$CURRENT_COMMIT"
echo "REPORT=$OUTPUT"
echo "CANONICAL_TASKS_CREATED=0"
echo "WEB_TOOL_CALLS=0"
echo "CANONICAL_SNAPSHOT_UNCHANGED=true"
if ((QUALIFICATION_EXIT == 0)); then
  echo "PRESELECTION_RESEARCH_TERMINEE"
else
  echo "AUCUN_MODELE_ELIGIBLE_OU_QUALIFICATION_INCOMPLETE"
fi
exit "$QUALIFICATION_EXIT"
