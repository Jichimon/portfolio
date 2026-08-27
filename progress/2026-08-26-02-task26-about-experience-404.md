# 2026-08-26 · Session 02 — TASK 26: About, Experience and 404

**Task:** TASK 26 — About, Experience and 404
**Status after this session:** IN PROGRESS

<!-- written as it goes (P-05). Skeleton first, deliberately: TASK 12 records that
     log-first is the one mitigation with a measured result — both cut-off runs that
     wrote their log first kept it. -->

## Riding along

TASK 50 — retire or route `contact.{en,es}.md`. A recorded decision, not a build.

## Checkpoint

`SPEC-TASK-26-about-experience-and-404.spec.md` written and **open for the author's approval**. 19 behaviors — `ABOUT-001`...`009`, `EXP-001`...`005`, `NF-001`...`004`, `PAGE-001` — eleven of them `critical`. `tdd: required`, because two core modules land in `site/lib/**`.

`H-05` denies every write-capable delegation until the file on disk reads `status: active` with `approved_version == version`. TASK 25 learned that the expensive way: the approval happened in conversation, the file still said `draft`, and that session's first write had to be recording it. Nothing is delegated here until the file says so.

Guards green against the new spec before the checkpoint: `check-templates`, `check-docs`, `check-content`, `check-terms`.

## Findings from validating against real state (P-04)

Recorded before any production code, because two of them changed the design.

- **The 404 needs no new content at all.** `ui.not_found` is complete and in parity in both locales — `status_code`, `status_word`, `heading`, `body`, four `destinations`. `ui.about` and `ui.experience` carry their labels. `article.part_of` and `article.figure_prefix`, which TASK 25 left owed, have also landed.
- **`about.{en,es}.md` and `experience.{en,es}.md` are in full paragraph-by-paragraph parity**, so the restructure into frontmatter is mechanical in both locales rather than a translation job. Checked, not assumed.
- **All five case-study titles match the Experience artboard's link text exactly**, so `case_studies` can carry bare slugs and the row title can be read from each case study's own file. No per-row label is needed and none is invented (`S-01`).
- **`resources/photos/` carries no EXIF on any of the five files**, so the location-metadata risk that `C-06` would otherwise raise is already closed. `check-terms` passes with them in place: binaries are skipped, 78 of them.
- **`site/tests/e2e/` holds five files against a cap of six.** This item adds one, landing it at the cap with zero headroom. That is TASK 47's shape arriving in a second directory.

### The image pipeline, spiked before it was specified

Two spikes run against a real build, because TASK 25's rule is that a spec written against an unverified mechanism is a spec written against a pipeline this repository does not have.

| What was in doubt | Result |
|---|---|
| Does `import.meta.glob` reach `resources/photos/` from `site/src/`, the way the diagrams already reach `resources/diagrams/`? | **Yes.** It returns real `ImageMetadata` — `{ src, width, height, format }` — so `<Image>`/`<Picture>` accept it directly |
| Does `<Image formats={['avif','webp']}>` emit AVIF? | **No, and it fails silently.** `formats` is a `<Picture>` prop; `<Image>` ignored it and emitted WebP only, as one `<img srcset>`. The spike would have shipped believing it had AVIF |
| Does `<Picture>` emit both? | **Yes** — `<source type="image/avif">`, `<source type="image/webp">`, and a JPEG `<img>` fallback, each with a three-width `srcset`, plus intrinsic `width`/`height` and `loading="lazy"` by default |
| Does a **lazy** glob stop unreferenced files from being emitted? | **No.** This is the finding that matters — see below |

**Every file matched by the glob is published, referenced or not.** With `eager: true` and with `eager: false` alike, Vite emitted all five photographs into `dist/_astro/` at guessable hashed URLs, including the two this item deliberately excluded. One of those two, `huayna-summit.jpeg`, was excluded **because it shows six or more identifiable third parties and `C-06` requires their consent.**

So this is not a page-weight defect, it is a confidentiality one, and it is exactly the invisible class: nothing renders the file, no test looks for it, every check stays green, and the photograph is on the internet. Two answers, and this item takes both:

