# 2026-08-20 · Session 04 — Design canvas, pass 1 (screens 1–4, desktop)

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

The author reviewed pass 0 v2's three directions and picked **A**, amended: swap A's packed-block wall for **B's stacked-strata texture** on the legacy side, rendered as a **blurred atmospheric background** behind the hero copy instead of a foreground diagram — the author's own framing: "que quede de fondo, difuminado." Recorded as a decision before building anything, in `docs/design/decisions/2026-08-20-hero-direction.md`, per the author's explicit instruction to not let this decision live only in chat.

Built pass 1: the four real screens the brief lists first, desktop only (mobile and the `home.es` stress test are explicitly deferred, not silently dropped — see "Next"). Canvas republished to the same Artifact, now organized into two pages: **Screens** (this pass, current) and **Directions** (pass 0's three explorations, kept for history, clearly marked not-current).

- **Home** — `Main.dc.html` rebuilt with the accepted hero: two CSS layers (`filter: blur(26px)` strata on the legacy side, a lighter `blur(1.5px)` node network on the modern side, masked to fade toward the seam) sitting behind the hero copy at `z-index: 0`, plus soft pulsing glow blobs replacing the earlier hard traveling dots at the author's request ("no sé si me gusta o no la animación de los puntitos").
- **Case study detail** — `otp-provider-decoupling`, the full ~1,300-word content verbatim, the masthead metadata block with the long honest `outcome` unmodified, the numbered compute-decision list, the pull quote ("That threshold is reusable. A recommendation is not."), the before/after C4 diagram pair (same layout, same labels, so they read as a pair even where the prose puts them apart), the breakeven comparison rendered as a real table (its source `.mmd` is `type: table`, not a flowchart — matched, not forced into a flowchart shape), and the "What I would do differently" block with visual weight (accent-tinted panel).
- **Case studies index** — `/case-studies`, built from scratch as the brief specified, all 5 real items in the author's stated priority order, the platform card visually anchored above its three children (connected by an indent + rule), the fifth item (`multi-tenant-biometric-attendance`) separated under an explicit "not part of the platform" label.
- **Platform anchor page** — `mobile-banking-platform`, deliberately distinct from the case-study template per the brief: a `scale` stat in the header instead of an `outcome` metric (the frontmatter genuinely has one and not the other), a 2-column services grid instead of a bullet list, and "Deep dives" styled as the same card language its 3 children use elsewhere on the site — visually reinforcing the parent relationship rather than just naming it.

## Decisions

- **Desktop only this round.** Four complete desktop screens over eight half-built ones — `P-09`'s "an agent cut off mid-run delivers zero, not half" applies to scope cut mid-build, not only to turn budgets. Stated to the author as the plan for this round rather than silently narrowed.
- **The before/after diagram pair reads as a pair through shared layout, not literal adjacency.** The brief requires `otp-c4-before`/`otp-c4-after` to "read side by side." This build places each where the prose calls for it (Problem section / Decomposition section) and makes them read as a pair by giving them identical node layout and labeling, rather than breaking the narrative to force literal adjacency. Flagged as an open question in the canvas annotation — if literal side-by-side matters more than narrative flow, that's the same question `TASK 6` will face for the real 11 diagram assets, and worth settling once, not twice.
- **`otp-breakeven` is a table, not a redrawn flowchart.** Checked its `.mmd` source before designing it (`type: table`, `block-beta` layout, not `flowchart`) rather than assuming every diagram gets the same node-and-line treatment as the others — it's rendered as an actual comparison table matching what the source data is.

## Findings from validating against real state (P-04)

- **`mobile-banking-platform`'s frontmatter has `scale` and no `outcome`** — confirmed by reading the file, not assumed from the earlier session's frontmatter table. This is what motivated the header's distinct treatment (a scale stat, not an outcome metric) rather than an arbitrary design choice.
- **`otp-breakeven.mmd` is a `block-beta` comparison grid, not a `flowchart`** — read before designing its figure. Building it as another node-and-line diagram would have misrepresented what the content actually is.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/design/decisions/2026-08-20-hero-direction.md", "docs/design/canvas/README.md — updated", "progress/2026-08-20-04-task8-design-pass1.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 200 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap as sessions 02/03, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["one deliverable: the 4 pass-1 screens, desktop, plus the decision doc and updated README/log — mobile and es explicitly out of scope this round, not silently dropped"] }
  loose_ends: { status: passed, evidence: ["mobile + home.es + pass 2 named explicitly in Next, not left as prose in a chat message"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1", "content and diagram sources were read and verified before designing each figure (P-04), so no rework was needed within this session"] }
```

## Open questions

- **Literal side-by-side for the before/after diagram pair** — see Decisions above. Deferred to `TASK 6`, flagged on the canvas.
- **Should the rejected `DirectionB`/`DirectionC`/`DirectionCDark`/`MobileSeam` artboards stay on the canvas's history page, or get deleted from `src/`?** Kept for now (README's "Once a direction is accepted" step 1 allows either); no cost to keeping them beyond canvas size.

## Next

1. **Mobile** for these 4 screens, against the *accepted* hero — the existing `MobileSeam.dc.html` tested Direction C's seam, which wasn't the one accepted, so it needs a fresh build, not reuse.
2. **`home.es`** as the Spanish-length stress test.
3. **Pass 2**: About, Experience, Contact, system states, component sheet.

## Files changed

`docs/design/decisions/2026-08-20-hero-direction.md` — new. The accepted direction, why, what carries forward, what's still open.
`docs/design/canvas/src/Main.dc.html` — hero rebuilt: blurred strata + node layers behind the copy, soft glow pulses replacing hard dots.
`docs/design/canvas/src/CaseStudyDetail.dc.html` — new. Full `otp-provider-decoupling` case study.
`docs/design/canvas/src/CaseStudiesIndex.dc.html` — new. `/case-studies`, 5 items, hierarchy expressed.
`docs/design/canvas/src/PlatformPage.dc.html` — new. `mobile-banking-platform`, distinct treatment.
`docs/design/canvas/src/canvas.json` — reorganized into `screens`/`directions` pages, new annotations.
`docs/design/canvas/local-preview.mjs` — board list updated for the 8 current artboards.
`docs/design/canvas/README.md` — rewritten for pass-1 status, layout, and history.
`progress/2026-08-20-04-task8-design-pass1.md` — this log.
`TASKS.md` — TASK 8 status line updated.
