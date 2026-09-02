# 2026-09-02 · Session 02 — TASK 113, the testimonials column on the home page

**Task:** TASK 113 — Testimonials column on the home page
**Status after this session:** DONE — with TASK 19 closed alongside it

## What was done

The three LinkedIn recommendations render on `/` and `/es/`. This item built everything downstream of the words — the `testimonials` collection, the core module, the gateway query, the card component, the restored two-column contact layout, the inverted `HOME-006` — and the author transcribed the words themselves, which `H-02` puts outside any agent's reach.

The recommendations run 1,400–2,400 characters against a card that wants ~150, so the spec gained an optional `excerpt` at 1.1: the full quote stays in the file as the record, the excerpt is what a reader sees, and the build refuses an excerpt whose words are not in the quote it claims to come from.

## Decisions

- **The files live in `resources/site/`, not `resources/`** — the shape they copy is `ui.{en,es}.md`, a data file with no route. `TASK 19`'s wording corrected in the same change (`P-07`).
- **A translated quote renders translated, with a note naming the source language and a link to LinkedIn.** The original stays verbatim in the file and is public at the permalink. Rejected stacking both texts and a `<details>` disclosure.
- **The cross-field and cross-locale rules live in the core, not the collection schema** — they span two levels of one document, and in `site/lib/` they are also mutation-covered.
- **`excerpt` beat editing the quote down.** Editing in place would have destroyed the full text and forced the same elision decision twice for the translated pair. Keeping both bought the invariant that made the field worth having.
- **Surrounding quotation marks are delimiters, not words** — stripped before comparing and before rendering. Reversed a day-one decision; see the findings.
- **An odd number of cards gives the last one full width.** Derived from the count, in CSS, so one card, three and five all work and two and four need no rule. Which recommendation reads last stays the author's decision.

## Findings from validating against real state (P-04)

- **The page reader excluded the interface strings by filename.** `readLocalizedMarkdownEntries(dir, 'ui')` was a roster with one member, and adding `testimonials.{en,es}.md` to the same directory gave it a second it did not know about — the pair began flowing into three e2e suites and the post-deploy verifier **as a page**. Harmless by luck: `deriveRouteSetFromEntries` iterates a fixed slug list and filters case studies by type, so no `/testimonials` route was derived. Replaced with `readPageEntries`, filtering on the declared `type`, four tests pinning the property.
- **`check-content` and `check-terms` both PASS on a malformed testimonial pair.** They validate frontmatter shape and vocabulary; a translation claiming to be an original is neither. That is the argument for where the invariant went, and it stopped being theoretical within the hour.
- **`HomeES.dc.html` and `HomeMobile.dc.html` are generated, not authored.** `derive.mjs` builds the Spanish artboard from `Main.dc.html` by substitution and mirrors the mobile one byte-identically. Hand-editing them was wrong and `verify.mjs` caught it. The substitution table is now **per card rather than per string**, because a translated card carries a source line the native one does not — the locales differ in structure, which no per-string pair can express.
- **`site/src/components/home/` holds 5 files, not 6** — `byDirectory` counts files only, and `work/` is a directory.
- **`HOME-007` is already owned by `SPEC-TASK-24`.** The gap in the home suite's numbering is not a free slot; the new assertion carries `TESTIMONIAL-002`.

## The red paths, proven against real content rather than fixtures (P-14)

Three, all on first real use, all caught by the build rather than by review:

1. **The first transcription copied the English file into the Spanish one**, changing only `lang` and `title`. Both directions of the translation invariant fired, naming all three entries — two translated from English with no `original_quote`, one native carrying one anyway.
2. **An excerpt ended in a period where the source has a comma.** My own draft, rejected. Exactly the class of error nobody catches by reading.
3. **Every excerpt arrived wrapped in quotation marks.** Caught, and then reversed — see below.

## Where the invariant was wrong, and what that cost

Wrapping a quotation in quotation marks is what a person writes without thinking, and the marks are delimiters rather than words: the recommender did not type them and the card draws its own. Refusing them treated punctuation as paraphrase, blocked the author twice, and produced a finding that printed `""Although` — a quote character immediately inside its own delimiter, unreadable at the moment it was needed most.

Both halves fixed. The marks are stripped from the ends before comparing and before rendering, so a wrapped excerpt is accepted and the card never shows two opening marks. A mark *inside* the text is untouched — it is the recommender's own. The finding now delimits with `→ ←`. A test pins that a fragment differing by more than its quotation marks is still rejected, so the tolerance cannot hide a real paraphrase.

**The lesson is narrower than "be lenient".** The invariant's purpose is to catch paraphrase; punctuation the author added as a delimiter was never in scope, and the first implementation was stricter than the property it existed to protect.

## Done

