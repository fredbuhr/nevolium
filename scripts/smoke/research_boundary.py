#!/usr/bin/env python3

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
import json
import os
import time
from threading import Barrier
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

CORE = "http://localhost:8000"
INTERNAL_TOKEN = os.getenv("NEVOLIUM_INTERNAL_TOKEN", "CHANGE_ME_INTERNAL_TOKEN")
INTERNAL = {"X-Nevolium-Internal-Token": INTERNAL_TOKEN}


def request(method: str, path: str, *, payload: dict[str, Any] | None = None, expected: int | tuple[int, ...] = 200, headers: dict[str, str] | None = None) -> Any:
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        CORE + path,
        data=data,
        method=method,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.status
            body = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        status = exc.code
        body = json.loads(exc.read().decode())
    if status not in (expected if isinstance(expected, tuple) else (expected,)):
        raise AssertionError(f"{method} {path}: expected {expected}, got {status}: {body}")
    return body


def wait_ready() -> None:
    deadline = time.time() + 90
    while time.time() < deadline:
        try:
            if request("GET", "/health/ready")["status"] == "ready":
                return
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError("Core did not become ready")


def prove_concurrent_slot_binding(project_id: str) -> None:
    """Use the real Core/PostgreSQL boundary; no Worker or model is needed."""
    parent = request("POST", "/v1/research/runs", expected=202, payload={
        "project_id": project_id, "query": "Bound concurrent read-only calls", "max_tool_calls": 2,
    })
    path = f"/internal/v1/research/tasks/{parent['task_id']}/tool-invocations"
    for slot, keys in enumerate((
        ["researchsmoke.search", "researchsmoke.lookup"] * 4,
        ["researchsmoke.search"] * 8,
    )):
        barrier = Barrier(len(keys))

        def invoke(key: str) -> dict[str, Any]:
            barrier.wait(timeout=10)
            return request("POST", path, expected=(200, 409), headers=INTERNAL, payload={
                "tool_key": key, "input": {"query": "Same logical call"}, "slot": slot,
            })

        with ThreadPoolExecutor(max_workers=len(keys)) as pool:
            responses = list(pool.map(invoke, keys))
        accepted = [row for row in responses if "invocation_id" in row]
        assert len(accepted) == (4 if slot == 0 else 8), responses
        assert len({row["invocation_id"] for row in accepted}) == 1, responses
        assert len({row["task_id"] for row in accepted}) == 1, responses
        assert len({row["workflow_execution_id"] for row in accepted}) == 1, responses
        for row in responses:
            if "invocation_id" not in row:
                assert row["detail"] == "Research tool slot is already bound to another call", row
    request("POST", path, expected=422, headers=INTERNAL, payload={
        "tool_key": "researchsmoke.search", "input": {"query": "Over budget"}, "slot": 2,
    })


