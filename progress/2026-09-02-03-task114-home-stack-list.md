# 2026-09-02 · Session 03 — TASK 114, the stack strip becomes its own curated list

**Task:** TASK 114 — The home stack strip as a curated content pair, with marks
**Status after this session:** DONE — code and content both landed, full gate green on the real tree

## What was done

The strip stopped being derived and became content. A `stack` collection over a new locale pair, a core module holding the three rules that span two files, a gateway query that inlines each mark, the component's mark slot finally doing what the artboard designed it to do, and the dead aggregate deleted rather than left reachable. The nine-of-twenty-two entries that were never technologies left the home page and stayed in the case-study mastheads, where they have context.

## Decisions

- **The list stops being derived from the case studies and becomes content the author owns.** `listStack` returned the deduplicated union of every case study's `stack:` frontmatter, which is not a technology list: that array is what a reader of *that article* needs to know, so it legitimately holds standards (`BIAN`), notations (`C4 model`), practices (`batched stored procedures`) and hardware categories (`biometric terminals`). Under a heading that says *Technologies I've worked with*, half the strip contradicted its own title. Rejected renaming the heading to cover both, which keeps a list where half the entries can never carry a mark.
- **The non-technologies leave the home page and nothing is orphaned.** `article-masthead.mjs` renders `stack` as a masthead row on every case study, so `BIAN`, `C4 model` and the rest keep the one place where they have context.
- **Marks are monochrome and painted with `currentColor`, not full-colour brand logos.** The site has two themes and the chip is text at `--color-ink-muted`; a colour logo needs a per-logo dark check and fifteen different brand colours break the strip's register.
- **`resources/logos/stack/`, not `resources/logos/`.** See the findings below — a second logo consumer already exists.
- **A wordmark is not a usable mark, so `.NET` and `iOS` render the dot.** Measured with `getBBox()` in a real browser rather than eyeballed: 24x8.94 and 24x11.9, which is 6.7px and 8.9px tall inside the 18px box, beside a 13px name saying the same word. Rejected the author's first instinct — logo-only chips for those two — on three grounds: the mark is `aria-hidden` so the technology would vanish for a screen reader, the marquee is a repeating two-part unit whose rhythm two chip shapes destroy, and the thing would be illegible anyway.
- **The colour-literal fixtures are assembled, not written.** The detector needs literals to detect and lives inside the tree that forbids them. Rejected an exclusion entry, which would have been a roster.

## Findings from validating against real state (P-04)

- **The design had already decided all of this, and the implementation took a shortcut.** `Main.dc.html:230-232` declares `.mark.has-logo { width: 18px; height: 18px }` with `object-fit: contain`, and the comment above it calls the dot *"the mark slot, in its no-logo state… a designed fallback rather than a gap"*. `StackStrip.astro:65-74` copied that comment without the mechanism. The artboard's own chip list was also already **curated** — 15 items including `Polly` and `BFF`, which appear in no case study's `stack:` at all — against the ~26 the live page derives. So the aggregation was never the design.
- **A second logo consumer exists, built and empty.** `EmploymentEntry.astro:36-37` renders `<img src={logo} alt="">` from the `logo` key of each role in `experience.{en,es}.md`, with its own artboard block at `Main.dc.html:286-300`. No role declares one today. That is what decides the folder: a flat `resources/logos/` would make every employer logo read as unreferenced to the stack's publication-boundary check and every tech mark unreferenced to the employers', so the check would need a roster to tell them apart (`P-13`).
- **`site/src/components/home/` is now at 6 files of 6.** `TASK 113`'s log recorded 5 with "zero headroom"; `Testimonials.astro` took the last slot. So this item adds **no** file there — the mark is a variant of the existing span rather than its own component.
- **`listCaseStudyStackForLang` has exactly one consumer.** Once the gateway stops calling it, the function and its five tests are dead and are deleted rather than left as a second, wrong answer to *what is the stack*.
- **`assertEveryAssetIsReferenced` is reusable verbatim.** It destructures `{ file }` from each entry, which is why the frontmatter key is `file` and not `icon`.
- **`ui.es.md:175` is stale.** It says `home.stack_heading` *"ya dice Tecnologías que manejo"*; the value at line 38 is `"Tecnologías que he usado"`. `resources/**` is read-only to every agent (`H-02`), so it is flagged to the author, not fixed here.

- **Two claims made from memory were checked and both were wrong, in opposite directions.** Against the real Simple Icons index (16.29.0, 3457 icons): `.NET` **is** present, and **every Amazon/AWS mark is absent** — a grep for `amazon` or `aws` over the full slug list returns nothing, and the Microsoft family is down to `dotnet` alone. Eleven of the twenty-two candidates have a mark; the eleven that do not are almost all service SKUs and components, which is an argument for trimming the list that does not depend on logos at all.
- **The vendors' own terms make the dot correct rather than second-best**, read on 2026-09-02: AWS permits its marks *"in plain text only (no logos)"* and forbids *"changing the … color"*; Microsoft says *"Don't use Microsoft's logos, icons, or designs, in any manner"* and forbids altering them. Using a brand logo AND normalizing it to the site colour is precisely the pair of acts both prohibit, so the chip's plain-text name is the permitted form and the dot beside it is the right render. Recorded in the spec so a later session does not "fix" the two dots by adding logos.

