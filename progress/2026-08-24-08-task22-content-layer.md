# 2026-08-24 · Session 08 — TASK 22, content layer

**Task:** TASK 22 — Content layer: collections, schema, locale join
**Status after this session:** DONE

## What was done

Oriented against real state before writing anything (`P-04`), which turned up four assumptions in the register and the ADRs that are not true of the repository today — three of them would have failed the gate if the spec had been written from the documents alone. Four scope questions taken with the author. Spec drafted; the checkpoint is open.

## Findings from validating against real state (P-04)

Written before the spec, because three of the four change what the spec has to say.

1. **`stryker.config.mjs` generates mutants for `site/lib/content/**` that nothing can kill.** `mutate` carries the glob (line 47); `tap.testFiles` (lines 27–30) does not. The comment above the glob claims the surface "is covered the moment it is written" — half true: mutants are generated, no test file is handed to the runner to kill them. Every test this item writes would therefore be invisible to Stryker, the new surface would score ~0, and the aggregate would fall below the measured floor of 74 and **fail the gate**. Fixed by adding `site/lib/content/**/*.test.mjs` to `tap.testFiles`.

2. **`scripts/gate.mjs` has no step for the content core's tests.** `30-testing.md`'s stack-dependent table names `node --test "site/lib/content/**/*.test.mjs"` as a sub-gate command; no step runs it. Sixteen steps today, none of them this one.

3. **Zod 4, not Zod 3.** `astro@7.2.5` depends on `zod@^4.3.6` and `site/node_modules/zod` reads `4.4.3`. `ADR-002` sub-decision 1 specifies `.passthrough()`; in Zod 4 that method still exists but is deprecated in favour of `z.looseObject()` — read from `node_modules/zod/v4/classic/schemas.d.cts:460-461`, not from a release page.

4. **`guards.config.json`'s `docs.ignore` entry for `site/src/content.config.ts` expires the moment this item runs.** Its own written reason says so: *"Self-clearing: the entry is reported as stale the day TASK 22 creates it."* Creating the file without removing the entry fails `check-docs`. The self-staling property working exactly as designed, and found by reading rather than by a red gate.

**A conflict between the register and an accepted ADR, resolved rather than blurred.** The work item's first constraint reads *"Five universal keys … plus per-type required keys, per `ADR-002` and `C-14`"*. `ADR-002` sub-decision 1 considered exactly that (its Option A) and **rejected it**, choosing Option C: only the five universal keys in the Zod schema, with everything type-conditional left to `check-content` so `guards.config.json`'s `byType` map has one owner rather than two. The ADR governs. What the constraint is actually asking for — *an unknown `type` is a build failure, not a pass* — is satisfied by pinning `type` to a literal union per collection, which needs no per-type key duplication at all.

## Decisions

- **`:::diagram` resolution is deferred to the item that renders prose.** Nothing renders a body here, so a remark/rehype transform could only be verified by inspection — which is what `P-15` and `T-02` exist to refuse. `30-testing.md` naming `:::diagram` resolution inside the mutation-covered surface describes where that code will live, not which item writes it. Rejected: shipping it here to "finish the pipeline in one item", which buys a tidy boundary and pays for it with code nothing exercises for two items.

- **The route-literal assertion checks for literals that name a real slug**, with the slug set derived by reading `resources/**` filenames. Rejected: banning anything that looks like an internal route path — that pattern is derived from nothing, and `../resources/site` already lives in the config as a legitimate string. `TASK 10` spent five denials in one day learning that a guard firing on quoted text is a guard people route around. Consequence: unit-test fixtures use invented slugs, which `T-07` prefers anyway — a test coupled to real content breaks when the content changes.

- **The gateway exposes the interface strings in this item.** `resources/site/ui.{en,es}.md` exists because the chrome-copy item created it for this layer to read. The alternative leaves the layout-shell item either editing the gateway (fine) or importing `astro:content` directly, which is an `S-02` violation waiting to happen. Cost: the deliverable grows from the register's three named functions to four.

- **The in-body link rewrite ships as a pure function with tests; the rehype wiring is deferred.** `localizeInternalHref` is exactly the parsing-and-deciding logic `D3` scoped mutation to, and it is testable to exhaustion with no build. The plugin that applies it to the markdown pipeline is verifiable only against rendered HTML, which arrives with the prose item. `ADR-003`'s open item is answered — mechanism *and* the split — in the ADR rather than only in code.

