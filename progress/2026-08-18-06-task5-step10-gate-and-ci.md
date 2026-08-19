# 2026-08-18 · Session 06 — TASK 5, step 10: gate and CI

**Task:** TASK 5 — AI Agent Development Harness v2
**Status after this session:** IN PROGRESS (steps 1–10 done). **Next: TASK 10, then step 11.**

## What was done

The CI workflow, and a second guard that was not in the blueprint until a sweep found what it would have caught. Tests 267 → 290, gate to eleven steps.

## Decisions

- **The workflow carries no `paths:` filter, and a guard fails the file if one returns.** `INC-08` was two path-filtered workflows that made a repo-root guard run in CI **zero times** since it was written, invisibly, because the local gate was green. The cost of running the gate on a docs-only commit is a few seconds; the cost of the filter was months of a guard that never fired.
- **CI runs one command, the same one a human runs.** `node scripts/gate.mjs` and nothing else. A test asserts CI does *not* re-list steps the gate already delegates to — a step added to the gate would otherwise be silently absent from CI, and the local run would verify more than CI does (`T-09`).
- **The workflow is written and inert, and the file says so.** No remote exists, so nothing here has ever run. That is why the `ci` done-dimension reads `not_applicable` with a reason rather than `passed` — and it is `T-10` in practice: a green local gate is not evidence CI fired.
- **The known CI failure is documented in the workflow itself.** `check-terms` needs `private/banned-terms.txt`, which is gitignored and never reaches a runner, so the gate step will fail on a fresh checkout **by design**. Naming it in the file means nobody debugs it as a mystery. Resolving it — a repository secret, or a CI mode that asserts the check ran and skipped for a stated reason — is TASK 7's business; choosing now, with no remote and no runner, would be guessing.
- **`check-docs` distinguishes a path *claim* from a naming convention.** A markdown link is always a claim. A backticked token is one only if it carries a known extension, a directory separator, and no placeholder. `H-01`, `status` and `passed` are backticked throughout the registry; `EC-0NN.yaml` is a shape, not a promise. Without that line the guard demands files nobody meant to promise, and gets switched off within a day.
- **The ignore list shrinks on its own.** Two entries, each with a written reason, and an entry whose target starts resolving is reported as **stale** — because a kept exemption would hide the next time that path goes missing. A reasonless entry fails outright, the same rule every other calibrated exception in this harness follows.

## Findings from validating against real state (P-04)

- **`check-docs` exists because of what the previous session's hand-run sweep found**, not because the blueprint asked for it: `architecture.md` cited `procedures.md` and `metrics.md` **thirteen times**, and neither had ever been written. Roles' bootstrap paths were checked by `check-agents`, templates' `instances:` by `check-templates`, and architecture prose by nobody — which is exactly why architecture prose is what drifted.

- **The one remaining hit was fixed at the source rather than exempted.** `TASKS.md` wrote `home.en/es.md`, meaning *home.en.md and home.es.md*. It reads like a path and is not one. Rewritten as `home.{en,es}.md`, the convention `C-14` already uses. Growing an ignore list to accommodate ambiguous prose would have been the easier move and the wrong one — the ignore list should hold things that are genuinely exceptions, not things that are badly written.

- **5/5 mutants caught**, on the real artifacts: a `paths:` filter added back, CI re-listing a test command instead of delegating, CI pinned to Node 18, a stale markdown link in `evidence.md`, and `CLAUDE.md` pointing at a renamed rule file.

## Done

```yaml
done:
  tests:      { status: passed, evidence: ["node --test scripts/guards/**/*.test.mjs", "290 pass 0 fail", "5/5 doc+CI mutants caught"] }
  gate:       { status: passed, evidence: ["node scripts/gate.mjs", "exit:0, 11 steps green"] }
  content:    { status: passed, evidence: ["check-terms.mjs", "exit:0"] }
  docs:       { status: passed, evidence: ["check-docs.mjs", "25 living docs, 78 references resolved, 2 reasoned exemptions"] }
  ci:         { status: not_applicable, reason: "no remote exists — the workflow is written, unfiltered and inert; T-10 forbids calling a local pass evidence that CI fired" }
  security:   { status: not_applicable, reason: "no new boundary and no new tool grant; the workflow declares contents:read only" }
```

## Open questions

- **`check-terms` will fail in CI on a fresh checkout**, because `private/banned-terms.txt` is gitignored by design. Documented in the workflow, deliberately unsolved until a remote and a hosting decision exist (TASK 7).
- **Nothing in CI has ever executed.** Every claim about the workflow is a claim about its *text*, verified by `check-ci`. Whether GitHub accepts and runs it is unverified and unverifiable here, and `T-10` says so.

## Next

**TASK 10 first, then step 11** — the human approved both fixes and set that order deliberately: the eval cases exercise these guards, and writing them against a guard with a known false positive produces results that have to be redone.

1. `checkBashPaths` / `checkGitWrite` stop firing on a dangerous string that appears **inside quotes** rather than as a command. It has now fired seven times in two days, once aborting a patch mid-run.
2. The registry gains a rule for **"a guard that cannot evaluate must deny"**, with its incident transcribed in `architecture.md` §C first — a rule with no origin is deleted rather than kept (`G-10`). Its sibling belongs in the same incident: a guard whose regex arrived on disk with literal control bytes, so it read correctly in four inspections and could never match.

Then **step 11** — ten eval cases and the `EVAL-000` baseline, which is a **human checkpoint**.

## Files changed

`.github/workflows/harness.yml` — new; unfiltered, one command, Node 24, `contents: read`, with the known CI failure documented in place.
`scripts/guards/lib/ci.mjs` + tests — new; the `INC-08` guard, 11 tests.
`scripts/guards/lib/doc-links.mjs` + tests — new; path-claim extraction and resolution, 12 tests.
`scripts/guards/gate/check-docs.mjs` — new; step 10's acceptance check, both halves.
`scripts/gate.mjs` — the eleventh step.
`scripts/guards/guards.config.json` — the `docs` block: roots, one exclusion and two exemptions, each with a reason.
`TASKS.md` — step 10 closed; `home.en/es.md` disambiguated.
