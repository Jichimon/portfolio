# Design canvas — `TASK 8` design/UX pass

**Status:** the desktop set is complete and approved. Direction accepted 2026-08-20 (`docs/design/decisions/2026-08-20-hero-direction.md`); **pass 1** — home, the `otp-provider-decoupling` case study, the `/case-studies` index, the `mobile-banking-platform` anchor — approved 2026-08-22 after eleven revision rounds; **pass 2** — About, Experience, the bilingual 404, the Spanish length stress test, the responsive contract on every screen, the component sheet and two frozen 390px frames — approved 2026-08-23.

**Not covered yet:** nothing here has been rendered by a browser. No headless browser exists in this repo until `TASK 15` installs Playwright, so narrow-state behaviour is reasoned from measured character counts and judged by eye in the canvas or the local preview — never screenshot-diffed. That gap is `INC-03`'s visual-QA item, and it needs the real site, not the mockup.

**Pass 0 v1 was rejected 2026-08-20** — three typeset documents with no nav, no hero, no motion. See "History" below before reusing anything from that version's reasoning.

## What this is

The Claude Design canvas source for `TASK 8`'s design/UX work item, run against `docs/design/claude-design-brief.md`. Every `.dc.html` file under `src/` is one artboard on a published Artifact canvas — a live editor, not a static export. The canvas has two pages: **Screens** (the real pass-1 build, current) and **Directions** (pass 0's three explorations, kept for history, not the current design).

## Layout

```text
src/
  # Screens page — pass 1, current
  Main.dc.html              Home — the accepted hero as a blurred atmospheric layer
  CaseStudyDetail.dc.html    otp-provider-decoupling, full content, 3 diagrams
  CaseStudiesIndex.dc.html   /case-studies — 5 items, platform→children hierarchy
  PlatformPage.dc.html       mobile-banking-platform — distinct treatment, 2 diagrams
  About.dc.html              the person, as an article — one centred axis, two widths
  Experience.dc.html         the employer chronology, owned outright
  HomeES.dc.html             Main, copy-substituted — the Spanish LENGTH STRESS TEST,
                              not a second design: same CSS, same markup, only the words
  NotFound.dc.html           404 — bilingual, one file for every unmatched route
  Components.dc.html         the component sheet — a DOCUMENT, not a page (no rail)
  HomeMobile.dc.html         DERIVED — Main at a 390px frame
  CaseStudyMobile.dc.html    DERIVED — CaseStudyDetail at a 390px frame

  # Directions page — pass 0, history only, not the accepted design
  DirectionB.dc.html        B — Estratos y falla (not chosen)
  DirectionC.dc.html        C — Todo pasa por acá (not chosen)
  DirectionCDark.dc.html    C, dark (not chosen)
  MobileSeam.dc.html        mobile test of C's seam — superseded, C wasn't accepted

  canvas.json                artboard layout, pages, annotations
build.mjs                    expands each artboard's <style data-fonts="..."> marker into
                              real @font-face rules with inline base64 woff2
local-preview.mjs            builds a static, editor-free HTML page from build/src/ —
                              the file:// fallback, see "If the Artifact link doesn't open"
derive.mjs                   writes the three artboards that must never drift from another
                              artboard — HomeES, HomeMobile, CaseStudyMobile. See below
verify.mjs                   the canvas's structural invariants, asserted as properties —
                              see "Verifying a pass". Run it before every re-seed
.fonts/                      gitignored — cached woff2, fetched from Fontsource's CDN
build/src/                   gitignored — src/*.dc.html with fonts expanded, what
                              seed-canvas.mjs (and local-preview.mjs) actually consume
```

## Why the fonts aren't inline in `src/`

The canvas's iframe has no network egress — webfonts have to ship as inline `data:` URIs inside each artboard. Inlining ~150–220 KB of base64 directly into the versioned `.dc.html` would rewrite that base64 on every touch and make the git diff unreadable (and opaque base64 blobs are exactly what already produced a false positive in the confidentiality term check — `TASK 18`). So `src/*.dc.html` carries a marker instead:

```html
<style data-fonts="space-grotesk,ibm-plex-sans,ibm-plex-mono-400,ibm-plex-mono-500"></style>
```

