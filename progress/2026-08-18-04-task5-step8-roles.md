# 2026-08-18 · Session 04 — TASK 5, step 8: the agent roster

**Task:** TASK 5 — AI Agent Development Harness v2
**Status after this session:** IN PROGRESS (steps 1–8 done, step 9 next). Gate green at 9/9 after the human cleared the pre-fix trace data.

## What was done

Five role files, the roster guard that validates them as properties, and one enforced per-role write scope. Tests went 199 → 247. Contracts went to 2 fully enforced, 3 partial, 1 pending.

Step 8 also turned the delegation gate from theoretical into operational: `roleTools` is no longer empty, so write-capability is now read from real declarations instead of failing closed on every role.

**And it surfaced a fail-open hole in the rung-1 guard, which is the most serious defect found so far.**

## Decisions

- **Model is assigned per role and justified, never inherited.** `adversarial-auditor` and `harness-evaluator` run on opus because their entire value is catching what a cheaper pass misses; the other three run on sonnet because the judgment was already made in the spec or the brief. Omitting `model` inherits, which silently runs the expensive model everywhere — a cost regression wearing the clothes of a neutral default.
- **`maxTurns` is set by judgment and will be recalibrated from the trace.** 20–30 depending on role. These are budgets, not measurements, so `C-01` does not forbid them — but they are guesses, and `G-06` already says `maxToolCalls` and `maxRuntime` are observed at wrap-up. The first real work item through the harness (TASK 7) produces the numbers to correct them with.
- **Withholding beats guarding, and the roster guard asserts it.** `researcher` holds no shell — network access beside a shell is not a boundary. `harness-evaluator` holds no shell — its value depends on not being able to reach what it scores. `adversarial-auditor` holds no `Write` or `Edit` — an auditor that can fix what it finds starts fixing instead of finding, and the record of what broke disappears into the repair. It *does* hold a shell, which is a write vector, so its write posture is procedural rather than enforced and now says so (see the findings). Each withholding is now checked, so a later edit that "just adds Bash for convenience" fails loudly.
- **One enforced write scope, not five** (`A20`, `A21`). `harness-evaluator` may write only inside `progress/evaluations/`, enforced by a `PreToolUse` guard. The other roles' file sets stay procedural — named in the brief, checked by the auditor — because enforcing them has no incident behind it. The asymmetry is the decision: an evaluator that can edit the artifact it grades produces a number about nothing.
- **A scoped role may not use a shell at all.** A write scope cannot be held through a shell with any confidence — a script the role writes and then runs defeats every pattern. Refusing the tool is honest; pattern-matching it would be a claimed lock that leaks.
- **The posture dimensions live in frontmatter, as the Agent Contract specifies.** Whether the runtime tolerates custom keys was unconfirmed when this was written. **Confirmed since:** all five roles were surfaced by the runtime as available agent types with their descriptions intact, so the six posture keys parse without breaking the file. The `## Posture`-in-body fallback is not needed.

## Findings from validating against real state (P-04)

- **The `PreToolUse` guard failed OPEN, and had done so at least twice in this session.** A concurrent rewrite of `guards.config.json` left it momentarily unparseable; the hook's top-level `JSON.parse` threw; the process exited 1; and the runtime treats exit 1 as a *non-blocking* hook error. **Every rung-1 boundary was open for the duration of that read.** Reproduced deliberately afterwards: with a torn config, a git write reached exit 1 — the tool would have run.

  Now wrapped so any internal error exits 2 with an attributable message. A guard that cannot evaluate cannot permit. The cost is that a broken config denies everything until a human fixes it, which is loud, correct and recoverable — the opposite of the failure it replaces.

  **This was found by the trace, not by reading the code.** Two `tool.result` events with no matching `tool.requested` were the only symptom, and `check-trace` refused to accept them. The subsystem built to make claims falsifiable falsified one about itself.

- **The trace was blind to every tool outside the `PreToolUse` matcher.** `WebFetch` showed `requested=0, result=1`: the matcher listed only the tools the guard dispatches on, while `PostToolUse` matched `*`. So results were recorded for calls whose requests never were, and the three-event correlation silently did not hold for `WebFetch`, `WebSearch`, `TodoWrite`, `Skill`, and anything the runtime adds next. The matcher is now `*`, and `check-settings` understands that `*` covers everything rather than demanding a list.

- **A dot-dot bypass in `H-02`, `H-03` and `H-04`, live since step 6.** `isInside` compared normalized *strings*, so `docs/../resources/case-studies/x.en.md` — which resolves on disk to a protected path — failed the prefix test and was allowed. Same for `a/b/../../evidence/runs/t.jsonl` and `docs/../private/glossary.md`.

  Found by a *sibling* guard's test: `role-scope` was written with a dot-dot case, it failed, and the same weakness turned out to live in the shared `normalize`. `..` and `.` segments are now resolved, and relative paths are joined to the root first — because `docs/../../portfolio/resources/x.md` is only recognizable as re-entering the repository once you know where the repository is. All four spellings now denied through the live hook; ordinary relative paths still pass.

