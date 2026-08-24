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
  src/        Astro only
    gateway/  the sole caller of getCollection
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
| **S-03** | **No directory under `site/**` holds seven or more files.** At seven it splits into subfolders that **name a context** — a folder existing only to absorb the overflow is a finding, not compliance. The cap lives in `guards.config.json` with its reason, never as a literal. | 2 for the count · 4 for whether the split means anything | `ADR-008` sub-decision 5 |
| **S-04** | **Class names are block, element, variant, state** — `.case-tile`, `.case-tile__metric`, `.case-tile--wide`, `.case-tile.is-current`. A class names what the thing *is*, in the site's own vocabulary, never where it sits. **A class with no stated purpose is a finding.** The canvas's mockup shorthand (`hd`, `grp`, `lbl`, `k`, `v`, `sw`) is not carried across — the fidelity diff is structural and stylistic, never name equality. | 4 | `ADR-008` sub-decision 5 |
| **S-05** | **Design tokens are declared in one stylesheet, and no colour or breakpoint literal appears outside it.** Composition and utility layers live there too; component styles stay scoped to their component. | 4 today · **2** once the layout-shell item builds the Stylelint assertion it already owes (`G-11` — the claim moves when the mechanism does, not before) | `ADR-008` sub-decision 5 |
| **S-06** | **`site/lib/**` is framework-free and imports nothing from `site/src/**`.** That is the only reason it can sit outside `src/`: it is the surface `node:test` runs and Stryker mutates (`ADR-006`), and an Astro import takes it out of both. | 2 · `check-site` | `ADR-008` sub-decision 1 |
| **S-07** | **Nothing is installed before the item that needs it**, and no version is written down that has not been installed and read (`C-01`). The root `package.json` carries the two commands and **no dependencies**. | 4 | `ADR-008` sub-decision 6 |

## What is decided and not yet built

Recorded so nobody re-derives it, and so "we should also…" has somewhere to land other than scope.

| Item | Owned by | Returns when |
|---|---|---|
| The Stylelint assertion behind `S-05` | the layout-shell item | the token stylesheet exists |
| A mechanized form of `S-01` | the layout-shell item | there is markup with strings in it to scan |
| The loader fallback, if `base` cannot resolve outside the project root | the content-layer item | the skeleton item's spike says so — `ADR-008` sub-decision 3 carries the ladder |
