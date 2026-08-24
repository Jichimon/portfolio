# 2026-08-23 · Session 22 — TASK 33: the UI component model and the component test tier

**Task:** `TASK 33` — UI component model and component test tier · `research`
**Status after this session:** IN PROGRESS

## What was done

`ADR-007` written and accepted; `ADR-006` amended in place with a dated amendment; the stack-dependent rows in `.claude/rules/30-testing.md` brought in line; `docs/adr/README.md` reconciled with its first level-2 rows since the file was created.

## The finding that shaped the work, found before writing anything (`P-04`)

The register's `TASK 33` entry enumerated three islands — the theme toggle, the scroll-spy rail, and later the contact form's states. **The design specification of record, reconciled the previous day, contradicts two of them.**

| Claim in the register | What the artifacts say |
|---|---|
| The scroll-spy rail is an island | `claude-design-brief.md` §7: *"roughly 30 lines of vanilla JS; a working reference implementation is present in the canvas source"*, and *"with JavaScript disabled the rail is still a working list of links — tracking is the enhancement, never the mechanism."* Confirmed at `Main.dc.html:738` and `CaseStudyDetail.dc.html:477` |
| The theme toggle is an island | The layout-shell item's Done requires it *"must not flash on load — set it before first paint"*, which no hydrating island can do |
| The contact form's states are an island | `mailto:` at launch, by the author's own 2026-08-23 decision; the stateful path belongs to the deferred contact-form Worker item |

Under `ADR-001`'s own carried-forward heuristic — *reserve framework islands for genuinely stateful widgets* — **the island count at the localhost milestone is zero.** That is not a smaller decision than the register described; it is a different one, and it changes what the `ADR-006` amendment can honestly justify. A component tier defended as *"testing Preact islands"* would have tested nothing at the milestone.

## Three decisions taken with the author before writing

| Question | Decision | Why it changed the work |
|---|---|---|
| What does `ADR-007` enumerate? | **Zero framework islands now; Preact declared, installed and proven** | The theme toggle and scroll-spy become `.astro` + `<script>`, matching the design spec and the reference implementation already written. Preact is not re-litigated — it stays the framework for the first genuinely stateful widget |
| What does the component tier test? | **The DOM-requiring behavior modules, plus islands when one exists** | The real gap is not Preact — it is that the scroll-spy's current-section logic and the theme toggle's persistence need a DOM that `node:test` does not provide. The tier has something to test on day one |
| Is the new surface mutation-covered? | **No — one Stryker config stays** | `ADR-006` already confirmed Stryker has no multi-runner support. Covering Vitest costs a second config and a second invocation, the exact cost that ADR priced and declined |

## Decisions

- **`ADR-006` is amended, not superseded, and the amendment says what is actually true about the trigger.** `ADR-006`'s written review trigger is about `site/lib/content/**` needing *Vite*; this amendment is about components needing a *DOM*. Those are adjacent propositions, not the same one. The register's phrasing — *"this is ADR-006's own review trigger firing"* — is not quite right, and the amendment says the accurate thing instead: the trigger set the **policy** (introduce Vitest when the need is real, never preemptively) and the need is now real for a surface `ADR-006` never contemplated. Rejected: quietly writing the register's sentence into the ADR, which would have been the easy and slightly false version.
- **`ADR-001` gets a level-2 row with the verb Extended, not Amended.** It *deferred* the component-model question rather than asserting something now false, so the point stands as written; Extended takes no inline mark and no level-1 status change. The row is what makes the answer findable. Rejected: marking it Amended, which would claim ADR-001 said something wrong.

## Findings from validating against real state (`P-04`)

Beyond the island finding above:

1. **`guards.config.json` carries a forward-looking `check-docs` ignore entry for `docs/adr/ADR-007-ui-component-model.md`**, and the list is self-staling by design — *"an entry whose target starts resolving is reported as stale."* Creating the ADR **breaks `check-docs` until the entry is removed.** Removing it is part of this item, not a follow-up.
2. **`.claude/rules/30-testing.md` is path-scoped and not counted against the context budget** — `check-context-budget` reports it as *"path-scoped, not counted"*, 274/320 without it. The stack-dependent table can grow without pressure.
3. **`T-08` already fixes component-test placement** (colocated with the code; e2e in one dedicated directory). No rule row needed. Recorded so silence does not read as an oversight.
4. **`docs/design/claude-design-brief.md` line 19 already cites `ADR-007`** with a parenthetical saying it is *"not yet written"* — true when written, false the moment this item lands.

## The second `P-04` finding: the register's bundle-size numbers are wrong in both directions