and `build.mjs` expands it just before seeding — self-fetching from Fontsource's CDN if `.fonts/` is empty. The font ids are registered in `build.mjs`'s `REGISTRY`/`SOURCE` maps. Fonts are Fontsource variable builds, `latin` subset, OFL-licensed.

## Re-seeding and republishing

```sh
node docs/design/canvas/build.mjs
```

Then, from the design skill's base directory for this session (re-run `/design` if that path was lost):

**Derive the `--artboard` flags from `canvas.json`; never type a list.** This block used to
carry all ten artboard paths literally, which is the exact failure `P-13` names: the eleventh
screen gets added to `src/`, the roster here is not updated, and it silently never reaches the
canvas. `canvas.json` already knows every artboard, so let it say so.

```sh
ART=$(node -e "const c=require('$PWD/docs/design/canvas/build/src/canvas.json');\
console.log(c.artboards.map(a=>'--artboard docs/design/canvas/build/src/'+a.file).join(' '))")

node "<skill base>/seed-canvas.mjs" \
  --template "<skill base>/payload.template.html" \
  --out <scratchpad>/portfolio-site-design.html \
  --title "Portfolio Site Design" \
  $ART \
  --canvas docs/design/canvas/build/src/canvas.json

node "<skill base>/seed-canvas.mjs" --check <scratchpad>/portfolio-site-design.html
```

The `--check` output names every file it seeded — read it, and confirm the count matches
`src/*.dc.html`. That is the cheap half of the property; the full one is the verifier
described under **Verifying a pass** below.

Publish with the `Artifact` tool, passing `url` back to the same artifact so the link stays stable across passes rather than minting a new one each time. `favicon` must be passed on every publish call, including republishes — it is not carried forward automatically.

## Derived artboards

Three screens in `src/` are **not independently authored**, and treating them as if they were is the defect this guards against.

| Derived | From | Why it must be identical |
| --- | --- | --- |
| `HomeES.dc.html` | `Main.dc.html` | Copy substitution only. If the CSS or the markup could differ, a layout that holds in Spanish would prove nothing — it would just mean somebody designed around the longer strings |
| `HomeMobile.dc.html` | `Main.dc.html` | Byte-identical; only the artboard frame width differs (390px, set in `canvas.json`). A phone frame that has drifted from its source documents a screen that does not exist |
| `CaseStudyMobile.dc.html` | `CaseStudyDetail.dc.html` | Same |

```sh
node docs/design/canvas/derive.mjs           # write them
node docs/design/canvas/derive.mjs --check    # report drift, write nothing
```

**Edit the source, never the derived file.** `verify.mjs` re-runs the derivation in memory and fails if a checked-in file differs, so a hand-edit is caught rather than discovered months later — hand-maintaining a duplicate guarantees it diverges, silently, in the direction nobody is looking.

The two phone frames cover **two archetypes, not all eight screens**: home (hero, bento, marquee) and the article (the disappearing table of contents, the stacked masthead, the overflowing diagrams). Every other screen is one of those two shapes.

## Verifying a pass

```sh
node docs/design/canvas/verify.mjs
```

Run it **before** every re-seed. It exits 1 and names the file on any failure. Eight properties, every one derived from the artboards rather than from a list kept here.

**Page versus document**, and where the line comes from: a **page has a rail** — it is somewhere you can be on the site, so it owes the reader navigation, a locale switch, and copy that behaves like copy. The component sheet has no rail, because there is nowhere to navigate to from a specimen; its prose is *about* the site rather than *of* it, which is why it may quote a rule the pages have to obey. Three checks are scoped by that one distinction, derived from the artboard — never a per-file exception list.

