import type { CollectionEntry } from 'astro:content';
import { getCollection, render } from 'astro:content';
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
import {
  collectReferencedDiagramIds,
  resolveDiagramAssets,
} from '../../lib/content/diagrams/diagram-assets.mjs';
import {
  buildDeepDiveCards,
  buildParentTitleLookup,
} from '../../lib/content/entries/deep-dives.mjs';
import { NAV_ITEMS, resolveNavItemHref } from '../../lib/nav/nav-structure.mjs';
import { readAboutMasthead, readPhotoFigures } from '../../lib/content/pages/about-article.mjs';
import { buildEmploymentRecord } from '../../lib/content/pages/employment-record.mjs';
import { assertEveryAssetIsReferenced } from '../../lib/content/assets/published-photos.mjs';

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
  // Optional because they do not exist yet, not because they are decorative. Both are
  // an author hand-off into the frozen content, and both have a block waiting for them:
  // `part_of` is the connective that extends a case study's tag with the platform that
  // names it, and `figure_prefix` is the numbering a figure caption would carry. Until
  // each lands, the block that wants it ships shorter rather than with an approximation.
  part_of?: string;
  figure_prefix?: string;
}

interface NextUpEntry {
  key: string;
  label: string;
}

interface AboutStrings {
  label: string;
  based_in: string;
  since: string;
  reads_as: string;
  next_up: NextUpEntry[];
}

