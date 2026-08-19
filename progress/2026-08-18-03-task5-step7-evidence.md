# 2026-08-18 · Session 03 — TASK 5, step 7: the evidence trace

**Task:** TASK 5 — AI Agent Development Harness v2
**Status after this session:** IN PROGRESS (steps 1–7 done, step 8 next)

## What was done

Built layer 06 — the observable substrate. The harness now records what it does instead of describing it, and the recording is validated by a gate step rather than trusted. Tests went 153 → 199, the gate grew to eight steps, and the contracts table was corrected from a false "4 of 6 enforced" to 1 fully enforced, 3 partial, 2 pending — see the correction section below.

The trace went live mid-session and has been recording this session's own work since. That is not a demo; it is the substrate `P-11` has been pointing at since step 1.

## Decisions

- **Run identity is derived, not coordinated.** The orchestrator run *is* the session; a delegated run is `<session>:<agent_id>` with the session as parent. Two hook processes that never communicate therefore agree on who is running, and a subagent's events stay correlated to the run that spawned it without any handshake.
- **One file per run, plus a lock.** Concurrent hooks would otherwise read the same `seq` and write it twice, and a counter that silently duplicates under concurrency falsifies the exact property it exists to provide. An atomic `mkdir` lock with a stale-lock break costs about twenty lines; the alternative was claiming monotonicity and not having it.
- **Redaction is a switch statement with a closed default.** Known tools get a shaped summary — path, byte length, content hash. Anything else records **keys only**. Unknown fails closed, exactly as the delegation gate treats an unknown tool name (`P-16`): a tool the runtime ships next month must make the trace stricter, never leakier.
- **Paths are scrubbed, not only commands.** The obvious half is scrubbing shell commands. A file path is just as publishable, and a repository full of internal system names would have leaked through the field nobody thought about.
- **`policy.decision` is written on allow as well as deny.** A request with no decision would be indistinguishable from a crashed hook. *The guard ran and allowed it* and *we do not know what the guard did* are different facts, and only one of them is evidence.
- **`PermissionDenied` is wired, giving the trace the permission engine's verdicts too.** The `PreToolUse` guard records its own; deny rules in `settings.json` are evaluated *after* the hook and would otherwise be invisible. Recorded with `source: "permission"` against `source: "guard"`, so the two layers stay distinguishable. **Not yet exercised** — every deny rule in this project is also hook-denied, so the guard fires first. Stated rather than claimed as proven.
- **`evidence/README.md` was not created, deliberately.** The architecture's layout sketch put a README inside `evidence/`, but `H-03` denies agent writes to `evidence/**` at rung 1. The choice was to narrow the boundary or move the document; narrowing a rung-1 boundary for the convenience of one file is the erosion this harness exists to prevent, so the schema lives at `docs/harness/evidence.md` instead. The rule kept its full width.
- **`is_interrupt` is recorded as its own error class.** A user changing their mind is not the tool failing, and conflating them corrupts any metric built on error rates.

## Findings from validating against real state (P-04)

- **The documented field name was wrong, and it failed silently.** The docs summarize `PostToolUse`'s output field as `tool_result`. The runtime sends **`tool_response`**. Every `tool.result` event was being written with `bytes: 0` — a healthy-looking trace recording nothing, which is `INC-08`'s exact shape *inside the subsystem built to prevent it*. Found by capturing a real payload with a temporary probe rather than by reading more carefully.

  The fix is not the rename. `eventsFor` moved out of the hook script into a pure, tested function in `lib/evidence.mjs`, and the captured payload shapes are asserted in its tests — `PostToolUse` carries `tool_response`, `tool_use_id`, `tool_name`, `duration_ms`; `PostToolUseFailure` carries `error`, `is_interrupt`, `duration_ms`. A coupling to someone else's schema that nothing tests will drift, and this one drifted before it was a day old.

- **The same probe found two fields worth having that nobody had specified.** `duration_ms` comes from the runtime directly — the Evidence contract wanted it and the plan was to derive it from timestamps. And `is_interrupt` distinguishes an interrupted call from a failed one.

- **`H-03` denied the author.** Cleaning up a probe trace with `rm -rf evidence/runs/probe-sess-1` was blocked by the `path-boundary` guard mid-session, and the attempt is in the trace: `tool.requested` + `policy.decision{deny, H-03}` and **no `tool.result`**. The derivation the whole schema exists for, demonstrated on a real denial rather than a fixture. The probe trace stays, which is correct.

- **Six mutants, six caught.** Before trusting 24 green tests written in one pass, the evidence library was mutated six ways — redaction off, command scrubbing removed, file contents recorded, `seq` continuity skipped, deny attribution dropped, whole-file redaction disabled. Every mutant failed at least one test. Green tests that have never been seen to fail are not evidence (`P-14`, `T-04`).

