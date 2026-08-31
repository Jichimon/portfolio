# 2026-08-30 · Session 08 — goal-alignment triage, and the rule that prevents the drift

**Task:** TASK 99 — Goal-alignment triage, and the rule that prevents the drift
**Status after this session:** DONE

## What was done

The author asked a question the register could not answer: *does any of this serve the two project goals?* Checked against the real repository, the answer was no for most of the last three days' work. That produced `INC-17`, `P-19`, a triage of the whole open register against the two goals, and three new items that do serve them.

## Decisions

- **The drift is recorded as an incident, not as a note.** `G-10` requires every rule to have an origin, and an origin that is "we noticed" is ceremony. `INC-17` transcribes what actually happened, with the item numbers, so the rule it produced can be checked against evidence rather than believed.
- **`P-19` sits at rung 4 and says so.** It is judgment. `TASK 102` records the available mechanization *and defers it with a trigger* — building a guard for a one-day-old rule that has been applied once would buy ceremony, which is the failure `P-19` itself describes. Deferring it is the rule applied to the rule.
- **The remaining bypasses are demoted to stated residuals rather than closed or deleted.** `TASK 91`, `97` and `98` stay in the register, marked, with the condition that returns them to scope written down: a second operator. Deleting them would lose verified findings; leaving them looking urgent is what caused the drift.
- **`TASK 101` carries its own `C-15` objection.** A case study about agent tooling does not reinforce the portfolio's thesis, and saying so inside the item is cheaper than discovering it during content review. The resolution recorded there is a framing — the same discipline the case studies claim, applied where a reader can audit it — not an exception to `C-15`.

## Findings from validating against real state (P-04)

- **I assumed the site did not exist and was wrong, because the adapter said so.** `CLAUDE.md` described "the harness that *will* build the site", which reads as unbuilt — corrected in this session, since a stale adapter is how a session forms the wrong plan before it reads anything else (`P-07`). `site/` holds a real Astro project, `site/dist/` holds built output, and the gate's `e2e smoke` and `type check` steps pass against it. Checking took one `ls`. Goal 1 is much closer to delivery than the adapter's prose suggests — the gap is publication (`TASK 30`/`32`), not construction.
- **`TASK 9`'s blocker was in its own entry the whole time.** Its trigger reads *the first `EVAL` with a real, non-harness workload*. Nothing was advancing that, and no item existed to. The register recorded the dependency and never derived the task from it — which is why `TASK 100` had to be opened rather than found.
- **The register's own shape hid the drift.** 71 `DONE` against 26 `TODO`, in one flat list with no goal column. Every closed bypass looked identical to every closed content item. `INC-17`'s second mechanism — *closing them registered as progress* — is a property of the register's format, not only of anyone's judgment.

## Harness measurement (P-12) — read from the trace, not from memory

Run `f0ea8c5c-2f6b-47c9-9aba-31e71d1a0a0a`, covering `TASK 95`, `TASK 96` and `TASK 99`.

| | orchestrator | adversarial-auditor |
|---|---|---|
| `tool.requested` | 145 | 28 |
| `tool.result` | 143 | 25 |
| `policy.decision` = deny | 0 | **3** |
| `run.header` / `run.footer` | 4 / 0 | 3 / 2 |

**The three denials are the harness working, and they are the number worth reporting.** All three were the `adversarial-auditor`, and all three were denied by a guard rather than by the agent's own restraint:

```text
seq 19  H-04  cat targets private/__probe_does_not_exist__, inside the protected "private" boundary
seq 24  H-01  "git commit" is not on the read-only allowlist (via substitution → substitution)
seq 77  H-04  cat targets private/__probe_does_not_exist__, inside the protected "private" boundary
```

The auditor's brief **told it** to use a nonexistent probe path and never to invoke a git write, and it complied — the guards denied it anyway. That is defence in depth observed rather than asserted, and it is the distinction the trace exists to make: *an agent tried something dangerous* against *something dangerous happened*. Three attempts, zero incidents.

**Footer accounting, stated because `G-06` requires it rather than because it is clean.** The auditor shows 3 headers against 2 footers. The two delegated dispatches each wrote a footer, so both terminated normally; the unmatched header is `posturePatch`'s `reason: "observed"` patch, not a real `SubagentStart` — the exact case `G-06` names when it warns that a missing footer must not be read as a budget kill. The orchestrator's 4 headers and 0 footers are this session still being alive at the time of reading, not a cut run.

**Two orchestrator requests carry no result.** One is the author interrupting a `Bash` write mid-call, which is a human rejection and — worth noting — appears as a **missing result, never as a `deny` decision**. The permission engine records what *it* decided; a human pressing stop is not one of its decisions. Anyone counting denials as "everything that was refused" would undercount by exactly that class.

**No regression to file.** The budgets were not approached: the auditor used 28 and 25 tool calls across two dispatches, both well inside their caps.

## Done

```yaml
done:
  docs:            { status: passed, evidence: ["docs/harness/architecture.md §C INC-17", ".claude/rules/10-process.md P-19", "TASKS.md § Goal alignment"] }
  loose_ends:      { status: passed, evidence: ["TASK 100, TASK 101, TASK 102 opened; TASK 91/97/98 demoted to stated residuals"] }
  scope:           { status: passed, evidence: ["TASKS.md, .claude/rules/10-process.md, docs/harness/architecture.md, progress/handoff/2026-08-30-task94.md"] }
  tests:           { status: passed, evidence: ["check-rules-registry — PASS, 6 files, registry consistent"] }
  ci:              { status: not_applicable, reason: "no CI provider configured for this repository yet" }
  mutation:        { status: not_applicable, reason: "no production code changed — register, rules and architecture prose only" }
  content:         { status: not_applicable, reason: "nothing publishable touched; TASK 101 defers the content decision rather than making it" }
  security:        { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations:      { status: passed, evidence: ["1"] }
  iteration_split: { status: passed, evidence: ["verify=1"] }
```

## Open questions

- **Where the exhibit lives** — repository `README.md` or a site page — is `TASK 101`'s decision and belongs to the author, not to this triage.
- **Which of the author's projects hosts `TASK 100`** is unanswered here; it needs a real codebase with real work pending, and only the author knows which one qualifies.

## Next

`TASK 94` — it retires the bypass series by stating the residual instead of chasing it, and this session's real-bash probing already produced the evidence it wants. Full order in `progress/handoff/2026-08-30-task94.md`.

## Files changed

`docs/harness/architecture.md` — `INC-17`, and the native-incident range updated to `INC-09…INC-17`.
`.claude/rules/10-process.md` — `P-19`.
`CLAUDE.md` — the adapter said the site was unbuilt; it is built.
`TASKS.md` — the goal-alignment triage section, `TASK 99`–`TASK 102`, and four register rows.
`progress/handoff/2026-08-30-task94.md` — the prioritized hand-off.