- **No `i18n` block in `astro.config.mjs`, and this is drift from `ADR-003`.** That ADR says cross-locale links use `astro:i18n`'s `getRelativeLocaleUrl`. `ADR-008`, four days later, puts locale URLs in the framework-free core, and `S-06` makes that enforceable — a module importing `astro:i18n` is out of `node:test`'s reach and out of Stryker's. The pure function wins. Recorded as drift rather than quietly implemented the new way.

## Slice 4 — the route-literal guard, verified by the orchestrator after six truncated returns

The guard landed and works. `checkRouteLiteralsAreDerived` takes `contentSlugs` as opaque input, derived by the CLI from the filenames under the content roots, so a sixth case study is covered with no edit anywhere. Template literals are skipped, locale prefixes stripped, declaration sites exempt.

**It found a real violation on its first run against the real tree** — `route-set.test.mjs` used `/about` as a sample input to the path builder, and `about` is a real page slug, while every neighbouring fixture in that file was already invented. Corrected to `/sample-secondary-page`. The correction improves the test on its own terms: a fixture coupled to real content breaks the day the content changes (`T-07`).

**Precision is the part that was hard and the part it got right.** Three findings, all the same literal, and nothing else: not the invented slugs, not `'/es'`, not `` `/case-studies/${slug}` ``. A guard that fires on the derivation doing its job is a guard people route around.

**Battery: 8 of 8 applied mutants killed**, including declaration-site exemption removed, template-literal skip removed, path-shape guard inverted both ways, slug membership inverted, and splitting on the wrong separator. One hypothesis of mine was wrong and worth recording: I expected *locale prefix no longer stripped* to be an equivalent mutant, since `find` scans every segment anyway. **It was killed** — the tests distinguish it, and my reasoning about the code was worse than their coverage of it.

**Red path against the real tree, not only fixtures:** a real route literal planted in `site/src/pages/index.astro`, `check-site` failing with the file, line, literal and slug named, exit 1, page restored byte-identical.

## Done

```yaml
done:
  tests:       { status: passed,         evidence: ["node --test site/lib/content/**/*.test.mjs — 26/26", "node --test scripts/guards/**/*.test.mjs — 476/476, up from 465"] }
  mutation:    { status: passed,         evidence: ["stryker: content core 92.62% — 138 killed, 11 survived, 0 no-coverage", "aggregate 72.11 -> 75.66 against break 74", "hand batteries: 9/9, 17/17, 8/8"] }
  gate:        { status: partial,        evidence: ["node scripts/gate.mjs — 16 of 17 PASS; evidence trace FAILS on TASK 12's known trace-writer defect, which H-03 puts outside every agent's reach"] }
  docs:        { status: passed,         evidence: ["ADR-003 amended: both open items answered, one stated fact refuted", "ADR-002 dated note on the Zod method rename", "docs/adr/README.md — level-1 status and four level-2 rows", "SPEC-TASK-22 status: shipped, drift log carries four entries"] }
  scope:       { status: passed,         evidence: ["docs/specs/SPEC-TASK-22-content-layer.spec.md — out_of_scope, five items each with a named owner"] }
  loose_ends:  { status: passed,         evidence: ["TASK 42 and TASK 43 opened", "notes on TASK 12, TASK 25, TASK 38, TASK 39", "ordering constraint written into TASK 24"] }
  iterations:  { status: passed,         evidence: ["15"] }
  ci:          { status: not_applicable, reason: "no remote exists; the workflow is inert until the publication item" }
  content:     { status: not_applicable, reason: "resources/** is read-only and untouched — this item reads it and writes nothing back (H-02)" }
  security:    { status: not_applicable, reason: "no credential, no network call, no new boundary; the guard change tightens an existing rung-2 check" }
```

### K1 = 15, and the composition is the useful part

A bare 15 says this item was expensive. It was not expensive for the reason the number implies, and smoothing it would destroy the only thing it can teach:

| Cycles | Cause |
|---|---|
| 2 | checkpoint rounds — the spec was drafted, questioned by the author on two points, corrected, approved |
| 4 | **real defect corrections found in verification** — vacuous assertions, the positional home coupling, the brief's own self-contradiction, the guard's first finding |
| 6 | **truncated reports** — a delegated run stopping mid-turn with its work finished and its account cut |
| 3 | clean returns and the run that died on a session limit |

