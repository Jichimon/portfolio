import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import {
  findEntryBySlugAndLang,
  findAlternateLocaleEntry,
  assertEverySlugHasBothLocales,
} from '../../lib/content/entries/locale-pair.mjs';
import { listCaseStudyEntriesForLang } from '../../lib/content/entries/case-study-catalog.mjs';
import { deriveRouteSetFromEntries } from '../../lib/content/routes/route-set.mjs';
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
}

interface HomeStrings {
  employers_heading: string;
  work_heading: string;
  stack_heading: string;
  contact_heading: string;
  contact_invite: string;
  contact_note: string;
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

export async function getUiStrings(lang: Locale): Promise<UiStringsEntry> {
  const entry = findEntryBySlugAndLang(await loadUiEntries(), 'ui', lang);
  return entry as unknown as UiStringsEntry;
}

// Contact renders as a section of the home page and interface strings are chrome, so
// neither carries its own route. Nothing about the collection tells routed apart from
// not-routed, so which page slugs route, and which one is the index, is stated here.
const ROUTED_PAGE_SLUGS = ['home', 'about', 'experience'];
const INDEX_PAGE_SLUG = 'home';

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
