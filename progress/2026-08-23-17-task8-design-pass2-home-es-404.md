# 2026-08-23 · Session 17 — The Spanish stress test, the bilingual 404, and the language switcher

**Task:** TASK 8 — Site work breakdown
**Status after this session:** IN PROGRESS

The author approved the responsive round and asked to keep going: *"ok, podemos continuar con los siguientes puntos del diseño"*. Three of the remaining pass-2 items landed. The component sheet did not, and that is deliberate — see the last section.

## The language switcher — chrome, not a states sheet

The brief listed *"language switcher, open state"* among the system states. **There is no open state, and manufacturing one would have been worse than admitting it.** With exactly two locales (`ADR-003`: unprefixed English, `/es/` for Spanish) the control is a two-state switch, not a menu — a dropdown holding two options always spends a click to show one row you did not want.

So it is `EN / ES` in mono, in `.rail-bottom` above the theme toggle, and it went onto **every** live screen rather than into an inventory. Grouping it with the theme toggle is the reasoning: both are "how you view this page" controls, neither is navigation.

Two decisions inside it that are easy to get wrong and expensive to find later:

- **The alternate href points at THIS page in the other language**, never at the other language's home. Being thrown back to the home page when you switch locale is the classic locale-switch defect, and it is a defect of *data*, not of styling — which is why the target is per-screen and not a constant. `/about` → `/es/about`, `/case-studies/otp-provider-decoupling` → `/es/case-studies/otp-provider-decoupling`.
- **It survives narrow, unlike the socials.** On a phone, language outranks a GitHub link. The narrow state was already dropping things; this one had to be exempted explicitly rather than by luck.

## Home in Spanish — a stress test, so it is generated, not designed

`HomeES.dc.html` is produced from `Main.dc.html` by **substituting copy only**: identical CSS, identical markup structure, only the words differ. That is what makes it evidence. Had I hand-built a second Spanish screen, a layout that held would prove nothing — I would simply have designed around the longer strings without noticing.

The generator asserts every one of its 58 substitutions fired, and then asserts a property on the result: a short list of English phrases that appear only as prose must not survive. A source edit that moves a string now fails loudly instead of shipping an English fragment into the Spanish screen.

The copy is the real content — `resources/site/home.es.md` and the Spanish case-study frontmatter — not translation written for the mockup.

### What the stress test actually measured

Folklore said Spanish runs 15–20% longer. Measured across the 37 corresponding strings on this page: **+10% overall.**

| | EN → ES | ratio |
|---|---|---|
| rail · timezone line | 43 → 63 | **+47%** |
| tile tag · platform | 33 → 45 | +36% |
| section label · what I've built | 15 → 20 | +33% |
| tile title · OTP | 54 → 69 | +28% |
| tile blurb · QR | 93 → 88 | −5% |
| tile title · QR | 77 → 72 | −6% |
| section label · get in touch | 12 → 8 | −33% |

The large ratios are all short strings where the ratio misleads — `Work` → `Trabajo` is +75% and three characters. **The only element that changes shape is the rail's timezone line**, which goes from two lines to three inside a 264px rail; the rail is `space-between` with vertical room to spare, so it grows rather than overflows.

Nothing else moves, and the reason is worth stating because it is the actual finding: **nothing in the layout is sized to an English string.** Every measure is a `max-width` or a fraction, every tile is a grid cell, and the two longest Spanish words on the page (`autenticación`, `documentación`) are 13–14 characters, well inside any column. The design absorbing Spanish is a property of how it was built, not luck.

### What this does not prove

**Not verified by rendering.** No headless browser is installed in this repo — Playwright arrives with `TASK 15` — so overflow was reasoned from measured character counts, not screenshotted. The claim is *"nothing is sized to an English string, and the measured deltas fit"*, which is weaker than *"I looked at it at 390 and it holds"*. The author judges it in the local preview at 390 and 768; that is where the claim gets confirmed or falsified.

