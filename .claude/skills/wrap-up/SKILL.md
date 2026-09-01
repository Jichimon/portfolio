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
  gate:       { status: passed,         evidence: ["node scripts/gate.mjs --profile full", "exit:0, 22 steps, 0 deferred"] }
  content:    { status: passed,         evidence: ["check-terms.mjs", "exit:0"] }
  docs:       { status: passed,         evidence: ["contracts.md enforcement table", "TASKS.md step 9"] }
  ci:         { status: not_applicable, reason: "no remote exists" }
  iterations:      { status: passed,    evidence: ["3"] }
  iteration_split: { status: passed,    evidence: ["checkpoint=1", "verify=2"] }
```

Three rules keep this from becoming bookkeeping:

- **Evidence is a pointer** — a command and its exit code, a file path, a trace event, a run id. Never a sentence. "gate-run exit:0" and "we ran the gate and it was fine" are both non-empty, and only one of them can be checked.
- **`not_applicable` carries a one-line reason** and needs no evidence. A dimension that does not apply is declared **out loud**, because silence reads as coverage — and that is how a missed dimension becomes an escaped defect.
- **Only applicable dimensions are listed.** A content item costs three lines, not nine.

**`iterations` and `iteration_split` are the two with a narrowed shape**, because `EVAL-001` reads them without interpreting prose. The first is a bare integer. The second attributes it to the `work-item` step each cycle returned to, as `bucket=count` pairs summing to the first — the legal buckets are derived from that procedure's own headings and the item's `type`, and `check-procedures` prints the set when it rejects one.

`blocked`, `failed` and `partial` are legitimate outcomes. Report them plainly with what stopped you. A partial result reported as complete costs more than one reported as partial, because the second is a schedule problem and the first is a defect nobody is looking for.

## 3 · Verify the block, do not trust it

Run the gate. `check-procedures` fails any dated log whose `done` block reads `passed` with an empty evidence list, or `not_applicable` with no reason. It also fails a split whose counts do not add up to `iterations`, or one naming a bucket the item's type cannot have had. **This is enforced, not encouraged** — it is the mechanized half of `P-03`, and it is what makes the block worth writing.

One consequence worth knowing before it surprises you: **a log opened as a skeleton, per `P-09`, fails this check until its block is filled.** That is the correct behaviour and not a reason to delay opening the log — an empty `done:` is an empty conjunction, which is true of everything.

```
node scripts/gate.mjs --profile full
```

**The full profile, not the bare command, and the distinction is load-bearing** (`TASK 111`). A bare `node scripts/gate.mjs` runs the `fast` profile: it defers the mutation run and the visual-capture matrix, prints both by name, and says so in its own headline. That is the right default for the inner loop and for a push, and it is the wrong evidence for closing a work item — `gate: { status: passed }` against a fast run is a claim about less than the reader will assume. If you record a fast run anyway, record the profile in the evidence string, so nobody has to infer it.

If the gate cannot pass, say so and name the step. `gate: { status: blocked, ... }` with the reason is a true report; omitting the dimension is not.

## 4 · Measure, on a trigger

At wrap-up, read the harness's own numbers from the trace rather than from memory (`P-12`):

- Budgets are **observed**, not enforced, apart from `maxTurns` — count tool calls and derive runtime from trace timestamps (`G-06`).
- Unsafe-action attempts: `tool.requested` events carrying a deny decision and no result. **An attempt is the harness working**, and counting them is the only way to tell that from nothing having happened.
- Regressions become work items. The harness is a tool and is **permitted to be found not paying**.

## 5 · Hand over

State what is done, what is not, and what the next session should read first. Leave the working tree uncommitted — the human owns commits, and one reviewable diff is what that ownership buys (`H-01`, `D2`).

**When the next work item will start in a fresh session — the normal case — write the packet: `progress/handoff/<date>-<task>.md`.** Shape and required sections: `progress/README.md`, *"`handoff/` — the packet that starts the next session"*.

Write it **last, and write it here**, while the context that makes it cheap is still loaded. That is the whole economics of it: a long session re-sends its entire context on every turn, so continuing costs more than stopping — but a fresh session that has to rediscover what this one already knows costs more than either. The packet is how the ending session spends its context instead of losing it.

Its centre is the **prompt to paste, verbatim**, and the section that pays for the rest is **the traps** — what would otherwise be rediscovered the expensive way. A packet with no prompt is a summary, and the next session then opens by deciding what to do rather than doing it.

**Then say the hand-over out loud, in the terminal.** The packet is a file; the human is reading a terminal, and a file they have to be told to open is a file they open later. Three parts, and they are not a form to fill:

1. **The cut, stated explicitly** — *stop here* — rather than left to be inferred from the work having stopped.
2. **The prompt, reproduced verbatim**, because the terminal is where a human copies from. It appears in the packet too; that is quotation, not the duplication `G-10` forbids — the packet is the durable artifact and this is the copy that gets used.
3. **The tier, with its one-line reason.** `ADR-009` §6 decided the allocation; a recommendation with no reason attached gets dropped the first time it is inconvenient.

Then what is left for the human to decide — an approval, an acceptance, a judgment call — so it does not arrive as a surprise two sessions later.

## Boundaries

- Never invoke a git write (`H-01`).
- Never mark a dimension `passed` to make the gate green. If it is not passing, the honest status is the deliverable.
- Never write to `evidence/` (`H-03`). The trace is read here, never edited — a trace the scored party can edit has the same substrate problem as a self-report.
