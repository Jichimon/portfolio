# 2026-08-23 · Session 20 — the backlog re-cut local-first, delegated, two commands

**Task:** amendment to `TASK 8`'s backlog (`TASK 8` itself stays `DONE`)
**Status after this session:** the register describes the order the work will actually run in, and the execution model it runs under

## What the author asked for

> *"se busca que esta tarea sea avanzar con un primer presentable en localhost, estable y real… una vez con eso podemos continuar con la tarea de deploy y subir a github (mi parte, la de subir a github). Por ahora tenemos que avanzar en local."*

And then, on reviewing the first draft of the plan, five execution requirements:

1. **The harness implements the work**, through the agent roles, on their smaller model.
2. Cloudflare deploy stays **CI-only, on push to `main`**.
3. **One command** to build and serve the site locally.
4. **One command** for every test, run at the end of every task.
5. **Unit tests on every item**, so the UI cannot break silently.

Plus: build it with React **if there is no counter-argument** — with load time and page weight named as the priority.

## Seven decisions taken before writing, not during

Every one of these changes the *shape* of the backlog rather than an entry's wording, so each was asked rather than assumed.

| Question | Answer | What it changed |
|---|---|---|
| Where is the "presentable localhost" line? | **The whole site, both locales** | Six implementation items before the milestone, not two |
| React? | **Preact via `preact/compat`** | The counter-argument existed and it was the author's own second requirement: React's runtime is ~45KB gz per hydrating page, and the site has ~4 genuinely stateful widgets. Preact ships ~3KB for the same API. `TASK 33` records it as `ADR-007` |
| One local command does what? | **Production build, served locally** | The verified artifact is the one that would ship. `INC-03` was precisely a defect invisible in a dev build |
| What runs at the end of each task? | **The single test command** — unit + design/screenshot | `harness-evaluator` runs once, at the milestone, unless something goes wrong first |
| How are components tested? | **Vitest + Testing Library** | `ADR-006` left that row open by name; its own review trigger contemplates Vitest. `TASK 33` amends it |
| `TASK 27` compares dev/prod/design, and there is no prod | **Build all three**, prod skipped with a declared reason | `TASK 32` is not done until it is switched on and passing |
| `TASK 31` stays before the pages? | **Yes** | It is the input artifact every page item reads |

## Two facts checked against the repo, not assumed (`P-04`)

Both changed what the plan could promise:

- **`implementer` and `test-engineer` already declare `model: sonnet`.** Requirement 1 needed no role change — it needed the *register* to say implementation is delegated, which it did not.
- **`H-05` is rung 1 and cannot be waived in-session.** `delegation-gate.mjs` filters specs with `s.work_item === item`, strict equality on a scalar, so a combined spec covering several items is not merely discouraged — it cannot match. That is **one spec per `feature` item**, eight in this backlog, each with the author's approval in `approved_version`. Stated at the head of the backlog rather than discovered at the first delegation.

## What changed in the register

**The reversal is recorded, not deleted.** The first of `TASK 8`'s four framing decisions — *"Deploy early, iterate in production"* — is struck through in place with the original reasoning intact and the replacement named. A reversed decision with no trace is one the next session re-litigates.

**Three new head sections:** the localhost milestone (a checkable condition, no id, because it has no deliverable); the two commands; and the execution model.

**Two new criteria**, 5 and 6, stated once at the head rather than repeated fourteen times — tests-per-item, and delegation. Criterion 6 was reworded after a self-check: the first draft demanded each item name the files its role owns, which the register cannot do, because the file enumeration belongs in the spec the author approves (`P-08`). A criterion the register itself violates is worse than no criterion.

**`TASK 21` was split rather than edited.** It carried an Astro project *and* a deploy workflow, with a done that needed a remote to exist. One item with two dones is `INC-01`'s exact mechanism. The deploy half is now **`TASK 32`**, and nothing was renumbered (`G-10`).

**`TASK 15` was pulled into a site sequence** it was never part of. The author asked for *one* command covering every test; `ADR-006` names mutation as a sub-gate `gate.mjs` does not run. Leaving it out ships an `npm test` that claims to run all the tests and does not. It runs before any site code lands, so `site/lib/content/**` is covered by the Stryker glob the moment it exists rather than retrofitted.

**`TASK 27`'s third comparison is deferred out loud.** The mechanism is built for three targets; the prod target reports `skipped — no deployed build exists yet (TASK 32)` until the URL exists. Removing the leg would remove `INC-03`'s whole lesson, which is that dev-vs-design alone would have missed it exactly as it was missed then.