`TASK 33`'s entry justified Preact with *"~3KB instead of ~45KB gz per hydrating page."* Those numbers came out of a planning conversation and had no source. `C-01` forbids publishing an unmeasured number as measured, so the research pass was asked to source them or retire them. **Neither number survived**, and the failure is not a rounding error:

| What was claimed | What the sources say, fetched 2026-08-23 |
|---|---|
| Preact ~3KB gz | Preact's **homepage** says "Fast 3kB alternative to React"; Preact's **own README the same day** says "Fast 4kB alternative". Bundlephobia measures the actual current package at **4,837 B** core-only, **6,199 B** with hooks, and **9,689 B** for the `preact/compat` surface this project actually chose — roughly 3x the claim |
| React ~45KB gz | `react` + `react-dom/client` — the real browser-hydration entry since React 18 — measures **60,329 B** gz. The claim was too *low*. Bundlephobia's 1.4 KB for `react-dom` measures the package's `main` entry, which is not what ships |

**No source anywhere measures the thing the decision actually turns on** — the same widget, built once in each, with its features. Every published figure is a library-size proxy.

So `ADR-007` carries the sourced figures with their disagreement visible, and says plainly that the direction is corroborated by every source while the two specific numbers are not. The alternative — quietly copying the register's sentence into an ADR — is exactly `INC-09`'s shape: a plausible number published as a measured one.

**This also corrects the register.** `TASK 33`'s own entry is amended rather than left standing, because a spec written next month would cite it.

## What the research closed, and what it left open

**Closed, with a source:** `@astrojs/preact` is at `6.0.4` (published 2026-08-19) and enables the compat layer through `preact({ compat: true })`, with one documented caveat — *"the compat option only works for React libraries that export code as ESM."* `@testing-library/preact` `3.2.4`, not `@testing-library/react`, is what Preact's own testing guide installs, and that guide never mentions `compat` as changing the answer. Vitest is at `4.1.11` (2026-08-18) and `getViteConfig()` is Astro's documented way to point it at the project's own settings.

**A real constraint nobody's documentation states, found by comparing two vendors' defaults:** Node's auto-discovery matches `**/*.test.{cjs,mjs,js}` and Vitest's default `include` is `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`. **They overlap.** Neither project's docs discuss the other, so nothing warns you. The amendment therefore decides that **both runners are explicitly scoped and neither uses default discovery** — which is what this repository already does for `node:test` by accident of `ADR-006`'s invocation shape, now made a stated rule rather than a lucky habit.

**Left open, deliberately:** Astro's testing docs are **silent** on `jsdom` vs `happy-dom` vs browser mode, and silent on whether a plain behavior module needs `getViteConfig()` at all. `jsdom` is chosen because Preact's own testing guide names it for non-Jest runners — a sourced reason, not a preference — and the silence is recorded rather than papered over.

## A third finding, from the guard rather than from reading

`check-docs` reads a **backticked bare `host/path` string as a repository path claim.** `ADR-007`'s first draft cited a package manifest as `` `unpkg.com/@astrojs/preact@6.0.4/package.json` `` and the guard reported it as a living document pointing at a file that does not exist. The guard is right and its own test suite says so — *"external links are not path claims"* holds for a **scheme-qualified** URL, and a bare host with slashes is indistinguishable from a path.

The convention this fixes, for every future ADR's Sources section: **cite an external URL in prose or with its scheme, never as a bare backticked path.** Not raised as a work item — the guard already fails loudly and correctly, which is the self-correcting case rather than the silent one, and every existing ADR already writes its sources in prose.

## Verification

| Step | Result |
|---|---|
| guard tests | 378/378 PASS |
| `check-rules-registry` · `check-terms` · `check-templates` · `check-settings` | PASS |
| `check-contracts` · `check-agents` · `check-docs` · `check-context-budget` | PASS |
| `check-content` · `check-procedures` · `check-evals` | PASS |
| `design canvas` (`verify.mjs`) | PASS — 9 properties |
| `node scripts/gate.mjs` | FAILS at step 9, `check-trace` — pre-existing, `TASK 12` owns it, `H-03` blocks every agent from `evidence/` |

**The red-path proof (`P-14`), run by the orchestrator rather than asserted.** The one mechanized change this item makes is the removal of a `check-docs` exemption, and a check only ever seen to pass has not been tested:

```text
BEFORE removing the ignore entry
FAIL  check-docs  1 finding(s)
  the ignore list still exempts `docs/adr/ADR-007-ui-component-model.md`, but it
  resolves now — a stale exemption hides the next time it goes missing
exit=1

AFTER removing it
PASS  check-docs
  50 living document(s), 158 path reference(s) resolved · 5 reasoned exemption(s)
exit=0
```

The self-staling property `guards.config.json` claims for its exemption list is therefore **real and observed**, not merely documented — the first time it has been exercised since it was written.