- **`check-trace` asserts the wiring, not just the contents.** A checker that only read trace files would pass forever on a repository whose hooks were never registered. It also fails a *filtered* matcher: a partial trace that reads as complete is worse than no trace, because someone will draw conclusions from it.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs", "192 pass 0 fail", "6/6 mutants caught in evidence.mjs"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs", "exit:0, 8 steps green"] }
  content:    { status: passed, evidence: ["check-terms.mjs", "33 terms × 97 files, exit:0"] }
  docs:       { status: passed, evidence: ["docs/harness/evidence.md", "contracts.md Evidence row built", "CLAUDE.md pointer", "TASKS.md step 7"] }
  evidence:   { status: passed, evidence: ["evidence/runs/<session>/orchestrator.jsonl", "69 events validated by check-trace", "live denial recorded as an attempt"] }
  ci:         { status: not_applicable, reason: "no remote exists" }
  security:   { status: passed, evidence: ["redaction proven by mutation", "H-03 denied a real write to evidence/ during this session"] }
```

## A step-3 artifact corrected during step 7

Asked directly whether the contracts were verified as *used* where each belongs, the answer turned out to be no — and the document was saying so incorrectly.

- **The prose under the enforcement table had been stale for two steps.** It read *"Today: 2 of 6 enforced ... the Run row still reads step 6"* while the table listed four existing enforcers. `check-contracts` validated the table and never looked at the paragraph describing the table, so the document contradicted itself and the gate stayed green (`P-07`).
- **Binary `built`/`pending` was overstating coverage.** Three contracts had an enforcer covering *part* of them, and both available words were wrong. A third status now exists: `partial`, which **must name what it does not cover** — partial with no named gap conceals exactly what an overclaim conceals (`G-11`).
- **The honest picture is 1 fully enforced, 3 partial, 2 pending**, not 4 of 6. Run is missing the brief's own shape; Tool is missing per-role allowlists; Evidence is missing the done-dimension half at step 9.
- **The summary sentence is now checked against the table.** `validateRatioProse` fails the gate when they disagree, proven in red three ways: a stale ratio, a deleted sentence, and a `partial` row that stopped naming its gap.
- **And the limit is written down.** That an enforcer exists is not that a contract is honored everywhere it should be. Whether a real brief carries its `scope` and `budget` is answered by eval cases at step 11 — *the guard is installed* and *the guard is sufficient* are different claims, and only the first is mechanized today.

## Open questions

- **`PermissionDenied` is wired but unexercised.** Every deny rule in `settings.json` is also covered by the `PreToolUse` guard, which fires first, so the permission engine's own denials have not been observed. Reachable in principle through an `ask` rule the human declines. Worth constructing as an eval case at step 11 rather than assuming the branch works.
- **Retention has never pruned.** `retainRuns: 50` runs on `SessionStart` and there are two run directories. The code path is untested against a real overflow; a fixture test belongs with step 10 or step 12.

## Next

**Step 8 — Roles.** Five agent files (`implementer` with the TDD contract, `test-engineer` with e2e plus the mutation gate, `adversarial-auditor`, `researcher`, `harness-evaluator`), each declaring `model`, `tools`, `maxTurns` and all six posture dimensions, with a `## Bootstrap` section whose every named path must resolve. Enforced by `check-agents` (`G-05`, `G-09`).

Step 8 also switches the delegation gate on in a way it has not been so far: once `.claude/agents/*.md` exist, `roleTools` stops being empty and write-capability is read from real declarations rather than failing closed on every role.

## Files changed

`scripts/guards/lib/evidence.mjs` + tests — new; the schema, redaction, `seq`, `eventsFor`, and the three validators. 38 tests.
`scripts/guards/hooks/trace-writer.mjs` — new; the only thing that writes to `evidence/`. Lock, stamping, retention, and a failure path that never breaks a session.
`scripts/guards/hooks/record-event.mjs` — new; a thin dispatcher over `eventsFor`.
`scripts/guards/hooks/pretooluse.mjs` — records `tool.requested` before the verdict and `policy.decision` after it, on both branches.
`scripts/guards/gate/check-trace.mjs` — new; step 7's acceptance check.
`scripts/guards/lib/terms.mjs` — `mask` exported for the trace scrubber.
`scripts/gate.mjs` — the eighth step.
`scripts/guards/guards.config.json` — `enforcementEnvironment`, `traceEvents`, `recordedHookEvents`, each with a reason.
`.claude/settings.json` — eight hook events wired to `record-event.mjs`.
`.gitignore` — `evidence/`.
`docs/harness/evidence.md` — new; the schema, the two write-time properties, and what is deliberately not recorded.
`docs/harness/contracts.md` — Evidence row `built`.
`CLAUDE.md` — pointer to the evidence document.
`TASKS.md` — step 7 closed.