**Only four of fifteen were rework.** Six were a delegation pathology that has nothing to do with this item's difficulty, and which is now recorded against the item that owns budgets with three unambiguous specimens. Reporting K1 as 15 without that split would send the next session looking for complexity that is not there.

## Two things the author corrected at the checkpoint, both worth keeping

**1 · "Half a criterion" was the wrong framing, and the wrong framing invented a loose end.** The register's fourth done criterion reads *"an absent optional field returns `undefined` and the consuming component omits its block."* The spec's first draft called the second clause a deferred half — which made a clause that already has an owner look like something this item was scoping down. The author's objection was the right one: *"¿a qué te referís con la otra mitad? ¿por qué se parte? ¿no deberíamos entregar algo completo y tangible?"*

There is no component in this item, so the clause naming a component cannot be tested here — but it needs no new owner either. **"A section is omitted when its content is absent" is one of the five decisions taken on 2026-08-23** and binds every page item as a standing constraint. So the spec now says that rather than declaring a split: `CONTENT-004` delivers what this layer owns, complete — no value is ever invented, proven against real specimens (`mobile-banking-platform` carries no `outcome` in either locale, the other four carry no `scale`).

The general lesson, because it will recur: **an obligation that already has an owner is not a scope reduction, and describing it as one manufactures a loose end that nobody needs to track.** `P-06` says a loose end becomes a tracked item; the inverse matters too — inventing one costs attention that a real one then does not get.

**2 · The Zod note read as a change of decision and was only a change of method name.** The author asked why the minimal-schema decision was being abandoned. It is not, and the first draft's phrasing earned the question. Zod is not an alternative to `ADR-002`'s minimal schema — **it is the mechanism of it**: Option C reads *"Minimal schema — the 5 universal keys only, `.passthrough()` for the rest"*, and an Astro collection schema is a Zod schema. Sub-decision 1 is followed exactly: five universal keys, everything type-conditional left to `check-content` so `byType` keeps one owner.

What actually moved: `ADR-002` was written 2026-08-19 against Zod 3 documentation, and `astro@7.2.5` installs `zod@4.4.3`, where `.passthrough()` still works but carries `@deprecated Use z.looseObject() or .loose() instead` (`node_modules/zod/v4/classic/schemas.d.cts:460`). Both spellings would run today. The current name is used, and `ADR-002` gains a dated note — an ADR naming a method deprecated in the installed version is one the next reader believes and applies wrongly.

And the *other* drift entry is the opposite of departing from that ADR: `TASKS.md`'s first constraint asks for per-type required keys in the schema, which is precisely `ADR-002`'s Option A, weighed and rejected. The spec follows the ADR against the register's paraphrase.

## Slice 1 — the entries core, and what verifying it rather than believing it found

**First return: 11/11 green, and three of those tests proved nothing.**

The implementer delivered four files, zero imports in both production modules, fixtures using invented slugs, `check-site` PASS at 9 files across 3 directories. All of that reproduced independently rather than taken from the report (`P-11`). The suite was green on my machine too.

Stryker does not cover `site/lib/content/**` yet — its `mutate` glob names the surface and its `tap.testFiles` does not, which is this item's own finding 1. So a green suite here had **no mechanism behind it at all**: nothing in the repository could distinguish a test that asserts something from a test that asserts nothing. A hand-applied battery stood in: nine mutants against the two production modules, each applied to the real file, suite re-run, file restored and verified byte-identical by hash.

**4 of 9 survived**, and they were not spread thinly — they clustered on three named defects, all in the tests, none in the implementation:

| Mutant | Survived because |
|---|---|
| `inLocale.length > 1` → `> 2` | `rejects a slug duplicated within one locale` used a fixture with two `en` entries and **no `es` entry**, so the bulk assertion threw for the missing locale either way. The assertion matched the slug, which both messages contain |
| `presentLocales.length === 0` → `=== -1` | `distinguishes absent-from-both from present-in-one` leaned on `assert.notEqual(messageA, messageB)` — two messages about **two different slugs**, which can never be equal whichever branch produced them |
| `matches.length === 0` → `< 0` | nothing calls `findEntryBySlugAndLang` with zero matches |
| `matches.length > 1` → `> 2` | nothing calls it with a duplicate either |

