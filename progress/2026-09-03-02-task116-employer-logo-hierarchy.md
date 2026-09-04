# 2026-09-03 · Session 02 — TASK 116, the employer card's logo becomes the dominant element

**Task:** TASK 116 — Employer strip: the logo becomes the dominant element
**Status after this session:** DONE — `node scripts/gate.mjs --profile full` GATE PASSED, 22/22, mutation 80.18 against a 79.0 floor. Verified against the built screenshots, which is where both of this item's real defects were found.

## What was done

The employer card's hierarchy is inverted: the logo leads and the company name captions it. Final numbers, after one correction round described below:

- **`EmployerCard.astro`** — `.employer-card__logo` is now a **fixed-height, flexible-width** box: `height: 48px; max-width: 100%`, `inline-flex`, margin-bottom 14→16px. `.employer-card__logo-img` is `height: 100%; width: auto; max-width: 100%; object-fit: contain`. `.employer-card__name` became the caption default (700/21px → 600/13px, line-height 1.25→1.3, letter-spacing -0.008em → normal, because display tracking reads cramped at caption size). A new `.employer-card__name--standalone` restores the pre-caption 700/21px treatment and is wired with `class:list={{ 'employer-card__name--standalone': !hasLogo }}` onto the existing `hasLogo` conditional, which was left untouched. `.employer-card__period` unchanged.
- **All three artboards** — `.logo-slot` and `.employer-name` updated identically, and the reasoning comment above `.logo-slot` rewritten to describe the inverted hierarchy and the height-normalized box rather than a square that no longer exists. `HomeMobile.dc.html` and `HomeES.dc.html` are derived from `Main.dc.html`, so the three hand-edits had to stay byte-identical in the shared `<style>` text; `node docs/design/canvas/derive.mjs --check` and `verify.mjs` both confirm they did.
- **`home.smoke.spec.ts`** — `EMP-004` (rendered logo-box vs name font-size, both locales; no horizontal overflow at 390/1024/1440px) and `EMP-005` (two groups, `test.skip()`-guarded with a stated reason).

## Findings from validating against real state (P-04)

- **The hierarchy the author flagged is the artboard's, not an implementation error.** `TASK 115` matched `Main.dc.html:293-309` exactly; the design itself specifies a 32px slot under a 21px/700 name. That reframes the item from bugfix to design change, and is the whole reason the artboards move with the component.
- **A fixed *square* slot does not produce a common optical baseline — it produces a common bounding box, which is not the same thing, and the difference was visible.** The first implementation used 72×72 with `object-fit: contain`, faithfully following the artboard's existing shape. Because `contain` scales each mark to its own limiting dimension, rendered cap heights came out `avicola-sofia` 50px, `banco-solidario` 40px, `nice` 40px, `mamaya-tech` **20px** — a 2.5× spread, with Mamaya reading as a runt beside Sofía. Measured from the four `viewBox` ratios (1.44, 1.78, 1.80 and 3.58:1), not judged by eye alone. The artboard's own comment claims the fixed box exists so that "a row of logos at their natural sizes has no optical baseline" is solved; a square box does not solve it. Corrected by normalizing **height** and letting width fall out, with `max-width: 100%` so the widest mark cannot overflow the narrowest four-column card at the 1180px breakpoint.
- **Found by looking at the built screenshot, not by any test — the third time in a row on this surface.** `EMP-004`'s e2e assertions all passed against the square slot: the logo box *was* larger than the name's font size, and nothing overflowed. "These four marks read as comparably weighted" is not a proposition the DOM can answer, which is why the spec declared it a coverage gap rather than pretending to cover it. A declared gap still needs someone to look.
- **Both logo asset defects were diagnosed on rendered output.** Mamaya Tech's traced orange layer was a full-bleed rect with the letters punched out as `evenodd` holes and a cream fill trimmed ~1.5 units inside them, so the *page* background showed through the gap — a dark outline on every letter against the dark theme, invisible against the light one. Banco Solidario's white fringe was **opaque** near-white rather than semi-transparent, measured at 469 opaque against 524 partial-alpha pixels, which is why an un-premultiply pass could not reach it and no threshold separates it from the mark's own light regions. Its embedded raster was also 249×137, adequate at 32px and not at the new size.
- **Both corrected assets were applied by the author before implementation started** (`H-02`), verified by hash rather than by listing the directory: `mamaya-tech.svg` at 8,865 bytes against 17,973, and `banco-solidario.svg` re-extracted from a 1132×615 source at 36,760 against 70,259 — half the weight at 4.5× the source resolution. Confirmed clean at the new size in both themes on the final screenshots: no outline, no fringe, no softness.

## Decisions

- **The artboards are part of the deliverable, not documentation of it.** Changing only the component would make the design-fidelity diff report the intended correction as drift, which is why `EMP-006` is `critical` rather than housekeeping.
- **`tdd: not_applicable`, declared with its reason** rather than left silent (`P-03`). Every behavior lands in presentation or in an asset file; nothing under `site/lib/**` changed, so nothing entered the surface `D3` scoped mutation and TDD to. The `EMP-005` fallback **is** real behavior and carries e2e coverage; what differs is the instrument, not the rigor.
- **Card ordering stays reverse-chronological.** The strip carries no axis, connecting rule or direction marker, so nothing in the layout says time flows left to right — absent that grammar it reads as a credential list, where reverse-chronological is the convention, and `/experience` already orders the same four facts newest-first. The trigger that would re-open it is an explicit timeline treatment, named in the spec so it is re-decided deliberately rather than rediscovered.
- **`EMP-005`'s two e2e tests are written and `test.skip()`-guarded with a stated reason**, rather than either omitted or left to pass vacuously. No role in real content declares zero logos and `resources/**` is not writable by the implementer, so the branch is unreachable from a real build. A skipped test carrying its reason becomes live the day a role ships without a mark; a test that passes with the branch removed never would.

