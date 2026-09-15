#!/usr/bin/env python3
"""Static contract for the pure D08 radial graph fallback."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GRAPH = ROOT / "packages/graph/src/mindmap.ts"
INDEX = ROOT / "packages/graph/src/index.ts"


def main() -> int:
    graph = GRAPH.read_text(encoding="utf-8")
    index = INDEX.read_text(encoding="utf-8")

    assert "export function buildRadialMindMapLayout(" in graph
    assert "const queue = [rootId]" in graph
    assert "queue.shift()" in graph
    assert ".sort((a, b) => a.localeCompare(b))" in graph
    assert "connectedMaxDepth + 1" in graph
    assert "Math.cos(angle) * radius" in graph
    assert "Math.sin(angle) * radius" in graph
    assert "Math.random" not in graph
    assert "fetch(" not in graph
    assert "localStorage" not in graph
    assert "export * from './mindmap'" in index

    print(
        "D08 GRAPH CONTRACT PASS: radial fallback is deterministic, pure, bounded by its input "
        "snapshot and exported from @nevolium/graph"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