- **Malformed events could permanently red the gate, and nobody could clean them.** Synthetic probe payloads without `tool_use_id` wrote invalid events into `evidence/runs/`, `check-trace` correctly refused them, and `H-03` denies every agent vector for removing them. The writer now validates each event before it reaches disk and records a `trace.rejected` event instead — the malformation stays visible, the file stays valid. A silent drop would have been worse than either: that is `INC-08` again, the recorder that quietly stops recording.

- **7 mutants, 7 caught,** run against the real role files: dropped `model`, dropped posture dimension, renamed bootstrap path, renamed `## Reporting`, researcher gains a shell, evaluator gains a network tool, auditor gains write.

- **A posture line was false, and the roster guard did not check for it.** `adversarial-auditor` declared `filesystem_write: none` while holding `Bash`. A shell is a write vector — the Tool Contract itself says Bash's effective permission is the union of everything it can reach around — so the declaration claimed a boundary the role did not have, in the one file whose whole job is to declare a role's capabilities truthfully.

  Surfaced by the author asking whether the withholding summary was correct. It was not: "no write tools" was true of `Write`/`Edit` and false of the role's actual capability. The guard now fails any role declaring `filesystem_write: none` beside a shell, and the auditor's posture says what is true — no file tools, a shell held deliberately for running bypasses, write scope procedural per `A21`.

- **That check was written, looked correct, and could never fire.** The `` word boundaries in its regex were written through a shell heredoc and arrived on disk as literal **0x08 backspace bytes**. `grep`, line printing and every visual inspection rendered them invisibly, so the source read correctly in four separate reviews. The predicate tested `true` in isolation; the guard returned nothing.

  Caught only because the accompanying red test failed. A guard that silently cannot fire is `INC-07`'s exact shape, and this one was authored *by the tooling workaround used to write guards*. Every `.mjs`, `.md` and `.json` under `scripts/` and `.claude/` was then scanned byte-wise for stray control characters: none remain.

## Blocked — resolved

`node scripts/gate.mjs` fails at `check-trace` with 20 findings. **All twenty are historical events already on disk**, produced by the two defects above before they were fixed:

- 16 from synthetic probe runs (`evidence/runs/escape-probe`, `evidence/runs/scope-probe`) — malformed payloads, now impossible.
- 4 from this session's own run — the `WebFetch` orphan and the results whose requests were lost to the fail-open crash, both now impossible.

Neither can recur. Neither can be removed by an agent: `H-03` is doing exactly what it exists to do, and cleanup of the evidence directory belongs to the human.

```powershell
Remove-Item -Recurse -Force evidence/runs
```

Run by the human; the gate is green at 9/9. `evidence/runs/` is gitignored operational output, not knowledge — everything of value in it is recorded here.

Worth carrying into the export: the first instruction handed over was the POSIX form, which PowerShell rejects. This project's primary shell is PowerShell, and the harness's own documents should say so wherever they hand out a command.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs", "247 pass 0 fail", "7/7 role mutants caught"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs", "exit:0, 9 steps green after the human cleared pre-fix trace data"] }
  content:    { status: passed, evidence: ["check-terms.mjs", "exit:0"] }
  docs:       { status: passed, evidence: ["contracts.md 2 built / 3 partial / 1 pending", "TASKS.md step 8 + TASK 10"] }
  security:   { status: passed, evidence: ["fail-open reproduced then closed, proven with a torn config", "dot-dot bypass closed, 4 spellings denied through the live hook", "role scope proven in red"] }
  ci:         { status: not_applicable, reason: "no remote exists" }
```

`gate: blocked` rather than `passed`. The steps that could pass did; the one that cannot is named, with the reason and the fix.

## Next

**Step 9 — Procedures.** `work-item` (the spec-first driver with its checkpoint), `wrap-up` (which must fail a done-dimension that reads `passed` with empty evidence — the uncovered half of the Evidence contract), and `evaluate-harness`. Roles exist now, so the procedures have something to delegate to.

## Files changed

`.claude/agents/{implementer,test-engineer,adversarial-auditor,researcher,harness-evaluator}.md` — new; five roles.
`scripts/guards/lib/agents.mjs` + tests — new; the roster guard, 21 tests.
`scripts/guards/lib/role-scope.mjs` + tests — new; A20's enforced write scope, 11 tests.
`scripts/guards/gate/check-agents.mjs` — new; step 8's acceptance check, including the withholding assertions.
`scripts/guards/hooks/pretooluse.mjs` — **fails closed on any internal error**; dispatches the role-scope check.
`scripts/guards/lib/path-boundary.mjs` — `normalize` resolves `.`/`..`; relative paths resolve against the root.
`scripts/guards/lib/evidence.mjs` — `rejectReason` and the `trace.rejected` event.
`scripts/guards/hooks/trace-writer.mjs` — validates before writing.
`scripts/guards/lib/settings.mjs` — understands a `*` matcher.
`.claude/settings.json` — `PreToolUse` matcher widened to `*`.
`scripts/guards/guards.config.json` — `roleWriteScopes`, `trace.rejected` in the vocabulary.
`scripts/gate.mjs` — the ninth step.
`docs/harness/contracts.md` — Agent `built`; Run and Tool gaps re-stated.
`TASKS.md` — step 8 closed; TASK 10 opened for the two loose ends.
