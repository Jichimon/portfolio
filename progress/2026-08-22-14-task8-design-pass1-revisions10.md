# 2026-08-22 · Session 14 — Pass 1, tenth revision round: the rail becomes real navigation

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## The one that was a defect, not a preference

The author flagged a white band to the right of every page at large window sizes and hedged — *"capaz es solo limitación de la herramienta"*. It was not. `.board` carried `width: 1440px`, a fixed slab, on all seven artboards. The canvas declares `expand: "fill"` for these frames, which resizes the frame to the window; the board stayed 1440px and the host's own background showed beside it.

Fixed at the root: `width: 100%; min-width: 1024px`. `main` also picked up `max-width: 1176px; margin-inline: auto` so a very wide window centres the column rather than stranding it against the rail with a void beside it — 1176px is exactly what main occupied in the 1440px design, so the proportions are unchanged at the design width.

Recorded because the author gave the tool the benefit of the doubt and the tool did not deserve it. The three superseded direction boards keep their fixed width; they are history, not maintained.

## The rail is now navigation, not a picture of navigation

Three separate things the author asked for, built rather than declared:

**Every live nav item is a real link with a real href.** `<li>Work</li>` became `<li><a href="/case-studies">`. The routes are now declared in the markup — `/`, `/case-studies`, `/about`, `/experience`, `/contact` — so the implementation task inherits them instead of inferring them from a caption. The three `soon` items stay non-links, because a link to a page that does not exist is worse than a label that says it does not exist yet. The wordmark is the way home. Hover extends the indicator and lifts the label to full ink; `:focus-visible` draws an accent outline, so the rail is keyboard-navigable and visibly so.

**Every page's rail now carries an on-this-page list, home included.** The rule is uniform and worth stating once: **site nav is routes, the TOC is in-page anchors.** Home's four sections (`#employers`, `#work`, `#stack`, `#contact`) got ids and a TOC of their own, so the answer to *"where am I"* is the same component on every screen.

**Scroll-spy is wired, not mocked.** A small vanilla-JS block per board tracks which section is in view and moves the `.here` class — and therefore the accent segment — as you scroll. It is deliberately the shape the real island takes under `ADR-001` (no framework, one behaviour, progressive), not a mockup trick. It scopes itself with `document.currentScript.closest(".board")`, so the local preview — which puts all eight artboards in one document — does not cross-wire them, and it finds its own scroll container rather than assuming the window. If `currentScript` is unavailable it bails and the rail degrades to a static list.

`scroll-behavior: smooth` and `scroll-margin-top: 32px` on every `[id]`, so a TOC click lands the heading below the top edge instead of flush against it.

## Every remaining placeholder link got its real destination

While making the nav real, `href="#"` stopped being defensible anywhere on the four pass-1 screens. All of them now point somewhere:

- the five case-study cards and the three deep-dive cards → `/case-studies/<slug>`, using the real slugs from `resources/case-studies/`
- the back link → `/case-studies`
- GitHub, LinkedIn and Email → the real destinations already published in `resources/site/contact.en.md`, not invented ones

`grep -c 'href="#"'` returns 0 on all four boards.

## A defect the verification found

The four employer cards on the home page linked to `#experience` — an in-page anchor to a section that does not exist on the home page, so the click did nothing. It predates this round and had survived every visual review, because a dead anchor looks exactly like a live one.

It surfaced because the check was written as a property rather than a walkthrough: parse the generated preview, collect every `id`, collect every `href="#…"`, and assert the difference is empty (`P-13`). Four dangling anchors, all `#experience`, repointed to the `/experience` route. Re-run: **18 in-page anchors, 0 dangling, 0 duplicate ids.**

That assertion is the honest limit of what was verified. It proves the wiring — anchors resolve, ids are unique per board, one scroll-spy per TOC, no fixed-width slab left — but **no browser was run**, so the scroll-spy's behaviour on real scroll is reasoned about, not observed. The author's eye is still the test for that.

## Decisions

- **Home gets a TOC.** The alternative was leaving the home rail static and only giving articles a position indicator, which would have made the rail mean two different things on two pages. One rule, four screens.
- **No nav item is `active` on home.** Home is reached through the wordmark and has no nav entry of its own; marking `Work` active there — as the previous version did — claimed a page the visitor is not on. The TOC carries the position instead.
- **`soon` items are not links.** They are labels with a `soon` tag and `cursor: default`.
- **Scroll-spy as JS, not CSS.** `timeline-scope` plus `view-timeline-name` could drive this in pure CSS, and it was considered. It is Chromium-only today, and — more to the point — it could not be verified here without a browser, whereas the JS version is the same code the real site ships and fails safe.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-22-14-task8-design-pass1-revisions10.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 210 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  tests:      { status: passed, evidence: ["anchor/id integrity assertion over the generated preview — 18 in-page anchors, 0 dangling, 0 duplicate ids, 3 scroll-spy blocks for 3 TOCs, 0 fixed-width boards among the pass-1 four"] }
  scope:      { status: passed, evidence: ["all three of the author's points built rather than declared; the white band was root-caused rather than attributed to the tool"] }
  loose_ends: { status: passed, evidence: ["the pre-existing #experience dead anchor was found and fixed in the same change rather than logged for later"] }
  mutation:   { status: not_applicable, reason: "no mutation-covered surface touched" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions / follow-ups

- **The scroll-spy is unobserved.** The wiring is asserted; the behaviour is not. If it does not track on the published canvas, the likely cause is the Design runtime not executing a raw `<script>` inside `<x-dc>` — the local preview is the reliable place to judge it either way.
- **The rail's vertical budget** is now full on `PlatformPage` (7 nav items + 8 TOC entries). `overflow-y: auto` catches it; a longer article will scroll the rail.
- **The routes declared here are a proposal**, not a decided URL scheme. `/case-studies/<slug>` matches the existing content layout, but nothing has ratified it — worth confirming in the implementation item, which now has something concrete to confirm rather than a blank.
- Carried forward: diagram text legibility; the "Get in touch" copy change (`H-02`); contact form backend; real logos for the marquee; mobile artboards; `home.es` stress test; `TASK 19`'s testimonial text; motifs unreviewed at real size.

## Next

Author reviews the interactivity and the wide-window fix. Then: mobile for the 4 screens and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/Main.dc.html` — fluid board, centred main, nav as links, section ids, on-this-page TOC, scroll-spy, employer links repointed to `/experience`, real social/case-study routes.
`docs/design/canvas/src/CaseStudyDetail.dc.html`, `PlatformPage.dc.html` — same, plus heading ids and TOC entries as anchors.
`docs/design/canvas/src/CaseStudiesIndex.dc.html` — fluid board, centred main, nav as links, real card and social routes.
`docs/design/canvas/local-preview.mjs` — namespaces ids and in-page anchors per board, so the eight artboards sharing one preview document stop colliding on `#context`.
`progress/2026-08-22-14-task8-design-pass1-revisions10.md` — this log.
