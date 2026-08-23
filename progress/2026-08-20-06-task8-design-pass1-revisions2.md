# 2026-08-20 · Session 06 — Pass 1, second revision round

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

## What was done

The author reviewed the republished canvas (session 05's changes) with four screenshots and seven more concrete points. All were actionable; implemented directly, per the same `P-17` pattern as session 05.

- **The case study's info grid read as a wall of text.** The author: "en esta última página se pierde el diseño... popurrí de texto feísimo." Root cause: five fields (Role, Context, Period, Outcome, Stack) squeezed into one `100px 1fr` list, with the Outcome field — a full sentence — competing in the same rhythm as one- or two-word facts. Fixed by splitting it into two visually distinct pieces inside one card: a 4-column quick-facts grid (Role/Context/Period/Stack) and a separated Outcome note below it, on an accent-tinted background, styled as prose rather than another field. Applied the same card treatment to the platform page's masthead for consistency, since it had no visual container at all before this pass.
- **Masthead subtitles unreadable — needed a third color.** The author's own diagnosis was correct: the labels (`ROLE`, `CONTEXT`, `PERIOD`, `STACK`, `OUTCOME`) used `--ink-faint` (38% alpha) at 10–10.5px, both too low-contrast and too small. Introduced a third palette color, `--label` (a muted gold/ochre, `oklch(52% 0.1 75)` light / `oklch(75% 0.11 75)` dark) — deliberately not another blue, to avoid re-landing on the "NiCE" problem from the accent color. Applied it to the masthead labels on both the case study and platform pages, and to the platform page's `scale-label` and the case study's diagram before/after tags (`.pair-label`), which had the identical problem. This also answers the broader "paleta muy apagada" note from the prior round — wine (accent) and gold (label) now read as a considered pair rather than ink/white plus one color.
- **Diagram text is illegible at real size — logged, not fixed this pass.** The four inline SVG diagrams (two per case study/platform page) use 9–13px text inside hand-placed boxes with tight coordinates. The author flagged this could be separate scope; agreed, for a concrete reason: bumping font sizes on hand-tuned SVG layouts risks overflow inside boxes I can't visually re-verify without the author's next look, and this canvas format gives me no way to render and check before publishing. Logged as an explicit follow-up (below) rather than risk a silent breakage.
- **The hero's central glow read as an unexplained stain.** The author: "no se ve una mancha al medio... quitarle la difuminación o quitar los puntos." Diagnosed why: the three blurred glow blobs sat alone in the seam gap with no line or channel to anchor them, and once the strata/nodes were sharpened in the last round, the blobs' heavier blur made them look like a mismatched leftover rather than part of the system. Chose to keep the "pulses crossing the seam" idea from the original accepted direction rather than deleting it outright, but replace the blob with a legible **seam line** — a thin vertical accent line at the strata/node boundary — with three small, sharp dots animating along it (top to bottom, staggered), reading as a channel with traveling pulses instead of a smudge.
- **Contact copy reworded** in the canvas mockup: "Got a problem like the ones above? Email me." → "Got a problem that's hard to explain? Let's work through it together." **This is a divergence from the frozen source** (`resources/site/home.en.md` line 28, verified before writing this) — flagged explicitly as a decision, not applied silently (see below).
- **Contact form fields added** — About (select: role you're hiring for / a problem like the ones above / something else), Subject, Description, and a Send button — styled as underline-only inputs to match the site's understated type system rather than boxed form chrome.
- **Contact section reordered**: form is now the centerpiece; "Open to remote or hybrid/relocation" and the Email/GitHub/LinkedIn links moved to a closing footer row below the form, as the author asked.

## Decisions

- **The `--label` color is gold/ochre, not another blue**, specifically because the prior round's accent complaint was about a blue reading as a former employer's brand — reusing a different blue for labels would have repeated the same risk under a different name.
- **The reworded contact copy stays in the canvas only; `home.en.md` is not touched.** `resources/**` is read-only for every agent under `H-02` — a rung-1 hard rule no in-session instruction can move — so the actual site copy can't be updated from here even with the author's sign-off in this conversation. If the new wording is approved, it needs its own content-type change to `home.en.md` **and** `home.es.md` together (`C-09`, locale parity), made by the author directly or through a dedicated content work item — not folded into this design pass.
- **The contact form is mocked as UI only.** Whether it posts somewhere real (a Cloudflare Worker per `ADR-004`) or falls back to a `mailto:` prefill is a build-phase decision, not a canvas-design one — noted so it doesn't get silently assumed either way.
- **Diagram font-size legibility is deferred**, at the author's own suggestion, rather than risking an unverified overflow across four hand-tuned SVGs.

## Findings from validating against real state (P-04)

- Confirmed the exact current wording of the "Get in touch" section in `resources/site/home.en.md` before proposing a replacement, rather than assuming the canvas copy could just be edited freely.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["progress/2026-08-20-06-task8-design-pass1-revisions2.md"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 202 files, 6 exclusions"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing correlation gap (now 4 occurrences, accumulated over this session's length), unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  scope:      { status: passed, evidence: ["all seven of the author's points addressed or explicitly deferred with a stated reason"] }
  loose_ends: { status: passed, evidence: ["diagram font-size logged below as a tracked follow-up; contact copy divergence from home.en.md flagged as needing a separate content change, not silently applied to resources/"] }
  tests:      { status: not_applicable, reason: "no mutation-covered surface touched" }
  mutation:   { status: not_applicable, reason: "same as tests" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["1"] }
```

## Open questions / follow-ups

- **Diagram text legibility** — the four inline SVG diagrams need larger text without breaking their hand-placed box layout. Worth its own pass once the author can review a render, ideally with room to adjust box sizes alongside font sizes rather than font size alone.
- **Contact copy change** — if "Got a problem that's hard to explain? Let's work through it together." is approved, it needs to land in `home.en.md` and `home.es.md` as a content change made outside this design task (`H-02`).
- **Contact form backend** — mocked as UI; needs a build-phase decision on submission handling.
- Still open from prior rounds: real vendor/tool logos for the marquee, mobile artboards, `home.es` stress test.

## Next

Author reviews the republished canvas (same URL). If the case-study layout, label color, seam line and contact section land, move to mobile for the 4 screens and the `home.es` stress test.

## Files changed

`docs/design/canvas/src/Main.dc.html` — `--label` token, hero seam-line/pulse replacing the glow blobs, contact section rebuilt (reworded invite, form, reordered footer).
`docs/design/canvas/src/CaseStudyDetail.dc.html` — `--label` token, masthead split into facts grid + outcome note, `.pair-label` recolored.
`docs/design/canvas/src/PlatformPage.dc.html` — `--label` token, masthead given card treatment + facts/lbl structure, `.scale-label` recolored.
`progress/2026-08-20-06-task8-design-pass1-revisions2.md` — this log.
