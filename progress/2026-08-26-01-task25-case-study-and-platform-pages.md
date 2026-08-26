# 2026-08-26 · Session 01 — TASK 25: case study and platform pages

**Task:** TASK 25 — Case study and platform templates
**Status after this session:** DONE

<!-- written as it goes (P-05) -->

## Checkpoint

`SPEC-TASK-25-case-study-and-platform-pages.spec.md` **approved by the author**, in conversation, at the start of this session. The file on disk still read `status: draft` with an empty `approved_version`, so the first write of this session was to record the approval — `status: active`, `approved_version: 1.1`. `H-05` reads the file, not the conversation, so until that landed no write-capable delegation was possible at all.

Fifteen behaviors, `CASE-001`…`CASE-015`, nine of them `critical`.

## The warning this item carries forward

`TASK 24`'s closing note is the one fact that shapes the verification plan here: **every automated check was green — `astro check`, `check-site`, the smoke tier, the mutation gate — while five design defects shipped.** Missing art, a hole in the bento, three absent responsive stages, a form at twice its width. The gate is not the design-fidelity instrument and this item does not pretend otherwise: the artboard read is a named verification step with the author in it, not a side effect of a passing gate.

## Findings from validating against real state (P-04)

Recorded before any code, because four of them changed the plan.

- **Astro already assigns heading ids.** Its own heading-id pass runs by default and the `headings` array `render()` returns carries `{ depth, slug, text }`. So the question is not *whether* ids exist but *whose* they are — see the decision below.
- **`site/lib/content/entries/` cannot hold the modules the brief assigned to it.** It holds four files today and `S-03`'s cap fails at seven. `toc` + `article-sections` + `article-masthead` + `deep-dives`, each with its test, is eight new files. The split is forced, not chosen.
- **`## Deep dives` is the LAST section of the platform body, after `What I would do differently`.** `CASE-011`'s "strip the deep dives first, then the self-critique is last" is therefore load-bearing rather than defensive: without the strip, the positional rule picks the wrong section.
- **The artboard's table of contents carries a `#deep-dives` entry** on `PlatformPage.dc.html`, and its entries are *shortened* against the real heading text (`One decision: two services` for `One decision worth explaining: two services, not one`). The first is reproducible; the second is not, because shortening is new copy (`S-01`).
- **Eleven directives resolve to eleven ids, and all eleven `.svg` files exist** in `resources/diagrams/`. Counted, not assumed.
- **`resources/site/contact.{en,es}.md` is deleted in the working tree** (`TASK 50`). It was never in `ROUTED_PAGE_SLUGS`, so it does not touch this item — noted only so the next reader does not attribute the deletion here.

## The finding that changed the mechanism (P-04)

**Astro 7 does not use remark.** Its markdown pipeline is `satteri` (`@astrojs/markdown-satteri`), and `markdown.remarkPlugins` / `rehypePlugins` are deprecated in favour of `markdown.processor`. Every plan written against "register remark-directive plus a heading-id plugin" was written against a pipeline this repository does not have. Found by installing `remark-directive`, discovering `remark-parse` was not resolvable anywhere in the tree, and reading what Astro ships instead.

What that changes, and what it does not:

- **`remark-directive` is not needed and is uninstalled.** Container directives are a **built-in feature**: `satteri({ features: { directive: true } })`. `unist-util-visit` is uninstalled with it — satteri plugins subscribe to node types by name and never walk a tree. `@astrojs/markdown-satteri` is installed as a direct dependency instead, because `astro.config.mjs` imports it (`S-07`).
- **Plugins are plain objects, not unified attachers.** `{ name, containerDirective(node, ctx), heading(node, ctx), after(root, ctx) }`. Mutation goes through `ctx.replaceNode` / `insertBefore` / `setProperty`, never by mutating the node.
- **Every behavior the spec describes is still reachable, and all of it was verified against the real processor before a line of production code was written.** Two spikes, both run:

