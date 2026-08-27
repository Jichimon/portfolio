# 2026-08-27 · Session 01 — Trace fidelity and the turn budgets

**Task:** TASK 52 — A missing `run.footer` may be the cut-off signal `G-06` says does not exist · TASK 55 — Five delegated runs, five turn budgets exhausted
**Status after this session:** TASK 52 · TASK 55 · TASK 12 · TASK 18 · TASK 59 all DONE · **gate 19/19**

Written as the work happens, not reconstructed (`P-05`). `TASK 12` and `TASK 18` are the same investigation's code half and are being closed as a separate `bugfix` item, three sequential `implementer` slices, after this one.

## What was done

`TASK 52`'s controlled comparison was run, and it decides the item. Two dispatches of the **same role** (`researcher`, `maxTurns: 25`), in the same session, on the same day, under the same posture, with the same read-only tool set. The only variable was whether the brief fit the budget.

| | green half | red half |
|---|---|---|
| trace file | `researcher-a3c611a937e8d1a35.jsonl` | `researcher-ad61d65a67c3ce435.jsonl` |
| brief | 12 files, read strictly one per turn | 32 files, read strictly one per turn |
| turns | 12 of 25 | **25 of 25** |
| outcome | completed and reported | **cut off at the limit, mid-list, at file 24 of 32** |
| last event | `run.footer` | `tool.result` |
| `run.footer` | `COMPLETE / objective_reported` | **none** |

A run that terminates normally writes its footer. A run stopped by its budget does not. This is the mechanism `G-06` said did not exist, produced on purpose rather than inferred from six files found after the fact (`P-14` — the red path is the deliverable, not the happy path).

**A second result falls out of the same two runs, and it validates the turn-reconstruction method.** Both briefs forbade parallel reads, so every turn held exactly one tool call — and the `tool.result → tool.requested` proxy read **exactly** 12 and **exactly** 25, against a known cap of 25. So the proxy is exact when calls are sequential and overcounts when they are batched, which is the direction the corpus table already assumed. The overcount is a property of parallelism, not a bug in the method.

## The measurement this session starts from

The four entries share one investigation, and it was done in the orchestrator before anything was planned or delegated (`P-04`) — reading the real corpus in `evidence/runs/`: 34 run directories, 101 trace files, 12,885 events, read and never written (`H-03`). The briefs downstream carry these numbers, not the corpus, which is `TASK 55`'s own finding applied to itself.

### Turns are reconstructable from the trace, and that is what unblocked `TASK 55`

`TASK 55` demanded a measurement and `TASK 12` had concluded none existed. Both were reading the trace for a turn *count*, which no event carries. But a turn is observable as a **transition from `tool.result` to `tool.requested`**, and a dispatch — the unit `maxTurns` actually applies to — is a **segment between `run.header` events**, since a resumed run gets a fresh budget and a fresh header.

Segments per role, split by whether the segment ends in a `run.footer`:

| role | `maxTurns` | segments WITH footer | segments WITHOUT footer |
|---|---|---|---|
| `implementer` | 30 | 22 · turns 4–32 | 23 · turns 28–41, mode 30–33 |
| `test-engineer` | 30 | 1 · 2 turns | 6 · 1, 29, 34, 34, 37, 41 |
| `adversarial-auditor` | 20 | 3 · 0, 0, 3 | 2 · 25, 26 |
| `researcher` | 25 | 7 · 0–22 | 1 · 30 |
| `harness-evaluator` | 60 | 3 · 5, 5, 30 | 2 · **32, 32** |
| `Explore` | (none declared) | 8 · 12–32 | 0 |

The proxy overcounts by roughly 30% — a real cap of 30 reads as 28–41 — because a batch of parallel calls split by an interleaved result counts twice. The overcount is consistent across every role, which is what makes the comparison usable even though the absolute number is not.

**Half of all `implementer` dispatches hit the cap: 23 of 45.** The completed ones run 4–32, so the cap is biting inside the working distribution rather than at its edge.

## Decisions