The first is `INC-02`'s shape exactly — a test whose name states a guarantee and whose assertion is trivially true. The third and fourth matter most for what this item promises: `findEntryBySlugAndLang` is the **targeted-query** path, and the register's definition of done names precisely that path — *"a query for a slug that exists in only one locale fails loudly at build rather than rendering a half-page."* Only the bulk assertion covered that idea; the query itself could have both guards deleted in silence.

**And it settles a question about the red step.** Two of the three behaviours were driven red with `ERR_MODULE_NOT_FOUND` — the module did not exist yet. That is an honest first red and it is a weak one: it proves the import path resolves, not that the assertion discriminates. The one behaviour driven red by a real assertion failure (the ordering row, `expected [gamma, alpha, beta]`) is the one whose mutant was killed. **A module-not-found red and an assertion red are not the same evidence**, and the difference showed up as three survivors.

Returned to the implementer with the four mutants, the reason each survived, and the fix for each — implementation untouched, since it is correct and only the assertions are weak.

**Second return: 13 tests, 9/9 mutants killed.** Verified by re-running the same battery rather than by reading the report — and the battery is its own check that the implementation did not move, because every one of the nine patterns still had to match a real line to be applied. Only `locale-pair.test.mjs` changed; the two production modules are byte-identical to their first submission. The implementation was correct throughout; all three defects were assertions.

The fixes, each now proven by a real assertion failure rather than a missing module: the duplicate fixture gained a valid `es` entry so a missing locale can no longer be the reason it throws, and asserts on `duplicated within locale "en"`; the distinguishing test dropped `notEqual` for direct wording matches on both branches; and `findEntryBySlugAndLang` gained two tests of its own guards. **K1 for this slice: 2.**

**The design question the slice was asked to answer and not act on.** Once the collection schema pins `lang` to `en | es`, is `assertEverySlugHasBothLocales`'s absent-from-both branch reachable? The answer given is *probably not through the gateway path, and keep it anyway* — because this module is framework-free by design and has no way to know an upstream schema is guaranteeing anything, because its contract does not restrict callers to ones that came through the gateway, and because an unreachable branch costs a few lines while a missing one costs a silent gap. The honest part of the answer is what makes it usable: the claim that the branch is dead is stated as an inference from the ADRs, **not verified**, because the schema does not exist yet. The slice that writes it checks directly.

## Two observations from verify, neither acted on (`P-16`)

- **`findAlternateLocaleEntry` picks "the locale that is not this one" from a two-element list.** At three locales it silently returns an arbitrary alternate rather than failing. Not a live defect — the configuration declares exactly two locales and a third is already `ADR-003`'s stated trigger to revisit the whole routing approach — but silent-wrong is worse than loud-wrong, and this is the shape that survives a decision review because nobody re-reads it.
- **`listCaseStudyEntriesForLang` orders alphabetically by slug.** That satisfies the requirement asked of it — the same order on every call — and it is *not* the published order any artboard shows. The risk is specific: alphabetical order is deterministic, plausible-looking and wrong, so it can ship unnoticed. The core supplies determinism; the published order is the page item's to decide, and the `featured` flag is already on the entries.

## Slice 2 — the routes core

**First return: no report at all.** The run's last output was *"All green. Now run the full suite for both files together"* and then nothing — it stopped mid-turn, before the suite it was about to run and before any report. The artifacts had landed: four files, zero imports in both production modules, 24 tests green across the whole core, `check-site` PASS at 13 files across 4 directories, all verified directly rather than taken from a report that did not exist.

**Thirteen mutants, 11 killed.** The test files are markedly stronger than slice 1's — specific assertions about real paths, not about the slug appearing somewhere in a message. Two survivors, one design finding the battery did not catch:

- **Both survivors are equivalent mutants, and the fix is deletion rather than suppression.** `route-set.mjs` and `internal-link-localizer.mjs` each carry a special case for the root path — `x === '/' ? '/es/' : ` followed by the general template literal. The two branches produce the identical string, because `/es` concatenated with `/` is already `/es/`. A written suppression is the legitimate move for a genuine equivalent mutant; this is not one. It is redundant, and it misleads — a reader sees the ternary and infers the general branch is wrong for `/`, which it is not.
- **The home page was identified by array position** — `const isIndexRoute = position === 0`, with the test comment stating it outright. The caller will pass routed page slugs in what looks like nav order, and reordering that list silently moves which page lives at `/`: nothing throws, no test outside the module fails, and the site is quietly wrong. That is `P-16`'s question — *what breaks when someone moves one of these next month* — answered badly. **The ambiguity was mine:** the brief said "the ordered list of routed page slugs", which invited exactly this reading. Returned with the fix stated as identify-by-name, plus a test proving the same slugs in a different order produce the same route set.

