# ADR-008: Site implementation architecture — a framework-free core, an Astro gateway, and content as the only source of copy

**Status:** Accepted
**Date:** 2026-08-24
**Context:** `ADR-001` chose Astro, `ADR-002` the content pipeline, `ADR-003` the i18n routing and `ADR-007` the component model — but nothing has decided how the code is *arranged*. The skeleton item is about to create the first source file, and the author set five constraints that apply to every implementation item after it. Deciding them per item would produce five different answers; leaving them in a conversation would mean no delegated agent ever hears them, because a brief carries the task and never the rules (`P-08`).

The five, as the author stated them on 2026-08-24: every visible string comes from `resources/`; a dedicated layer fetches the content and no component reads it directly; no implementation folder reaches seven files; CSS classes are specified for reuse and none exists without a purpose; and the architecture is decided and written rather than improvised.

## Sub-decision 1 — Where the implementation tree lives

### Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. `site/` as the root: `site/lib/` framework-free, `site/src/` Astro-only** | `30-testing.md` and `ADR-006` already name `site/lib/content/**` as the mutation-covered surface and already carry its `node --test` glob — this option needs zero rule amendments. The core sits outside Vite's graph, which is what lets `node:test` run it | Two source roots inside one package, which reads as unusual until you know why |
| **B. Everything under `site/src/`**, i.e. `site/src/lib/content/**` | One literal `src/`, which is what the author asked for in those words | Amends `30-testing.md` (two globs and a sub-gate command) and `ADR-006` on the first day of implementation, and pulls the content core into Vite's module graph, where `node:test` alone can no longer run it |
| **C. `src/` at the repository root, no `site/`** | The shortest path from the repository root to the code | Puts the site's source beside `scripts/`, `docs/` and `evidence/` at the same level; contradicts the two-command shape already declared in the register, which delegates from a root `package.json` into `site/` |

### Decision — Option A

```text
portfolio/
  package.json                 root — "start" and "test", plus tooling that spans BOTH
                               packages (amended 2026-08-24; see the note under sub-decision 6)
  site/
    package.json  astro.config.mjs  tsconfig.json
    lib/                       the core: Node ESM, no Astro import, no Vite
      content/                 mutation-covered (30-testing.md, already committed)
      i18n/                    locale URLs, the in-body link rewrite
      nav/                     nav structure: ids, targets, the soon flag — no labels
    src/                       Astro only
      content.config.ts
      gateway/                 the sole caller of getCollection
      layouts/  components/  pages/  styles/
      behaviour/               client modules: scroll-spy, theme — the Vitest tier
```

The split is not stylistic. `astro:content` is a Vite virtual module, so anything importing it cannot be run by `node --test`, and `ADR-006` fixed `node:test` as the runner for exactly the surface that does the parsing, joining and validating. Putting that logic anywhere inside Vite's graph would break a decision that is already accepted and already has its glob written into the rules.

## Sub-decision 2 — How content reaches a component

### Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Pages call `getCollection` directly** | What every Astro tutorial and Astro's own i18n recipe does; least indirection | The author's second constraint forbids it. It also puts query logic in as many places as there are pages, which is where a locale-join bug hides |
| **B. One gateway module, and a framework-free core behind it** | A page receives props and nothing else. The core is plain data in, plain data out — `node:test` runs it, Stryker mutates it, and a locale-join defect has exactly one place to live | It is a repository/DAL pattern imported from general software architecture, **not** a named Astro idiom. Nothing in Astro nudges toward it, so it holds only if something enforces it |
| **C. A hand-written loader instead of `glob()`** | Path resolution is entirely ours, so a content directory outside the project root is not a question | Astro's markdown pipeline — including the `remark-directive` transform `ADR-002` depends on for `:::diagram` — no longer applies for free; dev watching and the incremental digest cache become ours; and the loader receives a `LoaderContext`, so testing it needs a mock. It buys **no** architectural property that B does not already have |

### Decision — Option B, with `glob()` as the loader

