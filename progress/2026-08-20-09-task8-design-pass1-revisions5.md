# 2026-08-20 · Session 09 — Pass 1, fifth revision round

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

- **Found the real cause of the hero's hard cutoff, which two prior fade attempts had failed to fix.** `.hero-bg` was positioned with `inset: -10% -4%` — 20% larger than the hero's own box on the vertical axis. Every mask gradient applied to its children used percentages relative to that oversized box, so a "0%–100% vertical fade" was actually landing mostly outside the visible hero viewport, and the visible edge was really the point where a *sized radial ellipse* (`ellipse 70% 90% at 15% 50%`) reached its own alpha floor — a hard edge dressed up as a gradient. Fixed by setting `.hero-bg { inset: 0; }` (removing the oversize entirely) and dropping both radial ellipses in favor of plain two-axis linear-gradient masks (horizontal fade × vertical fade, composited with `intersect`), which are trivial to reason about correctly against a 1:1 box. Applied to both `.strata-bg` and `.nodes-bg`.
- **Hero's bottom-right corner densified further** — three more nodes and eight more connecting lines added across the (650–900, 130–490) region of the 900×560 viewBox, tied into the existing cluster rather than floating free. This is the second densification pass; the first one (session 08) apparently wasn't enough on its own.
- **Dateline regrouped with the thesis instead of floating alone at the top.** It previously sat right under the nav padding with a large empty gap before the thesis line, reading as disconnected. Moved it to sit directly above the thesis as a tight eyebrow + headline pair (`hero-content` now carries the vertical offset via `padding-top: 340px`, replacing the thesis's own `margin-top: 260px`; the dateline's bottom margin dropped from 44px to 18px so the two read as one block).
- **Nav rail wordmark and role enlarged** across all four artboards (`Main`, `CaseStudyDetail`, `CaseStudiesIndex`, `PlatformPage`) — wordmark 19px &rarr; 23px, role caption 12.5px &rarr; 14px.
- **Contact form's About dropdown removed.** The author didn't like the `<select>` UI. The field that was labeled "Subject" (a plain text input) is now labeled "About," and a new "Your email" field was added ahead of it — the form previously had no way for a visitor to leave their own contact info, which is a real functional gap for a contact form, not just a naming one.
- **Three testimonial cards added to the contact section**, filling the large empty column to the right of the form (author referenced an external portfolio's testimonial-card layout: one tall card + two stacked). Built as a two-column grid (`.contact-layout`, `.testimonials`) matching that asymmetric arrangement, styled in the site's own palette (bg-elevated cards, accent quote mark, `--label` for titles) rather than the reference's saturated purple/blue, since a bright unrelated palette would fight `C-15`'s single-thesis consistency.

## Decisions

- **Testimonial content is `[NEEDS INPUT]` throughout, not filled with plausible-sounding text.** The author described three real recommendations (a manager at NICE, a PO at Banco Solidario, another NICE contact) but didn't paste the actual text. Writing invented quotes and attributing them to real named colleagues is a more serious integrity problem than an unmeasured number — it puts words in someone's mouth without their knowledge — so this follows `C-01`'s `[NEEDS INPUT]` convention rather than filling the gap with something plausible. **Needed from the author to close this:** the exact quote text, name, and title/company for each of the three recommendations, ideally copy-pasted directly from LinkedIn.
- **Mask math simplified rather than patched a third time.** Two rounds of "add a vertical fade layer" had silently failed because the underlying box was oversized and the ellipse's own edge was doing the actual cutting. Rather than tuning percentages against that broken foundation again, the fix removed the foundation problem (the oversized box) and the fragile shape (the sized ellipse) at the same time.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-20-09-task8-design-pass1-revisions5.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 205 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["all six of the author's points addressed; testimonial content explicitly marked as needing real input rather than fabricated"] }
  loose_ends: { status: passed, evidence: ["testimonial text/name/title is the one new concrete blocker, called out above and in the reply to the author"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions / follow-ups

- **New this round:** the three testimonial quotes need real text/name/title from the author — the design can't ship with placeholder attribution to real people.
- Carried forward: diagram text legibility in the four inline SVGs; the "Get in touch" invite copy still needs a content-type change to `home.en.md`/`home.es.md` outside this task (`H-02`); contact form backend/submission handling; real vendor/tool logos for the marquee; mobile artboards; `home.es` stress test.

## Next

Author reviews the republished canvas (same URL) and, if the hero fade actually resolved this time, supplies the real testimonial text. Then: mobile for the 4 screens and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/Main.dc.html` — hero-bg box and masks rebuilt (root-caused the fade bug), more nodes/lines added, dateline regrouped with thesis, wordmark/role enlarged, contact section restructured into a two-column layout with a rebuilt form and three testimonial cards, marquee unchanged from session 08.
`docs/design/canvas/src/CaseStudyDetail.dc.html`, `CaseStudiesIndex.dc.html`, `PlatformPage.dc.html` — wordmark/role font sizes enlarged to match.
`progress/2026-08-20-09-task8-design-pass1-revisions5.md` — this log.