1. **`resources/photos/` is the publication boundary**, stated rather than assumed. Anything in it ships. The two held-back photographs move out, which is an author action (`H-02`).
2. **The gateway fails the build on a file nothing references**, derived from the directory listing against the `photos` entries of both locales rather than from a roster (`P-13`). An unreferenced asset becomes a named build error instead of a silent publication.

### What the photographs actually cost, measured

AVIF, per photograph, per emitted width:

| | 340w | 680w | 1024w |
|---|---|---|---|
| `Huayna-Potosi-landscape` | 6.9 KB | 22.3 KB | 44.3 KB |
| `me-profile` | 11.8 KB | 43.7 KB | 88.6 KB |
| `bolivia-landscape` | 13.1 KB | 51.8 KB | 123.1 KB |

A 1440 desktop at 2x takes the panorama at 1024w and the two paired photographs at 680w — **139.8 KB of AVIF for the whole page's photography.** A 390 phone takes far less. Recorded as a measurement rather than an impression (`C-01`).

## Decisions

- **The full-width photo slot is 3:2, not the artboard's 21:9.** The author's call, taken on the measurement rather than on preference: the source is 1080x717, and a 21:9 crop gives 1080x463 on an element that runs to 1176 CSS pixels, cutting away the sky and the foreground road that give the mountain its scale. Rejected: re-exporting at 2400px, which depends on a full-resolution original that may not exist. Recorded as a declared design-fidelity deviation rather than absorbed silently.
- **`<Picture>`, never `<Image>`.** Not a style preference — `<Image>` accepts a `formats` array and ignores it, emitting WebP only. A component written the obvious way would have shipped believing it had AVIF.
- **`resources/photos/` is the publication boundary, and the build enforces it.** `ABOUT-009` fails the build naming any file in that directory that no `photos` entry in either locale references. Derived from the directory listing, never from a roster (`P-13`). Rejected: relying on the convention that nobody drops a private photograph there, which is exactly the convention that was about to fail.
- **No new layout file.** `site/src/layouts/` holds four against a cap of six, and three new archetypes would fail `S-03`. Each page composes `BaseLayout` with a page-level component, the shape `index.astro` already uses with `HomeSections`.
- **The next-up block is one component, not two.** About and Experience draw it identically apart from a top margin. A variant or a prop, never a copy — this is the class of duplication that made About and Experience read as the same page in the first place.
- **The About body carries its own structure in markdown**, not in frontmatter: one thematic break marks where the paired photographs go, and one blockquote is the pull line. Rejected: positional rules over paragraph indices, which break silently the day a paragraph is added.

## Slicing

Four extracts written to the scratchpad before any brief exists, so the artboard read happens **once**, here, and no delegated run repeats it. TASK 12's eighth specimen burned ~100k tokens across 30 tool calls and produced zero files: it was still reading an artboard.

- `shell-extract.md` — the rules belonging to no component, plus the token mapping and the one vertical-rhythm gap this item opens. TASK 24 shipped a home page edge to edge because exactly this class of rule reached none of five components.
- `about-extract.md`, `experience-extract.md`, `notfound-extract.md` — component CSS and markup, one per page.

**Every brief is forbidden from opening any `.dc.html` file**, owns two files, and runs no gate, no build and no `astro check`. Each writes its log skeleton first — the one mitigation with a measured result, since both cut-off runs that did it kept their logs. A cut-off slice is resumed by message, never taken over: taking over is what produced TASK 43's concurrent-write collision.

## Log

### Round one — four core modules, four delegated slices in parallel

| slice | owns | outcome |
|---|---|---|
| A · employment record | `pages/employment-record.{mjs,test.mjs}` | delivered, 9 tests |
| B · about frontmatter | `pages/about-article.{mjs,test.mjs}` | **cut off after test 7 of 10**, resumed by message, delivered 10 tests |
| C · about body plugin | `pages/about-body.{mjs,test.mjs}` | delivered, 9 tests |
| D · published photos | `assets/published-photos.{mjs,test.mjs}` | delivered, 7 tests — **cut off during a self-check it added**, work already complete and green |

