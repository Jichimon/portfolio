import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import {
  findEntryBySlugAndLang,
  findAlternateLocaleEntry,
  assertEverySlugHasBothLocales,
  assertEveryPairAgreesOnOrder,
} from '../../lib/content/entries/locale-pair.mjs';
import {
  listCaseStudyEntriesForLang,
  listCaseStudyStackForLang,
  deriveHomeTiles,
} from '../../lib/content/entries/case-study-catalog.mjs';
import {
  deriveRouteSetFromEntries,
  ROUTED_PAGE_SLUGS,
  INDEX_PAGE_SLUG,
} from '../../lib/content/routes/route-set.mjs';
import { NAV_ITEMS } from '../../lib/nav/nav-structure.mjs';

export type Locale = 'en' | 'es';

// The ui collection's schema only names five universal keys and passes the rest
// through, so a caller reading entry.data.nav off the raw collection type sees
// unknown. Every group below is copied from the English interface-strings entry's
// frontmatter by hand — this is the one place that shape gets typed, so a template
// never casts it itself.
interface NavStrings {
  work: string;
  about: string;
  experience: string;
  contact: string;
  writing: string;
  architectures: string;
  search: string;
  soon_tag: string;
}

interface RailStrings {
  role: string;
  location: string;
  timezone: string;
  language_group: string;
  theme_to_dark: string;
  theme_to_light: string;
  menu: string;
  wordmark: string;
}

interface SocialLink {
  name: string;
  url: string;
}

interface HomeStrings {
  employers_heading: string;
  work_heading: string;
  standalone_label: string;
  stack_heading: string;
  contact_heading: string;
  contact_invite: string;
  contact_note: string;
  contact_email: string;
  seam_legacy: string;
  seam_modern: string;
}

interface ArticleStrings {
  toc_heading: string;
  back_to_work: string;
  role: string;
  context: string;
  period: string;
  outcome: string;
  stack: string;
  platform_tag: string;
  case_study_tag: string;
  deep_dives: string;
}

interface AboutStrings {
  label: string;
  based_in: string;
  since: string;
  reads_as: string;
}

interface ExperienceStrings {
  label: string;
}

interface ContactFormStrings {
  email_label: string;
  email_placeholder: string;
  subject_label: string;
  subject_placeholder: string;
  message_label: string;
  message_placeholder: string;
  submit: string;
}

interface FooterStrings {
  metrics_slot: string;
}

interface NotFoundDestination {
  name: string;
  what: string;
}

interface NotFoundStrings {
  status_code: string;
  status_word: string;
  heading: string;
  body: string;
  destinations: NotFoundDestination[];
}

interface UiStringGroups {
  nav: NavStrings;
  rail: RailStrings;
  socials: SocialLink[];
  home: HomeStrings;
  article: ArticleStrings;
  about: AboutStrings;
  experience: ExperienceStrings;
  contact_form: ContactFormStrings;
  footer: FooterStrings;
  not_found: NotFoundStrings;
}

// The raw entry, typed so its nine chrome-copy groups carry real shapes instead of
// unknown. A single cast lands here, at the boundary that knows what it loaded, so
// no template downstream casts anything itself.
export type UiStringsEntry = Omit<CollectionEntry<'ui'>, 'data'> & {
  data: CollectionEntry<'ui'>['data'] & UiStringGroups;
};

async function loadPageEntries() {
  const entries = await getCollection('pages');
  assertEverySlugHasBothLocales(entries);
  return entries;
}

async function loadCaseStudyEntries() {
  const entries = await getCollection('caseStudies');
  assertEverySlugHasBothLocales(entries);
  assertEveryPairAgreesOnOrder(entries);
  return entries;
}

async function loadUiEntries() {
  const entries = await getCollection('ui');
  assertEverySlugHasBothLocales(entries);
  return entries;
}

export async function getPage(slug: string, lang: Locale) {
  return findEntryBySlugAndLang(await loadPageEntries(), slug, lang);
}

export async function listCaseStudies(lang: Locale) {
  return listCaseStudyEntriesForLang(await loadCaseStudyEntries(), lang);
}

export async function getAlternate(slug: string, lang: Locale) {
  const routableEntries = [...(await loadPageEntries()), ...(await loadCaseStudyEntries())];
  const requestedEntry = findEntryBySlugAndLang(routableEntries, slug, lang);
  return findAlternateLocaleEntry(routableEntries, requestedEntry);
}

