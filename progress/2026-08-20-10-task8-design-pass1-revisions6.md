# 2026-08-20 · Session 10 — Pass 1, sixth revision round

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

- **Location/timezone moved from the hero to the nav rail.** The author noticed the hero's dateline (`Senior Software Engineer · Cochabamba, Bolivia (GMT-4, full overlap with US business hours)`) duplicated information already sitting in the left rail (name + role), and asked for the location/timezone half to move there instead — under the wordmark and role, as a third line. Added `.location` (11.5px mono, `--ink-faint`) to the rail across all four artboards (`Main`, `CaseStudyDetail`, `CaseStudiesIndex`, `PlatformPage`), and removed the dateline paragraph and its CSS rule from the hero entirely, since with the location now in the rail, nothing in it was still unique to the hero.
- **More density added to the hero's lower-middle-right region.** The author circled a specific still-empty pocket (roughly the area below the existing node cluster and right of the thesis text). Two previous densification passes had filled the upper-right and far-right zones but left a gap around x=550–860, y=380–430 in the 900&times;560 viewBox. Added two more nodes there with six connecting lines tying them into the existing cluster (not floating free), placed inside the mask's fully-opaque band rather than near the fade edge, so they actually read as solid rather than washing out.

## Decisions

- **No new open questions this round** — both points were direct instructions with a clear single interpretation, unlike some earlier rounds' ambiguous phrasing.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-20-10-task8-design-pass1-revisions6.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 206 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["both of the author's points addressed directly"] }
  loose_ends: { status: passed, evidence: ["no new open items; carries forward the same follow-ups logged in sessions 08-09"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions / follow-ups (carried from sessions 08-09, unchanged)

- **Testimonial text/name/title still needed from the author** for the three LinkedIn recommendation cards — currently `[NEEDS INPUT]` placeholders.
- Diagram text legibility in the four inline SVGs.
- "Get in touch" invite copy still needs a content-type change to `home.en.md`/`home.es.md` outside this design task (`H-02`).
- Contact form backend/submission handling.
- Real vendor/tool logos for the marquee, mobile artboards, `home.es` stress test.

## Next

Author reviews the republished canvas (same URL). If the hero and rail land, and the real testimonial text arrives, this pass is close to settled — then mobile for the 4 screens and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/Main.dc.html` — dateline removed from hero, more nodes/lines added to the lower-middle-right region.
`docs/design/canvas/src/CaseStudyDetail.dc.html`, `CaseStudiesIndex.dc.html`, `PlatformPage.dc.html` — `.location` line added to the nav rail.
`progress/2026-08-20-10-task8-design-pass1-revisions6.md` — this log.