**Two of four hit their turn budget, and neither lost any work.** That is a better ratio than TASK 25's five of five, and the difference is what the briefs handed over: four extracts written by the orchestrator, every brief forbidden from opening an artboard, and no brief asked to run a gate or a build. B lost three tests and was resumed by message in one round trip; D was cut *after* its seven tests were written and passing, during a verification step it chose to add — so the deliverable was whole in both cases. Recorded as evidence for `TASK 55`.

**All three finished agents reported their TDD honestly rather than dressing it up.** A wrote the general implementation before growing the tests and said so, then neutered its own module and recorded 7 of 9 failing to prove the tests discriminate. B did the same for two of its four `readPhotoFigures` tests. C swapped its implementation for a stub and recorded 3 of 9 passing against a no-op — correctly identifying that the three survivors were the negative-assertion tests, which is the honest reading rather than the flattering one.

Core suite after round one: **191 tests, 0 failures**, up from 156.

### The orchestrator's own work, round one

- **`tokens.css` gained the one shell rule the extract predicted** — the vertical rhythm of a document page. Horizontal measure was already there; the artboards put top and bottom on `main`, which our shell had never carried. It lands once, as `section.document-page`, and no component declares page padding. This is the exact class of rule that shipped the home page edge to edge.
- **The rail learned a neutral-locale state.** The language switcher took `lang` plus `alternateHref`, which cannot express "no locale is current". It now takes one discriminated `localeSwitch` — `{ kind: 'alternate' }` or `{ kind: 'neutral' }` — rejected: an optional href plus a boolean, which can express a fourth combination that means nothing. Threaded through `Rail`, `BaseLayout` and the four existing call sites; `astro check` clean at 0 errors before anything else was built on top of it.
- **The about-body plugin is registered** in the markdown pipeline, and the gateway gained the About content, the Experience record, the both-locale chrome read and the locale home hrefs.
- **`AboutPhotoFigure`, `NextUp` and `DocumentHead`** are the orchestrator's, because each is shared or depends on the image-pipeline spike.

### Round two — three component slices

`experience/`, `about/` and `not-found/`, two files each, every brief pointed at its extract and forbidden from opening an artboard.

| slice | owns | outcome |
|---|---|---|
| E · experience components | `experience/EmploymentRecord.astro` + `EmploymentEntry.astro` | delivered, full report |
| F · about components | `about/AboutArticle.astro` + `AboutByline.astro` | delivered, full report |
| G · not-found components | `not-found/NotFoundPanels.astro` + `SeveredLink.astro` | delivered, full report |

**Three for three, none cut off.** Round one lost two of four to the turn budget; round two lost none, on work of comparable size. The difference is what the brief handed over: each of these three read one extract and one shell extract instead of an 800-line artboard, and none was asked to verify anything. That is the clearest evidence this repository has that the cut-off correlates with what an agent must **consume**, not only with what it must produce — which is the second axis `TASK 55` is looking for.

**Two of the three reported a design decision the orchestrator had not specified**, which is what a report is for:

- G was warned that the artboard writes each locale panel as a `<section>` and that the shell insets every section. It used `<article>` instead and said why — the semantically truer element, and no scoping trick needed.
- F was handed the flex-order mechanism as a requirement and returned the actual `order` values with the reasoning for why one prose part and two prose parts both land correctly, plus a loose end it could not verify from inside its own slice: whether the pipeline emits those parts as direct children of the slot. **It does — confirmed against the built page.**

### Verification the orchestrator ran

- `npx astro check` — **0 errors**, twice: once immediately after the rail refactor, before anything was built on top of it, and again with all components in place across 90 files.
- **Caches cleared before every build.** `node_modules/.vite` and `node_modules/.astro` key the markdown pipeline's output on the markdown, so a change to a plugin under `site/lib/**` does not invalidate them. `TASK 25` proved a full suite green against HTML built by the previous version of the code, and this item adds a pipeline plugin — so the risk is live, not theoretical.
- `npx astro build` — **17 pages**, exactly the predicted count: 12 before, plus About, Experience and the 404 in both locales.
- `node --test "site/lib/**/*.test.mjs"` — **191 pass**, up from 156.
- `check-site` — PASS, after one finding of this item's own.
- `check-content`, `check-docs`, `check-terms` — PASS.