```text
resources/**  →  content.config.ts  →  src/gateway/*  →  lib/content/*  →  props  →  component
                                       (Astro)          (pure logic)
```

`site/src/gateway/**` is the only place in the repository that may import `astro:content`. Everything downstream receives plain objects. The constraint the author asked for and the surface the harness already requires mutation coverage on turn out to be the same object, which is the reason to believe this shape rather than merely prefer it.

**Option C was considered on merit and rejected on merit.** The layering the constraint asks for is satisfied by `site/lib/content/**` operating on already-loaded entries — it is indifferent to how they arrived. A hand-written loader adds a surface that needs a mock to test and moves nothing. It stays recorded as the contingency if sub-decision 3's assumption fails.

## Sub-decision 3 — Reading a content directory outside the project root

`resources/` is a sibling of `site/`, not a child. The Content Loader Reference defines `base` only as *"A relative path or URL to the directory from which to resolve the pattern"* and **says nothing about whether it may point outside the project.** The researcher found the mechanism and found community use of `base: "../…"`, but no vendor sentence. This is the single load-bearing assumption in the whole implementation backlog with no documentation behind it.

**Decision: prove it in the cheapest item, not in the item that depends on it.** The skeleton item carries a throwaway spike — one collection with `base` pointing at `../resources/site`, one real entry loaded, the result recorded, the spike deleted — the same shape as the throwaway Preact island `ADR-007` already requires of that item. If it fails, sub-decision 2's Option C is the answer and its cost is already written down above.

**The fallback ladder, in order, so nothing gets improvised later:** `glob()` with `base` → a hand-written loader → a prebuild copy of `resources/` into `site/`, whose cost is a generated duplicate inside the tree, a step someone can forget, and every repository-wide scan suddenly seeing two copies of each file.

> **Result — 2026-08-24. It works.** A throwaway collection with `loader: glob({ pattern: '*.en.md', base: '../resources/site' })` loaded **4 entries** during `astro build` on `astro@7.2.5`, and the built HTML carried a real frontmatter value read out of `resources/site/about.en.md`. The evidence is the build's own printed output, not a reading of the loader's source, and the spike was deleted once recorded.
>
> **The ladder is not entered, and this is not an amendment** — the decision said prove it in the cheapest item, and the cheapest item proved it. The ladder stays written down because the reason it was written has not changed: the documentation still does not say this is supported, so a future Astro major could take it away without breaking a documented promise. That is the trigger to reach for rung two, and nothing else is.

**Moving `resources/` into `site/` is rejected outright.** `H-02` is a rung-1 boundary anchored to that literal path — a `deny` rule on writes into `resources/**` and a guard comparing against a boundary of that name. Relocating it means rewriting a rung-1 boundary for a build convenience, dragging `guards.config.json`, four guards, seven ADRs and fifty living documents with it, and putting frozen content inside the only tree agents write to. A symlink or junction is rejected too: it does not survive a CI checkout reliably and does not behave the same on both platforms this repository already has to support.

## Sub-decision 4 — Where visible strings come from

### Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. A dictionary module at Astro's recipe path, src/i18n/ui.ts** | Astro's own documented i18n recipe. Type-safe, one file, no content plumbing | It is a hardcoded visible string in a `.ts` file, which is precisely what the first constraint forbids. Copy in code also drifts from copy in content, and only one of the two has a locale-parity guard |
| **B. Every string in `resources/`, including chrome** | One rule with no exceptions, so nobody has to decide per string. Locale parity already has a guard over `resources/**` (`C-09`, `check-content`) | The chrome copy does not exist yet, and `H-02` means only the author can create it. It puts the project off Astro's documented path |
| **C. Copy in `resources/`, chrome in a data module** | No new content file; the register's criterion 4 already said this for nav items | Splits one rule into two with the boundary drawn by convenience rather than by meaning, which is how "just this one string" starts |

### Decision — Option B, with structure and copy separated by meaning

**Every string a reader can see is declared in `resources/**`** — nav labels, `aria-label`, `<title>`, `alt` text, the 404's copy. A single pair under `resources/site/`, one file per locale, is the shape, and `TASK 36` is the item that drafts it for the author to apply.