**Closed after three rounds — 26 tests across the core, 17/17 mutants killed.** K1 for this slice: 3. The battery that closed it included path-segment corruption, a `/es` prefix gaining a slash, the delegation hardcoding a locale, and the delegation removed entirely. Both files restored byte-identical after every pass.

**The second round found a defect the mutation battery structurally could not.** Both survivors were equivalent mutants — redundant ternaries — and killing them was a deletion, not a test. The positional home coupling was invisible to mutation testing entirely: the code was correct, the tests were correct, and a caller reordering an argument would silently move the home page. **A battery measures whether the tests bind the code that exists; it says nothing about whether that code is the right shape.** Worth writing down, because a 100% score reads like an all-clear and is not one.

**The third round exposed a contradiction in the brief rather than in the code**, and the implementer reported it instead of resolving it silently — which is the behaviour worth more than the fix. The brief's numbered constraint said *"neither production module imports anything"*; its prose said `buildLocalizedRoutePath` is the only place in the repository that concatenates a route path. Both cannot hold. The numbered one was meant to say *imports no framework and nothing from `site/src/**`* — the property that keeps this surface runnable by `node --test` — and was written too broadly. Resolved toward the prose: the localizer imports the concatenation and calls it. **The duplicated datum was *how a path becomes a Spanish path*** — one template literal in each file, which survives until the day the prefix changes and only one of the two gets edited.

Wiring that dependency then exposed a third dead branch by the same method: `localizeInternalHref`'s own `lang === 'en'` early return became unreachable once the delegate handled the default locale, and mutating it produced a false green. Deleted, same call as the ternaries. **Three redundant branches in one slice, all found by mutation and none by review** — which is the argument for the gate step the next slice is wiring.

**`SPANISH_ROUTE_PREFIX` was deliberately not reconciled**, with a reason worth keeping: it answers *does this href already look localized*, not *how do you build a localized path*. They share the literal `es` today, but `KNOWN_LOCALES` in the sibling module holds its own copy, so extracting a shared constant for one of the two pairs would move the duplication rather than remove it. A third locale is already the stated trigger to revisit the whole two-locale scheme, and that is when all three get looked at together.

## Slice 3a — the gate step and the Stryker wiring, and the number that proved the finding

**The gap was measured, and it was worse than "a glob is missing".** Running the mutation step *before* touching `tap.testFiles`:

```text
site/lib/content   0.00%   ...   149 mutants, ALL no-coverage
  entries           85
  routes            64
Final mutation score 72.11 under breaking threshold 74 — exit 1
```

**The item would have shipped a red gate.** 149 mutants generated for a surface no test file was handed to the runner for, dragging the aggregate from 74.98 (the `scripts/` subtree, unchanged) down to 72.11. This is not a tidy-up: `stryker.config.mjs`'s own comment claimed the surface was *"covered the moment it is written"*, and **a glob that generates mutants and a glob that supplies killers are two separate promises — only one of them had been made.**

After adding `site/lib/content/**/*.test.mjs` to `tap.testFiles`, same command:

```text
site/lib/content  92.62%   138 killed · 11 survived · 0 no-coverage
  route-set.mjs             100.00
  case-study-catalog.mjs    100.00
  locale-pair.mjs            88.89   (8 survivors)
  internal-link-localizer.mjs 83.33  (3 survivors)
Final mutation score 75.66 ≥ break threshold 74 — PASS
```

The `scripts/` subtree is byte-identical between the two runs, so the whole aggregate movement is attributable to the content core alone. `break` was not touched — the floor stays where it was measured, and raising it belongs to the item that owns the burn-down.

**The gate step was proven in red at the CLI, not reasoned about.** One assertion broken in `route-set.test.mjs`, full gate run, file restored and verified by hash:

```text
FAIL    content core tests
FAIL    mutation                ← the predicted double-report
PASS    rules registry
…                               ← fifteen further steps ran and reported
exit code 1
```

Both halves matter: the step fails, **and the steps after it still run**. A new step that quietly reintroduced fail-fast would undo the fix that made the gate honest, and the only way to know is to look.

**Clean run: 16 of 17 steps PASS.** The single failure is `evidence trace`, the known trace-writer defect that `H-03` puts outside every agent's reach. Same call as the items before this one: closed as `gate: partial`, naming the step and its owner.

