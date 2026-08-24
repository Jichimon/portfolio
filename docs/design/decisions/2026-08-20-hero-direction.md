# Design decision — hero direction and visual system

**Status:** Accepted 2026-08-20, by the author, from pass 0 v2's three directions. **Revised twice since** — see "Revisions after author review" below; the original decision below is kept for the reasoning trail, not as the current state of `Main.dc.html`.
**Scope:** Governs the site's visual system going forward — type pairing, palette, the seam hero, and (downstream) the diagram visual language `TASK 6` builds against.

## The decision

**Direction A's structure** (density resolving into openness: a dense legacy mass, a channel, discrete floating modern nodes) **carries Direction B's stacked-strata texture** for the legacy side, in place of A's original packed-block grid — rendered as a **blurred, atmospheric background layer** behind the hero copy, not a foreground technical diagram.

Concretely:

- **Legacy side:** horizontal stacked strata (Direction B's "accumulated over time" texture), heavily blurred (`filter: blur(~20px)`), low opacity, fading out toward the page edges via a mask gradient. Reads as atmosphere, not diagram.
- **Modern side:** Direction A's floating nodes and connecting lines, blurred much less than the strata — the resolution difference *is* the metaphor. Legacy is a blur you can't quite make out; modern comes into focus.
- **The seam itself:** the pulse animation that crosses the boundary changes from a hard traveling dot to a soft glow blob (blurred, pulsing opacity/scale) — consistent with the ambient treatment, not a diagram signal.
- **Both layers sit behind the hero text** (`position: absolute`, `z-index: 0`) rather than as a standalone figure claiming its own vertical space above the copy.

## Why

- **A's weakness was genericness** — a packed grid of blocks doesn't specifically say "legacy," it says "dense." B's strata does say something specific: accumulation over time, layers that can't be removed without disturbing what's built on top — which matches the real narrative (`CLAUDE.md`'s thesis: four employers, one recurring layered problem).
- **B's weakness was competing with the text** — at full opacity and sharp focus, the strata pattern was busy enough to fight the hero copy for attention. Blurring it into a background layer removes the competition and keeps the specificity.
- **The blur gradient is a second, free metaphor**: legacy is indistinct, modern resolves into focus. It costs nothing extra to build (already blurring for the atmosphere reason) and reinforces the thesis a second way.
- **Still zero logos, zero vendor marks** (`C-06`), same as every direction in pass 0 — geometry and blur, never iconography.

## What carries forward unchanged from pass 0

- Type pairing: **Space Grotesk** (display/UI/nav) + **IBM Plex Sans** (body) + **IBM Plex Mono** (labels, metadata, marquee). Validated as available (Fontsource, variable, OFL) and judged to already read as considered rather than placeholder — not revisited without a reason to.
- Accent: single hue, oklch — **not** what this bullet originally said. It did not carry forward unchanged: session 05 replaced the ~230° cyan-blue named here with a wine/burgundy `oklch(42% 0.15 15)` light / `oklch(70% 0.15 15)` dark, because cyan read as a former employer's brand rather than this site's own. See "Revisions after author review" below for the full account — this bullet is corrected to stop contradicting it.
- Nav rail sized for 7 items (`Work · About · Experience · Writing · Architectures · Search · Contact`), light/dark toggle with real component state, technology marquee sourced from real `stack` frontmatter, employer strip (verified public, no vendor names).

## What's still open

- The exact blur radii, opacity values and mask stops were a first build, not author-reviewed at this resolution when this section was written — that follow-up tuning happened; see "Revisions after author review" for what changed and why.

Mobile (`HomeMobile.dc.html`, derived) and the Spanish-length stress test (`HomeES.dc.html`, `home.es`) were both listed here as deferred to the next pass. Both shipped — mobile in session 18 as two frozen 390px frames derived from their desktop sources, the Spanish stress test as a measured +10% overall length delta across 37 corresponding strings, one element changing shape (the rail's timezone line). Neither is open any longer.

## Downstream consequence

Whichever diagram visual language `TASK 6` eventually specifies for the 11 hand-authored assets does **not** have to inherit the blur — the hero's atmospheric treatment is a hero-specific device. What *does* carry forward: the principle that legacy/modern is expressed through density and openness rather than color-coding or iconography, and that the same geometric vocabulary has to read in both light and dark.

## Revisions after author review

The "heavily blurred atmosphere" reading above did not survive contact with the actual artboard. Several rounds of author feedback moved the executed design away from it, in the direction the "what's still open" note already flagged as likely:

- **Session 05** (`progress/2026-08-20-05-task8-design-pass1-revisions.md`): the strata blur was cut from `~20px` toward legibility and tinted with the accent, because at full atmosphere the pattern "se pierde todo el sentido" — the metaphor needs to be legible, not just felt. The accent hue also changed from the ~230° cyan named above to a wine/burgundy `oklch(42% 0.15 15)` light / `oklch(70% 0.15 15)` dark, because cyan read as a former employer's brand, not as this site's color. The blur value kept moving through subsequent rounds and **settled at `11px`**, not the `6px` first landed on in this session — see `docs/design/canvas/src/Main.dc.html`'s `.strata-bg`.
- **Session 06** (`progress/2026-08-20-06-task8-design-pass1-revisions2.md`): the "soft glow blob" seam treatment described above (bullet 3) was rejected outright. In the real artboard it read as an unexplained stain rather than a pulse, because it had no line or channel to anchor it and its heavier blur no longer matched the now-sharper strata/nodes around it. It was replaced with a visible thin seam line with small, sharp dots traveling along it. This same session also introduced a **third token, `--label`** (gold/ochre `oklch(52% 0.1 75)` light / `oklch(75% 0.11 75)` dark), for masthead and metadata legibility — deliberately not another blue, to avoid re-landing on the problem that had just killed cyan.
- **Session 07** (`progress/2026-08-20-07-task8-design-pass1-revisions3.md`): session 06's traveling-dot line was itself rejected and rebuilt as a vertical line with traveling pulses.
- **Session 11** (`progress/2026-08-20-11-task8-design-pass1-revisions7.md`): that vertical line was rejected in turn and replaced with a static horizontal line — which was also rejected.

**Three rejections of the seam-as-a-drawn-line class, not just of one execution of it, is what settled the final shape:** the seam is now **not a separate element at all**. It is the overlap of the two layers — the strata's fade finishes at ~55% of the hero width while the node graph's mask starts at 38%, so the modern side visibly emerges out of the legacy blur across that shared band, with no line, dot or pulse doing the work. `Main.dc.html`'s own inline comment records the same conclusion: *"the graph emerging out of the blur IS the seam. That replaced a drawn line, which kept reading as decoration."*

**Current state, for anyone building against this doc instead of reading the source:** legible strata (`11px` blur, accent-tinted) on the legacy side, resolved floating nodes on the modern side, no drawn seam — the boundary is the overlap band where the two layers meet — wine/burgundy accent plus the gold/ochre `--label` tertiary color from session 06 for metadata legibility. Read `docs/design/canvas/src/Main.dc.html` for the ground truth; this document records why it changed, not what it currently renders.
