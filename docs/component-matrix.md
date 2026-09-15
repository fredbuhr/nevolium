# Component matrix

The component registry is intentionally broader than the currently implemented product. Presence in
`config/components.yaml`, Compose or a package manifest does **not** mean a capability is complete.
The maturity column describes the Nevolium integration, not the upstream project's maturity.

D04 supplies bounded real-engine evidence for Docling/Mem0/Graphiti and the API-first pilot. D05
validates the workspace shell. D06 is integrated by PR #90, merge commit
`20720774552418a6c9e7acbfbf069945ff0f57df`. D07 is integrated by PR #91, merge
`f4390a5cdbd1e2b3ef512ad728983f001f2fd8b4`. D08 is integrated by PR #92, merge
`2ded338ed4e0b619a7b2bae4d732e56771151e3c`; final PR head passed 9/9 workflows.
D09 is implemented in draft PR #93, with browser and physical-device qualification still open.
Deployment remains separate; the last verified pilot runtime is D05.

## Maturity legend

- **Validated** — Nevolium integration is exercised by the current qualified product/CI path.
- **Integrated** — Nevolium code/adapters use the component, but the end-user capability or hardening is incomplete.
- **Configured** — dependency/service is wired but no stable Nevolium product workflow is complete.
- **Scaffold** — placeholder contracts/package/application skeleton exists.
- **Declared** — architectural target only.

| Capability | Component | Mode/profile | Nevolium ownership rule | Current maturity |
|---|---|---|---|---|
| Canonical database | PostgreSQL + pgvector | service / core | authoritative domain state; vectors rebuildable | **Validated** |
| Temporal context graph | Graphiti + Neo4j | worker library + service / core | derived projection only | **Integrated; real execution validated in D04** |
| Cache/locks | Valkey | service / core | ephemeral only | **Configured** |
| Event bus | NATS JetStream | service / core | events from transactional outbox | **Validated** |
| Object storage | SeaweedFS | service / core | authoritative binary objects | **Validated** |
| Durable workflows | Temporal | service + SDK / core | in-flight authority correlated to Nevolium records | **Validated** |
| Agent framework | PydanticAI | worker library / core | agents act under Nevolium policy | **Validated** |
| Model gateway | LiteLLM | service / core | provider abstraction/routing boundary | **Validated** |
| Local model simple | Ollama | service / core | model provider only | **Configured** |
| Local model edge | llama.cpp | sidecar/host / desktop | model provider only | **Declared** |
| Local model GPU | vLLM | service / `gpu` | model provider only | **Configured** |
| Long-term memory | Mem0 | worker library / core | derived memory projection | **Integrated; real execution validated in D04** |
| Document parsing | Docling | worker library / core | canonical document/chunk provenance | **Integrated; bounded real execution validated** |
| External automation | Activepieces | service / `automation` | delegated engine; Nevolium owns intent/policy/run link | **Configured** |
| Tool protocol | MCP | protocol / core | preferred AI tool boundary | **Validated** |
| Deterministic browser | Playwright | future browser boundary | side effects policy-gated | **Declared; direct Worker dependency retired in D03** |
| AI browser | Browser Use | future browser boundary | side effects policy-gated | **Declared; direct Worker dependency retired in D03** |
| Dev agent | OpenHands | service / `dev-agent` | Nevolium owns task/approval/diff references | **Configured** |
| Search | SearXNG | service / `search` | sourced search adapter, never canonical truth | **Integrated** |
| Secrets | OpenBao | service / core | secret values never stored in domain DB | **Validated** |
| Identity | Keycloak | service / core | authentication provider; Nevolium owns permissions | **Validated** |
| AI observability | Langfuse + ClickHouse | services / `observability` | tracing/eval projection, not audit source | **Configured** |
| Notifications | ntfy | service / `notifications` | delivery adapter | **Configured** |
| Realtime docs | Hocuspocus + Yjs | `collaboration-experimental` | realtime must materialize to canonical state | **Scaffold / configured** |
| Voice realtime | LiveKit | `voice-experimental` | transport only | **Configured** |
| Speech synthesis | Kokoro-FastAPI | service / `voice` | speech synthesis adapter | **Configured** |
| Speech-to-text | whisper.cpp | sidecar/worker / desktop | local transcription engine | **Declared** |
| Voice activity | Silero VAD | sidecar library / desktop | local signal processing | **Declared** |
| Wake word | openWakeWord | sidecar library / desktop | custom Nevolium model preferred | **Declared** |
| Desktop runtime | Tauri | app / desktop | Nevolium-owned local trust boundary | **Scaffold** |
| Workspace shell | Dockview | web library | Nevolium UX/layout surface | **Validated** |
| Data views | TanStack Table/Query | web libraries | Nevolium UX/data access | **Integrated** |
| Drag/drop | dnd-kit | web library | Kanban interaction only; Task remains canonical | **Validated in D06** |
| Rich text | Lexical | web library / D07 | renderer/editor over canonical DocumentVersion content | **Validated in D07** |
| Whiteboard | Excalidraw | web library target | assets/doc objects linked to domain | **Declared** |
| Planning calendar | Nevolium Web | web / D06 | view/editor over canonical Tasks and virtual occurrences | **Validated in D06** |
| Calendar library target | Schedule-X | web library | optional renderer only; never canonical truth | **Configured; not used by qualified D06 calendar** |
| Dashboards | Apache ECharts | web library | view only | **Configured** |
| Maps | MapLibre GL JS | web library | view over place/location state | **Configured** |
| 2D graph | React Flow (`@xyflow/react`) | web library / D08 | renderer/input over canonical Documents/Tasks/Relationships; layout in WorkspaceLayout | **Validated in integrated D08** |
| 3D graph | React Three Fiber + Three.js | web libraries / D09 | canonical D08 snapshot; separate presentation layout, bounded rendering, 2D fallback | **Integrated on PR #93; qualification pending** |
| Gantt | SVAR React Gantt 2.7.3 | web library / D06 | renderer/input only; Core/PostgreSQL own plan state | **Validated in D06** |
| Crypto accounting | rotki | service / `finance` | portfolio source/adapter, private network only | **Configured** |
| Exchange APIs | CCXT | integration library / finance | no raw secret exposure to models | **Declared** |
| EVM | viem | web/worker library / finance | prepare/read; signing isolated | **Declared** |
| Trading engine | Hummingbot | service / `finance` | disabled for live authority by default | **Configured** |
| Personal finance | Actual Budget | service / `finance` | external ledger adapter | **Configured** |
| Smart home | Home Assistant | service / `home` | upstream device authority | **Configured** |
| Sandbox | gVisor | host runtime / ops | hardened execution boundary | **Declared** |
| Backup | restic | host job / ops | encrypted recovery layer | **Validated** |
| Private access | Headscale | service / `remote` | private network overlay | **Configured** |
| Deployment UI | Coolify (optional) | host platform | deployment convenience, not dependency | **Declared / optional** |