- **Four items, two work items, split by deliverable rather than by shared research.** The opening hypothesis paired `TASK 12 + 18 + 52` on shared surface and put `TASK 55` alone. Corrected against the code: `TASK 52`'s done is *"amend `G-06` or record the correlation as coincidental"* — a rule change, the same shape as `TASK 55`'s, and the premise `TASK 55`'s budget argument rests on. `TASK 12 + 18` are the only code. So: one `harness` item of rules and budgets, run in the main session; one `bugfix` item of five slices, delegated. `TASK 52`'s red path also **cannot** be delegated — a subagent holds no `Agent` tool, so only the orchestrator can cut a run on purpose.

- **The `permission_mode` mechanism is a second `run.header` carrying `reason: "observed"`**, emitted when the mode is real, new, and not immediately after another header. Rejected: putting the mode on every `tool.result`, which would have bloated 4,300 events and forced `TASK 12`'s done clause to be rewritten. Rejected: declaring it unreachable, which was honest but threw away a value the runtime hands over on every `PostToolUse`.

- **Orphan `tool.result` events are measured and floored rather than failed hard.** They are the runtime failing to deliver, not the writer misbehaving, and `H-03` means no agent can ever clear one — which is why the gate had twice been made green by a human deleting run directories. A defect in the writer still fails always; a delivery loss fails only above a floor measured at 1.68% and declared at 2.0%, the same ratchet shape as `T-03`'s mutation floor. The floor exists to remove the incentive to delete evidence, and it is stated in the config that the answer to a rising rate is finding the lost writes, never a bigger number.

- **`run.header` is once per resume, and once per run was rejected on the data.** 28 non-first headers exist in the corpus and every one is legitimate. What is assertable is that no header is ever adjacent to another. **Deliberately not added: "the first event of a file is a header"** — 11 files violate it, and `H-03` puts them beyond every agent's reach, so the assertion would have recreated the exact harm this item exists to end.

- **Both branches of `TASK 55` were taken.** The budget was raised where the measurement supports it and left alone where it does not, and `P-09` gained the reading axis. Neither alone was enough: the numbers say the cap bites, and the controlled comparison says the brief's reading list matters more than the cap.

- **One clause was deleted from `P-09` rather than kept.** It promised *"an agent cut off mid-run delivers zero, not half."* Thirteen specimens in this repository say otherwise — the artifacts mostly land and the report is the casualty. A rule contradicted by the evidence beside it is a rule that gets disbelieved, and one disbelieved rule discredits the registry.

## Findings from validating against real state (P-04)

### A real leak was already on disk, and it is `TASK 45`'s blast radius

`check-trace`'s 64th finding was never an orphan — it was a genuine redaction failure that the orphan noise had buried. A banned term sits in the `target.command` of a `tool.requested` event in `evidence/runs/e2b37e26…/orchestrator.jsonl`, written `2026-08-25T15:40:31Z`.

The route was located without ever printing the term, using the repository's own `mask()`: field path and string length only. **`TASK 45` found that a malformed ` <term> ` line was read as one literal and matched nothing while `check-terms` reported PASS. The half nobody looked at is that `redactToolInput` scrubs through the same `mask()`** — so for the whole window that the list was malformed, the **write-time scrubber was also protecting nothing**, silently, and wrote the result to a file `H-03` puts beyond every agent's reach.

The fix landed the same day in `a45bbec` and `mask()` blanks the term correctly today, verified rather than assumed. So the writer is sound and this is historical. Opened as **`TASK 59`** (`P-06`), because a check that fails is loud and a redactor that stops redacting is not.

### Four of five delegated slices were cut, at 30 turns, and the fourth confirms the pattern from inside

Slices 2, 3 and 5 were cut at exactly their cap, and slice 4 finished at 23. What got cut is the tell: slice 2 was about to view its final diff, slice 3 was tidying markdown lint **in its own log**, slice 5 was finalizing its log. **Every cut landed after the code was done and on the account of it.** `P-09`'s new clause — the cut lands on whatever is last — is now backed by four specimens produced while writing it.

All five slices kept their logs, because all five were told to write the skeleton first. Log-first is nine for nine across this repository now.

### A role file is picked up late, not never — and the first version of this finding overstated it

