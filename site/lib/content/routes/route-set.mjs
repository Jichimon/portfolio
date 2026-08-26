// Which page slugs get a routed page, and which one is the index. Neither is
// derivable from the content files: every page entry looks the same on disk, and
// nothing in a frontmatter block says "this one is the home page". So it is a
// decision, and it lives beside the derivation that consumes it rather than in
// each caller — the build and the smoke suite both read these, and a slug routed
// on one side but not the other is precisely the drift that would ship a 404.
export const ROUTED_PAGE_SLUGS = ['home', 'about', 'experience'];
export const INDEX_PAGE_SLUG = 'home';

const KNOWN_LOCALES = ['en', 'es'];
const CASE_STUDY_ROUTE_TYPES = ['case-study', 'platform'];

export function buildLocalizedRoutePath(unlocalizedPath, lang) {
  if (lang === 'en') {
    return unlocalizedPath;
  }
  return `/es${unlocalizedPath}`;
}

export function deriveRouteSetFromEntries(entries, routedPageSlugs, indexPageSlug) {
  const routes = [];

  if (!routedPageSlugs.includes(indexPageSlug)) {
    throw new Error(`index page slug "${indexPageSlug}" is not among the routed page slugs`);
  }

  for (const routedPageSlug of routedPageSlugs) {
    const hasMatchingEntry = entries.some((entry) => entry.data.slug === routedPageSlug);
    if (!hasMatchingEntry) {
      throw new Error(`no entry found for routed page slug "${routedPageSlug}"`);
    }

    const isIndexRoute = routedPageSlug === indexPageSlug;
    const unlocalizedPath = isIndexRoute ? '/' : `/${routedPageSlug}`;
    for (const lang of KNOWN_LOCALES) {
      routes.push({ slug: routedPageSlug, lang, path: buildLocalizedRoutePath(unlocalizedPath, lang) });
    }
  }

  const caseStudySlugs = [...new Set(
    entries
      .filter((entry) => CASE_STUDY_ROUTE_TYPES.includes(entry.data.type))
      .map((entry) => entry.data.slug),
  )];

  for (const slug of caseStudySlugs) {
    const unlocalizedPath = `/case-studies/${slug}`;
    for (const lang of KNOWN_LOCALES) {
      routes.push({ slug, lang, path: buildLocalizedRoutePath(unlocalizedPath, lang) });
    }
  }

  return routes;
}
