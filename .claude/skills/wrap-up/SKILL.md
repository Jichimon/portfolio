---
name: wrap-up
description: Close out a session or a work item — reconcile the documents, write the done block, and refuse one that claims success with nothing behind it. Use when finishing up or when asked where things stand.
argument-hint: [TASK-N]
disable-model-invocation: true
allowed-tools: Read Grep Glob
---

Close out cleanly. The point of this procedure is that "done" stops meaning four different things (`INC-01`), and the mechanism is one check that cannot be talked around.

## 1 · Reconcile before reporting

In this order, because reporting first tends to produce a report about intentions:

1. **`TASKS.md`** — statuses set to what is true now. A work item's status is set by a human, never inferred from run states.
2. **The work log** in `progress/` — decisions, findings, and what changed. Written as you went, finished now (`P-05`).
3. **Living documents** — any index, contract table or architecture claim the work made stale. Then *check that you reconciled*, because doing the obvious half is the characteristic failure (`P-07`).
4. **Loose ends** — each becomes a tracked entry in `TASKS.md` with a checkable done, never a sentence in a paragraph (`P-06`).

## 2 · Write the done block

Done is the **conjunction of every applicable dimension**, each carrying a status and an evidence pointer (`P-03`).

```yaml
done:
  tests:      { status: passed,         evidence: ["node --test scripts/guards/**/*.test.mjs", "247 pass 0 fail"] }
  gate:       { status: passed,         evidence: ["node scripts/gate.mjs", "exit:0, 9 steps green"] }
  content:    { status: passed,         evidence: ["check-terms.mjs", "exit:0"] }
  docs:       { status: passed,         evidence: ["contracts.md enforcement table", "TASKS.md step 9"] }
  ci:         { status: not_applicable, reason: "no remote exists" }
```

Three rules keep this from becoming bookkeeping:

- **Evidence is a pointer** — a command and its exit code, a file path, a trace event, a run id. Never a sentence. "gate-run exit:0" and "we ran the gate and it was fine" are both non-empty, and only one of them can be checked.
- **`not_applicable` carries a one-line reason** and needs no evidence. A dimension that does not apply is declared **out loud**, because silence reads as coverage — and that is how a missed dimension becomes an escaped defect.
- **Only applicable dimensions are listed.** A content item costs three lines, not nine.

`blocked`, `failed` and `partial` are legitimate outcomes. Report them plainly with what stopped you. A partial result reported as complete costs more than one reported as partial, because the second is a schedule problem and the first is a defect nobody is looking for.

## 3 · Verify the block, do not trust it

Run the gate. `check-procedures` fails any dated log whose `done` block reads `passed` with an empty evidence list, or `not_applicable` with no reason. **This is enforced, not encouraged** — it is the mechanized half of `P-03`, and it is what makes the block worth writing.

```
node scripts/gate.mjs
```

If the gate cannot pass, say so and name the step. `gate: { status: blocked, ... }` with the reason is a true report; omitting the dimension is not.

## 4 · Measure, on a trigger

At wrap-up, read the harness's own numbers from the trace rather than from memory (`P-12`):

- Budgets are **observed**, not enforced, apart from `maxTurns` — count tool calls and derive runtime from trace timestamps (`G-06`).
- Unsafe-action attempts: `tool.requested` events carrying a deny decision and no result. **An attempt is the harness working**, and counting them is the only way to tell that from nothing having happened.
- Regressions become work items. The harness is a tool and is **permitted to be found not paying**.

## 5 · Hand over

State what is done, what is not, and what the next session should read first. Leave the working tree uncommitted — the human owns commits, and one reviewable diff is what that ownership buys (`H-01`, `D2`).

## Boundaries

- Never invoke a git write (`H-01`).
- Never mark a dimension `passed` to make the gate green. If it is not passing, the honest status is the deliverable.
- Never write to `evidence/` (`H-03`). The trace is read here, never edited — a trace the scored party can edit has the same substrate problem as a self-report.