interface ExperienceStrings {
  label: string;
  most_recent: string;
  cv_note: string;
  full_history: { label: string; social: string };
  next_up: NextUpEntry[];
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


// The diagram sources sit outside this package, beside the markdown that names
// them, and they are read-only input: the build reads them and serves copies, and
// nothing is ever written back. They are pulled in as build-time text rather than
// read from disk at request time, which is what makes the paths resolve against
// THIS file rather than against whatever directory the bundled output ends up in —
// the first attempt read the directory at runtime and looked for it inside the
// build output, where it does not exist.
const DIAGRAM_SOURCES = import.meta.glob('../../../resources/diagrams/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const DIAGRAM_EXTENSION = '.svg';

function diagramIdFromSourcePath(sourcePath: string): string {
  const fileName = sourcePath.slice(sourcePath.lastIndexOf('/') + 1);
  return fileName.slice(0, -DIAGRAM_EXTENSION.length);
}

const DIAGRAM_SOURCE_BY_ID = new Map(
  Object.entries(DIAGRAM_SOURCES).map(([sourcePath, text]) => [diagramIdFromSourcePath(sourcePath), text]),
);

// Resolving here rather than in the endpoint keeps "which ids does the content
// actually reference" in the one layer that can see the content at all.
export async function listDiagramIds(): Promise<string[]> {
  const entries = await loadCaseStudyEntries();
  const referencedIds = collectReferencedDiagramIds(entries.map((entry) => entry.body ?? ''));
  return resolveDiagramAssets(referencedIds, new Set(DIAGRAM_SOURCE_BY_ID.keys())) as string[];
}

// An id that never appeared in the listing above is a caller bug rather than a 404,
// so this throws instead of returning an empty document a browser would render as a
// blank frame.
export function readDiagramAsset(id: string): string {
  const source = DIAGRAM_SOURCE_BY_ID.get(id);
  if (source === undefined) {
    throw new Error(`no diagram source is bundled for id "${id}"`);
  }
  return source;
}


export async function getCaseStudy(slug: string, lang: Locale) {
  return findEntryBySlugAndLang(await loadCaseStudyEntries(), slug, lang);
}

// Every article route, for the two page modules' getStaticPaths. Read off the route
// set rather than off the collection directly, so a slug that is derived but not yet
// routed cannot produce a page module for a path nothing else agrees exists.
export async function listCaseStudyRouteParams(lang: Locale) {
  const caseStudyEntries = (await listCaseStudies(lang)) as { data: { slug: string } }[];
  const caseStudySlugs = new Set(caseStudyEntries.map((entry) => entry.data.slug));
  return (await listRoutes())
    .filter((route) => route.lang === lang && caseStudySlugs.has(route.slug))
    .map((route) => ({ slug: route.slug }));
}

export interface DeepDiveCard {
  title: string;
  meta?: string;
  href: string;
}

export async function listDeepDiveCards(slugs: string[], lang: Locale): Promise<DeepDiveCard[]> {
  const entries = (await loadCaseStudyEntries()).filter((entry) => entry.data.lang === lang);
  const routes = (await listRoutes()).filter((route) => route.lang === lang);
  return buildDeepDiveCards(slugs, entries, routes) as DeepDiveCard[];
}

// Which platform, if any, names this case study among its deep dives. The relation
// exists only as the link list in a platform's own body, so the answer comes from the
// same extraction that strips that list — the plugin writes the slugs onto the
// rendered entry's data, and this reads them back rather than parsing a second time.
async function listPlatformSummaries(lang: Locale) {
  const platformEntries = (await loadCaseStudyEntries()).filter(
    (entry) => entry.data.lang === lang && entry.data.type === 'platform',
  );
  return Promise.all(
    platformEntries.map(async (entry) => {
      const { remarkPluginFrontmatter } = await render(entry);
      return {
        slug: entry.data.slug,
        title: entry.data.title,
        childSlugs: (remarkPluginFrontmatter.deepDiveSlugs ?? []) as string[],
      };
    }),
  );
}

export async function getParentPlatformTitle(slug: string, lang: Locale): Promise<string | undefined> {
  return buildParentTitleLookup(await listPlatformSummaries(lang))(slug) as string | undefined;
}

// The article's back link. Derived from the same nav data the rail renders, so the
// destination is declared once and the Spanish page lands on the Spanish home.
export function getBackToWorkHref(lang: Locale): string {
  const workItem = NAV_ITEMS.find((item) => item.key === 'work');
  if (!workItem) {
    throw new Error('the nav declares no "work" item for an article to link back to');
  }
  return resolveNavItemHref(workItem, { lang, isIndexPage: false }) as string;
}

// The rendered article, and everything the pipeline learned while rendering it. The
// heading list is the one the body's own anchors were built from, and the deep-dive
// slugs are the ones the pipeline lifted out of the body — a page reads both back
// from here rather than parsing the body a second time to rediscover them.
export async function renderCaseStudy(slug: string, lang: Locale) {
  const entry = await getCaseStudy(slug, lang);
  const { Content, headings, remarkPluginFrontmatter } = await render(entry);
  return {
    entry,
    Content,
    headings: headings as { depth: number; slug: string; text: string }[],
    deepDiveSlugs: (remarkPluginFrontmatter.deepDiveSlugs ?? []) as string[],
  };
}


// The photographs sit beside the markdown that names them, outside this package, and are
// read-only input — exactly like the diagram sources above, and pulled in the same way so
// the paths resolve against THIS file rather than against the build output.
//
// The glob is a PUBLICATION BOUNDARY, and that is not a figure of speech: measured against
// a real build, every file it matches is emitted into the output whether or not anything
// references it, under both an eager and a lazy glob. A photograph withheld for any reason
// would therefore ship at a guessable URL with nothing rendering it and every check green.
// assertPhotoAssetsAreAllReferenced turns that into a named build failure.
const PHOTO_SOURCES = import.meta.glob('../../../resources/photos/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
}) as Record<string, ImageMetadata>;

function fileNameFromSourcePath(sourcePath: string): string {
  return sourcePath.slice(sourcePath.lastIndexOf('/') + 1);
}

const PHOTO_SOURCE_BY_FILE_NAME = new Map(
  Object.entries(PHOTO_SOURCES).map(([sourcePath, metadata]) => [fileNameFromSourcePath(sourcePath), metadata]),
);

interface PhotoFrontmatterEntry {
  file: string;
  slot: string;
  alt: string;
  caption?: string;
}

export interface PhotoFigure {
  alt: string;
  image: ImageMetadata;
  caption?: string;
}

export interface AboutPageContent {
  masthead: { h1: string; since: string; readsAs: string; lead?: string };
  breakFigure?: PhotoFigure;
  pairFigures: PhotoFigure[];
}

async function assertPhotoAssetsAreAllReferenced() {
  const aboutEntries = (await loadPageEntries()).filter((entry) => entry.data.slug === ABOUT_PAGE_SLUG);
  const photoEntriesByLocale = aboutEntries.map(
    (entry) => (entry.data.photos ?? []) as PhotoFrontmatterEntry[],
  );
  assertEveryAssetIsReferenced([...PHOTO_SOURCE_BY_FILE_NAME.keys()], photoEntriesByLocale);
}

// The core decides which figure belongs in which slot and whether a caption exists at all;
// only the join from a filename to the built image lands here, because an ImageMetadata is
// a build artifact and site/lib cannot see one.
function withImage(figure: { file: string; alt: string; caption?: string }): PhotoFigure {
  const image = PHOTO_SOURCE_BY_FILE_NAME.get(figure.file);
  if (!image) {
    throw new Error(`photo "${figure.file}" has no bundled asset`);
  }
  const withMetadata: PhotoFigure = { alt: figure.alt, image };
  if (figure.caption !== undefined) {
    withMetadata.caption = figure.caption;
  }
  return withMetadata;
}

const ABOUT_PAGE_SLUG = 'about';
const EXPERIENCE_PAGE_SLUG = 'experience';

export async function getAboutPageContent(lang: Locale): Promise<AboutPageContent> {
  await assertPhotoAssetsAreAllReferenced();
  const entry = await getPage(ABOUT_PAGE_SLUG, lang);
  const sourceName = `${ABOUT_PAGE_SLUG}.${lang}.md`;
  const masthead = readAboutMasthead(entry.data, sourceName) as AboutPageContent['masthead'];
  const figures = readPhotoFigures(entry.data, new Set(PHOTO_SOURCE_BY_FILE_NAME.keys()), sourceName) as {
    break?: { file: string; alt: string; caption?: string };
    pair: { file: string; alt: string; caption?: string }[];
  };

  const content: AboutPageContent = { masthead, pairFigures: figures.pair.map(withImage) };
  if (figures.break) {
    content.breakFigure = withImage(figures.break);
  }
  return content;
}

export interface EmploymentEntryContent {
  company: string;
  period: string;
  title: string;
  paragraphs: string[];
  isMostRecent: boolean;
  stack?: string[];
  logo?: string;
  caseStudyRows?: { title: string; href: string }[];
}

// The About body is the one page body the site renders as prose. Rendering it here rather
// than in the page module keeps astro:content behind this boundary, which is the whole
// point of the boundary — a page receives a component, not a content API.
export async function renderAboutBody(lang: Locale) {
  const { Content } = await render(await getPage(ABOUT_PAGE_SLUG, lang));
  return Content;
}

export async function getExperienceRecord(lang: Locale): Promise<EmploymentEntryContent[]> {
  const entry = await getPage(EXPERIENCE_PAGE_SLUG, lang);
  const roles = (entry.data.roles ?? []) as Record<string, unknown>[];
  return buildEmploymentRecord(
    roles,
    await loadCaseStudyEntries(),
    await listRoutes(),
    lang,
    `${EXPERIENCE_PAGE_SLUG}.${lang}.md`,
  ) as EmploymentEntryContent[];
}

// The not-found page is the one page that belongs to no locale, so it reads both halves of
// the chrome at once and offers both locale homes rather than an alternate of itself.
export async function getUiStringsForEveryLocale(): Promise<Record<Locale, UiStringsEntry>> {
  const [en, es] = await Promise.all([getUiStrings('en'), getUiStrings('es')]);
  return { en, es };
}

export async function getLocaleHomeHrefs(): Promise<Record<Locale, string>> {
  const routes = await listRoutes();
  const hrefFor = (lang: Locale) => {
    const route = routes.find((candidate) => candidate.slug === INDEX_PAGE_SLUG && candidate.lang === lang);
    if (!route) {
      throw new Error(`the index page has no route in locale "${lang}"`);
    }
    return route.path;
  };
  return { en: hrefFor('en'), es: hrefFor('es') };
}