Two other guard verdicts were the guards working rather than defects: `check-docs` caught the bare-URL citation above, and `check-procedures` caught this log's own `done` block while it was still a placeholder.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/adr/ADR-007-ui-component-model.md — Accepted, 4-part decision, 3 options, 3 review triggers, sources dated 2026-08-23", "docs/adr/ADR-006-testing-toolchain.md — Date line amended, 2 inline markers at the affected paragraphs, dated amendment section with its own sources and triggers", "docs/adr/README.md — ADR-007 level-1 row; ADR-006 to Current-with-amendments; the file's FIRST 2 level-2 rows", ".claude/rules/30-testing.md — component tier row, explicit-scoping row, sub-gate command, surface map, open-not-blank note narrowed"] }
  gate:       { status: partial, evidence: ["11 of 11 guard steps PASS individually", "design canvas PASS", "guard tests 378/378", "node scripts/gate.mjs FAILS at step 9 check-trace"], reason: "check-trace fails on TASK 12's pre-existing correlation gap, which H-03 forbids any agent from fixing. Steps 10-14 were run individually for that reason, per the precedent of the last two sessions" }
  tests:      { status: passed, evidence: ["check-docs proven in RED and in GREEN by the orchestrator: stale exemption -> FAIL + exit 1; entry removed -> PASS + exit 0", "guard suite 378/378 unchanged after the guards.config.json edit", "guards.config.json re-parses as JSON"], reason: "T-01: TDD is not applicable to a research item. The one mechanized change is the removal of a config entry consumed by an existing tested guard, and it was proven in red rather than merely seen to pass (P-14)" }
  content:    { status: passed, evidence: ["check-terms PASS", "nothing in resources/** touched; H-02 holds", "C-01: the register's ~3KB/~45KB figures were sent for sourcing, failed, and are NOT reproduced in ADR-007 — every size figure carries its source and its disagreement"] }
  scope:      { status: passed, evidence: ["one deliverable: two ADRs exist and are indexed, so the specs below cite something real (P-01)", "7 files changed", "no code written, no package.json, no Astro config — those belong to the skeleton item", "no second testing ADR: ADR-006 amended in place per the item's own constraint (G-10)", "no git write (H-01)"] }
  loose_ends: { status: passed, evidence: ["the register's 3 false claims were corrected in TASKS.md, struck through rather than deleted, not left in this log (P-06)", "the missing feature-equivalent bundle measurement is owned by ADR-007's third review trigger rather than orphaned", "the undocumented @testing-library/preact cleanup question is carried as a named caveat in the amendment, to be settled by the skeleton item", "the backticked-bare-URL property needs no work item: the guard already fails loudly, which is the self-correcting case"] }
  mutation:   { status: not_applicable, reason: "no code in the mutation-covered surface touched. The amendment decides this tier stays OUTSIDE that surface, with the reason stated in ADR-006 and in 30-testing.md rather than left blank" }
  security:   { status: not_applicable, reason: "no boundary, guard verdict or permission changed. The one guards.config.json edit removes an exemption, which makes check-docs stricter rather than looser" }
  iterations: { status: passed, evidence: ["2"] }
```

`iterations: 2` — the checkpoint round, where three questions changed what both documents could say, and one verify round where `check-docs` sent two edits back. Neither was a defect in delivered work; the second was a guard doing precisely its job.

## Open questions

None blocking. Two facts nobody's documentation answers are recorded as caveats rather than guessed at: whether a plain behaviour module needs `getViteConfig()` (Astro is silent), and whether `@testing-library/preact` needs a manual cleanup call (neither Preact's guide nor the package README says). The skeleton item settles both by writing the config.

## Next

`TASK 21` — the Astro skeleton and the two root commands. **The first line of code in this repository**, and the first `feature` item, so it is the first that needs a spec the author approves before any write-capable role can be delegated against it (`H-05`). It installs `@astrojs/preact` and proves hydration with a throwaway island, and it installs Vitest and writes the config this session decided the shape of.

## Files changed

`docs/adr/ADR-007-ui-component-model.md` — new; the component model.
`docs/adr/ADR-006-testing-toolchain.md` — dated amendment, two inline markers, the component tier.
`docs/adr/README.md` — ADR-007 indexed; ADR-006 amended; the first level-2 rows.
`.claude/rules/30-testing.md` — the component tier's stack-dependent rows.
`scripts/guards/guards.config.json` — the stale ADR-007 exemption removed.
`docs/design/claude-design-brief.md` — the "not yet written" ADR-007 citation reconciled.
`TASKS.md` — TASK 33 closed; three of its own claims corrected; TASK 23's constraint and criterion 5 aligned.