## Open

- **Two gate flakes this session, same shape, cause unconfirmed.** A `guard tests` step failed once at 26.1s and passed on the next two runs (1138/1138 in isolation); a `component tests` step failed once with all three `src/behaviour/` suites erroring at module load (`Cannot read properties of undefined (reading 'config')`) and passed on re-run (28/28 in isolation), with `git status` showing no change to `src/behaviour/**`, the Vitest config, the Astro config or any package file. Both occurred while a second gate run was active or had just finished on the same machine — concurrent runs share `node_modules/.vite`, `.astro`, `dist/` and Playwright's preview server, which is a real resource collision and the best candidate cause. Recorded as a finding with a hypothesis rather than as "sometimes flaky" (`T-06`); a finding with no candidate cause is the one nobody investigates.
- **Numbers chosen beyond the spec's targets**, recorded here rather than only in code comments: slot height 48px (the brief's starting point, kept after the screenshots), margin-bottom 16px, name letter-spacing normal, line-height 1.3. All judged against produced screenshots; none is a fact a test could check.
- Carried from `TASK 115`, unchanged and still outside this item's surface: the stray literal `</content>` tag closing `EmploymentEntry.astro` and `EmploymentRecord.astro`, and two mutation survivors in `buildCaseStudyRow`.

## Corrections to this log's own earlier revision

An earlier revision of this file, written mid-session, attributed a failing `guard tests` step to this log's own empty `done:` block. That is false: `guard tests` runs `node --test "scripts/guards/**/*.test.mjs"` and has no relationship to a progress log. `check-procedures` is the step that reads `done:` blocks, and it did fail for that reason. The two were collapsed into one explanation; only one of them was real. Corrected rather than quietly deleted, because a wrong cause in a log is worse than no cause — the next reader would stop looking.

## Done

```yaml
done:
  scope:      { status: passed, evidence: ["docs/specs/SPEC-TASK-116-employer-logo-hierarchy.spec.md — approved_version 1.0, matches version 1.0"] }
  content:    { status: not_applicable, reason: "no resources/** file written this item (H-02); EMP-007's asset half was applied by the author before implementation started, verified by hash" }
  tests:      { status: passed, evidence: ["node scripts/gate.mjs --profile full — e2e smoke PASS, EMP-004 green, EMP-005 skip-guarded with stated reason", "npx vitest run — 3 files, 28 tests passed"] }
  mutation:   { status: passed, evidence: ["stryker 80.18 vs break threshold 79.0 — incremental run reporting 0 changed files, correct for an item that touched nothing under site/lib/"] }
  build:      { status: passed, evidence: ["npx astro check — 0 errors, 0 warnings", "e2e visual capture PASS — site/screenshots/home.{en,es}.{390,1024,1440}.{light,dark}.png regenerated and reviewed this session"] }
  visual:     { status: partial, evidence: ["home.en.1440.{light,dark}.png — four marks share a 48px cap height, none shows outline/fringe, NICE swaps to its dark variant", "home.es.390.dark.png — single column, no overflow"], reason: "Both widths checked sit outside the band where the shared cap height fails. An adversarial audit measured the real build at eleven widths and found the four-column grid runs down to 1181px, where Mamaya Tech letterboxes to 38.7px against the others' 48px — 1280px viewports sit inside that band at 45.7px. Recorded as a stated residual in the spec's Drift log; the capture matrix is 390/1024/1440 and never photographs it" }
  docs:       { status: passed, evidence: ["docs/specs/SPEC-TASK-116-employer-logo-hierarchy.spec.md — Traceability implemented, Drift log carries the optical-baseline correction and the EMP-005 gap"] }
  ci:         { status: not_applicable, reason: "H-01 — no git write available; nothing pushed this session for CI to evaluate" }
  security:   { status: not_applicable, reason: "presentation-only change to a public page — no new input, secret, endpoint or dependency" }
  loose_ends: { status: partial, reason: "two gate flakes with an unconfirmed cause, and two pre-existing TASK 115 items, all recorded in Open" }
  scope_gate: { status: partial, reason: "`git status --short` cannot answer this: nothing for TASK 115, 116 or 117 is committed (HEAD is 8b4d2ce), so it returns the union of all three items and cannot isolate this one's. Caught by an adversarial audit, not by the gate. What is verified: no Write or Edit tool request naming resources/ appears in this session's trace, so H-02 held" }
  iterations:      { status: passed, evidence: ["8"] }
  iteration_split: { status: passed, evidence: ["spec=1", "checkpoint=1", "slice=2", "verify=3", "reconcile=1"] }
```

## Next

Nothing for this item. `TASK 117` — the employer cards' deep links to their own role on `/experience` — is the next one on this surface and was deliberately held until this closed, because both items write `EmployerCard.astro` and `home.smoke.spec.ts` and two write-capable actors on one object is what `G-12` forbids.

## Files changed

`TASKS.md` — `TASK 116` opened, then closed.
`docs/specs/SPEC-TASK-116-employer-logo-hierarchy.spec.md` — written, approved at 1.0, Traceability and Drift log closed.
`progress/2026-09-03-02-task116-employer-logo-hierarchy.md` — this log.
`site/src/components/home/employers/EmployerCard.astro` — height-normalized logo slot, caption name, `--standalone` fallback modifier.
`site/tests/e2e/home.smoke.spec.ts` — `EMP-004` and `EMP-005` assertions.
`docs/design/canvas/src/Main.dc.html`, `HomeMobile.dc.html`, `HomeES.dc.html` — `.logo-slot` / `.employer-name` and the reasoning comment, identically in all three.