**Eleven survivors stay open and named rather than counted.** Eight in `locale-pair.mjs`, three in `internal-link-localizer.mjs`, against a floor of 74 and a module score of 92.62. They belong to the ratchet item, which owns the burn-down; chasing them here would be doing another item's work while this one is unfinished. Named so they are findings with a location rather than a statistic.

## Slice 3b — collections, schema, gateway, and the finding that justified the whole layer

**Three collections load, and the counts are the evidence.** A temporary route called the gateway during a real build and printed `pages: 8 · caseStudies: 10 · ui: 2`, plus a real frontmatter value read out of `home.en.md`. Four page slugs × 2, five case studies × 2, one chrome pair — and `intake.md` and `profile-README.md` in none of them, which the counts confirm arithmetically rather than by inspection. The route was deleted and the build re-run clean.

**`CONTENT-002` was proven by breaking it.** The pinned page type was temporarily pointed at a value the content does not carry; the build failed with `[InvalidContentEntryDataError] pages → about.en data does not match collection schema. type: Invalid input: expected "article"`, naming the file. Restored, rebuilt. A schema seen only to accept is a schema nobody has tested.

### The one that matters: `ADR-003` stated a fact about Astro that is false, in the dangerous direction

`ADR-003` warns that the collection's auto-generated id *"via `github-slugger` on the filename, e.g. `mobile-banking-platform-en`"* must not be used for pairing. **The advice was right and the reason was wrong.** From the glob loader's own source in the installed package:

```js
function generateIdDefault({ entry, base, data }, isLegacy) {
  if (data.slug) {
    return String(data.slug);
```

The default id is **`data.slug` whenever frontmatter carries one**, and `ADR-002` made `slug` universal — so both halves of every locale pair generated the *same* id and one silently overwrote the other in the content store. The ADR warned about an id that could not pair; the reality was an id that made entries **disappear**.

**It was found by a build, not by a review — and by our own assertion.** The first real build of the collections failed with `slug "about" is present only in "es", missing "en"`. That is `assertEverySlugHasBothLocales`, written two slices earlier for exactly this, catching a live defect on its first contact with real content. The behaviour the register describes as *"fails loudly at build rather than rendering a half-page"* did that, on its first opportunity, against a defect nobody had predicted.

Fixed with an explicit `generateId` deriving from the entry's file path, which is unique per locale by construction. The join key is unchanged: consumers pair on `entry.data.slug`, never on the id. `ADR-003`'s parenthetical is marked **refuted** in the index, and this item's own spec carried the same inherited claim in a `CONTENT-003` edge case — corrected in place rather than left to be believed.

**Two independent readings of an assumption, five days apart, both wrong in the same direction.** The researcher found filename-derived ids for this loader in general; the ADR wrote it as a fact about this project; nobody checked it against a build until there was content to build. The cheap lesson is not *check harder* — it is that an assumption about a dependency's behaviour is worth exactly one build, and this one cost a spike that a previous item had already established the pattern for.

## Slice 4 — died on a session limit, and the author chose to wait

The route-literal guard never started: the delegated run terminated on `You've hit your session limit`. **It left nothing** — all three of its files verified byte-identical, no partial implementation, no residue.

Offered three ways forward — write it myself and record the deviation, wait for the limit and delegate, or close the item without it. **The author chose to wait.** The reasoning is worth keeping: the register's execution model says implementation is delegated and the orchestrator verifies, and this session had already breached that once by accident. Doing it deliberately, to save a few hours, would have made the writer and the verifier the same party on the one deliverable whose entire job is catching what a writer would miss.

## Reconciliation, done while the last slice ran

The spec's behaviours and its 28 test-plan rows moved from `planned` to their real states — everything green except the guard slice. Two new items opened and four notes placed on existing ones rather than inventing an item per finding, plus one constraint written into the home item, where the party that can violate it will read it.

## The concurrency incident, which was mine

**Two delegated runs on this item notified `completed` while still alive.** After the second such notification on the gate slice, its report was a fragment — *"Let's wait for the whole run to complete"* — so I treated the run as finished, verified the tree, found a deliberately-broken test still on disk and `stryker.config.mjs` unedited, and took the remaining work myself: restored the sabotaged assertion, made the `testFiles` edit, and ran both measurements.

