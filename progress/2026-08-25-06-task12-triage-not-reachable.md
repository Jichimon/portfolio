# 2026-08-25 · Session 06 — TASK 12 triage: the headline clause is not reachable

**Task:** TASK 12 — Trace fidelity
**Status after this session:** TODO — deliberately not started as an implementation item. This session produced a **triage and a corrected claim**, which was the author's decision at the planning checkpoint.

## Why this ran as a triage rather than an implementation

TASK 12 was one of five items scoped for this session. Reading the substrate before planning (`P-04`) showed its headline clause could not be delivered, so the author was given the finding at the planning gate rather than after an agent had spent a run discovering it. The decision was to **defer the item and record the triage**, closing the other four instead.

## The finding

**No code path in `scripts/` can produce `termination.state: FAILED` or `budget_exhausted`, because nothing in the runtime tells a hook that a budget was hit.**

| Checked | Found |
|---|---|
| Any hook payload carrying a turn count, a budget field, or a subagent stop reason? | No. `evidence.mjs:272-276` writes the literal `'COMPLETE'` in both branches and the literal `'objective_reported'` on `SubagentStop`. The string `budget_exhausted` does not appear anywhere in the codebase. |
| Does `SubagentStop` fire at all on a budget stop? | Apparently not. Five trace files carry a footer and nothing else, with `agent: ""` and a dash-prefixed filename — the artifact of a stop with no `agent_type`. |
| Every footer on disk | 35 `objective_reported`, 8 `other`, zero anything else, across 79 headers. |

## What changed as a result

- **`G-06` was amended** in `.claude/rules/40-agent-policy.md`. It promised that exhaustion terminates a run `FAILED` with the budget named; nothing has ever written that. The row now states that `maxTurns` is enforced natively but the *termination is not observable*, and that a budget-stopped run is indistinguishable from a successful one in the trace. Rung for that half moved to 4 (`G-11` — the claim moves when the mechanism does, including downward). One line, so the always-loaded budget is unchanged: 275/320.
- **`TASKS.md`'s TASK 12 entry** carries the triage, the four sub-goals that *are* still reachable (with the route for each), and the note that the mutation-step-clearing precedent has been *deleting evidence* twice.

## Findings from validating against real state (P-04)

- `permission_mode` is reachable after all: `SessionStart`/`SubagentStart` payloads omit it, but `PostToolUse`/`PostToolUseFailure` payloads carry it. The value exists; it is on the wrong event.
- The once-per-run vs once-per-resume question is **not answerable from the data**: all four headers carrying a non-null `model` still report `reason: "startup"`. That assertion must be decided, not discovered.
- `check-trace`'s current failure is 13 orphan `tool.result` events, all `Bash`, all `ok: true`, all `bytes: 15`. `H-03` keeps every agent out of `evidence/`, so no agent can clear them.

## Loose ends

- TASK 12 stays `TODO` with its scope narrowed and its unreachable clause named. Nothing was implemented.
- The five-cut-off finding produced by this session's own delegations is recorded in the TASK 12 entry, because that entry owns the budget re-measurement.

```yaml
done:
  tdd:        { status: not_applicable, reason: "no production behaviour was written — this session produced a triage, a rule amendment and register prose" }
  tests:      { status: not_applicable, reason: "no code changed; the guard suite was run as a regression check only and stayed green at 580" }
  docs:       { status: passed, evidence: ["TASKS.md — TASK 12 carries the triage table, the four reachable sub-goals with their routes, and the two new cut-off specimens", ".claude/rules/40-agent-policy.md — G-06 amended to an honest claim, dated, with G-11 cited as the reason"] }
  gate:       { status: partial, evidence: ["check-rules-registry, check-context-budget and check-docs all PASS after the G-06 amendment", "the `evidence trace` gate step remains FAIL — that is this item's own subject and H-03 forbids any agent from clearing it"] }
  scope:      { status: passed, evidence: ["no file under evidence/ was read for content or written (H-03); the trace was characterised from a read-only survey"] }
  loose_ends: { status: passed, evidence: ["TASK 12 left TODO with its scope narrowed rather than silently reduced; the unreachable clause is named in the register so the next session starts from the triage"] }
  iterations: { status: passed, evidence: ["1"] }
```