**Structure is not copy, and stays in code.** Which nav items exist, their order, their target and their `soon` flag are a data module under `site/lib/nav/`. A label is copy; a route is structure. That line is drawn by what the thing *is*, not by what is convenient.

The precedent that makes this reasonable rather than eccentric is Astro's own: **Starlight sources its interface strings from a content collection, one file per locale.** Astro's i18n *recipe* uses a dictionary module; Astro's own documentation site does not. Both facts are recorded here because the first is what someone will find first.

## Sub-decision 5 — CSS naming, and the file cap

**Class names.** Block, element, variant, state — `.case-tile`, `.case-tile__metric`, `.case-tile--wide`, `.case-tile.is-current`. A class names what the thing *is*, in the language of the site's domain, never where it happens to sit. The canvas's mockup shorthand (`hd`, `grp`, `lbl`, `k`, `v`, `n`, `sw`) is correct for eleven independent artboards and is not carried across. **This does not violate criterion 3.** That criterion makes the design the specification for markup and CSS, and the fidelity diff it names is structural and stylistic — layout, tokens, spacing, states — explicitly *never* text or name equality.

The researcher's recommendation was CUBE CSS over BEM, on the grounds that Astro's scoped `<style>` already solves the collision problem BEM's ceremony exists to prevent — Astro's docs say *"it is okay to use low-specificity selectors like `h1 {}` … because they will be compiled with scopes."* That is taken, and it lands on the *layering* rather than on the names: block/element/variant/state naming inside a component, and CUBE's composition and utility layers in the single global token stylesheet. The two halves occupy different places and do not compete. **The fit is the researcher's inference from CUBE's own documentation plus Astro's scoping documentation — no published case study pairs them**, and that is stated rather than implied.

**The file cap.** No folder under `site/**` holds seven or more files; at seven it is split into context-named subfolders. **No published style guide was found supporting a numeric cap**, and the search was not exhaustive — Astro's own project-structure page declines to prescribe one at all. This is therefore the author's convention, recorded as such. Its known failure mode is a split that invents categories purely to absorb overflow, so the rule carries its own guard rail: a subdivision names a context, and a folder that exists only to hold the excess is a finding rather than compliance.

## Sub-decision 6 — The Astro major

`^7`, latest stable at install time, with the lockfile committed because CI deploy will run `npm ci`. **No version number was asserted in this document until one was installed and read** — the researcher's `7.2.1 / 2026-08-11` came from a search-result summary and was flagged approximate, and `C-01` does not allow an unmeasured figure to be published as measured.

**Installed and read on 2026-08-24**, from the packages on disk rather than from a registry page:

| Package | Version |
|---|---|
| `astro` | 7.2.5 |
| `@astrojs/preact` | 6.0.4 |
| `preact` | 10.29.8 |
| `typescript` | 7.0.2 |
| `@astrojs/check` | 0.9.10 |

The researcher's approximate `7.2.1` was four patch releases behind by the time it was installed, which is the ordinary reason a version read from a search summary is not a measurement.

**One property of registering the integration, recorded because it looks like a defect and is not:** the build emits Preact's runtime chunks into `dist/_astro/` even with zero islands. The built page references none of them — no `<script>`, no `_astro` reference, zero bytes of JavaScript reaching a visitor. They are unreferenced files in the deploy artifact, and the direct consequence of `ADR-007`'s decision to install and prove the integration before the first island needs it.

The fact that *is* confirmed and that matters more: **the legacy Content Collections API was removed entirely in v6.** Astro's v6 upgrade guide states *"Astro v6.0 removes this previously deprecated Content Collections API support entirely."* Any example using the old collection type or slug-based lookups does not compile, and most examples reachable by search are of that vintage.

### ✏️ Amended 2026-08-24 — the root is not dependency-free, and could not be