## The mutation gaps were real, and finding them was the point

The first mutation run scored `stack.mjs` at **81%** — 15 survivors and 5 uncovered. Every one named a test that proved less than it looked like it proved, and only one was equivalent:

- **Two assertions passed for the wrong reason.** `RED: an id in one locale and not the other` matched on `/"aws"/`, and `"aws"` also appears in the *order* finding further down — so with the missing-id branch deleted, the test still passed. Same shape on the order test, which matched `/order/` and so never noticed `position + 1` becoming `position - 1`.
- **Only one direction of the cross-locale check was tested**, and the mirror branch had no coverage at all.
- **The whitespace tolerance of both regexes was untested** — `viewBox = "..."` with spaces around the equals sign is legal and nothing exercised it.
- **Four of the five inherited-paint keywords were never asserted.** `none`, `inherit`, `transparent` and `unset` could each have been dropped from the module silently.
- **A missing `stack` key read as `["Stryker was here"]` still passed**, because the test only asserted `doesNotThrow`. The real defect it hides: a phantom entry reported instead of the real one, in a plausible-looking message.

After: **100%** — 102 killed, zero survivors, zero uncovered, one suppression carrying its reason. The suppressed mutant is the only genuinely equivalent one: `<` to `<=` in the order loop reads one past two arrays already proven equal-length, comparing `undefined` with `undefined`.

## How the list ended up

The author curated it twice. First to 13, dropping the two wordmarks. Then five languages and data stores were added — JavaScript, TypeScript, Node.js, MongoDB, MySQL — all five with a mark, all five measured as symbols rather than wordmarks before being handed over. **18 chips, 14 marks, 4 dots**, and the four dots are exactly the four whose owners publish plain-text-only terms: `.NET`, `iOS`, `SQL Server`, `AWS`. Nothing arranged that; it is what the constraint produces.

The whole cycle cost one edit each time, in a file the author owns, with the build refusing every way of getting it wrong — a `file:` with no asset, an asset nothing references, a locale that disagrees. That is the property this item was actually for.

## Open

- `ui.es.md` line 175 still describes `home.stack_heading` with a value it no longer carries. The author's (`H-02`), and unrelated to this item's own surface.

## Done

```yaml
done:
  tests:           { status: passed, evidence: ["site/lib/content/stack/stack.test.mjs — 18 cases, 5 of them red paths", "node --test site/lib/**/*.test.mjs — 323 pass, 0 fail", "npx playwright test home.smoke — 17 pass, 4 of them new"] }
  red_path:        { status: passed, evidence: ["planted one undeclared chip named BIAN — the exact shape of the old aggregate leaking back — and STACK-001 failed in both locales: Expected 13, Received 14. Reverted, green again"] }
  build:           { status: passed, evidence: ["npx astro check — 0 errors, 0 warnings", "npm run build — 17 pages", "rendered dist/index.html and dist/es/index.html — 13 visible chips, 13 aria-hidden duplicates, 11 marks, 2 dots, no colour literal"] }
  scope:           { status: passed, evidence: ["docs/specs/SPEC-TASK-114-home-stack-list.spec.md — approved_version 1.0"] }
  docs:            { status: passed, evidence: ["TASKS.md TASK 114 and the goal-alignment row", "SPEC-TASK-114 drift log", "scripts/guards/guards.config.json _byTypeRationale", "3 canvas artboards realigned, verify.mjs PASS"] }
  content:         { status: passed, evidence: ["resources/site/stack.{en,es}.md — 18 entries, ids and order identical across locales", "resources/logos/stack/ — 14 marks, every one carrying a viewBox and no colour of its own, none unreferenced", "rendered dist/index.html and dist/es/index.html — 18 visible chips, 14 marks, 4 dots, both locales"] }
  mutation:        { status: passed, evidence: ["stack.mjs 100% — 102 killed, 0 survived, 0 uncovered, 1 suppression with its reason", "repository re-measured 80.11% over 8,704 mutants; floor ratcheted 77.0 -> 79.0 in stryker.config.mjs and recorded in .claude/rules/30-testing.md (G-11)"] }
  gate:            { status: passed, evidence: ["node scripts/gate.mjs --profile full — GATE PASSED (profile: full), 22 of 22 steps, run against the final content rather than an earlier one"] }
  iterations:      { status: passed, evidence: ["4"] }
  iteration_split: { status: passed, evidence: ["checkpoint=3", "verify=1"] }
```