```yaml
done:
  tests:           { status: passed, evidence: ["node --test site/lib/**/*.test.mjs — 309 pass, 0 fail", "site/lib/content/testimonials/testimonials.test.mjs — 34 cases", "site/lib/content/routes/route-source.test.mjs — 4 new cases"] }
  content:         { status: passed, evidence: ["resources/site/testimonials.{en,es}.md", "check-terms PASS", "check-content PASS"] }
  docs:            { status: passed, evidence: ["TASKS.md TASK 19 + TASK 113 DONE", "SPEC-TASK-113 shipped, 5 drift entries", "docs/design/canvas/verify.mjs PASS — 15 artboards"] }
  scope:           { status: passed, evidence: ["SPEC-TASK-113 approved_version 1.1 == version 1.1"] }
  security:        { status: not_applicable, reason: "no credential, no endpoint, no new network path — outbound links only" }
  loose_ends:      { status: passed, evidence: ["TASKS.md TASK 19 — three stated residuals, none reaching a reader (P-19)"] }
  ci:              { status: passed, evidence: ["node scripts/gate.mjs --profile full — GATE PASSED, 22 of 22 steps"] }
  mutation:        { status: passed, evidence: ["gate --profile full, mutation step PASS in 30.7s against the 79.0 floor TASK 114 raised it to"] }
  iterations:      { status: passed, evidence: ["6"] }
  iteration_split: { status: passed, evidence: ["spec=2", "slice=2", "verify=1", "reconcile=1"] }
```

## Open questions

None. Three residuals are recorded on `TASK 19` and each is the author's to take or leave: two typos that no page renders (`Recomendations`, `Al-assisted`), and the card order — moving `solidario-po` last, in both files, puts the long recommendation on the full-width row the author asked for.

## The close, and what nearly went out unverified

The first `--profile full` run of this session was launched at the moment the author said to close the ticket, and it passed. **It was also worthless as evidence for closing**, because it predated the canvas work, `derive.mjs`, the docs reconciliation and the quotation-mark fix. Re-running it over the final tree is what turned up the real state: **7 of 22 steps red**, and not one of them this item's.

**The item was left open on that evidence, and reopened for closing only after a second run.** `TASK 114` landed in the meantime — its own files registered, its progress log completed, the mutation floor re-measured and ratcheted 77.0 → 79.0 — and the confirming run over the finished tree read **GATE PASSED, 22 of 22**. A closure claimed on the first run would have been true by luck and false as evidence, which is the distinction `P-11` exists for: *I ran the gate and it passed* and *the gate passes* are different propositions.

Between the two runs, another session landed `TASK 114` — `resources/site/stack.{en,es}.md`, a spec and a progress log, timestamped 16:12–16:13. Those files are why the gate is red:

| Step | Why |
|---|---|
| `type check`, `e2e smoke`, `e2e visual capture` | `pages → stack.en` fails the collection schema, so the build dies |
| `content` | `stack.{en,es}.md` declares `type: stack`, which `guards.config.json` does not register |
| `guard tests` | the two content LIVENESS cases read the real tree and see the same thing |
| `mutation` | blocked on `guard tests` |
| `procedures` | `progress/2026-09-02-03-task114-home-stack-list.md` has an empty done block |

**Nothing there was touched.** `P-18` and `INC-16` are explicit: a run that is still alive is resumed by its own session, and the orchestrator is the one actor no write-scope allowlist can reach. Fixing another item's half-landed files to make my own gate green would be the exact failure that rule exists to prevent — and it would also have destroyed the evidence that `TASK 114` needs.

**The half-fix worth admitting:** this item found the roster-versus-property defect in how page entries are read, and fixed the readers with `readPageEntries`. It did **not** fix the `pages` loader glob, which still excludes non-page data files by name, because Astro's `glob()` matches filenames and cannot see a frontmatter `type`. `TASK 114` resolved its own case by adding a third name — the glob now reads `!(ui|testimonials|stack)` — so the mechanism is unchanged and will ask for a fourth. Recorded as a stated residual on this item rather than as a work item (`P-19`): the cost is one line, paid by whoever adds the next data file, and the failure is loud and immediate.

## Next

`TASK 30`/`TASK 32` per the register's recommended order. The home page now renders every section its design draws.

## Files changed

`site/lib/content/testimonials/testimonials.mjs` · `.test.mjs` — the core: locale agreement, the translation invariant, the anti-paraphrase check, card building. New directory, forced by the file cap.
`site/lib/content/routes/route-source.mjs` · `.test.mjs` — `readPageEntries`, replacing the filename roster.
`site/src/content.config.ts` — the `testimonials` collection; the pages glob excludes it the way it already excludes `ui`.
`site/src/gateway/content-queries.ts` — `listTestimonialCards`, three new `HomeStrings` keys, the source-language-to-sentence join.
`site/src/components/home/Testimonials.astro` — new: the card list, and the odd-count full-width rule.
`site/src/components/home/ContactSection.astro` — two-column layout restored, stale comment corrected.
`site/src/components/home/HomeSections.astro` — wiring; no cards, no column.
`site/tests/e2e/home.smoke.spec.ts` — `HOME-006` inverted with a derived count; `TESTIMONIAL-002` added.
`site/tests/e2e/routes.smoke.spec.ts` · `screenshots.smoke.spec.ts` · `scripts/verify-deploy.mjs` — page entries by type, not by filename.
`scripts/guards/guards.config.json` — `content.byType.testimonials`, with its rationale.
`docs/design/canvas/derive.mjs` — the ES table is per card now, not per string.
`docs/design/canvas/src/{Main,Components}.dc.html` — real cards; `{HomeES,HomeMobile}.dc.html` regenerated from them.
`TASKS.md` · `docs/specs/SPEC-TASK-113-home-testimonials.spec.md` · `progress/handoff/2026-09-02-task19-content.md`.