### Two defects the orchestrator found by reading the built HTML

Neither was visible to `astro check`, and neither would have failed a test that nobody had written yet.

**1. About shipped with its page inset applied twice.** `AboutArticle` rendered a `<section>`, and the page module already wraps its content in one — so the shell's `section` rule matched both and the entire page sat indented against every other page on the site. This is precisely the failure `TASK 24` shipped in the opposite direction, and the reason the not-found brief carried an explicit warning about it. **The warning worked where it was given and the defect landed where it was not**: G was told and used `<article>`; F was not told and used `<section>`. Fixed by making the About root an `<article>` too, with the reasoning in the frontmatter rather than in an HTML comment — the first fix shipped the explanation to production inside a comment, which is its own small defect and was corrected in the same pass.

**2. A unit test pinned a real case-study path.** `check-site` reported five findings in slice A's test file: it used a real slug and a real `/case-studies/...` path as fixture data. The guard is right — the route set is derived, and a test that spells a path out is a test that pins something it does not own. The fixtures are now invented (`a-worked-example`), which is what a pure function over injected data should have had from the start. Nine tests still green.

### What the rendered pages actually prove

Read off the built HTML rather than off a test's opinion of it:

- **About**: two prose parts, one drop paragraph, one pull quote, one paired-figure block, one wide figure — and **no lead paragraph and no empty gap where one would go**, which is the absence-over-approximation rule holding against real unwritten content.
- **Experience**: four entries, **exactly one** most-recent badge, **zero** logo squares (no role declares one, and an empty placeholder frame would have been a mockup artifact shipping), and all four case-study rows resolving.
- **The locale join**: the Spanish Experience page links **only** to `/es/case-studies/...` and prints the Spanish title from the linked entry's own file — `Recuperar el segundo factor de autenticación de manos de un proveedor`, not the English one. Zero English article links on the page.
- **The 404**: two panels, `lang="en"` and `lang="es"`, **no `aria-current` anywhere on the page**, both language codes rendered as links pointing at `/` and `/es/`, and the status line composed across both locales as `HTTP 404 · not found · no encontrado`.
- **No photograph leaked.** Three source images emitted, exactly the three the content references. The two the author withheld are gone from the tree, and the build now fails if an unreferenced one returns.

### The photographs, measured

27 image variants emitted from three sources. AVIF at the widths the layout actually asks for: the panorama at 20 KB / 39 KB / 51 KB, the portrait at 43 KB / 88 KB, the landscape at 51 KB / 123 KB. A 1440 desktop at 2x takes roughly **140 KB of AVIF for the whole page's photography**, against 652 KB of source JPEG. Cold build 9.5s against a warm 1.3s, which is the cost of the cache-clearing discipline above.


## Done