**The agent was still running.** It reported the collision from the inside, accurately: its own restore-`Edit` failed with *"string not found"* because the revert had already happened, its `stryker.config.mjs` edit failed the same way, and `git status` showed files moving that were nowhere in its scope. It named it as an ownership violation, **verified with `git diff` rather than overwriting**, and refused to start an edit war. That is the correct response to a conflict and it is worth more than the fix would have been.

**No damage: the tree was consistent, and the two independent measurements agree exactly** — 72.11 before, 75.66 after, 149 uncovered becoming 138 killed and 11 survived. Corroboration arrived by accident rather than by design.

**The rule taken from it, because the mistake is repeatable:** *a `completed` notification is not a report.* When what returns is a fragment rather than an account, the run is resumed — never taken over. This is the same failure the register already tracks for delegated runs that stop without reporting, seen from the orchestrator's side rather than the agent's: the first stop is invisible, and acting on it corrupts the second.

It also lands squarely on something the agent policy already declares deferred. *Enforced write scope for the implementer role* and *worktree isolation as a default* both name **concurrent writes** as their trigger. The trigger fired here — not from two agents, but from an orchestrator and an agent writing the same file. That is a shape neither deferral anticipated, and it is recorded rather than filed as bad luck.

**The same run independently flagged the injected instruction.** It reported a `system-reminder` claiming an "auto mode" requiring all file work to go through shell commands, judged it untrusted content rather than an instruction, and continued. Two independent readings of the same text reaching the same verdict is the data-trust ladder working as designed rather than as prose.

## A third specimen for the delegation-budget question

This run is the cleanest one yet for the open budget item, and it is worth recording precisely because it cuts against a convenient reading. `implementer` carries a 30-turn budget; this run made 37 tool calls over roughly seven minutes and stopped without reporting. The register already holds two specimens of an auditor stopping mid-run, plus one implementer that used 30 of 30 and *did* report — of which it says the trace cannot tell whether it fit exactly or was cut off after the work happened to be done. This one removes that ambiguity in the other direction: the work was finished and the **report** was what got cut.

**Part of the squeeze is mine and says so.** Slice 2's brief added a requirement slice 1 did not carry — apply your own mutation battery before reporting — which is real extra work inside the same budget. So this is not simply evidence that 30 is too low; it is evidence that a brief which adds a verification step has to buy the budget for it. Both readings belong to that item, and neither is decided here: changing a budget while measuring it leaves nobody able to say which number was tested.

## A decision slice 2 forced, taken rather than handed to an agent blind

**Which pages get a route is structure, not content, and it cannot be derived from the collection.** Writing the routes brief surfaced it: `resources/site/` holds five locale pairs — `home`, `about`, `experience`, `contact`, `ui` — and only three of them are routes. `contact`'s content renders as a section of the home page, and `ui` is interface strings. Nothing in the frontmatter distinguishes *a page that is a route* from *a page whose content is a section of another page*, and `resources/` is frozen, so no field can be added to make it derivable.

So the route set is derived in the half where derivation is what matters and declared in the half where it is not: **case-study routes derive entirely from the collection** — a sixth `.md` pair produces two more routes with no code edit, which is the failure criterion 1 actually names — while **the routed page slugs arrive as a parameter**. Adding a page needs an Astro route file regardless, so nothing is lost that was ever available.

This is not a departure from the approved spec, which is why it did not go back through the checkpoint: `CONTENT-005`'s edge-case list already reads *"the home page is the work page: there is no /work route, and Work and Contact are anchors rather than routes."* The spec had the answer; the brief had to make it operational. It also lines up exactly with `ADR-008` sub-decision 4's split — a label is copy, a route is structure — which was written for the nav and turns out to govern this too.

The typo this creates a hole for is closed rather than accepted: `deriveRouteSetFromEntries` throws naming the slug when a caller names a routed page that has no entry. The reverse — a new page pair nobody adds to the list — stays a known limitation, recorded here rather than discovered.

## Open questions

None waiting on the author. The spec is approved; slice 1 is closed and verified, slice 2 is running.

## Next

Present `docs/specs/SPEC-TASK-22-content-layer.spec.md` at the checkpoint. No write-capable delegation can run until `approved_version` matches `version` — `H-05` already denied one delegation this session for exactly that reason, which is the gate doing its job on the first try.

## Files changed

`docs/specs/SPEC-TASK-22-content-layer.spec.md` — the artifact the checkpoint approves.
`TASKS.md` — status line.