## The 404 — bilingual for a structural reason

One file answers every unmatched route in both locales, so **it cannot read the visitor's language off a URL that just failed to match.** `/es/typo` would tell you; `/sobre-mi-typo` would not. A bilingual page is never wrong; branching on a path prefix is right most of the time and silently wrong exactly when someone mistypes.

**Two panels, each a complete monolingual page**, never interleaved: you read your half and ignore the other. At narrow they stack with a rule between them, still two complete halves. The alternative — one column with each line in both languages — is unreadable in both.

**The language switcher marks neither locale as current.** That is a designed state, not a missing one: a 404 has no locale to be current in. It is the only screen exempted from the switcher check in `verify.mjs`, and the exemption is named there rather than being a silent skip.

**The motif is the site's own vocabulary.** Strata that cannot move on the left, discrete nodes on the right — the hero's two sides — with the channel between them **severed**, and the status code sitting in the gap where the connection should be. A link that does not connect, on a site whose entire thesis is connecting things (`C-15`). It is drawn in the same geometry as the hero and the tile motifs, so it reads as the site's language rather than decoration bought in for one page. Below 560px the two sides are hidden rather than shrunk: at that size they would be two smudges, and the number carries the meaning alone.

**The rail stays.** This is the one page whose entire job is to get you somewhere else, so removing the navigation would remove the only thing that helps. Below the copy, four real destinations per locale with a one-line description each.

One implementation note is carried on the page itself rather than only in a canvas annotation, because whoever builds it will be reading the page: **it must be served with a real 404 status, never a 200 with error copy.** A soft 404 is indexed as a real page.

## A defect the verifier hid, then caught

Worth recording in full, because the failure was in the *check*, not the code.

The Spanish home's **wordmark still pointed at `/`** — the English home. Click your own name on the Spanish site and you leave Spanish. My first version of the locale check excused every `href="/"` with the comment *"the wordmark and the EN switcher target are meant to be root"* — which quietly asserted the bug was correct.

The fix narrows the exemption to the switcher's own `EN` target and nothing else, and it was **proven in red** (`P-14`): reintroduce the bad href → `FAIL HomeES.dc.html: links to /, which is the English route`, exit 1; restore → PASS. A check that has only been seen to pass has not been tested, and this one had been passing while the defect was in front of it.

## verify.mjs moved into the repository

The property checks had been living in the session scratchpad, regenerated from memory each round. That is a cache, not a source of truth (`P-10`), so they are now `docs/design/canvas/verify.mjs`, documented in the canvas README, and run before every re-seed. Seven properties, **every one derived from the artboards** rather than from a list (`P-13`):

1. Registration is bidirectional — every `src/*.dc.html` is in `canvas.json` **and** `local-preview.mjs`, and vice versa.
2. Every live screen carries the language switcher.
3. Three responsive states, and the rail actually collapses at narrow.
4. No fixed width floor survives.
5. Every in-page `href="#…"` resolves to an `id` in the same file.
6. A Spanish screen never links into an unprefixed route.
7. The switcher marks a current locale — except on the 404, which is designed to have none.

Checks 5 and 6 exist because they each caught something looking had not: the four home tiles pointing at `#experience` (a section that does not exist on home), and the wordmark above.

**The README's re-seed block was carrying the same anti-pattern** and is fixed in the same change (`P-07`): it listed all ten `--artboard` paths literally, so screen eleven would have been added to `src/` and silently never reached the canvas. The flags are now derived from `canvas.json`.

## Verification

