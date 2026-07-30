"""Deflake Python triager — offline clustering + fix suggestions."""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from typing import Any

ANSI = re.compile(r"\x1b\[[0-9;]*m")
PATH = re.compile(r"(?:[A-Za-z]:)?(?:[\\/][\w.-]+)+")
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", re.I)
TS = re.compile(r"\d{4}-\d{2}-\d{2}T[\d:.]+Z?")


def normalize(msg: str) -> str:
    msg = ANSI.sub("", msg)
    msg = TS.sub("<ts>", msg)
    msg = UUID.sub("<uuid>", msg)
    msg = PATH.sub("<path>", msg)
    return re.sub(r"\s+", " ", msg).strip()[:400]


def classify(msg: str) -> str:
    m = msg.lower()
    if "timeout" in m or "waiting for" in m or "networkidle" in m:
        return "timing"
    if "locator" in m or "detached" in m or "strict mode" in m:
        return "selector"
    if "net::" in m or "econnrefused" in m or "status=" in m:
        return "network"
    if "order dependence" in m or "leaked" in m:
        return "order-dependence"
    if "expect(" in m:
        return "deterministic-fail"
    return "unknown"


SUGGESTIONS = {
    "timing": "Await the specific response or locator state instead of networkidle/sleeps.",
    "selector": "Use getByRole/getByText and re-query after navigation.",
    "network": "page.waitForResponse for the failing endpoint or mock it in CI.",
    "order-dependence": "Isolate shared globals; reset fixtures in afterEach.",
    "deterministic-fail": "Treat as a real product failure, not a flake.",
    "unknown": "Inspect clustered evidence and add a readiness wait.",
}


def triage(summary: dict[str, Any]) -> dict[str, Any]:
    clusters_in = summary.get("clusters") or []
    suggestions = []
    for c in clusters_in:
        cls = c.get("class") or classify(c.get("sampleMessage") or "")
        suggestions.append(
            {
                "hypothesis": f"Python cluster: {cls} ({c.get('count', 0)} fails)",
                "evidence": [
                    normalize(c.get("sampleMessage") or ""),
                    f"fingerprint={c.get('fingerprint')}",
                ],
                "suggested_patch": SUGGESTIONS.get(cls, SUGGESTIONS["unknown"]),
                "confidence": min(0.95, 0.45 + float(c.get("count") or 0) / max(1, summary.get("completedAttempts") or 1)),
                "caveats": ["Generated offline by deflake_triager"],
                "class": cls,
                "source": "python",
            }
        )
    if summary.get("outcome") == "flaky" and not suggestions:
        suggestions.append(
            {
                "hypothesis": "Intermittent failures without clear cluster text",
                "evidence": [f"passRate={summary.get('passRate')}"],
                "suggested_patch": SUGGESTIONS["timing"],
                "confidence": 0.4,
                "caveats": [],
                "class": "timing",
                "source": "python",
            }
        )
    return {
        "schemaVersion": 1,
        "suggestions": suggestions,
        "clusters": clusters_in,
    }


def selftest() -> None:
    sample = {
        "completedAttempts": 10,
        "passRate": 0.7,
        "outcome": "flaky",
        "clusters": [
            {
                "fingerprint": "fp_x",
                "count": 3,
                "sampleMessage": "Timeout waiting for network /api/checkout",
                "class": "timing",
            }
        ],
    }
    out = triage(sample)
    assert out["suggestions"], "expected suggestions"
    assert out["suggestions"][0]["class"] == "timing"
    print("deflake_triager selftest ok")


def main(argv: list[str]) -> int:
    if "--selftest" in argv:
        selftest()
        return 0
    raw = sys.stdin.read()
    if not raw.strip():
        print("{}", end="")
        return 1
    summary = json.loads(raw)
    json.dump(triage(summary), sys.stdout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