**Four stale claims in `TASK 8`'s own closed entry were corrected** (`P-07`), found while editing around it: it said three criteria where there are now six; it credited `TASK 15` with installing Playwright, which is `TASK 27`; it still said *"the backlog itself is still unwritten"* three sentences after *"Closed 2026-08-23, the backlog is written"*; and it pointed at log 16 as "current" with logs 17–19 already on disk.

## The finding this session did not go looking for

`node scripts/gate.mjs` stops at the first failing step. `check-trace` (step 9) has failed on `TASK 12`'s known correlation gap since 2026-08-19 — so **steps 10 through 13 have not run in any gate invocation since.**

Running them by hand found `check-docs` **red behind it**, with three findings that predate this session: `site/src/content.config.ts`, `resources/testimonials.{en,es}.md`. Nobody saw them, because "the gate passes up to the known failure" had been reading as "the gate passes".

That is `INC-08`'s shape in a new place — *a check that exists and does not check* — and it is now **`TASK 34`**, with the fix stated as keeping the loud exit while removing the blindness.

The five unresolved paths (three pre-existing, two added by this change) are handled through `check-docs`'s existing `ignore` list, which is the right mechanism and not a workaround: every entry carries a reason, and **an entry whose target starts resolving is reported as stale**, so the list shrinks on its own as the work lands. A `_forwardLookingPathsNote` records the class — a `TODO` item's Deliverable naming a file that does not exist *yet* — and says plainly why teaching the guard to tell "planned" from "stale" is a work item with its own red-path battery rather than a side edit.

## Verification

```yaml
done:
  docs:       { status: passed, evidence: ["TASKS.md — sequence table replaced (14 items), reversal recorded as superseded, milestone/commands/execution-model sections added, criteria 5 and 6 added; TASK 21 split, TASK 32 and TASK 33 opened, TASK 34 opened; TASK 15/27/30 amended; four stale claims in TASK 8's entry corrected", "no id renumbered, none reused (G-10)"] }
  content:    { status: not_applicable, reason: "nothing in resources/** touched; H-02 holds and no published content changed" }
  gate:       { status: partial, evidence: ["guard tests 378/378 PASS", "check-rules-registry PASS", "check-terms PASS — 33 terms x 226 files", "check-docs PASS — 146 refs resolved, 6 reasoned exemptions (was FAIL with 5 findings, 3 of them pre-existing)", "check-context-budget PASS 274/320", "check-content PASS", "check-evals PASS", "node scripts/gate.mjs FAILS at step 9 check-trace"], reason: "check-trace fails on TASK 12's pre-existing correlation gap, which H-03 forbids any agent from fixing. Steps 10-13 were run individually for this reason — which is itself how TASK 34 was found" }
  tests:      { status: not_applicable, reason: "a register amendment produces work items, not code. The one code-adjacent edit — five ignore entries in guards.config.json — is configuration consumed by an existing tested guard, and the guard's own 378 tests pass against it" }
  scope:      { status: passed, evidence: ["one deliverable: the register describes the real order and the execution model (P-01)", "the two ADRs were deliberately NOT written here — they are TASK 33, so this change stays one deliverable", "no code written, no ADR edited, no git write (H-01)"] }
  loose_ends: { status: passed, evidence: ["the gate's first-failure short-circuit became TASK 34 rather than a paragraph (P-06)", "the ADR-001 component-model question, deferred to TASK 8 and never recorded when TASK 8 closed, became TASK 33", "ADR-006's open component-test row got an owner in the same item", "harness-evaluator's TASK 12 caveat is flagged in the plan rather than left to be discovered at the milestone"] }
  mutation:   { status: not_applicable, reason: "no code in the mutation-covered surface touched" }
  security:   { status: not_applicable, reason: "no boundary changed. Two items keep credentials out of the session by construction (G-08); the guards.config.json edit touches only check-docs's exemption list, not any rung-1 boundary input" }
  iterations: { status: passed, evidence: ["2"] }
```

`iterations: 2` — the first plan was rejected with five added requirements, the second was approved and executed. Both passes were the author adding scope, not a defect being corrected.

## Next

`TASK 31` — reconcile the brief and the three decision docs with the eleven artboards. It is a `content` item, needs no spec, and it is the input artifact every page item below it reads.

Then `TASK 33` (the two ADRs), then `TASK 21` (the first line of code). The author's own part does not arrive until position 11.