| Property | Scope | Why it exists |
| --- | --- | --- |
| Registration is bidirectional — every `src/*.dc.html` is in `canvas.json` **and** in `local-preview.mjs`, and vice versa | all | A screen that exists in `src/` and nowhere else is invisible in both the canvas and the preview, and nothing complains |
| Every derived screen matches `derive.mjs`'s current output | all | A hand-edited copy of a generated file is drift nothing else would ever surface |
| Every page carries the language switcher | pages | Chrome belongs on every page, not on the ones somebody remembered |
| Three responsive states, and the rail actually collapses at narrow | all · pages | The contract is the design, so a screen missing it is a screen that breaks on a phone |
| No fixed width floor survives | all | A `min-width: 1024px` guaranteed a horizontal scrollbar on every phone and lived on all six screens for two rounds |
| Every in-page `href="#…"` resolves to an `id` in the same file | all | Found four home tiles pointing at `#experience`, a section that does not exist on home. Looking had not found it |
| No visible copy states how many of a growing thing there are | pages | Found nine spots counting case studies, deep dives and employers. "Five case studies" is wrong the day a sixth lands and nothing fails when it does. Sentence-scoped, because *"Three specific problems … documented as separate case studies"* puts four words between the number and the noun |
| A Spanish screen never links into an unprefixed route | pages | Found the Spanish home's wordmark still pointing at the English home. Proven in red (`P-14`) after its first version excused every `href="/"` and hid exactly that |
| The switcher marks a current locale — except on the 404, which is designed to have none | pages | A switcher with nothing current elsewhere would mean the locale was lost |

**If the canvas was edited and saved in the GUI** since the last seed (the author used the visual editor), read it back before editing further: `WebFetch` the artifact URL, then `--extract` the saved file into a fresh directory and edit those files — never edit `build/src/` and re-seed over GUI-made changes, they'll be silently discarded.

## If the Artifact link doesn't open

Happened once already (2026-08-20) — the link resolved server-side (confirmed via `WebFetch` and `action: "list"`) but wouldn't open in the author's browser, most likely a claude.ai account/session mismatch between the browser and this Claude Code session. Every seed also produces a **static, editor-free local file** that needs no claude.ai account at all:

```sh
node docs/design/canvas/build.mjs
node docs/design/canvas/local-preview.mjs <scratchpad>/portfolio-site-design-preview.html
```

Open the output with `file://` directly. It strips the `{{handlebars}}` the Design Components runtime would normally resolve and wires a small vanilla-JS theme toggle in their place — every artboard's light/dark switch still works, the marquee and glow-pulse animations still run (they're plain CSS), just without the click-to-select editor chrome. Regenerate it any time `src/` changes; it's not committed (same reasoning as `build/`).

## What's next

1. **Mobile** for the 4 screens above, against the accepted hero (the `MobileSeam.dc.html` artboard tested the *rejected* Direction C's seam — it needs redoing, not reusing).
2. **`home.es`** as the Spanish-length stress test — the dateline and metric bullets are where the ~15–20% length difference is most likely to break the layout.
3. **Pass 2**: screens 5–9 — About, Experience, Contact, system states, component sheet.

## Dark mode

**Decided 2026-08-20: light and dark are both first-class, with a real toggle — not `prefers-color-scheme`-only.** Every artboard's nav carries a working switch (click it) backed by real component state. The accepted hero's density/blur metaphor (see the decision doc) was chosen specifically because it holds up in both themes without a separate dark redraw — the same property the diagram visual language needs for `TASK 6`.

## History

- **Pass 0 v1, rejected 2026-08-20.** Three typeset variations of the same content slice — no nav, no hero, no home page, no motion. Rejected in the author's own words as "un Word que se lea desde el navegador." Root cause and correction: `docs/design/claude-design-brief.md`'s "Visual direction" section.
- **Pass 0 v2, accepted 2026-08-20 with an amendment.** Three complete home-page directions (A · Muro y nodos, B · Estratos y falla, C · Todo pasa por acá). The author picked **A**, amended: swap A's packed-block wall for **B's stacked-strata texture**, rendered as a **blurred atmospheric background** rather than a foreground diagram. Reasoning and what carries forward: `docs/design/decisions/2026-08-20-hero-direction.md`.
- **Pass 1, this version.** The accepted hero built into the real home page, plus the three other screen-1–4 artboards: the richest case study template (`otp-provider-decoupling`, 3 diagrams including the before/after C4 pair), the case-studies index (5 items, platform→children hierarchy), and the platform anchor page (distinct treatment: a scale stat instead of an outcome, a services grid, deep-dive cards linking to its 3 children).
