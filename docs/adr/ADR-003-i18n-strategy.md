# ADR-003: i18n strategy — unprefixed English, `/es/` for Spanish, routes wired off `slug`

**Status:** Accepted
**Date:** 2026-08-19
**Context:** Builds on ADR-001 (Astro, static output) and ADR-002 (content collections, `slug`/`lang` as two of the five universal frontmatter keys, shared identically across each `.en.md`/`.es.md` pair). This decision fixes how that pair becomes two routes: URL shape, how a content-collection entry actually wires to an Astro route, and how a page links to its sibling locale.

## Options considered

### URL shape

| Option | Pros | Cons |
|---|---|---|
| **(a) Prefix every locale, including default** (`prefixDefaultLocale: true`) — `/en/case-studies/x`, `/es/case-studies/x` | Symmetric route-generation code, no root-vs-subfolder special case; unambiguous locale in every URL | Every URL the primary audience (English-speaking hiring managers, per `CLAUDE.md`) sees carries a `/en/` segment that buys them nothing; as of Astro v6, root `/` does **not** auto-redirect to `/en/` unless `redirectToDefaultLocale` is explicitly re-enabled — an unconfigured root is a real 404 risk under this option |
| **(b) Prefix only the non-default locale** (`prefixDefaultLocale: false`, Astro's documented default) — `/case-studies/x` for English, `/es/case-studies/x` for Spanish | Clean, unprefixed URLs for the default locale; matches the shape the frozen content's own internal links already assume (every link in `resources/**` is written as `/case-studies/{slug}`, no locale segment) | Asymmetric routing code — the default locale's pages live at the collection root, every other locale needs its own route file; a small, bounded cost at exactly two locales |

No built-in SEO advantage is tied to this flag either way — hreflang/canonical generation is config-driven (via `@astrojs/sitemap`'s own `i18n` block) regardless of which option is chosen, not an automatic consequence of `prefixDefaultLocale`.

### Wiring a content-collection entry to a route

| Option | Pros | Cons |
|---|---|---|
| **Two thin `getStaticPaths` route files, one per locale**, each filtering the same collection by `lang` | Matches option (b)'s asymmetric shape directly; matches Astro's own recipe pattern for combining `getCollection` + `getStaticPaths`; simple to reason about for exactly two locales | Small duplication between the two route files (mitigated with a shared helper); cost scales if a third locale were ever added — not a concern this project has |
| **One catch-all route with `i18n.routing: "manual"`**, hand-computing locale and slug from the path, calling Astro's `redirectToDefaultLocale()`/`notFound()`/`middleware()` helpers directly | One file instead of two; full control if routing logic ever needs to branch on more than locale | Opts out of the automatic routing Astro gives for free, for a two-locale, fully symmetric content set that doesn't need that control — disproportionate to the actual problem size |

**Eliminated:** locale-subfolder content — one folder per language, mirroring Astro's own recipe example exactly — would require renaming every file in `resources/**`, which is frozen (`H-02`) and already fixed to the flat `slug.lang.md` shape by ADR-002.

## Decision

**We choose: (b) prefix only the non-default locale, `defaultLocale: en`; two `getStaticPaths` route files per collection, joined on `entry.data.slug` and filtered by `entry.data.lang`.**

`en` as default is a judgment call stated plainly, not a technical requirement Astro imposes: `CLAUDE.md`'s stated audience (remote, international, English-speaking roles) and the content's own existing internal links (written unprefixed throughout `resources/**`) both point the same direction. Routing code must join on `entry.data.slug` — Astro's own auto-generated `id` (via `github-slugger` on the filename, e.g. `mobile-banking-platform-en`) is **not** the join key ADR-002 established and must not be used for pairing. Cross-locale links use `astro:i18n`'s `getRelativeLocaleUrl(locale, path)`.

> ✏️ **Both open items below were answered on 2026-08-24, and one sentence in the paragraph above was found to be factually wrong for the installed Astro.** See [Amended 2026-08-24](#-amended-2026-08-24--both-open-items-answered-and-one-stated-fact-corrected) at the end of this document before relying on anything in this section.

**Explicitly not decided here, and named as open rather than silently assumed:**

- **The in-body link-rewriting mechanism.** Every internal `/case-studies/{slug}`-style link inside the frozen `resources/**` content is locale-naive — the identical link appears verbatim in both `.en.md` and `.es.md` files. Under this ADR's URL shape, that link resolves correctly when read from an English page (coincidentally, since English is unprefixed) but would point at the **English** case study when rendered on a Spanish page, unless something rewrites it. Nothing in Astro's i18n feature does this automatically. This is real implementation work TASK 8 must carry, not a gap in this decision — recorded here so it isn't discovered as a surprise mid-build.
- **Whether Astro's built-in `i18n.fallback` behavior fires for collection-driven `getStaticPaths` routes**, versus only for its own automatic page-folder scan — the fetched evidence for this specific interaction was thin (see the researcher's report, this session). Irrelevant today (every `slug` has both locales, confirmed directly against `resources/`), but TASK 8 should verify this empirically before relying on it, rather than assume it.

## Consequences

- **We gain:** URL cleanliness for the audience that matters most; a routing shape that matches the content's own existing (if currently non-functional) internal links, minimizing rework; an explicit, footgun-documented join key.
- **We accept losing:** route-generation symmetry between locales — the English route file and the Spanish route file are not structurally identical, a small ongoing cost at exactly two locales.
- **This creates a dependency on:** TASK 8 building a link-rewriting mechanism for in-body content links before the site can correctly serve Spanish pages linking to other content — without it, every Spanish page's internal links point at English content. TASK 8 should also treat the `i18n.fallback` question above as a verify-before-relying-on-it item, not an assumption.

## Review trigger

If a third locale is ever added, revisit the two-route-files approach — the cost of the `"manual"` routing mode's single-catch-all was rejected specifically for being disproportionate at two locales, and that calculus changes at three. If the link-rewriting mechanism TASK 8 builds turns out to need per-locale content changes rather than a render-time transform, that's the trigger to revisit whether `resources/**`'s frozen, locale-naive link convention needs a documented exception.

## ✏️ Amended 2026-08-24 — both open items answered, and one stated fact corrected

The content layer is built. Both items this ADR left open now have answers, and building them found an error in the Decision paragraph above.

### The in-body link rewrite — answered, and split on purpose

**Mechanism:** a pure function, `localizeInternalHref(href, lang)`, in [site/lib/content/routes/internal-link-localizer.mjs](../../site/lib/content/routes/internal-link-localizer.mjs). English returns the href unchanged, because English is unprefixed. Spanish delegates to the same path builder the route set uses, so *how a path becomes a Spanish path* is declared once rather than in two files. A fragment, an absolute URL, a protocol-relative URL and a `mailto:` are returned untouched, and an already-prefixed href is never double-prefixed.

**What is deliberately not built yet:** the rehype plugin that applies it to the markdown pipeline. Nothing renders prose today, so a plugin could only be verified by reading it — and "it renders" is not a standard this repository accepts. The item that builds the article templates wires it and proves it against real HTML. The split is stated here rather than left as a silence, because a half-answered open item reads exactly like a finished one.

### Astro's `i18n.fallback` — answered by removing the dependency, not by testing it

This ADR asked whether the built-in fallback fires for collection-driven `getStaticPaths` routes, and told the implementer to verify it before relying on it. **It is not relied on, so the question is moot rather than answered** — and saying which of the two it is matters.

There is no `i18n` block in `astro.config.mjs`. Routes are explicit, and a slug present in only one locale throws at build naming the slug, instead of quietly falling back to the other locale's content. Failing loudly is the behaviour this project wants: a fallback that silently serves English on a Spanish URL is a half-page, and a half-page is the thing the register's definition of done named.

**No empirical test of the fallback interaction was run.** Nothing in this repository depends on the answer, and running an experiment to document behaviour nobody consumes would be evidence with no claim under it. If a later item ever wants the fallback, this is still open and must be measured then.

### ⛔ Corrected — the auto-generated collection id is **not** filename-derived

The Decision paragraph says:

> Astro's own auto-generated `id` (via `github-slugger` on the filename, e.g. `mobile-banking-platform-en`) is **not** the join key ADR-002 established and must not be used for pairing.

**The parenthetical is wrong for `astro@7.2.5`, and wrong in the dangerous direction.** Read from the glob loader's own source in the installed `astro` package — deliberately not cited as a path, because an installed dependency is absent on a clean checkout and a citation that only resolves after `npm install` is one that rots:

```js
function generateIdDefault({ entry, base, data }, isLegacy) {
  if (data.slug) {
    return String(data.slug);
```

The default id is **`data.slug` whenever frontmatter carries one** — and every file in `resources/**` carries one, because `ADR-002` made `slug` universal. So both halves of a locale pair generate the *same* id, and the second one loaded silently overwrites the first in the content store. The advice *"do not pair on the id"* was sound; the reason given for it described behaviour that does not exist here, and the real behaviour is worse than the one being warned about — entries disappear rather than merely failing to pair.

**Found by a build, not by review.** The first real build of the collections failed with `slug "about" is present only in "es", missing "en"` — the content layer's own pair assertion catching a live defect on its first contact with real content, which is what that assertion exists for.

**The fix** is an explicit `generateId` on all three collections in [site/src/content.config.ts](../../site/src/content.config.ts), deriving the id from the entry's relative file path, which is unique per locale by construction. The join key is unchanged and this ADR's decision stands: consumers pair on `entry.data.slug`, never on the id.

### ✏️ Amended — cross-locale links do not use `astro:i18n`

This ADR says *"Cross-locale links use `astro:i18n`'s `getRelativeLocaleUrl(locale, path)`."* `ADR-008`, five days later, places locale URLs in the framework-free core, and `S-06` makes that enforceable: a module importing `astro:i18n` leaves the reach of both `node:test` and the mutation gate. The later decision governs. Locale URLs are built by a pure function that both runners can see, and no `astro:i18n` import exists in the repository.

## Sources

One researcher pass, this session, 2026-08-19. Official/vendor, all fetched 2026-08-19: Astro docs *Internationalization (i18n) Routing*, *Add i18n features (recipe)*, *astro:i18n reference*, *Content Collections*, *Content Loader API Reference*, *Upgrade to v6*, *@astrojs/sitemap integration* (docs.astro.build). Independent corroboration on sitemap hreflang behavior: intlpull.com, retrieved 2026-08-19. Repository data (`D1`), read directly: `resources/site/*.{en,es}.md`, `resources/case-studies/mobile-banking-platform.{en,es}.md`, `scripts/guards/lib/content.mjs`, ADR-001, ADR-002.

**Evidence caveats carried forward:** the automatic-middleware-vs-custom-`getStaticPaths` fallback interaction (see "Explicitly not decided here") rests on absence-of-mention in official docs rather than an explicit statement either way. The current Astro major version (v7.2.x) came from a search-result summary, not an independently fetched release page — irrelevant to this ADR's routing decisions, which the fetched upgrade guide confirms are stable back to v5/v3.5.0.
