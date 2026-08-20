# ADR-001: Site stack — Astro, static output

**Status:** Accepted
**Date:** 2026-08-19
**Context:** TASK 7 needs a generator/framework and rendering model for a bilingual, Markdown-plus-frontmatter portfolio site (`resources/**`, frozen and read-only). No user accounts, no forms, no database — the content changes rarely and only by the author's own hand between sessions. The goal, stated by the author: fast, free to run, low-maintenance, and no "generated site" tells.

## Options considered

<!-- Full research, sources and dates: researcher report, this session, 2026-08-19. -->

| Option | Pros | Cons |
|---|---|---|
| **Astro (static output)** | Content-collections model maps closely to the frontmatter shape `check-content` already validates (five universal keys + type-dependent extras); built-in `i18n` routing; `remark-directive` plugin parses the frozen `:::diagram{id="..." type="..."}` syntax directly, no rewriting; zero client JS by default (islands are opt-in); official Cloudflare Pages guide; same Node runtime the harness already uses (`scripts/gate.mjs`, `node --test`) | npm/Node dependency surface (`package.json`, `node_modules`); content-collections' own zod schema is a second place frontmatter shape gets asserted, alongside `check-content` — a real but small redundancy, not a conflict, since both can derive from the same `type`-keyed rule |
| **Eleventy (11ty)** | Lightest dependency surface of the JS-ecosystem options; no imposed schema layer at all, so `check-content` stays the *only* source of truth for frontmatter shape; fast builds; official Cloudflare Pages guide | i18n is link/URL-management only (bundled plugin, since v2.0.0) — no content-schema validation built in (non-cost here, since `check-content` already exists); the `:::diagram{...}` directive needs two community plugins wired through `amendLibrary` rather than one first-party mechanism |
| **Hugo** | Fastest builds and simplest operability of any candidate — single Go binary, zero npm surface; i18n is genuinely first-class and needs no plugin | **No native mechanism parses `:::diagram{id="..." type="..."}`.** Goldmark render hooks cover exactly seven fixed element types, none a generic attributed container; the closest native tool (shortcodes) uses a different bracket syntax (`{{< … >}}`) than the frozen content. Making this content model work needs an undocumented Passthrough-hook workaround or a preprocessing stage — not the "thin custom layer" the project wants, a second pipeline stage on top of Hugo's own |
| **SvelteKit (`adapter-static`)** | `mdsvex` is unified/remark-based, so `remark-directive` applies the same way it does for Astro — a real fit for the directive syntax; most flexible component authoring of the group if the site ever wants richer interactive elements | No first-party i18n routing comparable to Astro's — needs a community i18n library plus manual `[locale]` route-group wiring, more assembly than Astro's single config block; non-enumerable routes need an explicit `entries` list for the static adapter |

