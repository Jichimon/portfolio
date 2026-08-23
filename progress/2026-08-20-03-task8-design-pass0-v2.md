# 2026-08-20 · Session 03 — Design canvas, pass 0 v2 (rejected → rebuilt)

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

Session 02's pass-0 canvas (three typeset variations of a content slice) was rejected by the author: *"un Word que se lee desde el navegador."* The diagnosis wasn't that the three options looked alike — it's that all three solved a reading screen when the ask was a site: no nav, no hero, no motion, no work index. This session rebuilt pass 0 from that correction, plus three rounds of author feedback caught mid-build rather than after publishing:

1. First redesign draft still read `ADR-001`'s zero-JS-by-default as "no motion" — corrected by re-reading the ADR, which explicitly delegates island/interactivity decisions to `TASK 8` and cites View Transitions as "eye-catching motion... no framework required."
2. First draft made dark the *base* theme. The author's actual instruction was "dark mode is not optional" — I'd overcorrected that into "dark is the default," which is a different claim. Corrected: light and dark are both first-class, with a real toggle, neither is the base.
3. The author asked directly how the hero's "seam" concept (legacy ↔ modern) would avoid needing system logos. Answered before building: geometry and behavior (density, rigidity, spacing) carry the metaphor, never iconography — verified as viable by designing three genuinely different geometric executions (a packed wall vs. floating nodes; stacked strata vs. a fault line; a converging bottleneck vs. an open fan) before writing any code.

Canvas republished to the same Artifact URL: https://claude.ai/code/artifact/890abe00-2817-4bc8-bd8c-6fc9dc887f6b — five artboards, all desktop except one: three light-mode home-page directions (**A · Muro y nodos**, **B · Estratos y falla**, **C · Todo pasa por acá**, recommended), a dark-mode instance of C, and a 390px mobile artboard testing the recommended seam rotated to portrait. Every artboard's nav carries a **working** theme toggle (real component state, not just an editor tweak) and real CSS motion — a marquee of the site's actual technology stack in loop, and pulses animating across each seam.

## Decisions

- **The home page gets a full mockup, not a content sample** — nav rail (sized for 7 items so `writing`/`architectures`/`search` slot in later without a redesign), hero, tech marquee, work cards expressing the platform→children hierarchy, employer strip, footer. This is the structural fix for what v1 got wrong; everything else follows from it.
- **The hero is "the seam"** — legacy systems that can't move vs. modern services, told through geometry and behavior, never logos. Chosen because it's the one hero concept that argues the thesis rather than just illustrating it, and because a geometry-only treatment is the thing that survives a light/dark theme switch without a separate redraw — which matters because whichever direction wins becomes `TASK 6`'s diagram visual-language spec, and those 11 diagrams have the same light/dark requirement.
- **Technology marquee, typographic, not logos.** The author asked for a horizontal scroll of technologies and one of "where I've worked or with whom." The second half of that ask runs directly into `C-06` (never name security/identity/fraud vendors) — resolved by splitting it: an **employer** strip (verified public in `experience.en.md`/`about.en.md` — NICE, Banco Solidario S.A., Mamaya Tech, Avícola Sofía) stays, a **vendor** strip does not exist. A logo wall was also an explicit brief anti-goal; the typographic marquee gets the same movement and the author's own stack data without either problem.
- **Employer strip is a static row, not a second marquee** — four items looping reads as filler; four employers naming four legacy systems reads as the thesis restated once, quietly. Flagged in the canvas annotation as a call the author can overturn.
- **`docs/design/claude-design-brief.md` is corrected in the same change**, not left describing v1's rejected framing (`P-07`). The "editorial-technical" section is rewritten to scope typeset rigor to the *reading* screens (case studies, About) and explicitly exclude the home page and chrome from it; dark mode's brief entry moves from "open decision" to "decided, both first-class, real toggle"; the anti-goals list is corrected on logo walls, scroll reveals, and the seam's no-logos rule.
- **A local, editor-free preview (`local-preview.mjs`) ships alongside the Artifact**, because the previous session's Artifact link didn't open for the author (confirmed server-side as real and owned by the account, via `WebFetch` and `action: "list"`, but still unreproducible client-side). Strips the `{{handlebars}}` a plain browser can't resolve and rewires the theme toggle in vanilla JS, so the fallback isn't a static screenshot — the toggle still works.

## Findings from validating against real state (P-04)

- **The employer strip has no confidentiality problem.** Checked `experience.en.md` and `about.en.md` directly rather than assuming: all four employers are already named in published, frozen content. What `C-06` actually forbids is the *other* half of the author's ask — naming vendors worked *with* (security/identity/fraud providers never appear anywhere in `resources/`) — so the strip ships employers only.
- **`ADR-001` does not close the door on motion or interactivity.** Re-read before redesigning rather than trusted from memory: zero-JS is a default, islands are opt-in per component, and the decision explicitly defers "what should be an island" to this task. The first pass-0 rejection traces back to treating an ADR default as a ceiling.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/design/claude-design-brief.md — corrected", "docs/design/canvas/README.md — corrected", "progress/2026-08-20-03-task8-design-pass0-v2.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 195 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap as session 02, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["one deliverable: the rebuilt pass-0 canvas, its source, the corrected brief and README, this log"] }
  loose_ends: { status: passed, evidence: ["direction choice is the explicit next step below, not left as prose"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["2", "v1 rejected outright by the author in the prior session is iteration 1; this session's own redesign went through 2 self-corrections before publish (ADR-001 motion reading, dark-as-base) plus one author question answered before building (the seam's no-logos requirement) — counted as part of this iteration since the author hadn't seen an artifact yet"] }
```

## Open questions

- **Which direction — A, B, C, or a recombination?** Blocks pass 1.
- **Does the employer strip scroll or stay static?** Flagged in the canvas annotation; author's call, not decided here.
- **Did the local preview file actually open this time?** The republished Artifact and the new `local-preview.mjs` fallback are both untested against the author's actual browser — first real signal arrives with their next message.

## Next

1. Author reviews the canvas (or the local preview, if the Artifact link still doesn't resolve) and picks a direction, or asks for a recombination.
2. Record the decision in `docs/design/decisions/` once made (`docs/design/canvas/README.md` names this as the immediate next step).
3. Pass 1: screens 1–4 (home is already built in the winning direction — reuses it directly), `otp-provider-decoupling`, case-studies index, platform anchor page, desktop + mobile, plus a `home.es` stress artboard.

## Files changed

`docs/design/canvas/src/Main.dc.html` — rewritten. Direction A (Muro y nodos), full home page.
`docs/design/canvas/src/DirectionB.dc.html` — rewritten. Direction B (Estratos y falla).
`docs/design/canvas/src/DirectionC.dc.html` — rewritten. Direction C (Todo pasa por acá), recommended.
`docs/design/canvas/src/DirectionCDark.dc.html` — new. C starting in dark, same component.
`docs/design/canvas/src/MobileSeam.dc.html` — new. The recommended seam at 390px.
`docs/design/canvas/src/canvas.json` — rewritten. New layout, new annotations with motivation/cost per direction.
`docs/design/canvas/local-preview.mjs` — new. Editor-free static fallback for when the Artifact link doesn't resolve.
`docs/design/claude-design-brief.md` — corrected. "Visual direction," dark mode, anti-goals, screens inventory brought in line with what was actually approved.
`docs/design/canvas/README.md` — corrected. Dark-mode position reversed to match the real decision; History section added.
`progress/2026-08-20-03-task8-design-pass0-v2.md` — this log.
`TASKS.md` — TASK 8 status line updated.