| What was in doubt | Result |
|---|---|
| Does the directive body arrive whole, with the `Spec:` lines? | Yes. `ctx.textContent(node)` returns the caption line, then the `Spec:` line, then its continuation, newline-separated in one string — so the split is a pure string function, exactly as `CASE-003` describes it |
| Can a directive become a real `<figure>`? | Yes. `ctx.replaceNode` with a `Custom` node carrying `data.hName` / `data.hProperties` emits `<figure class="…"><img src alt><figcaption>…</figcaption></figure>` |
| Whose heading ids win? | **Ours.** Astro's heading-ids pass reads an existing id and keeps it, and the `headings` array it returns then carries our slug. `CASE-002`'s "the same heading list the body renders" is literally true |
| Can a plugin hand data to the template? | Yes. `ctx.data.astro.frontmatter.X` surfaces as `remarkPluginFrontmatter.X` — how the deep-dive slugs travel out of the one parse that found them |
| Does a raw `<div>` opened before one node and closed after another survive? | Yes. `{ raw: '<div class="…">', mdxExpressions: false }` before the last `##` and its closer after the last node wraps the whole section correctly |
| Are `CASE-010`'s and `CASE-012`'s structural rules actually checkable? | Yes, and they are cleanly distinct: a deep-dive list item's first inline child is a `link`, a services list item's is a `strong` followed by a text node opening with an em dash |
| Does the strip-then-split order work? | Yes. With the deep-dives section removed first, the last `##` section is the self-critique — `CASE-011` verified on the real pipeline, not reasoned about |

**Nothing under `site/lib/**` imports anything external — production code or test.** Satteri lives in `site/node_modules`, and Stryker symlinks only the root `node_modules` into its sandbox; a lib test importing it would resolve locally and fail inside the mutation run, which is the kind of breakage that shows up as a score collapse rather than as an error anyone reads. So each module is pure functions plus a plugin object whose visitors only call them, and the plugin is tested against a recording fake `ctx`. The real pipeline is proven by the build and the e2e tier, which is where `T-02` wants that proof anyway.

## Decisions

- **The five parses live under three directories, not the two the spec named.** `site/lib/content/diagrams/` (4 files), `site/lib/content/articles/` (6 files — `toc`, `article-sections`, `article-masthead` and their tests) and `site/lib/content/entries/` (6 files — the existing four plus `deep-dives`). `articles/` names a context, the article body's own structure, rather than absorbing overflow — which is the distinction `S-03` actually cares about. Forced by the file cap; recorded because the spec's constraint block names only two new folders.
- **Heading ids are ours, assigned in an mdast plugin, and the table of contents reads the same list.** Rejected: letting Astro's own pass assign them and having `toc.mjs` only filter — the spec's `disambiguates duplicate heading text` and `ids are locale-native` tests would then be asserting things about `github-slugger` that our code never decides, which is `T-02`'s shape (a test that passes with the system under test removed). Verified that this works rather than assumed: Astro's heading-ids pass respects an id that is already there.
- **The deep-dives section is stripped in the mdast plugin and its slugs travel out through `remarkPluginFrontmatter`.** Rejected: stripping on the raw markdown string in the gateway and again on the mdast in the plugin — that is literally the "second parse that could disagree" `CASE-010` names. One rule, one place, and the template joins the slugs it is handed.
- **Diagram SVGs are served by a static endpoint** (`src/pages/diagrams/[id].svg.ts`) rather than copied by a build integration. Same outcome — a plain file copy into the build output, nothing written to the working tree — but it works identically in `dev` and `build` with no lifecycle hook, and a missing id fails `getStaticPaths` naming the id, which is exactly `CASE-004`'s required error.

## Slicing

`TASK 12`'s specimen set is the evidence: **every slice owning more than two files was cut; every slice owning two completed.** So every slice below owns two files, and the orchestrator keeps the config edits, the gate and the build.

