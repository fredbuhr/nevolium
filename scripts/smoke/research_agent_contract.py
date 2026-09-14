import asyncio
import copy
import json
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch

from pydantic_ai import UnexpectedModelBehavior

from nevolium_worker import model_gateway, workflows
from nevolium_worker.model_gateway import (
    MODEL_CHECKPOINT_KIND,
    MODEL_CHECKPOINT_VERSION,
    ModelCallOutcomeUnknown,
    ModelCheckpointLedger,
)
from nevolium_worker.research_agent import (
    RESEARCH_ACTIVITY_TIMEOUT_SECONDS,
    RESEARCH_HEARTBEAT_TIMEOUT_SECONDS,
    RESEARCH_MODEL_TIMEOUT_SECONDS,
    build_research_evidence,
    plan_research,
    research_progress_snapshot,
    resolve_research_tool_input,
    run_research_model_stage,
    split_research_model_budget,
    synthesize_research,
)


TOOLS = [
    {
        "key": "web.search",
        "title": "Search web",
        "description": "Search public sources without side effects.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
            "additionalProperties": False,
        },
    }
]

TOOL_RESULTS = [
    {
        "slot": 0,
        "tool_key": "web.search",
        "input": {"query": "Nevolium architecture"},
        "rationale": "Find public evidence.",
        "invocation_id": "00000000-0000-0000-0000-000000000010",
        "result": {
            "items": [
                {
                    "title": "Nevolium architecture",
                    "snippet": "Nevolium keeps canonical state in its own platform boundary.",
                }
            ]
        },
    }
]


