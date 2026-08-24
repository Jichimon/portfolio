# ADR-007: UI component model — `.astro` by default, Preact for islands, zero islands today

**Status:** Accepted
**Date:** 2026-08-23
**Context:** `ADR-001` chose Astro with static output and then deferred one question by name: *"whether any specific piece of the site's UI should be a React island, plain CSS/JS, or a View Transition — that is a design decision for TASK 8."* `TASK 8` closed on 2026-08-23 without recording it, and the site implementation backlog immediately below needs it: every `feature` spec in that backlog cites this ADR in `governed_by`, and a spec citing an ADR that does not exist governs nothing. The framework choice itself was taken with the author on 2026-08-23; this ADR records it with its rejected alternatives and its cost, and does not re-open it.

## Options considered

The rejected options are here because they are the ones a reader might reasonably have chosen. An ADR listing only what was picked is a record of a conclusion, not of a decision.

| Option | Pros | Cons |
|---|---|---|
| **React proper, via `@astrojs/react`** | The default choice, the largest ecosystem, no compatibility layer between what is written and what runs | The runtime a hydrating page must ship is `react` + `react-dom/client` together, which no source found measures below ~60 KB gzipped (see the sizing note). The author named low page weight and fast load as the priority for this site, and there is no functional capability at this scale that React has and Preact does not |
| **Preact via `@astrojs/preact` with `preact/compat`** — chosen | What gets written is literal React: JSX, hooks, the same public API. What ships is a fraction of the runtime. Astro maintains the integration | A compatibility layer is one more thing between the source and the browser, and it carries a documented boundary: *"the compat option only works for React libraries that export code as ESM"* |
| **No framework at all** | The smallest possible answer, and — as it turns out — sufficient for every behaviour the site needs today | The contact form's four designed states (`idle`, `sending`, `sent`, `error`) arrive with the contact-form Worker item, and that is a genuinely stateful widget. Retrofitting a framework, its integration and its test tier at that point costs more than declaring one now, while nothing depends on the answer |

## Decision

**1 · `.astro` by default, zero framework JavaScript.** This is `ADR-001`'s default restated as the rule rather than the fallback. A component is `.astro` unless something forces otherwise, and the thing that forces otherwise is named in point 3.

**2 · Preact is the declared framework, through `@astrojs/preact` with `preact/compat` enabled.** The integration is configured as `preact({ compat: true })`, which per Astro's own documentation *"will render React components as well as Preact components in your project and also allow you to import React components inside Preact components."* The point of `compat` is that islands are written as ordinary React — JSX and hooks, the same API — so nothing about the authoring experience is unusual, and nothing has to be unlearned if the choice is ever revisited.

**3 · Islands are enumerated, not implicit — and the count today is zero.**

The bar is `ADR-001`'s own carried-forward heuristic: **reserve framework islands for genuinely stateful widgets.** A new island needs a stated reason in the work item that introduces it. Two behaviours that look like islands and are not, with the reason each fails the bar:

- **The scroll-spy rail.** The design specification of record specifies it as *"roughly 30 lines of vanilla JS"*, with a working reference implementation already present in the canvas source, generalized over a `data-spy` attribute. Its fourth acceptance criterion is that **with JavaScript disabled the rail is still a working list of links** — tracking is the enhancement, never the mechanism. The rail must therefore be server-rendered markup regardless; an island would sit on top of work that has to exist anyway, and would render nothing of its own.
- **The theme toggle.** The layout-shell item requires that the theme *"must not flash on load — set it before first paint."* No hydrating island can satisfy that: hydration happens after paint by definition. The resolution has to be a blocking inline script, and once that script exists, the button beside it is a button.

**One behaviour is expected to clear the bar, and is named now so its arrival is not a surprise:** the contact form's four states, when the contact-form Worker item lands. Until then the form is `mailto:`, and the `sending` / `sent` / `error` states are designed and unexercised.

**4 · The integration is installed and proven before it is needed.** The Astro skeleton item installs `@astrojs/preact` and proves hydration with one throwaway island, then removes it. The path is therefore known to work at the moment the first real island is written, rather than being debugged then.

### On the sizing claim, and why this ADR does not repeat it

The work-item register justified this choice with *"~3KB instead of ~45KB gz per hydrating page."* That figure came out of a planning conversation. It was sent for sourcing before being written here, and **neither number survived**:

| Measured surface | Source | Gzipped |
|---|---|---|
| Preact, as Preact advertises it | `preactjs.com` homepage — *"Fast 3kB alternative to React"* | 3 kB |
| Preact, as Preact's own README says the same day | repository `README.md` — *"Fast 4kB alternative to React"* | 4 kB |
| `preact`, core only | Bundlephobia, `preact@10.29.8` | 4,837 B |
| `preact` + `preact/hooks` | bundlejs.com | 6,199 B |
| **`preact/compat`** — the surface this ADR actually chose | bundlejs.com | **9,689 B** |
| `react` + `react-dom/client` — the real browser entry since React 18 | bundlejs.com, `react@19.2.8` | **60,329 B** |