This ADR wrote *"root — `start` and `test` only, and no dependencies"*, and `S-07` carried it as a rule. The mutation-gate item hit it on its first day and the constraint did not survive contact, for a reason this document could not have known when it was written.

**Stryker's sandbox is rooted at the working directory.** It copies the project into `.stryker-tmp` and mutates the copy, so a configuration living in `site/` cannot reach `../scripts/guards/lib/**` — the files simply are not in the sandbox. `ADR-006` committed to *one* config and *one* invocation over both mutation-covered surfaces, and the only directory that contains both is the repository root. This is forced by the tool's architecture, not chosen for convenience.

**What the rule becomes**, rather than being dropped: the root carries the two commands plus **only tools whose configuration must live at the repository root to function**.

*Narrowed within hours of being written, by an audit of this paragraph.* The first attempt said "tooling that **spans both packages**" — and that is unfalsifiable. "Spans" is a claim about what the person adding a dependency intended it to do, and no reader of `package.json` can check it: ESLint added at the root because "it lints both packages" satisfies it, while nothing about ESLint requires it to be there. The old rule it replaced (*"no dependencies"*) was at least binary. The criterion that actually forced Stryker to the root is a property of **Stryker**, not of anyone's intent — its sandbox is rooted at the working directory, so a config under `site/` cannot reach `scripts/guards/lib/`. That is the thing to write down, because a future tool enters or leaves the set on its own requirements rather than on an argument. Today that is `@stryker-mutator/core` and `@stryker-mutator/tap-runner`, both 10.0.0, both read from disk on 2026-08-24 (`C-01`). Anything belonging to one package is still installed in that package — `site/`'s five dependencies did not move and will not.

**S-07's first clause is untouched and still binds:** nothing is installed before the item that needs it. That clause is what was doing the real work; *"no dependencies"* was a prediction about how it would turn out, and predictions in a rule row get corrected rather than defended.

The root lockfile is committed for the same reason `site/`'s is: CI runs `npm ci`.

## Sub-decision 7 — How the code reads: naming and comments

**Added 2026-08-24**, when the author set three further constraints on implementation and asked, as with the first five, that they become precedent rather than an instruction repeated per item. Their words: comments short and concise, unrelated to any document outside `site/`, used only where something needs explaining because the code cannot say it — *"mejor es que el código hable por sí mismo"*; and names verbose enough that what each variable, class, function and file is for, and what state it holds, is readable without leaving the file.

### Options considered

| Option | Pros | Cons |
|---|---|---|
| **A. Carry the harness's own convention into `site/`** | Consistency across one repository. `scripts/` cites rule ids, incidents and ADRs inline, and it works there | The harness is read by people auditing the harness; the site is read by people reading a site. A comment citing `ADR-003` is a pointer that decays silently the day the ADR is superseded, and nothing checks it |
| **B. Ban comments outright** | No decay, nothing to maintain | Throws away the one case a comment genuinely earns: a *why* the code structurally cannot express — the theme toggle resolving before first paint being the live example |
| **C. Comments only where the code cannot speak, and never carrying a reference** | Keeps the earned case, removes the decaying one. The reference obligation inverts onto documents, where `check-docs` already resolves every cited path | The reason a piece of code exists is no longer findable *from* the code. Someone has to search the documents to find the decision behind it |

### Decision — Option C, with the reference obligation inverted

**A comment explains what the code could not say by itself, and stops there.** No path, no document name, no rule, ADR, incident or work-item id.

**References run from the document to the code, never the other way.** That direction is already mechanized and needed no new machinery: `check-docs` resolves every path cited in every living document — 184 references across 53 documents on the day this was written — and fails the gate on one that does not resolve. A document citing a module by its path stays correct or the gate says so. A comment citing `ADR-003` stays whatever it was when someone typed it — nothing reads it, so nothing can find it wrong.

> Demonstrated the moment this paragraph was written: its first draft cited a module path that does not exist yet, and `check-docs` rejected the document. The mechanism this sub-decision leans on proved itself against the paragraph describing it.

