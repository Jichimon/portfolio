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
  package.json                 root — "start" and "test" only, and no dependencies
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

`^7`, latest stable at install time, with the lockfile committed because CI deploy will run `npm ci`. **No version number is asserted in this document until one is installed and read** — the researcher's `7.2.1 / 2026-08-11` came from a search-result summary and was flagged approximate, and `C-01` does not allow an unmeasured figure to be published as measured. The skeleton item records the output of `npm ls astro` here.

The fact that *is* confirmed and that matters more: **the legacy Content Collections API was removed entirely in v6.** Astro's v6 upgrade guide states *"Astro v6.0 removes this previously deprecated Content Collections API support entirely."* Any example using the old collection type or slug-based lookups does not compile, and most examples reachable by search are of that vintage.

## Consequences

- **We gain:** one place where content is fetched and one place where it is interpreted, both testable without a browser or a bundler; a copy surface that already has a locale-parity guard over it; class names that mean something to a reader six months from now; and five constraints that load themselves into a delegated agent's session instead of depending on an orchestrator remembering to paste them.
- **We accept losing:** Astro's documented i18n path, which is a dictionary module — we are off it deliberately, and the cost is that a newcomer's first search returns advice this project does not follow. We accept a tree with two source roots inside one package. We accept that the class names in the canvas and the class names in the site differ, so reading an artboard beside its component needs one mental translation. And we accept a file cap with no external sourcing, which will occasionally force a split that a reasonable person would not have made.
- **This creates a dependency on:** `TASK 36` for the chrome copy, which only the author can write (`H-02`) and which the layout shell item cannot ship without; the skeleton item's spike for sub-decision 3; and `check-site`, without which sub-decisions 1, 2 and 5 are prose rather than boundaries.

## Review trigger

If the spike in the skeleton item shows `base` cannot resolve outside the project root, sub-decision 2 moves to Option C and this ADR is amended at that point — not reopened. If the file cap forces a third split whose subfolder names nobody can defend, that is the trigger to revisit sub-decision 5's cap rather than keep inventing categories. And if a second framework surface ever needs the content core, revisit sub-decision 1 — the case for keeping it outside Vite is `node:test`, and only that.

## Sources

One researcher pass, 2026-08-24, plus repository data (`D1`) read directly: `resources/site/home.en.md`, `resources/case-studies/otp-provider-decoupling.en.md`, `docs/design/canvas/src/Main.dc.html`, `docs/design/canvas/src/Components.dc.html`, `.claude/rules/30-testing.md`, `scripts/guards/guards.config.json`, `scripts/gate.mjs`, and ADR-001 through ADR-007.

**Evidence quality, stated where it is thin.** The `base`-outside-the-root question rests on mechanism plus community use, with no vendor sentence — which is why sub-decision 3 spikes it instead of assuming it. The CUBE-with-Astro pairing is inference from two separate documents, not a published case study. The file-cap search found no supporting style guide and was not exhaustive. The current Astro version came from a search-result summary and is deliberately not asserted here. Everything else is quoted from vendor documentation or read directly from this repository.