Preact's two vendor-authored figures disagree with each other; the independent measurement of the compat surface is roughly three times the advertised number; and the React figure is *higher* than the register claimed, not lower. More importantly, **no source measures the thing the decision actually turns on** — the same widget, built once in each, with its features. Every published figure above is a library-size proxy.

So this ADR asserts only what the sources support: **every source agrees the gap is large and in Preact's favour, and no source supports the specific pair of numbers.** None will, until this repository builds one island and measures it. `C-01` is the rule here — a missing number is fine, a wrong one is disqualifying.

## Consequences

- **We gain:** React's public API at a fraction of the runtime cost, on a site whose author named page weight as the priority. A zero-JS default that keeps the no-JS acceptance criteria — the scroll-spy rail, the language switcher — satisfiable by construction rather than by discipline. And an enumerated island list, so page weight stays a decision someone makes rather than an accumulation nobody notices.
- **We accept losing:** the React ecosystem's long tail. Astro documents the boundary — *"the compat option only works for React libraries that export code as ESM"*, with `vite.ssr.noExternal` as the escape hatch — and Preact separately notes that some React libraries use types `preact/compat` may not provide. Which specific library breaks is discovered per library, not knowable now. We also accept a compatibility layer between what is written and what runs, and the smaller pool of people who have debugged Preact-specific behaviour. And we accept installing an integration that ships nothing at the localhost milestone, because zero islands is the honest count today.
- **This creates a dependency on:** the Astro skeleton item, which installs the integration and proves hydration; and on `ADR-006`'s 2026-08-23 amendment, which decides how an island is tested once one exists.

## Review trigger

Three, each concrete enough to notice:

- **A widget needs client state spanning more than one element.** The contact form's four states is the first named candidate, arriving with the contact-form Worker item. That is the trigger to write the first island, and to record its reason in that item.
- **A React library the site actually wants fails under `compat`** — most likely by shipping CJS rather than ESM, which is the documented boundary. If `vite.ssr.noExternal` does not resolve it, that is the trigger to reconsider React proper for that page, and to price the second runtime honestly rather than assuming the compat layer is free.
- **The first real island is built and measured.** That measurement is the first feature-equivalent number this decision will ever have had. If it lands nowhere near the gap the library-size proxies imply, what gets revisited is the reasoning above — not the numbers, which this ADR already declines to assert.

## Sources

One researcher pass, this session, 2026-08-23, briefed to return sourced facts and explicitly forbidden from recommending a choice or drafting this document. The decision was already the author's; the research existed to make the write-up honest, not to make the call.

Official/vendor, fetched 2026-08-23: Astro docs *Integrations · Preact* (the `compat: true` option, its quoted effect, and the ESM caveat) and *Testing*; Preact's homepage, repository `README.md`, and *Switching to Preact* guide; npm registry metadata for `@astrojs/preact` (`6.0.4`, published 2026-08-19), `preact`, `react` and `react-dom`; the package manifest unpkg serves for `@astrojs/preact@6.0.4`, confirming the peer dependency `preact: ^10.6.5`; GitHub Releases for `withastro/astro` and `preactjs/preact`.

Independent tooling, fetched 2026-08-23, used only for the size figures and named as third-party instrumentation rather than vendor claims: Bundlephobia (`preact@10.29.8`, `react@19.2.8`, `react-dom@19.2.8`) and bundlejs.com (`preact` + `preact/hooks`, `preact/compat`, `react` + `react-dom/client`).

Repository data (`D1`), read directly: `docs/adr/ADR-001-site-stack.md` (the deferral this ADR closes), `docs/design/claude-design-brief.md` §6–§7 (the component inventory and the behaviour contracts), `docs/design/canvas/src/Main.dc.html` and `docs/design/canvas/src/CaseStudyDetail.dc.html` (the working `data-spy` reference implementation, confirming the scroll-spy is already solved without a framework), and `TASKS.md` (the backlog's island claim, which this ADR corrects).

**Evidence caveats carried forward.** The `preact/compat` alias list reached this document through a search summary of Preact's *Switching to Preact* guide rather than a verbatim fetch of that page — accurate in substance, not quoted. No feature-equivalent bundle measurement exists for any of the figures above; every one is a library-size proxy, and they disagree with each other, which is why the decision rests on the direction rather than on a number. Whether `@testing-library/preact` requires a manual cleanup call is documented nowhere in either Preact's guide or the package's README — a genuine absence, recorded rather than assumed, and one the first island will settle.