The experiment was designed around a throwaway `budget-probe` role with `maxTurns: 2`. The file was written, `check-agents` passed on it, and the dispatch failed with *"Agent type 'budget-probe' not found"* — the runtime's agent registry is built at session start. Editing an **existing** role's `maxTurns` mid-session does not take effect either: `researcher` was temporarily set to 2 and its next run used 12 turns without stopping. Both were restored.

**Corrected later the same session, by the probe it was written about.** After the human cleared the two `evidence/` findings, `budget-probe` appeared in the registry and a third dispatch stopped at **exactly its 2-turn limit, with no footer** — a third `G-06` specimen at a cap an order of magnitude below the other two, and proof the rescan happens. So the reload is **delayed, not absent**, and the raised budgets are live rather than pending.

The first statement of this finding said *"cannot be delegated to"* where the evidence only supported *"not yet"*. That is `P-04` in miniature: the observation was real and the generalization ran ahead of it. What survives is the operational fact — **do not dispatch a role you just wrote** — and what does not is the claim that a session must restart to pick it up.

`.claude/agents/budget-probe.md` is kept rather than deleted: it is the reusable red path for `G-06`'s new claim, and a claim whose red path was thrown away is one nobody can re-run (`P-14`).

### Every `tool.result` in the corpus records `bytes: 15` — all 3,754 of them

`15` is the length of `"[object Object]"`. The runtime sends `tool_response` as an object; `bytes()` in `scripts/guards/lib/evidence.mjs` passes it through `String()`. This is `INC-08` repeating inside the subsystem built to prevent it: a number that looks healthy and is a constant artifact.

The test that congratulates itself for catching `tool_result` against `tool_response` (`evidence.test.mjs`) hands it a **string**, so it asserts against a shape the runtime does not send — the passing test that tests its own mock, which `implementer`'s role file names as its second failure mode. Belongs to `TASK 12`, which owns the writers; it is slice A-1's second behavior.

### The 64 red findings in `check-trace` are real losses, not an ordering bug in the validator

Both hypotheses were separated rather than assumed. Of the 63 `tool.result` events with no matching `tool.requested`, **zero** have their request later in the same file — so `validateTrace`'s order-sensitive correlation is not the cause. All 63 are `Bash`, all `ok: true`, all in orchestrator files, across 6 run directories. The `PreToolUse` write never happened.

### The footer-only files are not the resumes of cut-off runs

`TASK 12` conjectured that a cut run's footer lands in the `-<id>.jsonl` file written by a stop with no `agent_type`. It does not: the 7 dash-named files carry `agent_id`s matching no sibling run, and three of them sit in sessions with no cut-off run at all. They are a separate phenomenon, which matters because it means they do **not** confound the correlation `TASK 52` is chasing.

### `run.header` multiplicity is decidable but only downward

118 headers across 101 files: 70 files carry one, 18 carry two, 4 carry three, 9 carry none. Every one reports `reason` as `startup` or `delegated` — the payload cannot tell a resume from a cold start, exactly as `TASK 12`'s triage said. What the corpus *does* support: no `run.header` is ever adjacent to another (the 28 non-first headers are preceded by `tool.result` 21 times, `instructions.loaded` 4 and `run.footer` 3). So once-per-resume is assertable and once-per-run is not.

Also checked before proposing any new assertion, because the trap is well documented in `TASK 12`: **11 files do not begin with a `run.header`**, so "the first event is a header" would turn the gate red on evidence no agent may clean (`H-03`). It is not being added.

## Done