```yaml
done:
  spec:            { status: passed, evidence: ["SPEC-TASK-26-about-experience-and-404.spec.md approved by the author and recorded in the file as status: active, approved_version: 1.0 BEFORE any delegation", "19 behaviors, 11 critical, all implemented", "3 drift rows recorded: the 3:2 photo slot, <Image> silently ignoring a formats array, and the asset glob publishing every match"] }
  tests:           { status: passed, evidence: ["npx playwright test -> 303 passed across chromium, firefox and webkit", "node --test site/lib/**/*.test.mjs -> 212 pass 0 fail (156 before this item)", "npx vitest run -> 15 pass", "npx astro check -> 0 errors across 91 files"] }
  tdd:             { status: passed, evidence: ["all four core modules were delegated test-first and three of the four reported their own red evidence unprompted", "honest exception: slice A wrote the general implementation before growing its tests and said so, then neutered its own module to prove 7 of 9 tests discriminate", "slice D was cut off before reporting its red evidence, so its tdd dimension reads partial rather than passed"] }
  red_path:        { status: passed, evidence: ["two mechanisms neutered with the build caches cleared -> the locale join failed immediately; the unwritten-lead omission did NOT, because the component guards it too", "neutering the component guard as well -> 2 of 25 fail", "restored -> 25 pass, then 303 across three engines"] }
  mutation:        { status: passed, evidence: ["76.72 against break 74.5 — the highest this repository has measured, up from 75.90 at the previous item's close", "site/lib/content/pages 82.93 -> 96.59 after a hardening pass: survivors 27 -> 6, uncovered 8 -> 1", "site/lib/content/assets 93.75", "33 hardening tests added; nothing suppressed"] }
  gate:            { status: partial, evidence: ["node scripts/gate.mjs -> 18 of 19 steps PASS"], reason: "the `evidence trace` step is red and stays red: hooks are its only writers and H-03 puts evidence/** outside every agent's reach. Same cause TASK 12 owns, and the same one every item since the content layer has closed with" }
  design_fidelity: { status: partial, evidence: ["102 screenshots at 1440 / 1024 / 390 in both themes across 17 pages, including the not-found page for the first time", "orchestrator read About and Experience at 1440 light, and the not-found page at 1440 light and 390 dark, against the extracts", "three defects found by looking and fixed: About's page inset applied twice, an explanatory HTML comment shipping to production, and the not-found page printing HTTP 404 in the display slot where the artboard has the numeral alone"], reason: "the author has not yet looked. One declared deviation: the full-width photo slot is 3:2 where the artboard specifies 21:9, decided by the author on the measurement" }
  content:         { status: passed, evidence: ["check-content PASS", "check-terms PASS", "no file under resources/ was written, moved or deleted by any agent (H-02) — all six content files and the photo removals were the author's own edits from the hand-off packet"] }
  docs:            { status: passed, evidence: ["check-docs PASS", "check-site PASS after two findings of this item's own", "guards.config.json pendingRoutes emptied, which is its documented healthy end state"] }
  loose_ends:      { status: passed, evidence: ["TASK 56 opened — the smoke tier asserted its own pending list must never be empty", "TASK 57 opened — two e2e assertions were load-sensitive and passed in isolation while failing under the full suite", "TASK 58 opened — the screenshot tier's 200 assertion made a newly captured page silently red", "TASK 14 gained a live specimen: a slice log with no done block at all passed clean while two siblings were caught for a bad status", "TASK 55 gained six specimens, including the first where the orchestrator caused the cut-off"] }
  scope:           { status: passed, evidence: ["no artboard diffing — that stays with the fidelity-harness item", "no astro check gate step — that stays with its own item", "no delegated-role budget changed"] }
  author_handoff:  { status: partial, reason: "the About lead paragraph and the Cochabamba paragraph are still unwritten, and the third photo caption is still empty. All three are supported absences: the blocks are absent rather than approximated, an end-to-end test asserts that they are, and each appears with no code change on the day it lands. TASK 20 stays open on exactly those rows plus the photographs it still names" }
  ci:              { status: not_applicable, reason: "no remote exists; the workflow is unfiltered and inert until the publish item lands" }
  security:        { status: not_applicable, reason: "no credential and no network egress — but see the confidentiality finding below, which is this item's most important result and is NOT a no-op" }
  iterations:      { status: passed, evidence: ["9"] }
```

## The one thing this item should be remembered for

Not the three pages. **The build publishes every file its asset glob matches, referenced or not** — measured against a real build before a line of production code was written, under both an eager and a lazy glob.

A photograph the author had deliberately withheld, because six or more identifiable people are in it and `C-06` requires their consent, was sitting in that directory. Nothing rendered it. No test looked for it. Every check was green. It would have gone to the internet at a hashed but guessable URL, and the first anyone would have known is when someone found it.

It was caught because the mechanism was spiked before it was specified rather than after it shipped — which is the discipline `TASK 25` paid for and this item inherited. The answer is in two parts, and both are now in place: the directory is **declared** a publication boundary rather than assumed to be a drop box, and the build **fails naming the file** when it holds an asset no locale references, derived from the directory listing rather than from a list somebody has to maintain.

`INC-03`'s lesson has now arrived through four doors — *dev is not prod*, *nobody looked*, *the build did not rebuild*, and now **what nobody rendered was published anyway.** All four are the same shape: correct code, green checks, and a defect visible only to someone who goes and looks at the real output.
