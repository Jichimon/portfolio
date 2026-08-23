# 2026-08-20 · Session 11 — Pass 1, seventh revision round

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## Finding: the author's canvas edits never reached the published artifact

The author opened this round with *"como verás en el artefacto... le he quitado la línea de margen a varios bloques en el home"* — describing edits they had made in the canvas editor. Before touching anything, this session pulled the published artifact back (`WebFetch` → `seed-canvas.mjs --extract`) specifically to avoid overwriting them, then diffed the extracted artboards against `docs/design/canvas/build/src/` (the exact bytes session 10 published, with font blobs normalized out of the comparison).

**All four screens were byte-identical.** The edits stayed local in the editor and were never saved, so there was nothing to preserve — and equally, nothing this session could see. Reported to the author plainly rather than inferring what the changes might have been (`P-11`: the artifact is the evidence, not the description of it). Because the author's stated preference was clear regardless — the borderless treatment reads tidier — the border removal was applied in source instead, folded into the "What I've built" redesign they asked for in the same message.

The extract-before-edit step was still the right move: it was the only way to establish the fact, and had the edits been saved, editing straight from local source would have silently destroyed them.

### Correction, same day — the edits were saved shortly afterwards

After this session republished, an `artifact-changed` notification reported the canvas had been republished from another session (version `1787363638-bf86`). Re-fetched and re-extracted; this time the author's edits **were** present. So the finding above was accurate when made but is no longer the current state, and the paragraph is kept rather than rewritten so the sequence stays legible.

The actual edits, isolated by a semantic diff (normalizing HTML entities, self-closing-tag serialization and inline-style-vs-CSS representation — the editor's DOM round-trip rewrites all three, which buries a three-line change in a ~200-line raw diff):

- `border-top` removed from three home sections — `.marquee`, `.employers`, `.contact` — applied in the editor as `style="border-style: none"` on each `<section>`.

Folded into `src/Main.dc.html` by deleting the `border-top` declarations from those three CSS rules rather than carrying the inline overrides, which are an editor artifact. `footer` and `.contact-footer` keep their rules: the author removed exactly three, and extrapolating to a fourth would be inventing a preference they did not express.

`canvas.json` needed no repair. The raw diff appeared to show the `pages` array lost, but it had only moved to the end of the object — a key-order change from the editor's re-serialization, not a deletion. One genuine change was left alone as incidental editor bookkeeping rather than a design decision: `launch` had flipped from `{"view":"canvas","page":"screens"}` to `{"view":"focused","file":"Main.dc.html"}`, recording where the author's viewport happened to be at save time. Source keeps the canvas view, since it is the one that shows all four screens to a reviewer.

**Method note for future rounds:** a raw diff against an editor-saved canvas is close to unreadable. Normalize entities, tag serialization and inline styles first, or a real three-line edit hides inside serialization noise.

## What was done

- **"What I've built" rebuilt as an editorial index.** The author asked for a redesign and for a reference to work from. Diagnosis: the card boxes were carrying two jobs at once — separating entries *and* expressing the platform → deep-dives nesting (via a bordered, indented `.children-row`) — and neither read well, which is what made the section feel boxy rather than composed. New structure: hairline rules separate entries; **indent + numbering** (`01`/`02`/`03`) express nesting. Each entry is a two-column row — title/description on the left, metadata right-aligned in a fixed 230px column — so role, outcome and year line up down the page instead of trailing each title at different lengths. The platform anchor keeps the same grammar but takes more weight (30px Space Grotesk, its `100,000s` scale figure promoted to a display number in accent). Hover moves the title to accent rather than lighting a box. All `.card` / `.card-anchor` / `.children-row` / `.standalone` CSS is gone.
- **Hero seam marker removed for the third time — and not replaced with a fourth marker.** Three attempts at drawing the seam have now been rejected (blurred glow blobs, a vertical line with traveling pulses, a static horizontal line). The pattern is the finding: any *drawn* marker reads as decoration sitting on top of the composition. So instead of a fourth device, the two layers were made to **overlap**: the strata's horizontal fade now finishes at ~55% of the hero while the node graph starts at 38% and holds opacity to 58%, so the graph visibly emerges out of the blur across a wide band. The seam is now the overlap itself — which is also the more honest reading of the thesis, since the point is that the two systems interlock rather than meeting at a boundary.
- **Root-caused the vertical line that "looks like a border."** Two things produced it, both fixed. First, `-webkit-mask-composite: source-in` was set alongside `mask-composite: intersect` — these are **different operators from different spec generations**, not a prefix pair, and the prefixed one was winning with a hard-edged composite. The `-webkit-` mask declarations were removed entirely. Second, the horizontal fade ran to `transparent 96%` — i.e. it finished essentially *at* the element's box edge, so what showed was the edge rather than the fade hiding it. Every fade now completes well inside the box (`transparent 84%` on a widened 66% element).
- **Strata fade softened** — blur `6px` → `11px`, opacity `.85` → `.8`, and the vertical mask's opaque band narrowed (`20%`–`72%` instead of `18%`–`82%`) so the bands dissolve gradually instead of running into a limit.
- **Hero graph extended downward** — six nodes and eight connecting lines added across the bottom band (`y` 470–545 in the 900×560 viewBox), tied into existing nodes. The prior round's additions sat at `y` 400–490, which the vertical mask was already fading; widening the opaque band to 90% is what actually made the lower-right corner render.
- **Location split into two lines** in the nav rail across all four artboards — `Cochabamba, Bolivia` on one line, `GMT-4 · full overlap with US business hours` beneath it.

## Decisions

- **No fourth seam marker.** Recommended against drawing one at all and said why, rather than proposing a fifth variant next round — three rejections of the same class of solution is information about the class, not about the execution.
- **Editorial index over a bento/card grid** for the work section. The author had just removed borders for tidiness; answering a boxiness complaint with differently-sized boxes would have contradicted that. Hairlines and indentation also scale better as more case studies land.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-20-11-task8-design-pass1-revisions7.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 207 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["all five of the author's points addressed; the unsaved-edits finding reported rather than papered over"] }
  loose_ends: { status: passed, evidence: ["the author needs to re-apply their border edits via Save if they want them tracked, or name them — noted in the reply"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions / follow-ups

- **Testimonial text/name/title still needed** for the three LinkedIn recommendation cards — still `[NEEDS INPUT]`.
- Carried forward: diagram text legibility in the four inline SVGs; the "Get in touch" invite copy needs a content-type change to `home.en.md`/`home.es.md` outside this task (`H-02`); contact form backend; real vendor/tool logos for the marquee; mobile artboards; `home.es` stress test.

## Next

Author reviews the republished canvas. Then: mobile for the 4 screens and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/Main.dc.html` — work section rebuilt as an editorial index (all card CSS removed), hero masks root-caused and softened, seam marker removed in favour of layer overlap, graph extended downward, location split.
`docs/design/canvas/src/CaseStudyDetail.dc.html`, `CaseStudiesIndex.dc.html`, `PlatformPage.dc.html` — location split into two lines.
`progress/2026-08-20-11-task8-design-pass1-revisions7.md` — this log.
