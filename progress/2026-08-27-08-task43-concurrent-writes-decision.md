# 2026-08-27 · Session 08 — TASK 43: concurrent writes, and the deferred remedies name a different actor

**Task:** TASK 43 — Concurrent writes happened, and the deferred remedies name a different actor
**Status after this session:** DONE

## What was done

The decision the item asked for, taken and recorded: **neither deferred mechanism is built.** The trigger wording on both is corrected, the incident is transcribed as `INC-16`, and the half that actually attacks the cause lands as a new process rule, `P-18`, at rung 3.

## Decisions

- **Neither `roleWriteScopes` for `implementer`/`test-engineer`, nor worktree isolation.** The first would not have caught this: it is a per-role allowlist, and the colliding writer was the **orchestrator**, which has no role file by design (`G-09`) because a subagent cannot run the human checkpoint. The second would have separated the two writers, but at a merge step per delegation, on one incident, with its other three triggers still unfired (`P-17` — price it, do not adopt it on one event).
- **The trigger wording is the real defect, and it is corrected in both tables.** `architecture.md` §M and the mirror in `.claude/rules/40-agent-policy.md` both said *concurrent writes* / *two roles write concurrently*. The `[A21]` row now reads **two write-capable roles** and states out loud that this mechanism would not have covered `INC-16`; the `[A9]` row keeps its four triggers and records that the first fired and isolation was priced and declined. Two tables saying the same thing cannot be allowed to drift, so both moved in the same change.
- **`P-18`, rung 3, origin `INC-16`.** *A `completed` notification is not a report, and a fragment is resumed rather than taken over.* Its rung comes from the procedure step that forces it, added to `work-item` §4→§5.
- **`P-18` points at a mechanism that already exists.** `TASK 52` proved in red that a run terminating normally writes its `run.footer` and a cut run writes none (`G-06`). So *did this run finish* is readable from the trace rather than inferred from a notification. The rule names the artifact instead of asking for care.
- **`INC-16` gets an `evals.excluded` entry, not an eval case.** Its control is procedural: there is no guard to neuter, so no case can be demonstrated failing, and a case that passes because the orchestrator behaved well measures the model rather than the harness (`A16`). The entry names what brings it back — the moment footer-absence has a reader. `G-06` already carries that gap at rung 4.

## Findings from validating against real state (P-04)

- **`G-06` had already built the mechanism `P-18` needs.** The item was opened on 2026-08-24 and closed today; in between, `TASK 52` made *the run did not terminate normally* an observable rather than a guess. The cheap remedy became cheaper without anyone noticing, which is an argument for re-reading a `TODO` item's constraints against current state before acting on them rather than after.
- **`INC-12`'s guard was proven in red, by accident, by me.** Mid-session I wrote a malformed `guards.config.json` — an object opened and never closed — because the edit script validated the JSON **after** the write instead of before. `pretooluse.mjs` could not parse its config, exited 2, and denied **every** tool call including the ones that would repair it. That is `G-13` behaving exactly as specified: *a guard that cannot evaluate must deny*, at the stated cost that a broken config denies everything until a human fixes it. Loud, correct, recoverable — the human added the missing brace and the session continued. `INC-12`'s remedy has now been observed working under a real tear rather than a deliberately staged one.

## Done
```yaml
done:
  tests: { status: not_applicable, reason: "no production behaviour changed; the artifacts edited are the registry, two docs and a procedure, each covered by an existing gate step" }
  mutation: { status: not_applicable, reason: "no file under a mutation-covered surface was touched (D3, T-03)" }
  docs: { status: passed, evidence: ["check-rules-registry exit 0", "check-docs exit 0", "check-context-budget 276/320 exit 0", "check-evals exit 0 — 16 incidents, 2 excluded with a reason"] }
  scope: { status: passed, evidence: ["7 files: architecture.md, 40-agent-policy.md, 10-process.md, work-item/SKILL.md, guards.config.json, TASKS.md, this log"] }
  loose_ends: { status: passed, evidence: ["see Open questions below"] }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

- **Nothing reads the absence of a `run.footer`.** `G-06` states this at rung 4 and the `evals.excluded` entry for `INC-16` names it as the trigger that would make an executable case possible. It is recorded in two places and owned by neither; if it is to be built it needs a work item, and that is a decision for a session with the budget to price it.

## Next

TASK 47 — the `site/` file cap, whose decision is already taken with the author: a package root gets its own calibration, derived from disk.

## Files changed

`docs/harness/architecture.md` — `INC-16` transcribed into §C, the native range header widened, both deferred-remedy triggers corrected in §M.
`.claude/rules/40-agent-policy.md` — the mirror table's two triggers, matching §M word for word in substance.
`.claude/rules/10-process.md` — `P-18`.
`.claude/skills/work-item/SKILL.md` — the delegation-side step that gives `P-18` its rung.
`scripts/guards/guards.config.json` — `evals.excluded` gains `INC-16` with its reason.
`TASKS.md` — TASK 43 closed.