## Planning notes

D06 keeps PostgreSQL/Core authoritative. SVAR's internal task grid is disabled in the qualified
Gantt because Nevolium already owns the List view; the Gantt is chart-only and mutations are
intercepted back into Nevolium preview/apply or versioned planning-structure contracts. A regression
contract also forbids opening leaf rows in SVAR's `DataTree`, whose leaves carry `data=null`.

The qualified D06 calendar is a Nevolium surface over canonical Tasks and Core-produced virtual
occurrences. Schedule-X remains installed/configured and may be reused later, but its mere presence
is not validation evidence.

## D07 / D08 notes

Lexical is qualified as the D07 editor, but `Document`/`DocumentVersion` remain canonical. D08
qualifies React Flow as a 2D renderer/input only: node identities and relationships remain in Core,
while positions/viewport/groups live in `WorkspaceLayout`. Its browser proof includes multi-node
layout persistence, save failure/retry, a fresh owner-scoped deep link and an idea branch converted
and planned through D06 until both Tasks render in Gantt.

D09 uses R3F/Three with instanced nodes and batched filaments; `react-force-graph-3d` remains an
unused installed option. Physical GPU/tablet qualification remains open. Hocuspocus/Yjs, Tauri and voice dependencies remain
future boundaries. Finance, crypto, Home Assistant and OpenHands profiles may exist without
stabilized Nevolium adapters, policy flows and UX.

Open WebUI is not a frontend foundation. n8n is not the central automation dependency; Activepieces
is selected. FalkorDB and Kuzu are not selected for the recorded licensing/project-status reasons.
OpenClaw is not part of the target runtime. See [deployment](deployment.md),
[implementation-plan](implementation-plan.md) and [PROJECT_STATE](../PROJECT_STATE.md).