| Dimension | Status | Evidence |
|---|---|---|
| Structural properties | passed | `node docs/design/canvas/verify.mjs` → PASS, 12 artboards, 8 live screens |
| The locale check is real | passed | red/green/red cycle run in-session; FAIL + exit 1 on the reintroduced defect |
| Copy substitution complete | passed | `home-es.mjs` — 58 substitutions asserted, 0 English leftovers |
| Length delta | measured | 37 corresponding strings, +10% overall; worst element named above |
| Canvas seeds | passed | `seed-canvas.mjs --check` → ok, 13 files, clean stderr |
| Confidentiality | passed | `./scripts/check-terms.sh` → PASS, 33 terms × 219 files |
| Gate | **partial** | 8/9 PASS. `check-trace` FAILs on the pre-existing `tool.result`/`tool.requested` correlation gap owned by `TASK 12`; `H-03` forbids writing to `evidence/`, so it is not touchable from here |
| Rendered narrow states | **not done** | no headless browser in the repo (`TASK 15` owns Playwright). Reasoned from measured character counts; the author judges it in the local preview |

## Author review — two findings, both wider than the screen they were raised on

### Copy that counts a growing thing

*"nombrás (5 casos de estudio) y (4 empleadores) cosa que si crecen, eso debería crecer igual? preferiría algo más agnóstico al número… algo más concreto relacionado a Work y Experience, no cantidad."*

This is the **content-driven components** constraint (`TASK 8`, fourth breakdown constraint) applied to copy rather than to markup, and it had not occurred to me that copy is subject to it. The failure is quiet in a way markup is not: `Five case studies` does not break when a sixth lands — it just starts lying, and nothing anywhere fails.

Raised against the 404. Grepping for the property rather than fixing the two spots named found **nine**, on four screens:

| Screen | Was | Now |
|---|---|---|
| Main, CaseStudiesIndex, PlatformPage | `Platform · anchor of 3 deep dives` | `Platform · parent of the deep dives` |
| PlatformPage | `Three specific problems within it are documented…` | `The specific problems within it are documented…` |
| CaseStudiesIndex | `Five years, four employers, one recurring problem… the other four are…` | `One recurring problem at every employer… the rest are…` |
| Experience | h1 `Four employers that had nothing else in common` | h1 `Every employer was different. The problem never was.` |
| NotFound | `Five case studies` / `Four employers, in reverse order` | `What I built, and what it cost` / `Where each problem came from` |

The Experience h1 is the one worth noting: it counted employers, so it expires the day the author changes job — and it is the page's argument, the most expensive line to have to rewrite. The replacement makes the same claim without a number, and is a better line for it.

**Now enforced** as `verify.mjs` check 5, scoped to the **sentence** rather than to word distance — *"Three specific problems within it are documented in depth as separate case studies"* puts four words between the number and the noun, and a proximity rule would have waved it through. Four-digit years are excluded: a period is a fact about the past and does not grow.

It false-positived once, on real copy — *"One recurring problem at every employer"* — so `one`/`uno` came out of the pattern, with the reason recorded in the file. The rhetorical "one" is common here and the thing dropping it misses (a singular count of a list expected to grow) is not a sentence anyone writes. **A check that cries wolf gets switched off**, which is worse than a check with a known narrow blind spot. Proven in red on both restored defects.

### The Spanish read as translated English

*"tu español suena muy 'traducido literalmente' cuando en realidad debería ser más… 'traducido e interpretado'."*

Correct, and it is `C-09` — the Spanish is first-class content, not a translation artifact. The copy that came out of `resources/` was fine, because the author wrote it. Everything **I** added was English with Spanish words in it:

| Was | Now | What was wrong |
|---|---|---|
| `Plataforma · eje de 3 análisis en profundidad` | `Plataforma · los demás casos salen de acá` | calqued "anchor of deep dives"; also counted |
| `Tecnologías con las que he trabajado` | `Tecnologías con las que trabajé` | English present perfect where Spanish uses simple past |
| `No es parte de la plataforma` | `Fuera de la plataforma` | negation carried over from "not part of" |
| `¿Tenés un sistema difícil de explicar — o una idea que todavía no sabés cómo construir? Resolvámoslo juntos.` | `¿Tenés un sistema que cuesta hasta explicar? ¿O una idea que todavía no sabés cómo bajar a tierra? Veámoslo juntos.` | one English sentence with an em-dash clause, rather than the two questions Spanish would actually ask |
| `espacio reservado, aún no construido` | `lugar reservado, todavía sin construir` | `aún no + participle` is the English shape |
| 404: `Que es más o menos el problema que me pagan por resolver. La dirección está vieja o mal escrita` | `Que es, más o menos, para lo que me contratan. La dirección quedó vieja o tiene un error de tipeo` | the joke survived word-for-word but stopped being funny; `quedó vieja` and `error de tipeo` are what a person says |