def main() -> None:
    wait_ready()
    project = request("POST", "/v1/projects", expected=201, payload={"name": "Research boundary smoke", "status": "active"})
    server = request(
        "POST",
        "/v1/tool-servers",
        expected=201,
        payload={
            "key": "research-smoke",
            "namespace": "researchsmoke",
            "title": "Research smoke tools",
            "endpoint_url": "http://fake-mcp:8765/mcp",
        },
    )
    request(
        "POST",
        f"/internal/v1/tool-servers/{server['id']}/catalog",
        headers=INTERNAL,
        payload={
            "tools": [
                {
                    "name": "search",
                    "title": "Search",
                    "description": "Read-only source discovery",
                    "input_schema": {
                        "type": "object",
                        "properties": {"query": {"type": "string"}},
                        "required": ["query"],
                        "additionalProperties": False,
                    },
                    "annotations": {"readOnlyHint": True, "idempotentHint": True},
                },
                {
                    "name": "lookup",
                    "title": "Lookup",
                    "description": "Second read-only tool for slot binding regression",
                    "input_schema": {
                        "type": "object",
                        "properties": {"query": {"type": "string"}},
                        "required": ["query"],
                        "additionalProperties": False,
                    },
                    "annotations": {"readOnlyHint": True, "idempotentHint": True},
                },
                {
                    "name": "send",
                    "title": "Send",
                    "description": "Side-effecting tool",
                    "input_schema": {
                        "type": "object",
                        "properties": {"message": {"type": "string"}},
                        "required": ["message"],
                        "additionalProperties": False,
                    },
                    "annotations": {},
                },
            ]
        },
    )
    for key, policy in {
        "researchsmoke.search": {"enabled": True, "authority_level": 1, "risk_class": "read", "retry_policy": "safe_retry"},
        "researchsmoke.lookup": {"enabled": True, "authority_level": 1, "risk_class": "read", "retry_policy": "safe_retry"},
        "researchsmoke.send": {"enabled": True, "authority_level": 2, "risk_class": "write", "retry_policy": "no_retry"},
    }.items():
        request("PATCH", f"/v1/tools/{urllib.parse.quote(key, safe='')}/policy", payload=policy)

    created = request(
        "POST",
        "/v1/research/runs",
        expected=202,
        payload={
            "project_id": project["id"],
            "query": "Find evidence about Nevolium",
            "max_tool_calls": 2,
            "allowed_tool_keys": [],
            "model_alias": "local-fast",
            "estimated_model_cost_usd": "0.01",
        },
    )
    parent = request("GET", f"/v1/tasks/{created['task_id']}")

    pending = request("GET", f"/v1/research/runs/{parent['id']}")
    assert pending["task_id"] == parent["id"], pending
    assert pending["status"] == "queued", pending
    assert pending["query"] == "Find evidence about Nevolium", pending
    assert pending["artifact_id"] is None and pending["answer"] is None, pending
    assert pending["tool_invocations"] == [], pending

    context = request("GET", f"/internal/v1/research/tasks/{parent['id']}/context", headers=INTERNAL)
    keys = {tool["key"] for tool in context["tools"]}
    assert keys == {"researchsmoke.search", "researchsmoke.lookup"}, context

    request(
        "POST",
        f"/internal/v1/research/tasks/{parent['id']}/tool-invocations",
        expected=409,
        headers=INTERNAL,
        payload={"tool_key": "researchsmoke.send", "input": {"message": "no"}, "slot": 0, "rationale": "must be rejected"},
    )

    first = request(
        "POST",
        f"/internal/v1/research/tasks/{parent['id']}/tool-invocations",
        headers=INTERNAL,
        payload={"tool_key": "researchsmoke.search", "input": {"query": "Nevolium"}, "slot": 0, "rationale": "read evidence"},
    )
    replay = request(
        "POST",
        f"/internal/v1/research/tasks/{parent['id']}/tool-invocations",
        headers=INTERNAL,
        payload={"tool_key": "researchsmoke.search", "input": {"query": "Nevolium"}, "slot": 0, "rationale": "same logical call"},
    )
    assert replay["invocation_id"] == first["invocation_id"], (first, replay)
    assert replay["task_id"] == first["task_id"], (first, replay)

    request(
        "POST", f"/internal/v1/research/tasks/{parent['id']}/tool-invocations",
        expected=409, headers=INTERNAL,
        payload={"tool_key": "researchsmoke.lookup", "input": {"query": "Nevolium"}, "slot": 0},
    )
    prove_concurrent_slot_binding(project["id"])

    request(
        "POST",
        f"/internal/v1/research/tasks/{parent['id']}/tool-invocations",
        expected=409,
        headers=INTERNAL,
        payload={"tool_key": "researchsmoke.search", "input": {"query": "DIFFERENT"}, "slot": 0, "rationale": "slot rebinding must fail"},
    )

    parent_run = request("POST", f"/v1/tasks/{parent['id']}/run")
    synthetic_content = {
        "query": "Find evidence about Nevolium",
        "answer": "Nevolium preserves canonical provenance for research results.",
        "synthesis": {
            "answer": "Nevolium preserves canonical provenance for research results.",
            "claims": [
                {
                    "text": "The research result keeps a canonical tool invocation reference.",
                    "evidence_ids": ["E1"],
                    "confidence": "high",
                }
            ],
            "uncertainties": [],
        },
        "evidence": [
            {
                "evidence_id": "E1",
                "source_type": "tool",
                "source": "researchsmoke.search",
                "authority": "policy-bound-read-tool",
                "slot": 0,
                "tool_key": "researchsmoke.search",
                "invocation_id": first["invocation_id"],
            }
        ],
        "context_pack": {"item_count": 0, "character_count": 0, "sources": {}},
        "planner_model_alias": "local-fast",
        "synthesis_model_alias": "local-fast",
        "model_budget_usd": "0.01",
        "tool_results": [
            {
                "slot": 0,
                "tool_key": "researchsmoke.search",
                "input": {"query": "Nevolium"},
                "rationale": "read evidence",
                "invocation_id": first["invocation_id"],
                "result": {"items": [{"title": "Fixture", "snippet": "Canonical provenance"}]},
            }
        ],
        "tool_call_count": 1,
    }
    request(
        "POST",
        f"/internal/v1/executions/{parent_run['workflow_id']}/complete",
        headers=INTERNAL,
        payload={
            "kind": "autonomous-research",
            "title": "Research — Find evidence about Nevolium",
            "content": synthetic_content,
        },
    )

    completed = request("GET", f"/v1/research/runs/{parent['id']}")
    assert completed["status"] == "completed", completed
    assert completed["execution_status"] == "completed", completed
    assert completed["answer"] == synthetic_content["answer"], completed
    assert completed["synthesis"]["claims"][0]["evidence_ids"] == ["E1"], completed
    assert completed["evidence"][0]["source_type"] == "tool", completed
    assert completed["evidence"][0]["invocation_id"] == first["invocation_id"], completed
    assert completed["context_pack"]["item_count"] == 0, completed
    assert completed["tool_call_count"] == 1, completed
    assert len(completed["tool_invocations"]) == 1, completed
    invocation = completed["tool_invocations"][0]
    assert invocation["invocation_id"] == first["invocation_id"], invocation
    assert invocation["tool_key"] == "researchsmoke.search", invocation
    assert invocation["input"] == {"query": "Nevolium"}, invocation
    assert invocation["rationale"] == "read evidence", invocation
    assert invocation["result"]["items"][0]["snippet"] == "Canonical provenance", invocation
    assert completed["planner_model_alias"] == "local-fast", completed
    assert completed["synthesis_model_alias"] == "local-fast", completed
    assert Decimal(completed["model_budget_usd"]) == Decimal("0.01"), completed
    assert completed["artifact_id"], completed
    assert completed["workflow_execution_id"] == parent_run["workflow_execution_id"], completed
    assert completed["workflow_id"] == parent_run["workflow_id"], completed
    assert completed["correlation_id"], completed

    print(
        "PASS: Core enforces unique concurrent research slots, read/A1 tools, owner-scoped access and a stable multi-source "
        "research result contract"
    )


if __name__ == "__main__":
    main()