| slice | owns | role |
|---|---|---|
| A1 | `diagrams/diagram-directive.mjs` + its test | `implementer`, TDD |
| A2 | `diagrams/diagram-assets.mjs` + its test | `implementer`, TDD |
| B1 | `articles/toc.mjs` + its test | `implementer`, TDD |
| B2 | `articles/article-sections.mjs` + its test | `implementer`, TDD |
| B3 | `articles/article-masthead.mjs` + its test | `implementer`, TDD |
| B4 | `entries/deep-dives.mjs` + its test | `implementer`, TDD |
| — | `astro.config.mjs`, `package.json`, the gateway | orchestrator |
| C1–C3 | the five article components, two at a time | `implementer` |
| D1 | `CaseStudyDetail.astro` + `PlatformPage.astro` | `implementer` |
| — | the two route files, the endpoint, `pendingRoutes` | orchestrator |
| E1 | `case-study-pages.smoke.spec.ts` | `test-engineer` |
| — | gate, Stryker, the artboard read | orchestrator |

**No brief runs the gate or the build.** That is the orchestrator's step, after each slice lands — `TASK 12`'s finding was that verification is what gets cut when a brief mixes proving with building.

### The mutation pass, and why it was not optional

The first measured run put the item at **74.75** against a floor of 74.5 — passing, with a quarter of a point of slack, which is thinner than the floor's own documented drift. The two new directories were the worst in the tree: `diagrams` at 62.16%, `articles` at 73.87%. **121 surviving mutants in code written today.**

That is a finding, not a statistic. A survivor is proof that a test asserts nothing about the line it covers, and the pattern was consistent: the behavioural tests asserted the thing a reader would notice and nothing about the *shape* of what was emitted, so a mutant could rename a class, empty a `src`, or drop a guard clause without a single failure. The pass added shape assertions and boundary cases — a directive that is not a diagram, a link that only looks internal, a bold run with nothing after it, a separator that appears twice, an id that would come out empty.

| surface | before | after |
|---|---|---|
| `site/lib/content/diagrams` | 62.16 | **90.54** — 0 uncovered |
| `site/lib/content/articles` | 73.87 | **83.78** |
| `site/lib/content/entries` | — | **88.41** |
| `site/lib` overall | 79.78 | **88.17** |
| repository | 74.75 | **75.90** |

The floor is 74.5, so this item leaves **1.4 points of headroom where it found 0.25**. Nothing was suppressed; every mutant that died did so to a test.

### One design-fidelity defect, found by looking

The artboards mark **Work** as the current rail item on an article page. Ours marked nothing: the rail marks an item current when its slug matches the page, and `work` is an anchor with no slug, so no article could ever light it. Invisible to every check — the page was valid, the test suite green, the classes correct.

Fixed by declaring the relation once, as data: `SECTION_NAV_KEY_FOR_ARTICLES` lives in the nav structure module beside the items it refers to, with a test asserting it names an item that exists. Rejected: writing `"work"` into the two templates, which spreads a structural fact across the files least able to keep it true.

**This is the class of defect `TASK 24` shipped five of, and it was found the same way — by looking at the rendered page rather than at a report.**

## Author hand-off — two `ui` strings

`resources/**` is frozen (`H-02`), so these are the author's to add, in the `article:` group of **both** `ui.en.md` and `ui.es.md`:

- **`part_of`** — the connective in `Case study · part of <platform title>` (`CaseStudyDetail.dc.html` 262). Until it lands, a child case study ships the bare `case_study_tag` and no parent clause.
- **`figure_prefix`** — the `Fig. 1 —` prefix on a figcaption (`CaseStudyDetail.dc.html`, every figure). Until it lands, captions render unprefixed and figures are not numbered.

Neither is invented and neither is approximated (`S-01`, `C-01`). Both blocks ship useful without them.

- **The table of contents is injected into the rail through a named slot, and the wrapper only exists when the slot is filled.** `Rail.astro` renders `<div class="site-rail__mid">` around the nav and the slot only when `Astro.slots.has('rail-extra')`. Rejected: always wrapping — it changes the home page's rail DOM for a page that has no table of contents, and the narrow rail's `flex: 1 1 auto` on the nav is exactly the kind of thing a new wrapper silently breaks.
- **The table of contents prints each heading verbatim.** The artboard shortens long entries (`One decision: two services` for `One decision worth explaining: two services, not one`). Shortening is new copy, and copy lives in `resources/**` (`S-01`). Declared as a design-fidelity deviation rather than invented.