// The alternate entry names a slug and a locale, never a path — turning that into
// somewhere a switcher can link means joining it against the real route set, which
// is exactly the lookup a page would otherwise have to repeat for itself. Doing it
// here means every caller gets the join, and a page with no route in the target
// locale fails the build here rather than shipping a link nobody can follow.
export async function getAlternateHref(slug: string, lang: Locale) {
  const alternate = await getAlternate(slug, lang);
  const routes = await listRoutes();
  const alternateRoute = routes.find(
    (route) => route.slug === alternate.data.slug && route.lang === alternate.data.lang,
  );
  if (!alternateRoute) {
    throw new Error(`alternate entry for slug "${slug}" (locale "${alternate.data.lang}") has no routed page`);
  }
  return alternateRoute.path;
}

export async function listStack(lang: Locale) {
  return listCaseStudyStackForLang(await loadCaseStudyEntries(), lang);
}

// The core derives a tile's shape and its copy; it cannot derive the tile's href,
// because a path is a routing fact and site/lib/nav has no view of the collection.
// Joining the two here means a page receives tiles it can render directly, and a
// tile whose case study has no route in its own locale fails the build rather than
// shipping a dead link.
// The core is framework-free .mjs and carries no types, so the tile shape it returns
// is described once here — the same single-cast-at-the-boundary pattern the interface
// strings use above, and for the same reason: a component should never have to assert
// what it was handed.
export interface HomeTile {
  slug: string;
  title: string;
  variant: 'anchor' | 'numbered' | 'full';
  href: string;
  summaryText?: string;
  scaleFigure?: string;
  scaleCaption?: string;
  roleLine?: string;
  highlightLine?: string;
  positionNumber?: number;
}

export async function listHomeTiles(
  lang: Locale,
): Promise<{ featured: HomeTile[]; standalone: HomeTile[] }> {
  const entries = await loadCaseStudyEntries();
  // The core hands back a plain object literal, so TypeScript widens `variant` to
  // string. The cast lands here, once, at the boundary that knows what the core
  // returns — the same reason the interface strings are cast here and nowhere else.
  const { featured, standalone } = deriveHomeTiles(entries, lang) as {
    featured: Omit<HomeTile, 'href'>[];
    standalone: Omit<HomeTile, 'href'>[];
  };
  const routes = await listRoutes();

  const withHref = (tile: Omit<HomeTile, 'href'>): HomeTile => {
    const route = routes.find((candidate) => candidate.slug === tile.slug && candidate.lang === lang);
    if (!route) {
      throw new Error(`case study "${tile.slug}" has no routed page in locale "${lang}"`);
    }
    return { ...tile, href: route.path };
  };

  return { featured: featured.map(withHref), standalone: standalone.map(withHref) };
}

export async function getUiStrings(lang: Locale): Promise<UiStringsEntry> {
  const entry = findEntryBySlugAndLang(await loadUiEntries(), 'ui', lang);
  return entry as unknown as UiStringsEntry;
}

// nav-structure.mjs is framework-free and cannot see the content collection, so a
// route item's slug can silently point at a page that does not exist there — it
// would 404 in production and nothing would notice. listRoutes is the one place
// every caller ends up asking for the real route set, so the check lives here
// rather than in each page that calls it: a route item is validated once, for
// both locales, no matter how many pages render the nav.
const KNOWN_LOCALES: Locale[] = ['en', 'es'];

function assertNavRouteItemsAreRouted(routes: { slug: string; lang: string; path: string }[]) {
  for (const item of NAV_ITEMS) {
    if (item.kind !== 'route') continue;
    for (const lang of KNOWN_LOCALES) {
      const resolvable = routes.some((route) => route.slug === item.slug && route.lang === lang);
      if (!resolvable) {
        throw new Error(
          `nav item "${item.key}" targets slug "${item.slug}", which has no routed page in locale "${lang}"`,
        );
      }
    }
  }
}

export async function listRoutes() {
  const routableEntries = [...(await loadPageEntries()), ...(await loadCaseStudyEntries())];
  const routes = deriveRouteSetFromEntries(routableEntries, ROUTED_PAGE_SLUGS, INDEX_PAGE_SLUG);
  assertNavRouteItemsAreRouted(routes);
  return routes;
}