```yaml
done:
  rules:      { status: passed, evidence: [".claude/rules/40-agent-policy.md#G-06", ".claude/rules/10-process.md#P-09", "check-rules-registry exit:0"] }
  budgets:    { status: passed, evidence: [".claude/agents/implementer.md:6", ".claude/agents/test-engineer.md:6", ".claude/agents/adversarial-auditor.md:6", "check-agents exit:0"] }
  red_path:   { status: passed, evidence: ["evidence/runs/53898bfe-6d4b-4689-a93c-86900c09c619/researcher-ad61d65a67c3ce435.jsonl (cut, no footer)", "researcher-a3c611a937e8d1a35.jsonl (completed, footer)"] }
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs -> 642 tests, 642 pass, 0 fail"] }
  register:   { status: passed, evidence: ["TASKS.md#TASK-52", "TASKS.md#TASK-55", "TASKS.md#TASK-59"] }
  content:    { status: not_applicable, reason: "no publishable content touched - rules, role files and the register only" }
  ci:         { status: not_applicable, reason: "no remote exists (TASK 30 is still TODO), so no CI run can be read (T-10)" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions

- **The two `evidence/` findings were cleared by the human** and the gate now passes 19 of 19, `check-trace` included, at a delivery-loss rate of **1.49% against a 2.00% floor**. Nothing was deleted to reach green that recorded a real run: one directory was a synthetic fixture whose `run_id` was the literal `unknown-session`, the other was `TASK 59`'s artifact.

- **The raised budgets are live but their effect is unmeasured.** The registry rescanned mid-session and `budget-probe` enforced its 2-turn cap exactly, so the same scan has read the whole directory and 45/45/40 are in force. Whether 45 turns lowers `implementer`'s cut rate below the 23-of-45 measured here needs a fresh corpus. The segment method is cheap to repeat and is written down for whoever does.

- **The orphan `tool.result` cause is still unnamed**, and the floor measures it rather than explaining it. 59 events, all `Bash`, all from the orchestrator, `PreToolUse` never written. `INC-12`'s route is closed by `G-13` and they still appear in runs from 2026-08-26, so there is a second cause. Instrumenting it means observing why a hook process dies, which was deliberately not opened blind.

- **`TASK 59` closed the same day**, once the analysis showed the answer was already written in `check-terms.mjs`: the reading side guarded its term list twice and the writing side not at all. The decision — discriminate on whether `private/` exists — keeps the harness usable on a clone while failing closed where the protected thing is actually present. Both hooks were proven by spawning the real one against a temp root, not by reading the code. Detail: `progress/2026-08-27-07`.

- **The raised budgets are confirmed live by observation, not inference.** `TASK 59`'s slice ran to **45 turns** before stopping, against the 30 that cut four slices earlier the same day. What is still unmeasured is whether 45 lowers the cut rate — it did not save this one, which is a single data point and not yet a pattern.

## Next

**`TASK 14`** — a `done:` block left mid-state is caught by `check-procedures` only sometimes, and this session produced two more instances of exactly that: five of six logs written today were missing their `iterations` dimension and one claimed `passed` with a `reason` where evidence belongs. All six were caught by the gate and fixed, which is the mechanism working — but they were written by agents that had just been told the convention, which is the argument for the item.

## Files changed

`.claude/rules/40-agent-policy.md` — `G-06` amended upward on the red path, with the counterexample named.
`.claude/rules/10-process.md` — `P-09` gains the reading axis; one falsified clause removed.
`.claude/agents/implementer.md` · `test-engineer.md` — `maxTurns` 30 to 45.
`.claude/agents/adversarial-auditor.md` — `maxTurns` 20 to 40.
`.claude/agents/budget-probe.md` — new, the reusable red path for `G-06`.
`.claude/agents/researcher.md` — temporarily lowered to run the probe, restored to 25.
`TASKS.md` — `TASK 52` and `TASK 55` closed; `TASK 12` scoped and `TASK 18` merged into it; `TASK 59` opened.
`scripts/guards/lib/evidence.mjs` — `runIdFor`, `bytes`, `validateTrace`, and the new `posturePatch`.
`scripts/guards/hooks/trace-writer.mjs` — emits the observed posture header.
`scripts/guards/hooks/trace-writer.test.mjs` — new; the writer had no test file.
`scripts/guards/gate/check-trace.mjs` — reports the delivery-loss rate and floors it.
`scripts/guards/guards.config.json` — `opaqueFields`, `traceHeaderReasons`, `maxRequestLossRate`.
`scripts/guards/lib/evidence.test.mjs` — 47 to 71 tests.
`docs/harness/evidence.md` — three sections the event table cannot hold in a cell (`P-07`).
`docs/harness/contracts.md` — §2 stops promising a termination vocabulary nothing writes; `P-09`'s deleted clause removed from its duplicate.
`progress/2026-08-27-02` … `-06` — one log per slice, each written before its code.