## Log

### The core — six modules, five delegated slices

Five `implementer` runs, each owning two files, launched in parallel on disjoint objects.

| slice | owns | outcome |
|---|---|---|
| A1 · diagram directive | `diagrams/diagram-directive.{mjs,test.mjs}` | delivered, 4 tests |
| A2 · diagram assets | `diagrams/diagram-assets.{mjs,test.mjs}` | delivered, 6 tests — **cut off mid-sentence while fixing its own finding**, but the files were complete |
| B1 · table of contents | `articles/toc.{mjs,test.mjs}` | **cut off with two of three exports written.** Finished by the orchestrator |
| B3 · masthead | `articles/article-masthead.{mjs,test.mjs}` | delivered, 5 tests — cut off before reporting |
| B4 · deep dives | `entries/deep-dives.{mjs,test.mjs}` | delivered, 7 tests — cut off before reporting |

`articles/article-sections.{mjs,test.mjs}` — the largest of the six — was written by the orchestrator, test-first, after the budget pattern below made a sixth delegated run a poor bet.

**All five delegated runs hit their turn budget.** Five for five. That is not a slice-size accident: every one owned exactly two files, which is the size `TASK 12`'s specimen set says completes. What is different here is the *reading* — each brief needed the entry files, the artboards and a pipeline API nobody had used before, and the reading is what the budget went on. Recorded as a finding rather than absorbed, and tracked below.

### Verification the orchestrator ran

- `node --test "site/lib/**/*.test.mjs"` — **120 pass**, six new modules among them.
- `npx astro build` — **12 pages**: two home routes, ten article routes, plus eleven `.svg` assets emitted at `/diagrams/<id>.svg`.
- `npx playwright test routes.smoke.spec.ts` — **18 pass.** Every article route 200 with no console error; `about` and `experience` still 404 while pending.
- `npx playwright test case-study-pages.smoke.spec.ts` — **16 pass.**
- `check-site` — **PASS**, after four findings of this item's own were fixed.

### The two assertions the author asked for by name

Read off the built HTML, not off a test's opinion of it:

- **No text beginning `Spec:` appears anywhere in any of the twelve built pages.** `grep -rn "Spec:" dist --include="*.html"` returns nothing — checked on the rendered text and on the markup, so it is absent from `alt` and `title` too.
- **The deep-dives section renders exactly once.** One `.deep-dives` block, three `.deep-dive-card`s, and **zero** surviving `<li>` links in the body, in both locales. The Spanish cards point at `/es/case-studies/…`, not at the English paths the markdown literally writes.

### Proven in red, which is where the day's worst finding came from

Both mechanisms were deliberately neutered — the caption split made to keep the `Spec:` lines, the deep-dives strip made a no-op — and the suite re-run. **It passed, all sixteen.**

The tests were not the problem. **The build was serving a cached render.** `node_modules/.vite` and `node_modules/.astro` cache the markdown pipeline's output, and a change to a plugin under `site/lib/**` does not invalidate it: the markdown had not changed, so the rendered HTML was reused and the neutered code never ran. Clearing both caches and rebuilding produced `Spec:` twice and three raw deep-dive list items, and the suite then failed **6 of 16** — so the tests do discriminate, and the first run had proved nothing at all.

This is `INC-03`'s shape arriving through a new door for the second time in three items: not *dev ≠ prod*, and not *nobody looked*, but **the build did not rebuild.** It is tracked as its own work item rather than noted here, because the consequence is general: any future change to a content-pipeline plugin can pass a full green gate against HTML built from the previous version of that plugin.


## Done

