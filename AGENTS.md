# Nevolium agent operating rules

This file is the mandatory entrypoint for any coding agent or ChatGPT session working on this repository.

## 1. Establish repository truth before acting

Before proposing or making any change:

1. read `PROJECT_STATE.md`;
2. fetch the live `main` head from GitHub;
3. fetch the active pull request/branch named in `PROJECT_STATE.md` and read the active Dxx lot in `docs/implementation-plan.md`;
   if main's checkpoint names no active work, also inspect open PRs and their checkpoints before creating a branch;
4. compare the live refs with the checkpoint;
5. inspect existing code before creating files, branches, migrations, APIs or duplicate implementations;
6. read the accepted [refoundation contract](docs/refoundation-contract.md) and
   [ADR-034](docs/decisions/ADR-034-human-first-refoundation.md) alongside the applicable Dxx section.
   They amend product/interaction/data requirements and sequencing, not the implemented state.

Conversation history, model memory and previous-chat summaries are advisory only. If they conflict with GitHub, GitHub wins.

## 2. Branch policy

- `main` is the only canonical integrated source of truth.
- Keep at most one normal development branch active at a time.
- Do not create a new branch when `PROJECT_STATE.md` names an active branch unless the current gate explicitly requires replacing it.
- A branch is temporary workspace, not a Nevolium version.
- After a gate is validated and merged, update `PROJECT_STATE.md`, then delete/retire the merged branch during repository cleanup.
- Preserve milestones with Git tags/releases, not long-lived implementation branches.
- Experimental reservoirs such as the legacy interface prototype at commit `ed12d503…` must never
  be merged wholesale; salvage isolated components only after explicit review.

## 3. Deliver coherent recoverable lots

Each Dxx lot has one primary objective, coordinated changes, shared validation and a clear stop point.
Default to completing the lot in one coherent delivery; commits and internal checklists are recovery
points, not new sub-lots. Do not split by file or technical layer. Split only when an observed blocker
or a separately reviewable risk requires it, and record the reason. Do not silently start the next Dxx lot.

Before editing, state the current gate. After editing:

1. run or inspect the relevant validation;
2. record what changed and what remains;
3. update `PROJECT_STATE.md` before ending the gate or leaving work in progress.

If interrupted, the next session resumes the gate recorded in `PROJECT_STATE.md`; it does not invent a new branch or restart from an older milestone.

### User-path completion

Manual creation, editing and linking must work through canonical operations without an LLM.
For an exposed path, qualify FR/EN, keyboard/touch alternatives, retained context, errors/conflicts,
access and data egress. AI adds inspectable source, cost, scope and actual execution status.
Keep code integration, mocked-browser proof, real services, deployment, physical devices and user
acceptance distinct. Never mark a new requirement satisfied merely because its documentation is merged.
The 24 entries in `docs/refoundation-backlog.md` refine existing lots; they are not parallel gates.

## 4. Documentation authority

Use these roles consistently:

- `PROJECT_STATE.md` — operational checkpoint: where to resume now;
- `docs/status.md` — current implemented/validated product state;
- `docs/roadmap.md` — planned sequencing;
- `docs/implementation-plan.md` — stable Dxx delivery lots, dependencies and acceptance scenarios;
- `docs/development-workflow.md` — checkpoint format and recovery after interruption or failed validation;
- `docs/architecture.md` — architectural boundaries and system design;
- `docs/product-memory.md` — accepted user vision and durable continuity across conversations;
- `docs/component-matrix.md` — implementation/integration maturity by component;
- `docs/refoundation-contract.md` — accepted cross-document amendments from ADR-034;
- `docs/refoundation-backlog.md` — acceptance criteria within existing lots, not another live checkpoint;
- `docs/data-governance.md` — data flows, retention, rights and applicability, with explicit unknowns;
- `docs/decisions/` — durable architectural decisions;
- historical audits/plans — evidence only, never the current source of truth.

Do not make a historical document look current. Move superseded material to `docs/archive/` during the documentation cleanup gate rather than deleting useful history blindly.

Keep the active checkpoint compact: verified base, one active branch/PR, completed work, exact-head
validation, remaining uncertainty and one executable next action. Preserve long evidence in the
archive. A configured engine or successful mock must never be recorded as a verified real integration.

Keep private source PDFs/screenshots, signed contracts, personal registers, incident details and
secrets outside this public repository. A legal regime is assessed by role, use, offer and current
law; an obligation already triggered cannot be deferred solely because D22 is not active.

## 5. Safety against duplicate work

Before adding a capability, model, migration, endpoint, UI workspace, smoke test or adapter, search the current canonical line and the explicitly named experimental reservoir for an existing implementation.

Do not reuse an old branch merely because a previous conversation mentioned it. Never merge a divergent consolidation/prototype branch into `main` without a fresh comparison and an explicit salvage decision.

## 6. Current repository-reset rule

Until `PROJECT_STATE.md` says the repository reset is complete, repository hygiene and checkpoint correctness take precedence over new feature development. Do not begin Gantt, Calendar, Brain, Finance/Crypto or other new product slices outside the recorded gate.