**Names carry the load the comments no longer do.** `S-10` is `S-04` generalized: that rule already said a CSS class names what the thing *is* and that a class with no stated purpose is a finding. The same standard applied to every identifier is what makes a scarce-comment policy survivable rather than merely terse.

**The cost, stated in both directions (`C-11`).** When code exists *because* of a decision, the decision becomes unfindable from the code — a reader who wants to know why the theme toggle is not an island has to search the documents. That is a real loss and the mitigation is the inverted reference, not a denial that it costs something. It was accepted because the alternative decays: an inline citation is correct on the day it is typed and nothing ever checks it again.

**Enforcement is split, and the split is honest (`G-11`).** The reference ban is a property — a comment either contains one of the repository's own top-level names or an id matching the registry's shapes, or it does not — so it sits at rung 2 behind `check-site`. Comment density and name quality are judgment and stay at rung 4. A comment-per-line ratio and a minimum identifier length are both numbers that rot, and enforcing the second produces `i` → `indexValue`, which is noise wearing compliance.

**`scripts/` is untouched.** The harness comments the opposite way on purpose, and that convention stays. `.claude/rules/50-implementation.md` is path-scoped to `site/**`, so the line between the two trees already existed; this uses it rather than drawing a new one.

**Found on the guard's first run against the real tree:** `site/astro.config.mjs` carried `// Static output, no adapter (ADR-001, ADR-004). Preact is registered with compat enabled because the next slice (SKEL-004) needs it present.` — three references in two lines, in the only source file the site had. Rewritten to one line naming the single thing the code cannot say: what `compat` does.

## Consequences

- **We gain:** one place where content is fetched and one place where it is interpreted, both testable without a browser or a bundler; a copy surface that already has a locale-parity guard over it; class names that mean something to a reader six months from now; and five constraints that load themselves into a delegated agent's session instead of depending on an orchestrator remembering to paste them.
- **We accept losing:** Astro's documented i18n path, which is a dictionary module — we are off it deliberately, and the cost is that a newcomer's first search returns advice this project does not follow. We accept a tree with two source roots inside one package. We accept that the class names in the canvas and the class names in the site differ, so reading an artboard beside its component needs one mental translation. And we accept a file cap with no external sourcing, which will occasionally force a split that a reasonable person would not have made.
- **Sub-decision 7 adds:** a comment surface that cannot decay, at the price of a decision trail that is findable only from the documents; and a naming standard strict enough to carry the explanatory weight comments no longer do.
- **This creates a dependency on:** `TASK 36` for the chrome copy, which only the author can write (`H-02`) and which the layout shell item cannot ship without; the skeleton item's spike for sub-decision 3; and `check-site`, without which sub-decisions 1, 2 and 5 are prose rather than boundaries.

## Review trigger

If the spike in the skeleton item shows `base` cannot resolve outside the project root, sub-decision 2 moves to Option C and this ADR is amended at that point — not reopened. If the file cap forces a third split whose subfolder names nobody can defend, that is the trigger to revisit sub-decision 5's cap rather than keep inventing categories. And if a second framework surface ever needs the content core, revisit sub-decision 1 — the case for keeping it outside Vite is `node:test`, and only that.

## Sources

One researcher pass, 2026-08-24, plus repository data (`D1`) read directly: `resources/site/home.en.md`, `resources/case-studies/otp-provider-decoupling.en.md`, `docs/design/canvas/src/Main.dc.html`, `docs/design/canvas/src/Components.dc.html`, `.claude/rules/30-testing.md`, `scripts/guards/guards.config.json`, `scripts/gate.mjs`, and ADR-001 through ADR-007.

**Evidence quality, stated where it is thin.** The `base`-outside-the-root question rests on mechanism plus community use, with no vendor sentence — which is why sub-decision 3 spikes it instead of assuming it. The CUBE-with-Astro pairing is inference from two separate documents, not a published case study. The file-cap search found no supporting style guide and was not exhaustive. The current Astro version came from a search-result summary and is deliberately not asserted here. Everything else is quoted from vendor documentation or read directly from this repository.