```yaml
done:
  spec:            { status: passed, evidence: ["SPEC-TASK-25-case-study-and-platform-pages.spec.md — approved at 1.1 and recorded in the file before any delegation; 15 behaviors implemented", "4 drift rows recorded: the pipeline is satteri not remark, three folders not two, CASE-005's declared row order, CASE-013's coverage gap closed"] }
  tests:           { status: passed, evidence: ["npx playwright test -> 204 passed across chromium, firefox and webkit (81 before this item)", "node --test site/lib/**/*.test.mjs -> 156 pass 0 fail (120 before the hardening pass, 72 before this item)", "npx vitest run -> 15 pass", "npx astro check -> 0 errors, 0 warnings"] }
  tdd:             { status: passed, evidence: ["every one of the six core modules had its test run and fail before the implementation existed", "toc.mjs and article-sections.mjs were written by the orchestrator red-first after their slices were cut", "honest exception: two of diagram-directive's four tests passed on first run because a general implementation already covered them, and the agent reported that rather than inventing a red step"] }
  red_path:        { status: passed, evidence: ["both critical mechanisms neutered -> case-study-pages.smoke fails 6 of 16; restored -> 16 pass", "the FIRST attempt at this passed with both mechanisms broken, which is how TASK 54 was found"] }
  mutation:        { status: passed, evidence: ["75.90 against break 74.5 — the highest this repository has measured, up from 74.74 at the start of the day", "site/lib 79.78 -> 88.17; diagrams 62.16 -> 90.54 with zero uncovered; articles 73.87 -> 83.78; entries 88.41", "121 survivors in new code were treated as findings and killed with tests; nothing suppressed"] }
  gate:            { status: partial, evidence: ["node scripts/gate.mjs -> 17 of 19 steps PASS"], reason: "the `evidence trace` step is red and stays red: hooks are its only writers and H-03 puts evidence/** outside every agent's reach. 52 orphaned tool.result events, the same cause characterized against TASK 12, which owns the writers" }
  design_fidelity: { status: partial, evidence: ["72 screenshots at 1440 / 1024 / 390 in both themes for all 12 routes, regenerated by the gate", "orchestrator read the platform at 1440 light and dark, at 390, and the Spanish case study at 1440, against CaseStudyDetail.dc.html and PlatformPage.dc.html", "one defect found and fixed: the rail marked no current item on an article page where the artboards mark Work"], reason: "the author has not yet looked. Three declared deviations, all recorded: the table of contents prints headings verbatim where the artboard shortens them, the .pair-label above each figure is not reproduced, and the type: table diagram renders as its SVG rather than the artboard's hand-drawn table" }
  content:         { status: passed, evidence: ["check-content PASS", "check-terms PASS", "no file under resources/ was written, moved or deleted by this item (H-02)", "no drawing-spec text reaches any built page — grep over all twelve"] }
  docs:            { status: passed, evidence: ["check-docs PASS after a stale exemption was removed", "check-site PASS after the screenshot tree was excluded with a written reason", "the spec's behavior and test statuses reconciled; TASK 25's three open decisions answered in the entry that asked them"] }
  loose_ends:      { status: passed, evidence: ["TASK 54 opened — a green gate can measure HTML the current code did not produce", "TASK 55 opened — five delegated runs, five exhausted budgets", "TASK 51 closed, run in parallel", "TASK 6's trigger has fired: the diagrams now render in a real page, and they are light-only Mermaid exports framed on a declared surface token"] }
  scope:           { status: passed, evidence: ["the /case-studies index stays unrouted, as the item requires", "about and experience stay pending", "no artboard diffing — that is the fidelity-harness item"] }
  author_handoff:  { status: partial, reason: "article.part_of and article.figure_prefix are still owed in both locales. Both blocks ship shorter rather than approximated, and the parent clause is already wired so it appears the day the string lands, with no code change" }
  ci:              { status: not_applicable, reason: "no remote exists; the workflow is unfiltered and inert until the publish item lands" }
  security:        { status: not_applicable, reason: "no credential, no network egress, no new boundary — static pages reading local content" }
  iterations:      { status: passed, evidence: ["7"] }
```

**The one thing this item should be remembered for.** Not the pages. The red path that refused to go red: both critical mechanisms were deliberately broken and every test still passed, because the build was serving HTML rendered by the previous version of the code. `TASK 24`'s lesson was *the gate is necessary and not sufficient*. This item's is narrower and worse — **the gate can be measuring something other than what you just wrote**, and nothing in any report says so.
