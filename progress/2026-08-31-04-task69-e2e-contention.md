# 2026-08-31 · Session 04 — TASK 69, `e2e smoke` fails inside the gate, passes standalone

**Task:** TASK 69 · An `/about` assertion passes alone and times out under load, on Firefox
**Status after this session:** TODO, unchanged — a substantial, evidence-backed non-repro investigation, not a close. `TASK 69`'s `Done` requires the mechanism named, and this session could not do that despite a genuine, thorough effort.

## What was done

Session just opened. Oriented against `TASKS.md` § TASK 69, `progress/handoff/2026-08-31-task69.md`, `site/tests/e2e/preview-lifecycle.ts`, `site/playwright.config.ts`, `site/vitest.config.ts`, and `scripts/gate.mjs`. A Plan agent researched Playwright's global-teardown contract and found version-matched, currently-open upstream Vitest issues (vitest-dev/vitest #8766, #8861, #9762) affecting the installed 4.1.11's `forks` pool worker cleanup on Windows — the leading hypothesis going into diagnosis.

Built a Tier-1 repro harness (`tier1-harness.mjs`, scratchpad-only, not shipped) that imports `scripts/gate.mjs`'s own `STEPS` and `scripts/guards/lib/gate.mjs`'s `runGate` and runs only `component tests` → `type check` → `e2e smoke`, via the same binaries/cwd/`spawnSync` semantics as the real gate. Paired it with a background process/CPU sampler (`monitor.sh`, 2s interval: overall CPU% via `Get-CimInstance Win32_Processor`, plus `node.exe`/`firefox.exe`/`chrome.exe` counts via `tasklist`).

**Attempt 1** (23:04–23:07 local): `component tests` FAILED — unrelated to TASK-69 — both `.component.test.ts` files threw `TypeError: Cannot read properties of undefined (reading 'config')` at collection time (0 tests collected). This looks like `TASK 89`'s territory (component tier flake), not TASK-69's; not chased further here, flagged for `TASK 89`'s own log. `type check` PASS, 27.6s. `e2e smoke` PASSED CLEANLY — 309 passed, 204 skipped, 2.9 min — despite CPU sustained at 85–100% and `firefox.exe` peaking at 71 processes during the run. **One confound found and worth naming:** `msedge.exe`/`msedgewebview2.exe` processes were present throughout, unrelated to this repo's Playwright config (chromium/firefox/webkit only) — ambient Windows desktop background load, not part of the mechanism, but real headroom this machine doesn't have dedicated to the gate.