The general rule this leaves: **translate the intent, then write the sentence Spanish would have written.** A giveaway worth watching for is punctuation shape — Spanish asks two short questions where English strings one long sentence with a dash.

Not mechanizable, so it does not become a check. Recorded here so it is at least a known failure mode rather than a recurring surprise.

## Done

```yaml
done:
  docs:       { status: passed, evidence: ["docs/design/canvas/README.md — layout, derived re-seed block, and the new 'Verifying a pass' section with all seven properties and why each exists", "canvas.json — note-home-es and note-404 added; screens-summary carries the no-counts rule", "TASKS.md — TASK 8 status line and the content-driven-components constraint extended to copy"] }
  content:    { status: passed, evidence: ["./scripts/check-terms.sh — PASS, 33 terms x 220 files, 6 exclusions", "C-09: the Spanish rewritten as Spanish after the author found it read as translated English; the six calques and their fixes tabled above", "C-15: the 404's severed-seam motif reinforces the thesis rather than decorating"] }
  gate:       { status: partial, evidence: ["node scripts/gate.mjs — 8/9 PASS; check-trace fails on the same TASK 12 pre-existing tool.result/tool.requested correlation gap, unrelated to this change"], reason: "H-03 forbids editing evidence/ to work around it; TASK 12 owns the fix" }
  tests:      { status: passed, evidence: ["node docs/design/canvas/verify.mjs — PASS, 12 artboards, 8 live screens, 7 properties, every one derived from the artboards (P-13)", "seed-canvas.mjs --check — ok, 13 files, clean stderr", "home-es.mjs — 58 substitutions asserted, 0 English leftovers"] }
  scope:      { status: passed, evidence: ["the switcher went onto every screen rather than into a states sheet; the count fix went to all nine occurrences rather than the two the author named; the Spanish fix covered every string I authored, not only the 404"] }
  loose_ends: { status: passed, evidence: ["the component sheet is deferred with a stated reason (an inventory cannot close before the set does), not dropped", "the contact form's sent/error states surfaced here rather than left to be discovered at implementation"] }
  mutation:   { status: not_applicable, reason: "no mutation-covered surface touched — the canvas is design source, not shipped code" }
  security:   { status: not_applicable, reason: "no boundary, guard or permission changed" }
  iterations: { status: passed, evidence: ["2"] }
```

Two properties were **proven in red** rather than only seen to pass (`P-14`): the locale check (reintroduce the English wordmark href → FAIL, exit 1) and the count check (restore `Five case studies` and `Three specific problems … case studies` → both FAIL, including the sentence-scoped one a proximity rule would have missed).

One dimension is declared not done rather than left silent (`P-03`): **rendered narrow states**. No headless browser exists in this repo until `TASK 15` installs Playwright, so overflow is reasoned from measured character counts, never screenshotted.

## What remains in pass 2

- **The component sheet.** Held back on purpose, not for budget: it is an *inventory*, and it can only be complete once every component exists. Three arrived this round — the language switcher, the destination list, the severed-seam motif. Assembling the sheet before the set closed would have guaranteed a second assembly.
- **A fixed 390px artboard.** The responsive source is better for judging behaviour; a frozen phone frame is what a hand-off and the component sheet want.
- **`home.es` seen at narrow by the author.** Now buildable — the screen exists and the preview has width buttons — but not yet looked at.
- The contact form's **sent / error** states, which nothing has designed and the implementation will need. Surfaced here rather than discovered later.
