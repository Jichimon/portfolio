# 2026-08-20 · Session 12 — Pass 1, eighth revision round: the bento work grid

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

- **Marquee heading reworded**: `Stack` → `Technologies I've worked with`, matching the more human register the author established with `What I've built`.
- **"What I've built" rebuilt as a bento mosaic**, replacing session 11's editorial index. Chosen by the author from three options presented with ASCII previews (bento / featured-card-plus-list / even 2-column grid).

### The diagnosis that mattered more than the layout

The author's complaint was *"parece un CV... no una página web"* and their proposed fix was cards. Cards alone would not have fixed it, and saying so was the useful part of this round: **below the hero there was not a single image on the page.** Every section was type on a background. A text-only card is still a document; adding borders around paragraphs does not make a page feel designed.

So the real change is that **every project now opens with a small abstract motif** drawn from that project's own architecture, in the hero's established vocabulary — stacked strata for what cannot move, discrete circles for what is new, a channel where the two meet:

| Tile | Motif | What it depicts |
|---|---|---|
| Platform anchor | strata block · channel · connected node graph | the thesis in miniature — the seam itself |
| 01 · merchants delegate collection | one filled node fanning out to four | delegated authority spreading from one holder |
| 02 · 2FA back from a vendor | one block splitting into three, one detaching on a dashed line | decomposition, with the vendor leaving the critical path |
| 03 · payment data migration | stack of records → arrow → stack of records | the migration, with the destination drawn in outline |
| standalone · attendance platform | four lanes converging into one module | multiple tenants onto one modular monolith |

These are geometry, not iconography — **no vendor marks, no stock imagery** (`C-06`, and the same constraint the hero direction was built under). They also feed forward: `TASK 6` owes eleven hand-authored diagram assets, and this establishes the visual language they inherit rather than inventing a second one later.

### Layout

Three-column grid. The anchor spans two columns and gets the larger motif and a 30px display figure for `100,000s`; `01` and `02` take single columns; `03` spans two; the standalone case study is a full-width horizontal tile with its motif beside the text rather than above it. **Tile size carries the hierarchy**, which is what removes the need for session 11's indentation and numbering scaffolding and for pass-1's bordered `.children-row` bracket — the anchor is simply bigger, so it reads as the anchor.

All `.entry` / `.work-index` / `.dives` / `.entry-meta` CSS from session 11 is gone; nothing dead was left behind (verified by grep, not assumed).

## Decisions

- **Asked rather than built three variants.** Three prior rounds ended in a redirect after a full build-and-publish cycle. A layout direction is expensive to build and cheap to describe, so this round put three ASCII previews in front of the author first and built one. Recorded because the reflex to just build is the more expensive one here.
- **The motif is the fix; the layout is second.** Stated to the author explicitly rather than silently shipping cards and hoping the complaint went away — if cards had been the whole answer, the same complaint would have returned in a ninth round.
- **Section borders stay off.** The author removed `border-top` from `.marquee`, `.employers` and `.contact` in session 11; the bento tiles carry their own borders, which is a different thing from a section rule and does not contradict that edit.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-20-12-task8-design-pass1-revisions8.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 208 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["both of the author's points addressed; the layout direction was confirmed with the author before building rather than after"] }
  loose_ends: { status: passed, evidence: ["no new open items; the motifs are noted above as the input TASK 6's diagram language should inherit"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions / follow-ups

- **Testimonial text/name/title still needed** for the three LinkedIn recommendation cards — still `[NEEDS INPUT]`, and still the one item that cannot be invented.
- **The motifs are a first pass and are not yet author-reviewed at real size** — expect tuning, the same way the hero took several rounds.
- Carried forward: diagram text legibility in the four inline SVGs; the "Get in touch" invite copy needs a content-type change to `home.en.md`/`home.es.md` outside this task (`H-02`); contact form backend; real vendor/tool logos for the marquee; mobile artboards; `home.es` stress test.

## Next

Author reviews the bento grid and the motifs. Then: mobile for the 4 screens and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/Main.dc.html` — marquee heading reworded; work section rebuilt as a bento mosaic with five inline SVG motifs, replacing the editorial-index CSS and markup wholesale.
`progress/2026-08-20-12-task8-design-pass1-revisions8.md` — this log.