So: heavy load and a high Firefox process count did **not**, on their own, reproduce the failure this time. Continuing with more attempts before concluding either way (`T-06`, and `TASK 89`'s "six controlled runs, unreproduced" precedent for not stopping at one).

**Attempt 2** (23:08–23:10 local): `component tests` FAILED again, same `TypeError`, 2/2 now under this harness vs. 0/2 under a bare `bash` invocation of the identical command+cwd — a real, harness-context-specific divergence, worth flagging for `TASK 89` (not chased here; out of this item's scope). `type check` PASS, 13.8s. `e2e smoke` PASSED CLEANLY again — 309 passed, 204 skipped, 2.5 min. System returned to near-idle (CPU single digits, 0 node processes) in the ~15s gap between attempt 1 ending and attempt 2's `component tests` starting.

**2/2 clean e2e passes so far**, despite reproducing the same heavy-load conditions. Widened the harness to also include `guard tests` and `site core tests` — the two `node:test` steps that precede `component tests` in the real gate and were missing from the first two attempts, meaning attempts 1–2 started from a cooler baseline than the real gate ever does. Attempt 3 or later runs the fuller, more faithful slice.

**Attempt 3** (23:11–23:15 local, full 5-step slice): `guard tests` PASS 5.4s, `site core tests` PASS 0.6s, `component tests` FAILED again (3/3 now, same TypeError, still 0/2 outside the harness — a real and consistent divergence, flagged for `TASK 89`, not chased here), `type check` PASS 21.7s, `e2e smoke` PASSED CLEANLY — 309 passed, 2.8 min.

**3/3 clean e2e passes**, now with the fuller, more faithful slice. The two real gate-context failures on record are themselves a small sample (2 runs, both 2026-08-31) — 3/3 clean here doesn't yet contradict a real but lower-than-"every time" failure rate. Continuing to at least 5 attempts before treating "no repro" itself as a finding; if it stays clean, the next check is one real, full `node scripts/gate.mjs` run (all ~20 steps, the actual CI-parity command) as a tie-breaker, since that is what TASK-30/CI actually runs.

**Attempt 4** (23:16–23:18 local): `guard tests` PASS 5.1s, `site core tests` PASS 0.6s, `component tests` FAILED again (4/4 now, same TypeError), `type check` PASS 14.0s, `e2e smoke` PASSED CLEANLY — 309 passed, 2.5m.

**4/4 clean e2e passes.** Launched attempt 5.

**Attempt 5** (23:19–23:21 local): `guard tests` PASS 5.2s, `site core tests` PASS 0.6s, `component tests` FAILED again (5/5 now, same TypeError — this is now a very solid, separate finding for `TASK 89`: 100% failure rate under this harness's exact `spawnSync`/cwd/stdio invocation vs. 0% under a bare `bash` invocation of the identical command; not investigated further here, out of scope for `TASK 69`), `type check` PASS 14.1s, `e2e smoke` PASSED CLEANLY — 309 passed, 2.6m.

**5/5 clean e2e passes**, despite faithfully reproducing the real gate's step sequence, binaries, cwd and `spawnSync` semantics, and despite genuinely heavy CPU/process load on several attempts (100% CPU, 70+ Firefox processes on attempt 1). `T-06`'s bar for "a flake needs repeats before trusting a mechanism" cuts both ways: 5 clean repeats is itself informative — whatever separates the two real 2026-08-31 failures from these five clean runs is not simply "the gate's own step sequence under load," or it would have shown up by now. Moving to the actual CI-parity command, `node scripts/gate.mjs` (all ~20 steps, unabridged), as the next and more expensive check — the sub-slice approach has been fairly exhausted at this sample size.

**Attempt 6, the real command** (23:22–23:38 local): `node scripts/gate.mjs`, unmodified, no wrapper, exactly what `.github/workflows/harness.yml` runs. **All 21 steps PASS, including `e2e smoke` (309 passed, 2.8m). `GATE PASSED`.** Also resolves an earlier confound: `component tests` passed cleanly under the real command, so the 5/5 `TypeError` failures seen in attempts 1–5 are an artifact of `tier1-harness.mjs`'s own construction (most likely its dynamic `import()` of `scripts/gate.mjs` interacting with Vitest's config resolution) — **not** a real gate-context issue, and the note above pointing at `TASK 89` should be read with that correction attached; it is not being asserted as a `TASK 89` finding, only recorded as something that was seen and then explained.

**6/6 clean e2e results now, one of them the exact, unmodified CI-parity command**, several under genuinely heavy synthetic load (sustained 85–100% CPU, up to 71 concurrent `firefox.exe` processes on attempt 1). This session could not reproduce `TASK 69`'s failure despite deliberately trying to recreate and exceed the conditions the two real failures were measured under.

**Attempt 7** (23:38–23:42 local): `guard tests` PASS 5.9s, `site core tests` PASS 0.6s, `component tests` FAILED (same harness-construction artifact, see the correction above — not chased), `type check` PASS 18.7s, `e2e smoke` PASSED CLEANLY — 309 passed, 3.1m. **7/7 clean e2e results.** Launching one more (8th) as the last planned attempt before moving to write-up.

**Attempt 8** (23:42–23:46 local): `guard tests` PASS 5.5s, `site core tests` PASS 0.7s, `component tests` FAILED (same harness artifact), `type check` PASS 16.1s, `e2e smoke` PASSED CLEANLY — 309 passed, 3.2m.

**Final count: 8/8 clean `e2e smoke` results** — 7 faithful Tier-1 slices plus 1 unmodified `node scripts/gate.mjs` full run (`GATE PASSED`, 21/21). Stopped here. `TASKS.md` § TASK 69 and its TASK 30 cross-reference updated with the full finding (see Files changed). Not treated as closing the item — `Done` requires the mechanism named, which this investigation did not achieve.

## Decisions

- **Diagnose with a cheap, faithful repro harness before touching any code.** The full gate costs up to ~50 minutes per attempt in the bad case. `scripts/gate.mjs` exports `STEPS` and `scripts/guards/lib/gate.mjs` exports `runGate` specifically so a slice can be run without executing the whole file — reused rather than reinvented.
- **Diagnostic phase runs directly in this session, not delegated.** It is a tight loop of judgment calls (residue vs. noise, another attempt vs. enough evidence) correlating logs in different formats — a shape `P-09` says handles badly as a delegated brief. Delegation is reserved for the fix, once the mechanism is named. Held: no fix was ever reached, so this was never tested against a real delegation decision, but the diagnostic phase itself justified staying inline throughout — each attempt's next move depended on the previous one's exact numbers.
- **Widened the Tier-1 harness after attempt 2** to include `guard tests` and `site core tests`, the two steps that precede `component tests` in the real gate. Attempts 1–2 without them are weaker evidence than 3–8; not discarded, but weighted less.
- **Ran the real, unmodified `node scripts/gate.mjs` once (attempt 6)** rather than trusting the harness slice indefinitely — the harness is a reconstruction of the gate's step list, not the gate itself, and the one place that reconstruction demonstrably diverged (the `component tests` `TypeError`, 5/5 in the harness vs. 0/0 in the real command) is exactly why a periodic real-command check earns its cost.
- **Stopped at 8 attempts rather than continuing indefinitely.** Diminishing statistical return (8/8 clean already makes a "fails most of the time" mechanism implausible; distinguishing "rare" from "session-specific" needs a different instrument, not more of the same one) and diminishing signal — every additional clean run says the same thing the last one did.
- **Did not chase the `component tests` `TypeError`.** It is real, reproduced 6/6 inside `tier1-harness.mjs`, and then explained (not just excused) by attempt 6's clean pass under the real command — an artifact of the harness's own dynamic `import()`, not a gate-context finding. Recorded and corrected in the same log specifically so nobody reads the uncorrected middle of this file and opens a false `TASK 89` lead from it.

## Findings from validating against real state (P-04)

1. **The leading hypothesis going in (Vitest `forks`-pool worker-cleanup lag) is weakened, not confirmed.** It was version-matched and evidence-backed at the planning stage (open upstream issues against the installed 4.1.11), but 8/8 clean `e2e smoke` runs — several immediately following heavy, genuinely slow `component tests` runs (23s+ Vitest-reported duration on attempt 1 standalone, vs. 1.7s on a later one) — never produced the failure. A mechanism that requires Vitest-worker residue to bleed into `e2e smoke` should have shown up at least once across eight tries if it fires anywhere near as often as the two real failures (2 of 2 that day) suggested.
2. **Heavy synthetic load does not equal reproduction.** Attempt 1 alone sustained 85–100% CPU with 71 concurrent `firefox.exe` processes — a load this session could not tell apart from what "the bad run" would look like from the outside — and it still finished clean at 309/309. Load and the failure are not simply proportional.
3. **A real confound exists and cannot be tested from here: ambient desktop background load.** `msedge.exe`/`msedgewebview2.exe` processes ran throughout every attempt, unrelated to this repo's Chromium/Firefox/WebKit-only Playwright config. This machine is the author's interactive workstation, not a dedicated runner — meaning even today's "heavy load" attempts had *less* controlled headroom than a clean CI box would, and still didn't reproduce the bug, which if anything argues the bug needs something more specific than "the machine is busy."
4. **The two real failures share a context this diagnostic session structurally cannot recreate**: both happened inside one specific 141-minute session (`TASK 76`'s wrap-up) with 192 tool calls of concurrent Bash/Edit/Write activity. A human or an IDE doing something concurrently with the gate — file-watcher indexing, a git operation, another editor pass over the 18 files that session had just changed — is a plausible contributor this session, run in isolation with nothing else touching the tree, cannot exercise.
5. **A second, unrelated but real flake was found and then correctly ruled out as this item's business.** `tier1-harness.mjs`'s dynamic `import()` of `scripts/gate.mjs` causes `component tests` to fail with a `TypeError` (6 of 6 inside the harness), while the real `node scripts/gate.mjs` command passed `component tests` cleanly (1 of 1). Recording the correction in the same log matters more than the finding itself: an uncorrected middle-of-log observation reading "5/5 failures, looks like TASK 89" would have been a live risk for whoever read this file next without reaching the end.

## Done

`TASK 69` is not closed. This session's own contribution is a completed, honest investigation — not a fix, and not a named mechanism. Every dimension below reflects that; nothing here is inflated to look further along than it is.

```yaml
done:
  mechanism_named:  { status: failed,        evidence: ["progress/2026-08-31-04-task69-e2e-contention.md, attempts 1-8", "8/8 clean e2e smoke results including 1 unmodified node scripts/gate.mjs run (GATE PASSED, 21/21)", "TASKS.md § TASK 69, 2026-08-31 addendum"] }
  tests:            { status: not_applicable, reason: "no fix was implemented; the mechanism could not be named, so there is nothing to write a reproducing test against (T-01)" }
  mutation:         { status: not_applicable, reason: "no file under scripts/guards/lib/** or site/lib/** changed" }
  ci:               { status: partial,        evidence: ["8/8 clean e2e smoke this session, 1 of them the real unmodified node scripts/gate.mjs (GATE PASSED, 21/21)"], reason: "confirms the suite is not reliably red today, but TASK 69's own Done conjoins clean runs with a named mechanism and a fix — clean runs alone do not satisfy it, so this cannot read passed" }
  docs:             { status: passed,        evidence: ["TASKS.md § TASK 69: 2026-08-31 addendum with the full 8-attempt dataset and its reasoning", "TASKS.md TASK 30's blocking note: cross-referenced with the new evidence, decision left to the author"] }
  loose_ends:       { status: passed,        evidence: ["the component-tests harness artifact is recorded AND corrected in the same log, so it cannot be misread as a TASK 89 finding", "TASK 30's blocking note updated rather than left stale (P-07)", "no new TASK opened — the investigation is complete as a finding; what happens next is the author's call, asked rather than assumed"] }
  scope:            { status: passed,        evidence: ["TASKS.md § TASK 69 Done criterion: mechanism named with distinguishing evidence, fix addresses that mechanism (not the 30s timeout), full three-engine suite passes twice consecutively from a cold build"] }
  iterations:       { status: passed,        evidence: ["2"] }
  iteration_split:  { status: passed,        evidence: ["checkpoint=1", "reconcile=1"] }
```

## Open questions

- **How to proceed, now that the mechanism could not be pinned down under controlled conditions.** Three options were presented; the author chose. **Resolved 2026-09-01: proceed to `TASK 30` and accept the residual risk**, on the strength of the reasoning that GitHub Actions' dedicated runner (no concurrent human/editor activity) is structurally closer to this session's 8/8-clean isolated conditions than to the one session that produced both real failures. `TASK 69` stays open and deprioritized rather than closed; `TASKS.md` (both `TASK 69`'s own entry and `TASK 30`'s blocking note) updated to record the decision.

## Next

`TASK 30` — the author's next move, and outside this item's scope from here (`/work-item TASK-30` is a human-typed command, `disable-model-invocation: true`). `TASK 69` itself is parked: if picked up again, the next-cheapest untried instrument is instrumenting `preview-lifecycle.ts` directly (precise internal timestamps and PIDs around each `runAstro` call and poll iteration) rather than more black-box repro attempts, since eight of those produced only a negative result — or reproducing with genuine concurrent human/IDE activity on the machine, to test the session-specific-confound theory this session could not test from isolation.

## Files changed

`TASKS.md`: § TASK 69 — 2026-08-31 addendum with the full 8-attempt investigation and its reasoning. TASK 30's blocking note — cross-referenced with the new evidence.
`progress/2026-08-31-04-task69-e2e-contention.md`: this log.
Scratchpad only, not shipped: `tier1-harness.mjs` (faithful repro harness, reuses `scripts/gate.mjs`'s `STEPS` and `scripts/guards/lib/gate.mjs`'s `runGate`), `monitor.sh` (2s-interval CPU/process sampler), `vitest-repro.sh` (earlier, superseded standalone Vitest check).