async def main() -> None:
    scheduled: list[dict] = []
    workflow_payload = {
        "task_id": "00000000-0000-0000-0000-000000000020",
        "workflow_id": "fixture-research-bounds",
        "workflow_execution_id": "00000000-0000-0000-0000-000000000021",
        "correlation_id": "00000000-0000-0000-0000-000000000022",
    }

    async def execute_activity(function, value, **options):
        if function is workflows.begin_execution:
            return {
                "task_title": "fixture",
                "task_input": {"capability": "research.autonomous", "authority_level": 1},
            }
        if function is workflows.check_policy_gate:
            return {"allowed": True}
        if function is workflows.prepare_research_context_pack:
            return {"items": []}
        if function is workflows.perform_autonomous_research:
            scheduled.append(options)
            return {"kind": "autonomous-research"}
        assert function is workflows.complete_execution, function
        return {"status": "completed"}

    with patch.object(workflows.workflow, "execute_activity", execute_activity):
        result = await workflows.TaskExecutionWorkflow().run(workflow_payload)
    assert result["status"] == "completed", result
    assert len(scheduled) == 1, scheduled
    assert scheduled[0]["start_to_close_timeout"] == timedelta(
        seconds=RESEARCH_ACTIVITY_TIMEOUT_SECONDS
    )
    assert scheduled[0]["heartbeat_timeout"] == timedelta(
        seconds=RESEARCH_HEARTBEAT_TIMEOUT_SECONDS
    )
    assert RESEARCH_MODEL_TIMEOUT_SECONDS == model_gateway.MODEL_REQUEST_TIMEOUT_CAP_SECONDS == 180
    assert model_gateway.MODEL_REQUEST_HEARTBEAT_INTERVAL_SECONDS == 30
    assert (
        model_gateway.MODEL_REQUEST_HEARTBEAT_INTERVAL_SECONDS
        < RESEARCH_HEARTBEAT_TIMEOUT_SECONDS
        < RESEARCH_MODEL_TIMEOUT_SECONDS
        < RESEARCH_ACTIVITY_TIMEOUT_SECONDS
    )

    async def unknown_model_call():
        raise ModelCallOutcomeUnknown("fixture outcome unknown")

    for stage, operation in (
        ("planning", unknown_model_call),
        ("synthesis", unknown_model_call),
    ):
        try:
            await run_research_model_stage(stage, operation)
        except workflows.ApplicationError as exc:
            assert exc.non_retryable is True, exc
            assert exc.type == "ModelCallOutcomeUnknown", exc
        else:
            raise AssertionError(f"Research {stage} must stop ambiguous model-call retries")

    async def valid_completion(_messages):
        rendered = json.dumps(_messages)
        assert "specific facts requested" in rendered
        assert "Distinguish initial releases from updates" in rendered
        return json.dumps(
            {
                "calls": [
                    {
                        "tool_key": "web.search",
                        "input": {"query": "Nevolium architecture"},
                        "rationale": "Find public evidence.",
                    }
                ],
                "rationale": "One read-only search is sufficient.",
            }
        )

    plan = await plan_research(
        query="Research Nevolium architecture",
        tools=TOOLS,
        max_tool_calls=1,
        completion=valid_completion,
    )
    assert len(plan.calls) == 1, plan
    assert plan.calls[0].tool_key == "web.search", plan

    # The first real cold Research after thread correction returned exactly this shape:
    # a complete direct call list wrapped in a Markdown JSON fence. Normalizing this
    # serialization must not issue a second model request or bypass tool allowlisting.
    incident_completions = 0

    async def cold_incident_completion(_messages):
        nonlocal incident_completions
        incident_completions += 1
        return """```json
[
  {
    "tool_key": "web.search",
    "rationale": "Search recent public sources through the private SearXNG service.",
    "input": {
      "query": "NEVOLIUM-D04-RESEARCH-WEB-COLD-03",
      "language": "fr",
      "time_range": "year",
      "max_results": 8
    }
  }
]
```"""

    incident_plan = await plan_research(
        query="NEVOLIUM-D04-RESEARCH-WEB-COLD-03",
        tools=TOOLS,
        max_tool_calls=2,
        completion=cold_incident_completion,
    )
    assert incident_completions == 1, incident_completions
    assert len(incident_plan.calls) == 1, incident_plan
    assert incident_plan.calls[0].tool_key == "web.search", incident_plan
    assert incident_plan.calls[0].input["query"] == "NEVOLIUM-D04-RESEARCH-WEB-COLD-03"
    assert "normalized the plan envelope" in incident_plan.rationale, incident_plan

    # COLD-04 returned a complete object with the requested calls and their individual
    # rationales, but omitted only the required top-level rationale. Preserve the calls
    # verbatim, add an explicit normalization note and never ask the model a second time.
    cold_04_completions = 0
    cold_04_tools = [
        *TOOLS,
        {
            "key": "web.fetch",
            "title": "Fetch web page",
            "description": "Fetch one public page without side effects.",
            "input_schema": {
                "type": "object",
                "properties": {"url": {"type": "string"}},
                "required": ["url"],
                "additionalProperties": False,
            },
        },
    ]

    async def cold_04_incident_completion(_messages):
        nonlocal cold_04_completions
        cold_04_completions += 1
        return json.dumps(
            {
                "calls": [
                    {
                        "tool_key": "web.search",
                        "input": {
                            "query": "site:debian.org Debian 13 trixie release information",
                            "time_range": "year",
                        },
                        "rationale": "Search for Debian 13 release information.",
                    },
                    {
                        "tool_key": "web.fetch",
                        "input": {"url": "https://www.debian.org/releases/trixie/"},
                        "rationale": "Fetch the official Debian release page.",
                    },
                ],
                "max_tool_calls": 2,
            }
        )

    cold_04_plan = await plan_research(
        query="Use web.search, then web.fetch for the official Debian 13 release page.",
        tools=cold_04_tools,
        max_tool_calls=2,
        completion=cold_04_incident_completion,
    )
    assert cold_04_completions == 1, cold_04_completions
    assert [call.tool_key for call in cold_04_plan.calls] == [
        "web.search",
        "web.fetch",
    ], cold_04_plan
    assert cold_04_plan.calls[0].input == {
        "query": "site:debian.org Debian 13 trixie release information"
    }, cold_04_plan
    assert cold_04_plan.calls[1].input == {
        "url": "https://www.debian.org/releases/trixie/"
    }, cold_04_plan
    assert "omitted the top-level plan rationale" in cold_04_plan.rationale, cold_04_plan

    async def missing_official_filter_completion(_messages):
        return json.dumps(
            {
                "calls": [
                    {
                        "tool_key": "web.search",
                        "input": {"query": "Debian 13 release information"},
                        "rationale": "Search for Debian release information.",
                    },
                    {
                        "tool_key": "web.fetch",
                        "input": {"url": "SEARCH_RESULT_URL"},
                        "rationale": "Read the selected result.",
                    },
                ],
                "rationale": "Search and read one result.",
            }
        )

    try:
        await plan_research(
            query="Use web.search, then web.fetch for the official Debian 13 release page.",
            tools=cold_04_tools,
            max_tool_calls=2,
            completion=missing_official_filter_completion,
        )
    except UnexpectedModelBehavior as exc:
        assert "site filter" in str(exc), exc
    else:
        raise AssertionError("Planner accepted an official search without a site filter")

    dependent_fetch = cold_04_plan.calls[1].model_copy(
        update={"input": {"url": "TO_BE_FILLED_FROM_SEARCH_RESULT", "max_chars": 1200}}
    )
    completed_search = [
        {
            "slot": 0,
            "tool_key": "web.search",
            "input": {"query": "site:debian.org Debian 13 release information"},
            "result": {
                "structured_content": {
                    "query": "site:debian.org Debian 13 release information",
                    "results": [
                        {"title": "invalid", "url": "not-a-url"},
                        {
                            "title": "Unrelated mirror",
                            "url": "https://example.com/debian-13",
                        },
                        {
                            "title": "Debian 13 release information",
                            "url": "https://www.debian.org/releases/trixie/",
                        },
                    ]
                }
            },
        }
    ]
    assert resolve_research_tool_input(dependent_fetch, completed_search) == {
        "url": "https://www.debian.org/releases/trixie/",
        "max_chars": 1200,
    }
    assert resolve_research_tool_input(cold_04_plan.calls[1], completed_search) == {
        "url": "https://www.debian.org/releases/trixie/"
    }
    # Regression: an official download page first does not win over a result that
    # covers the requested facts. No Debian-specific ranking rules or network calls.
    for domain, entity, query, title, snippet in (
        ("debian.org", "Debian 13", "Debian 13 date publication initiale nom code",
         "Debian 13 publication initiale", "Date de publication et nom de code"),
        ("example.org", "Orion 7", "Orion 7 initial release date codename",
         "Orion 7 initial release", "Release date and codename"),
        ("example.net", "Étoile 4", "Etoile 4 duree garantie reparabilite",
         "Étoile 4 : durée de garantie", "Réparabilité et garantie"),
    ):
        ranked = copy.deepcopy(completed_search)
        ranked[0]["input"]["query"] = f"site:{domain} {query}"
        result = ranked[0]["result"]["structured_content"]
        # The persisted request wins over an inconsistent result echo.
        result["query"] = "site:untrusted.example unrelated"
        result["results"] = [
            {"url": f"https://{domain}/download", "title": entity,
             "snippet": "Download " * 100},
            {"url": "https://untrusted.example/match", "title": query},
            {"url": f"https://{domain}/facts", "title": title, "snippet": snippet},
        ]
        original = copy.deepcopy(ranked)
        selected = resolve_research_tool_input(dependent_fetch, ranked)
        assert selected == {"url": f"https://{domain}/facts", "max_chars": 1200}
        assert ranked == original, "Ranking must not mutate persisted results"
        # Equal relevance retains upstream order; repetition cannot inflate the score.
        result["results"].insert(0, {
            "url": f"https://{domain}/tie", "title": title, "snippet": snippet * 10,
        })
        assert resolve_research_tool_input(dependent_fetch, ranked)["url"].endswith("/tie")
        # Missing or malformed metadata retains deterministic legacy behaviour.
        result["results"] = [
            {"url": f"https://{domain}/first", "title": {}, "snippet": None},
            {"url": f"https://{domain}/second"},
        ]
        assert resolve_research_tool_input(dependent_fetch, ranked)["url"].endswith("/first")
        # An explicit URL remains unchanged, regardless of the ranking.
        assert resolve_research_tool_input(cold_04_plan.calls[1], ranked) == {
            "url": "https://www.debian.org/releases/trixie/"
        }
    try:
        resolve_research_tool_input(dependent_fetch, [])
    except ValueError as exc:
        assert "prior web.search" in str(exc), exc
    else:
        raise AssertionError("Dependent web.fetch input was accepted without prior search evidence")

    no_official_result = [
        {
            "slot": 0,
            "tool_key": "web.search",
            "input": {"query": "site:debian.org Debian 13 release information"},
            "result": {
                "structured_content": {
                    "results": [
                        {
                            "title": "Unrelated mirror",
                            "url": "https://example.com/debian-13",
                        }
                    ]
                }
            },
        }
    ]
    try:
        resolve_research_tool_input(dependent_fetch, no_official_result)
    except ValueError as exc:
        assert "site filter" in str(exc), exc
    else:
        raise AssertionError("Dependent fetch ignored the official-domain search constraint")

    async def omitted_explicit_fetch_completion(_messages):
        return json.dumps(
            {
                "calls": [
                    {
                        "tool_key": "web.search",
                        "input": {
                            "query": "site:debian.org Debian 13 trixie release information"
                        },
                        "rationale": "Search for Debian 13 release information.",
                    }
                ],
                "rationale": "One search should be enough.",
            }
        )

    try:
        await plan_research(
            query="Use web.search, then web.fetch for the official Debian 13 release page.",
            tools=cold_04_tools,
            max_tool_calls=2,
            completion=omitted_explicit_fetch_completion,
        )
    except UnexpectedModelBehavior as exc:
        assert "web.fetch" in str(exc), exc
    else:
        raise AssertionError("Planner omitted an explicitly requested allowed tool")

    async def missing_rationale_invented_completion(_messages):
        return json.dumps(
            {
                "calls": [
                    {
                        "tool_key": "payments.send",
                        "input": {"amount": 100},
                        "rationale": "Invent a side-effecting tool.",
                    }
                ]
            }
        )

    try:
        await plan_research(
            query="Do something unsafe through a missing-rationale envelope",
            tools=cold_04_tools,
            max_tool_calls=1,
            completion=missing_rationale_invented_completion,
        )
    except UnexpectedModelBehavior:
        pass
    else:
        raise AssertionError("Missing-rationale normalization bypassed the tool allowlist")

    async def malformed_missing_rationale_completion(_messages):
        return json.dumps({"calls": "web.search"})

    try:
        await plan_research(
            query="Return a malformed plan without a rationale",
            tools=cold_04_tools,
            max_tool_calls=1,
            completion=malformed_missing_rationale_completion,
        )
    except UnexpectedModelBehavior:
        pass
    else:
        raise AssertionError("Normalizer repaired a malformed call collection")

    async def fenced_invented_completion(_messages):
        return """```json
[
  {
    "tool_key": "payments.send",
    "input": {"amount": 100},
    "rationale": "Invent a side-effecting tool."
  }
]
```"""

    try:
        await plan_research(
            query="Do something unsafe through the normalized envelope",
            tools=TOOLS,
            max_tool_calls=1,
            completion=fenced_invented_completion,
        )
    except UnexpectedModelBehavior:
        pass
    else:
        raise AssertionError("Normalized planner envelope bypassed the tool allowlist")

    async def prose_wrapped_completion(_messages):
        return f"Here is the requested plan:\n```json\n{await valid_completion(_messages)}\n```"

    try:
        await plan_research(
            query="Return JSON embedded in prose",
            tools=TOOLS,
            max_tool_calls=1,
            completion=prose_wrapped_completion,
        )
    except UnexpectedModelBehavior:
        pass
    else:
        raise AssertionError("Planner extracted JSON from surrounding prose")

    async def invented_completion(_messages):
        return json.dumps(
            {
                "calls": [
                    {
                        "tool_key": "payments.send",
                        "input": {"amount": 100},
                        "rationale": "Invent a side-effecting tool.",
                    }
                ],
                "rationale": "Invalid proposal used to prove fail-closed behavior.",
            }
        )

    try:
        await plan_research(
            query="Do something unsafe",
            tools=TOOLS,
            max_tool_calls=1,
            completion=invented_completion,
        )
    except UnexpectedModelBehavior:
        pass
    else:
        raise AssertionError("Planner accepted a tool outside the Core-provided catalog")

    evidence = build_research_evidence(TOOL_RESULTS)
    assert len(evidence) == 1, evidence
    assert evidence[0]["evidence_id"] == "E1", evidence
    assert evidence[0]["invocation_id"] == TOOL_RESULTS[0]["invocation_id"], evidence
    assert "canonical state" in evidence[0]["result_excerpt"], evidence

    synthesis_prompts = []

    async def grounded_completion(messages):
        synthesis_prompts.append(messages)
        return json.dumps(
            {
                "answer": "The supplied evidence says Nevolium keeps canonical state inside its own platform boundary.",
                "claims": [
                    {
                        "text": "Nevolium keeps canonical state inside its own platform boundary.",
                        "evidence_ids": ["E1"],
                        "confidence": "high",
                    }
                ],
                "uncertainties": ["The single evidence record is insufficient for broader architecture claims."],
            }
        )

    synthesis = await synthesize_research(
        query="What does the evidence say about Nevolium architecture?",
        evidence=evidence,
        completion=grounded_completion,
    )
    assert synthesis.claims[0].evidence_ids == ["E1"], synthesis
    assert len(synthesis_prompts) == 1, synthesis_prompts
    rendered_prompt = json.dumps(synthesis_prompts[0], ensure_ascii=False)
    assert "E1" in rendered_prompt and "canonical state" in rendered_prompt, rendered_prompt

    async def fenced_grounded_completion(messages):
        return f"```json\n{await grounded_completion(messages)}\n```"

    fenced_synthesis = await synthesize_research(
        query="What does the evidence say about Nevolium architecture?",
        evidence=evidence,
        completion=fenced_grounded_completion,
    )
    assert fenced_synthesis.claims[0].evidence_ids == ["E1"], fenced_synthesis

    async def prose_wrapped_synthesis_completion(messages):
        return f"Here is the synthesis:\n```json\n{await grounded_completion(messages)}\n```"

    try:
        await synthesize_research(
            query="Return a synthesis embedded in prose",
            evidence=evidence,
            completion=prose_wrapped_synthesis_completion,
        )
    except UnexpectedModelBehavior:
        pass
    else:
        raise AssertionError("Synthesizer extracted JSON from surrounding prose")

    async def invented_evidence_completion(_messages):
        return json.dumps(
            {
                "answer": "Invented claim.",
                "claims": [
                    {
                        "text": "Invented claim.",
                        "evidence_ids": ["E999"],
                        "confidence": "high",
                    }
                ],
                "uncertainties": [],
            }
        )

    try:
        await synthesize_research(
            query="Invent something",
            evidence=evidence,
            completion=invented_evidence_completion,
        )
    except UnexpectedModelBehavior:
        pass
    else:
        raise AssertionError("Synthesizer accepted an evidence id outside the supplied evidence set")

    async def uncited_answer_completion(_messages):
        return json.dumps(
            {
                "answer": "This answer asserts a fact without binding it to evidence.",
                "claims": [],
                "uncertainties": [],
            }
        )

    try:
        await synthesize_research(
            query="Answer without citations",
            evidence=evidence,
            completion=uncited_answer_completion,
        )
    except UnexpectedModelBehavior:
        pass
    else:
        raise AssertionError("Synthesizer accepted an answer without evidence-bound claims")

    planner_budget, synthesis_budget = split_research_model_budget(Decimal("0.01"))
    assert planner_budget == Decimal("0.005"), planner_budget
    assert synthesis_budget == Decimal("0.005"), synthesis_budget
    assert planner_budget + synthesis_budget == Decimal("0.01")

    # Research phase heartbeats must not overwrite the replay-critical model checkpoint bundle.
    planner_key = "00000000-0000-0000-0000-000000000099"
    ledger = ModelCheckpointLedger()
    ledger.record(
        {
            "kind": MODEL_CHECKPOINT_KIND,
            "version": MODEL_CHECKPOINT_VERSION,
            "stage": "accounted",
            "idempotency_key": planner_key,
            "result": {
                "content": "fixture research plan",
                "usage": {
                    "provider_model": "fixture/local-fast",
                    "prompt_tokens": 10,
                    "completion_tokens": 5,
                    "total_tokens": 15,
                    "cost_usd": "0",
                    "cost_reported": True,
                    "litellm_call_id": planner_key,
                },
            },
        }
    )
    heartbeat = research_progress_snapshot(
        ledger,
        phase="tool-wait",
        planned_tool_calls=2,
        active_slot=1,
        completed_tool_slots=[0, 0],
    )
    assert heartbeat["research_progress"] == {
        "phase": "tool-wait",
        "completed_tool_slots": [0],
        "planned_tool_calls": 2,
        "active_slot": 1,
    }, heartbeat
    restored = ModelCheckpointLedger.from_heartbeat_details([heartbeat])
    restored_planner = restored.checkpoint_for(planner_key)
    assert restored_planner is not None and restored_planner["stage"] == "accounted", restored_planner
    assert restored_planner["result"]["content"] == "fixture research plan", restored_planner

    print(
        "PASS: research planning and synthesis stay evidence-bound, budgets remain bounded and "
        "progress heartbeats preserve replay-critical model checkpoints"
    )


if __name__ == "__main__":
    asyncio.run(main())
