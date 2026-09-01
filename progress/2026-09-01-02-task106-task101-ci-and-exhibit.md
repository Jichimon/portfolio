# 2026-09-01 · Session 02 — CI goes green, the repository becomes the exhibit

**Task:** TASK 106 — CI runs the gate and goes green · TASK 101 — the repository as the portfolio's public exhibit · (TASK 30 — publish, note-only, not closed here)
**Status after this session:** IN PROGRESS — local work complete and gate-verified; the CI-green claim and TASK 30's close both need a real push, which `H-01` reserves to the author.

## What was done

Read `.github/workflows/harness.yml` against the real remote for the first time — it had shipped inert-until-a-remote and nobody had checked it since. Two real failures, both root-caused: `site/` never gets `npm ci` (three gate steps resolve a binary CI never installed), and `private/banned-terms.txt` is gitignored by design and was never going to reach a runner. Fixed the workflow and made the confidentiality gap loud instead of hidden (`TASK 106`). Separately, decided and executed `TASK 101`: the exhibit is `README.md` only, rewrote it as the project's public front page, and moved the stale `resources/` conventions it used to carry into `docs/content-conventions.md`.

## Decisions

- **Confidentiality stays local-only in CI.** Raised once (`P-17`) that shipping the term list to a runner would close the gap more completely; the author declined to widen `H-04` for a green badge. The workflow instead accepts an `INCOMPLETE` gate run only when `confidentiality` is the single skip — any other skip, or a skip beside a real failure, still fails the job.
- **`TASK 32`'s Done drops its prod-fidelity clause.** `TASK 27` (the fidelity harness) is unbuilt, so "TASK 27's prod comparison is switched on and passing" is unsatisfiable as written. The obligation moves to `TASK 27`, whose prod leg gains its stated entry condition once `TASK 32` ships a live URL. Not yet written into `TASK 32`'s own entry — that edit belongs to the session that opens `TASK 32`, so the amendment lands beside the spec rather than speculatively ahead of it.
- **README is English-only, no site page.** `C-09` would pull both locales into an item whose subject is the harness, for a page most readers never navigate to. Same precedent `TASK 4` set for the GitHub profile README.
- **`SPEC-TASK-25`'s two citations of `README.md §Diagram tags` were corrected in this change**, not left stale. `check-docs` only checks that a cited path resolves, not that a cited section still exists there — moving the content without fixing the citation would have been the exact "doing the obvious half" `P-07` exists to catch, and I was the one who caused it.

## Findings from validating against real state (P-04)

- `gh repo view Jichimon/portfolio` and `git remote -v`/`git status -sb` confirm the remote is real, public, and `main` already tracks it — the repository was pushed before this session, on an earlier one not logged under this task. `TASK 30`'s own entry was stale about this (still read `TODO` with no note), which is `P-07`'s failure again, now recorded rather than repeated.
- Simulating the CI environment (`gate-steps.mjs`'s `validateSteps` with `site/node_modules` reported absent) reproduced the exact two findings from the pasted CI log — confirms cause #1 without needing a real CI run to diagnose it.
- `TASK 69`'s Firefox contention was *not* observed in the pasted log — the two real failures are unrelated to it. Stated so the next session does not conflate them.
- **The verdict script's own first draft was wrong** — `grep -c '^  SKIP  '` was meant to count skipped steps, but `gate.mjs` prints every skip twice (padded summary row, unpadded detail-block row), and a plain prefix match counted both. A synthetic single-skip fixture scored `skips=2` against it, which would have rejected the exact case the step exists to accept. Found by building three synthetic `gate.log` fixtures and running the *actual extracted script* (parsed out of the YAML, not retyped) against each before trusting it (`P-14`) — fixed by reading the count from the `GATE INCOMPLETE — N of 20…` header line instead.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs — 1050/1050", "node scripts/gate.mjs — GATE PASSED, all 20 steps PASS including confidentiality (this machine holds private/)"] }
  mutation:   { status: passed, evidence: ["node scripts/gate.mjs — 'mutation' step PASS, floor unmoved at 77.0"] }
  ci:         { status: blocked, reason: "TASK 106's own claim (harness.yml green on GitHub) needs a real push; H-01 reserves that to the author. Local simulation of the CI failure modes done and documented above." }
  security:   { status: not_applicable, reason: "no security-relevant surface touched — CI workflow and content, not a boundary or a guard's enforcement logic" }
  docs:       { status: passed, evidence: ["node scripts/guards/gate/check-docs.mjs — PASS, 62 living docs, 303 refs resolved"] }
  loose_ends: { status: passed, evidence: ["TASK 32's dropped Done clause and TASK 27's new entry condition both named above and left for TASK 32's own session, not silently forgotten"] }
  scope:      { status: passed, evidence: ["session boundary followed: TASK 32, TASK 107 and the profile-README audit deliberately left for later sessions per the approved plan"] }
  content:    { status: passed, evidence: ["README.md and docs/content-conventions.md written; C-01 (no invented numbers), C-10 (no adjectives without evidence) checked by hand"] }
  iterations: { status: passed, evidence: ["3"] }
  iteration_split: { status: passed, evidence: ["checkpoint=1", "verify=2"] }
```

## Open questions

- Awaiting the author's push. Once pushed: read `gh run list --workflow=harness.yml` / `gh run view --log` for the real result, browse the pushed tree for `private/`/`evidence/` absence, then flip `TASK 30` and `TASK 106` to `DONE` and add the CI badge to `README.md`.

## Next

Author reviews the diff and pushes. Then: verify the real Actions run, close `TASK 106` and `TASK 30` in the register, add the badge — all still this session, per the approved plan (session 1 does not end until that verification happens).

## Files changed

`.github/workflows/harness.yml` — fetch-depth 0, `site/` install, Playwright browsers, gate-verdict wrapper accepting a confidentiality-only skip, header comment corrected; the verdict script's skip-counting logic corrected after red-path testing found it double-counted.
`scripts/gate.mjs` — `confidentiality` step gains `skipIf`/`skipNote`.
`scripts/guards/gate/check-terms.test.mjs` — `LIVENESS` test gains the matching `node:test` skip.
`scripts/guards/gate/check-docs.mjs` — stale "inert until a remote exists" print corrected.
`README.md` — rewritten as the public front page.
`docs/content-conventions.md` — new; the moved `resources/` conventions.
`CLAUDE.md` — "Where knowledge lives" row repointed.
`docs/specs/SPEC-TASK-25-case-study-and-platform-pages.spec.md` — two `README.md` citations corrected to the new path.
`TASKS.md` — `TASK 106` opened; `TASK 101` closed; `TASK 30` annotated (not closed); goal-alignment table row updated.
