# 2026-08-20 · Session 07 — Pass 1, third revision round

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

The author compared session 06's masthead rework against a screenshot of the original (pre-session-06) masthead layout and preferred the original — a correction to session 06's own read of "popurrí de texto feísimo," which turned out not to be about the masthead's ruled-list layout at all. Three more points followed on the hero and the Home section order.

- **Masthead reverted to the original ruled-list layout**, on both the case study and platform pages. Session 06 had replaced the plain `border-top`/`border-bottom` list with a card (background, border-radius, a separated pink-tinted Outcome block) — the author explicitly preferred the original layout and borders. Reverted the structure and typography back to the single monospace grid with top/bottom rules; **kept** the one thing from session 06 that *was* wanted: the `--label` gold/ochre color on the field labels, in place of the original's low-contrast `--ink-faint`, plus a slightly larger label size (10–10.5px &rarr; 11px) for legibility. The platform page's masthead, which never had rules at all, gained the same border-top/border-bottom treatment for consistency between the two pages.
- **Hero seam line: vertical removed, replaced with a static horizontal line.** The author: "quitá esa línea vertical... no le aporta nada y se ve feo en Home... la línea horizontal me gustaba más... pero sin animación." Session 06's traveling-pulse-on-a-vertical-line treatment is gone. In its place: a single static horizontal accent line across the seam zone, no dots, no travel animation, no drift.
- **Home section order changed**: "Where I've worked" now comes first (right after the hero), then "What I've built," then the technology stack — reordered from hero → stack → work → employers to hero → employers → work → stack.
- **Technology stack marquee restyled as an encapsulated element**, per the author's request to move it away from an edge-to-edge horizontal carousel. It's no longer bound to the section's full width by its own border-top/border-bottom; it now sits inside a bordered, rounded `.marquee-frame` card with real side margins (inherited from the page's normal 72px section padding) and a small "Stack" eyebrow heading matching the other two sections' header style, since it's now a peer section rather than a decorative strip between others.

## Decisions

- **The `--label` color survives from session 06** even though the layout it was introduced alongside got reverted — the author confirmed the color itself, not the card treatment, was the fix that mattered for the illegible-subtitle complaint.
- **The horizontal seam line is fully static** — no keyframe animation at all, matching "pero sin animación" literally rather than reading it as "less animation."

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-20-07-task8-design-pass1-revisions3.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 203 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap (now 5 occurrences, accumulated over this session's length), unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["all four of the author's points addressed directly"] }
  loose_ends: { status: passed, evidence: ["no new open items this round; carries forward the same follow-ups logged in session 06"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions / follow-ups (carried from session 06, unchanged)

- Diagram text legibility in the four inline SVGs — still deferred.
- The reworded "Get in touch" invite copy still lives only in the canvas; landing it in `home.en.md`/`home.es.md` is a content-type change outside this design task (`H-02`).
- Contact form backend/submission handling — still a build-phase decision.
- Real vendor/tool logos for the marquee, mobile artboards, `home.es` stress test — still open.

## Next

Author reviews the republished canvas (same URL). If the masthead, hero and Home ordering land, move to mobile for the 4 screens and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/Main.dc.html` — hero seam line (static, horizontal), Home section order (employers &rarr; work &rarr; marquee), marquee encapsulated in a bordered frame with heading.
`docs/design/canvas/src/CaseStudyDetail.dc.html` — masthead reverted to ruled-list layout with `--label` color.
`docs/design/canvas/src/PlatformPage.dc.html` — masthead reverted to ruled-list layout with `--label` color, gained the border rules the case study page already had.
`progress/2026-08-20-07-task8-design-pass1-revisions3.md` — this log.