**Eliminated outright**, each on one deciding constraint (full reasoning and sources in the researcher's report):

- **Next.js, static export** — its own docs state built-in `i18n` config and `output: 'export'` are **mutually exclusive**; every static+bilingual pattern found is a client-side or hand-rolled workaround. Also carries a full React runtime for a site with no interactivity need.
- **Jekyll** — the directive syntax mismatch (`{::name}` vs. the frozen `:::name{attrs}`) plus a second language toolchain (Ruby/Bundler) alongside this repo's Node-based harness, with no compensating strength.
- **Zola** — "basic" multilingual support by the maintainers' own description, and **no plugin/extension system at all** — there is no in-framework path to parse the directive; it would need an external preprocessing stage, not a thin layer.
- **VitePress / Docusaurus** — both technically capable (VitePress's own `:::` syntax is the closest native match of any candidate; Docusaurus's admonitions use `remark-directive` under the hood), eliminated on fit: both default to a documentation-site theme and navigation model (sidebar, versioned docs, "Edit this page") that would need substantial override work to read as a portfolio rather than a docs site — a judgment call, named as one.

## Decision

**We choose: Astro, static output (`output: 'static'`, no adapter/SSR).**

It is the only surviving option with no functional gap against this project's actual content (the directive syntax, the frontmatter model) and no elimination-grade cost. Hugo is faster and simpler to operate but cannot cleanly parse `:::diagram{...}` — the one piece of the content model this decision has to get right for decision 4 to build on. Eleventy is a legitimate lighter-weight alternative (see Review trigger); Astro is chosen over it for i18n that doesn't need hand-assembly and a content-collections model that documents the frontmatter shape in code, alongside `check-content` rather than instead of it.

**On the backend question (folded into this decision per TASK 7's framing):** no persistent backend is needed anywhere in current scope. `contact.md` has no submission handler by design (TASK 2 acceptance), there are no user accounts, and content changes only through the author's own editor between sessions. Static output settles this — nothing here runs a server in production.

**On component authoring — plain HTML/CSS/JS and React are not a fork in this decision, both are available.** Raised by the author before approval: does choosing Astro mean choosing between "plain HTML/CSS/vanilla JS" and "React"? No — a `.astro` component is "HTML-only templating... with no client-side runtime" by default (Astro docs, *Astro Components*, fetched 2026-08-19), with automatic scoped `<style>` and plain `<script>` for vanilla JS. React, Vue, Svelte, Preact, Solid and Alpine are all Astro-maintained, opt-in integrations (Astro docs, *Integrations overview*, fetched 2026-08-19). A per-component hydration directive (`client:load`, `client:idle`, `client:visible`, `client:media`, `client:only`) turns exactly one component into an interactive "island," shipping that framework's JS only where it's used — the rest of the page stays zero-JS static HTML (Astro docs, *Islands architecture* and *Directives reference*, fetched 2026-08-19). Multiple frameworks can coexist in one project (mixing happens at the `.astro` parent, not framework-to-framework directly), and a given framework's runtime is deduplicated once per page rather than once per component instance (Astro docs, *Framework components*, fetched 2026-08-19). Astro also ships native page-transition animation (`<ClientRouter />`, built on the browser's View Transitions API) with **no framework required** (Astro docs, *View Transitions*, fetched 2026-08-19) — a real path to "eye-catching" motion without reaching for React at all.

**What this does not decide:** whether any specific piece of the site's UI should be a React island, plain CSS/JS, or a View Transition — that is a design decision for TASK 8 (site work breakdown), made per-component once the site's actual interactive needs are known, not a stack-level commitment now. One independent source (Ugur Aslim, *Astro Islands: Why Your Site Doesn't Need React Everywhere*, published 2026-05-19) offers a practitioner heuristic worth carrying into that later decision: reserve framework islands for genuinely stateful widgets (a handful at most on a content-first site), and default to zero-JS markup everywhere else — offered as one opinion, not a measured result.

## Consequences

- **We gain:** a rendering model that matches the frozen content's actual shape (directive syntax, per-type frontmatter) without a preprocessing stage; zero-JS-by-default output for page-load speed; the same Node runtime already used by the harness's own tooling, so no second language toolchain enters the repository.
- **We accept losing:** Hugo's build-speed and zero-npm-dependency simplicity — a real cost for a project that values "efficient to operate," accepted because the directive-parsing gap is a functional blocker, not a preference. We also accept a small, non-conflicting redundancy between Astro's content-collections schema and `check-content`'s own frontmatter validation, both asserting the same shape from two places.
- **This creates a dependency on:** the Node/npm ecosystem for the site build (separate from, but alongside, the harness's existing Node tooling); decision 4 (content pipeline) now has a committed target for exactly how `:::diagram{id}` resolves to `/diagrams/{id}.svg` — through Astro's remark-plugin pipeline — rather than an open question.

## Review trigger

If the content-collections/`check-content` redundancy causes real drift twice (a schema accepted by one and rejected by the other, or vice versa) within the site's first year, revisit whether Astro's content-collections schemas should be dropped in favor of loose frontmatter typing plus `check-content` as sole source of truth — the fix is narrower than re-opening the framework choice. If build time on the real `resources/` corpus (once decision 4 is built) exceeds 60 seconds on ordinary hardware, that is the trigger to benchmark Eleventy against it directly rather than accept Astro's convenience at that cost.

## Sources

Two researcher passes, both this session, 2026-08-19:

- Stack comparison (Astro/Eleventy/Hugo/SvelteKit vs. Next.js/Jekyll/Zola/VitePress/Docusaurus): Astro docs (*Content Collections*, *Internationalization*), Eleventy docs (*i18n*, *Markdown*), Hugo docs (*Render Hooks*), Next.js docs (*export-no-i18n*), Jekyll docs (*Markdown Options*), Cloudflare Pages *Framework guides* — all official/vendor, fetched 2026-08-19. `remark-directive` README (unifiedjs, independent). Hugo speed/i18n claims sourced to `gethugothemes.com` (theme vendor, flagged as interested-party evidence, not independent).
- Component authoring follow-up (React/vanilla mixing): Astro docs (*Astro Components*, *Styling & CSS*, *Integrations overview*, *Islands architecture*, *Directives reference*, *Framework components*, *View Transitions*) — official/vendor, fetched 2026-08-19. Practitioner heuristic on when to reach for a framework island: Ugur Aslim, independent, published 2026-05-19.
