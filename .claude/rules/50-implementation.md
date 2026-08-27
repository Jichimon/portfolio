---
paths:
  - "site/**"
  - "package.json"
---

# Implementation rules — how the site's code is arranged

The `S-*` surface. Path-scoped: these load when working inside `site/` or on the root commands, and nowhere else. Always-loaded instructions sit near their budget, and none of this matters to a content item or a guard fix.

Origin for every row: **`ADR-008`**, which records the reasoning, the rejected options and — where the evidence is thin — says so. These rules are the obligations that ADR creates. The ADR is not loaded into a session; this file is, which is the whole reason the split exists (`P-08`: a brief carries the task, never the rules).

## The shape

```text
site/
  lib/        the core — Node ESM, no Astro, no Vite. node:test runs it, Stryker mutates it
              (the Stryker config lives at the REPOSITORY root, not here — its sandbox is
               rooted at the working directory and has to reach scripts/guards/lib/ too)
  src/        the side Vite builds — Astro, plus the DOM-requiring behaviour tier, which
              needs no framework but does need a browser: Vitest runs it, Stryker does not
    gateway/    the sole caller of getCollection
    behaviour/  scroll-spy, theme — deliberately outside the mutated core (ADR-008, 2026-08-25)
```

```text
resources/**  →  content.config.ts  →  src/gateway/*  →  lib/content/*  →  props  →  component
```

The dependency runs one way: `src/` imports `lib/`, never the reverse.

## The rules

| id | rule | rung | origin |
|---|---|---|---|
| **S-01** | **No string a reader can see is declared outside `resources/**`.** Nav labels, `aria-label`, `<title>`, `alt` text, button copy, the 404's lines. A missing string is an absent block, never a placeholder invented in a template (`C-01`). | 4 · the mechanization is owed by the layout-shell item, and until it exists this is judgment | `ADR-008` sub-decision 4 |
| **S-02** | **Only the content-access layer imports `astro:content`** — `site/src/gateway/**`, plus `content.config.ts`, which Astro requires to live where it does and to import what it imports. A page or a component receives props. Nothing downstream of the gateway knows what loaded its data. The boundary is a set declared in `guards.config.json`, not a prefix. | 2 · `check-site` | `ADR-008` sub-decision 2 |
| **S-03** | **No directory under `site/**` holds seven or more files** — except the **root of a package**, which has its own calibration. At seven an ordinary directory splits into subfolders that **name a context**; a folder existing only to absorb the overflow is a finding, not compliance. **The split is not a raised cap in disguise:** the ordinary number governs directories somebody organised, and the remedy it asks for — split by context — is unavailable at a package root, whose members are fixed there by npm and by tools that resolve their config from the project root. A package root is **derived from disk** (it holds `package.json`), never named, so the repository root and a package nobody has created yet are covered by the same property. Both numbers live in `guards.config.json` with their reasons, never as a literal. | 2 for both counts · 4 for whether the split means anything | `ADR-008` sub-decision 5 · **amended 2026-08-27 by TASK 47**, when `site/` sat at 6 of 6 with zero headroom and the next config file would have failed the gate attached to an unrelated item |
| **S-04** | **Class names are block, element, variant, state** — `.case-tile`, `.case-tile__metric`, `.case-tile--wide`, `.case-tile.is-current`. A class names what the thing *is*, in the site's own vocabulary, never where it sits. **A class with no stated purpose is a finding.** The canvas's mockup shorthand (`hd`, `grp`, `lbl`, `k`, `v`, `sw`) is not carried across — the fidelity diff is structural and stylistic, never name equality. | 4 | `ADR-008` sub-decision 5 |
| **S-05** | **Colour is declared in one stylesheet and no colour literal appears anywhere else.** **Breakpoints are declared there as a set, and no component may use a width the set does not carry** — a media query cannot read a custom property, so the honest form of "declared once" for a breakpoint is *sanctioned by the set*, not *written once*. Composition and the page shell live there too; **component styles stay scoped to their component, media queries included**. | 4 today · **2** once the layout-shell item builds the `check-site` assertion it owes (`G-11` — the claim moves when the mechanism does, not before) | `ADR-008` sub-decision 5 · **amended 2026-08-24 by TASK 23**, twice: the row named **Stylelint**, which `ADR-008` never chose — the word does not appear in it — and it required two things CSS cannot both satisfy. The weakening is stated rather than hidden: an invented fourth breakpoint is caught, the same `820px` repeated across eight components is not |
| **S-06** | **`site/lib/**` is framework-free and imports nothing from `site/src/**`.** That is the only reason it can sit outside `src/`: it is the surface `node:test` runs and Stryker mutates (`ADR-006`), and an Astro import takes it out of both. | 2 · `check-site` | `ADR-008` sub-decision 1 |
| **S-07** | **Nothing is installed before the item that needs it**, and no version is written down that has not been installed and read (`C-01`). The root `package.json` carries the two commands and **only tools whose configuration must live at the repository root to function** — today Stryker, and nothing else. Anything belonging to one package is installed in that package. | 4 | `ADR-008` sub-decision 6 · **amended 2026-08-24 by TASK 15**, then narrowed the same day: the first amendment read *"tooling that spans both packages"*, which is a claim about the intent of whoever adds a dependency and is therefore decidable by nobody but them. This version is a property of the tool, checkable against its own documentation |
| **S-08** | **No comment references anything outside `site/**`** — no path, no document name, no rule, ADR, incident or work-item id. The citation runs the other way: a living document points at the code, and `check-docs` keeps that pointer resolving. The reference set is derived from the repository's own top-level entries plus an id pattern, never a roster. | 2 · `check-site` | `ADR-008` sub-decision 7 |
| **S-09** | **A comment explains what the code could not say by itself, and stops there.** Short, and only where the reader would otherwise have to guess *why*. Restating *what* the line does is noise, and a file dense with comments is a file whose names failed. | 4 | `ADR-008` sub-decision 7 |
| **S-10** | **Every name says what the thing is, what it is for, and what state it holds** — variables, functions, classes, files alike. Length loses to clarity only when the scope is a single expression. This is `S-04` generalized off CSS classes onto every identifier: **a name with no stated purpose is a finding.** | 4 | `ADR-008` sub-decision 7 |

## What is decided and not yet built

Recorded so nobody re-derives it, and so "we should also…" has somewhere to land other than scope.

| Item | Owned by | Returns when |
|---|---|---|
| The `check-site` assertion behind `S-05` | the layout-shell item | ~~the token stylesheet exists~~ — it does, as of 2026-08-24. In progress in that item |
| A mechanized form of `S-01` | the layout-shell item | ~~there is markup with strings in it to scan~~ — there is, as of 2026-08-24. In progress in that item |
| A mechanized form of `S-09` and `S-10` | nobody, deliberately | a comment-density ratio and a minimum identifier length are both numbers that rot, and `i` → `indexValue` is noise wearing compliance. They stay judgment, and say so (`G-11`) |
| The loader fallback, if `base` cannot resolve outside the project root | the content-layer item | the skeleton item's spike says so — `ADR-008` sub-decision 3 carries the ladder |
