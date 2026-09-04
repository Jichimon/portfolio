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
import {
  buildEmploymentRecord,
  collectDeclaredLogoFiles,
  deriveDarkLogoFileName,
} from '../../lib/content/pages/employment-record.mjs';
import { assertEveryAssetIsReferenced } from '../../lib/content/assets/published-photos.mjs';
import {
  assertTestimonialIdsAgreeAcrossLocales,
  assertTranslationsCarryTheirOriginal,
  assertExcerptsAreVerbatim,
  buildTestimonialCards,
} from '../../lib/content/testimonials/testimonials.mjs';
import {
  assertStackIdsAgreeAcrossLocales,
  assertMarkIsRenderable,
  buildStackItems,
} from '../../lib/content/stack/stack.mjs';

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
  testimonial_translated_from_en: string;
  testimonial_translated_from_es: string;
  testimonial_link: string;
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
  // The three result states. Each is read as a label with the address rendered after it,
  // which is why none of them ends in punctuation and why none carries a placeholder: a
  // sentence template would be a formatting convention no other string here uses.
  sending: string;
  sent: string;
  error: string;
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

// The marks sit outside this package, beside the markdown that names them, and are read-only
// input — pulled in as build-time text exactly like the diagram sources below, and for the same
// reason: the paths resolve against THIS file rather than against whatever directory the bundled
// output ends up in. Inlined rather than linked because a mark has to inherit the chip's colour
// to survive both themes, and an <img> cannot.
//
// The glob is a PUBLICATION BOUNDARY, the same one the photographs carry: every file it matches
// is emitted whether or not anything renders it. It is scoped to the stack's own folder, so the
// employers' marks sit outside it by folder rather than by a roster.
const MARK_SOURCES = import.meta.glob('../../../resources/logos/stack/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const MARK_SOURCE_BY_FILE_NAME = new Map(
  Object.entries(MARK_SOURCES).map(([sourcePath, text]) => [fileNameFromSourcePath(sourcePath), text]),
);

export interface StackChip {
  name: string;
  markSvg?: string;
}

// An empty collection is the legitimate "not curated yet" state and yields no chips, so the site
// builds before the list exists. One locale present without the other is NOT that state — it is a
// strip that would be silently different in one language — and the core refuses it by name.
export async function listStack(lang: Locale): Promise<StackChip[]> {
  const entries = await getCollection('stack');
  if (entries.length === 0) {
    return [];
  }
  assertStackIdsAgreeAcrossLocales(entries);

  for (const [fileName, svgText] of MARK_SOURCE_BY_FILE_NAME) {
    assertMarkIsRenderable(svgText, fileName);
  }
  const markNames = new Set(MARK_SOURCE_BY_FILE_NAME.keys());
  assertEveryAssetIsReferenced(
    [...markNames],
    entries.map((entry) => (entry.data.stack ?? []) as { file: string }[]),
  );

  const entry = findEntryBySlugAndLang(entries, 'stack', lang);
  // The core is framework-free .mjs and carries no types, so the single cast lands here, at the
  // boundary that knows what it called — the same place and reason as the home tiles above.
  const items = buildStackItems(entry.data, markNames) as { name: string; markFile?: string }[];

  return items.map(({ name, markFile }) =>
    markFile === undefined ? { name } : { name, markSvg: MARK_SOURCE_BY_FILE_NAME.get(markFile) as string },
  );
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

export interface TestimonialCard {
  id: string;
  quote: string;
  name: string;
  title: string;
  company: string;
  url: string;
  linkLabel: string;
  translationNote?: string;
}

type BuiltTestimonial = Omit<TestimonialCard, 'linkLabel' | 'translationNote'> & { translatedFrom?: string };

// The core decides which recommendations render, in what order, and which of them is a
// translation; only the join from a source language to the sentence that names it lands
// here, because that sentence is chrome copy and the core has no view of the strings
// collection. A missing string throws rather than rendering an empty note: a translated
// quote that does not say it is one is the thing this whole path exists to prevent.
function translationNoteFor(translatedFrom: string, home: HomeStrings): string {
  const noteByLanguage: Record<string, string | undefined> = {
    en: home.testimonial_translated_from_en,
    es: home.testimonial_translated_from_es,
  };
  const note = noteByLanguage[translatedFrom];
  if (!note) {
    throw new Error(`the interface strings carry no testimonial_translated_from_${translatedFrom}, so a quote translated from "${translatedFrom}" has no way to say so`);
  }
  return note;
}

// An empty collection is the legitimate "not transcribed yet" state and yields no cards, so
// the site builds before the recommendations exist. One locale present without the other is
// NOT that state — it is a column that would be silently shorter in one language — and the
// core refuses it by name.
export async function listTestimonialCards(lang: Locale): Promise<TestimonialCard[]> {
  const entries = await getCollection('testimonials');
  if (entries.length === 0) {
    return [];
  }
  assertTestimonialIdsAgreeAcrossLocales(entries);

  for (const entry of entries) {
    const sourceName = `testimonials.${entry.data.lang}.md`;
    assertTranslationsCarryTheirOriginal(entry.data, sourceName);
    assertExcerptsAreVerbatim(entry.data, sourceName);
  }

  const entry = findEntryBySlugAndLang(entries, 'testimonials', lang);
  const home = (await getUiStrings(lang)).data.home;

  // The core is framework-free .mjs and carries no types, so the single cast lands here, at
  // the boundary that knows what it called — the same place and the same reason as the home
  // tiles above.
  const builtCards = buildTestimonialCards(entry.data) as BuiltTestimonial[];

  return builtCards.map(({ translatedFrom, ...card }) => {
    const rendered: TestimonialCard = { ...card, linkLabel: home.testimonial_link };
    if (translatedFrom !== undefined) {
      rendered.translationNote = translationNoteFor(translatedFrom, home);
    }
    return rendered;
  });
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
  anchor?: string;
  stack?: string[];
  logo?: string;
  logoDark?: string;
  caseStudyRows?: { title: string; href: string }[];
}

// The employer marks sit beside the marks the stack strip reads (MARK_SOURCES above), in a
// separately-scoped folder rather than the same one — a single shared marks folder would
// make every employer logo read as unreferenced to the stack's own publication-boundary
// check and every technology mark unreferenced to this one, forcing a roster to tell the
// two families apart instead of the folder boundary doing it for free.
//
// `?url` rather than `?raw`: an employer mark renders as a full-colour <img>, never inlined
// and painted with currentColor the way a stack mark is, so what this boundary needs is a
// real, build-processed asset URL rather than the SVG's text.
//
// `&no-inline` is load-bearing, not decoration: Vite's own `assetsInlineLimit` (4096 bytes
// by default) still applies under a bare `?url` — measured directly against this folder's
// real content, where nice.svg (1,594 bytes) built to a `data:` URI while the other three
// marks, all larger, built to real `/_astro/*.svg` paths. A logo that only breaks below a
// byte threshold is exactly the kind of defect that ships quietly, so the query forces the
// same real-URL behaviour regardless of file size rather than relying on every future mark
// happening to be large enough.
const EMPLOYER_LOGO_SOURCES = import.meta.glob('../../../resources/logos/employers/*.svg', {
  query: '?url&no-inline',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const EMPLOYER_LOGO_URL_BY_FILE_NAME = new Map(
  Object.entries(EMPLOYER_LOGO_SOURCES).map(([sourcePath, url]) => [fileNameFromSourcePath(sourcePath), url]),
);

// The sibling-file convention (deriveDarkLogoFileName): every file in the folder is either
// a base mark or that base mark's dark-theme variant, told apart by name alone — no second
// frontmatter key, no schema change. Split once here so both the publication-boundary check
// below and the resolution step further down read from the same two sets.
const DARK_LOGO_FILE_SUFFIX_PATTERN = /-dark\.[^.]+$/;

function isDarkLogoFileName(fileName: string): boolean {
  return DARK_LOGO_FILE_SUFFIX_PATTERN.test(fileName);
}

const EMPLOYER_LOGO_BASE_FILE_NAMES = [...EMPLOYER_LOGO_URL_BY_FILE_NAME.keys()].filter(
  (fileName) => !isDarkLogoFileName(fileName),
);
const EMPLOYER_LOGO_DARK_FILE_NAMES = [...EMPLOYER_LOGO_URL_BY_FILE_NAME.keys()].filter(isDarkLogoFileName);

// The publication-boundary half of EMP-002, in two parts. Reads every experience entry
// directly off the pages collection rather than through getExperienceRecord(lang), because
// the boundary spans both locales at once and a single-locale call only ever sees one of
// them.
async function assertEmployerLogoAssetsAreAllReferenced() {
  const experienceEntries = (await loadPageEntries()).filter((entry) => entry.data.slug === EXPERIENCE_PAGE_SLUG);
  const rolesByLocale = experienceEntries.map(
    (entry) => (entry.data.roles ?? []) as Record<string, unknown>[],
  );
  const declaredLogosByLocale = rolesByLocale.map((roles) => collectDeclaredLogoFiles(roles) as { file: string }[]);

  // A base mark that no role, in either locale, declares — unchanged from before this asset
  // gained a themed sibling.
  assertEveryAssetIsReferenced(EMPLOYER_LOGO_BASE_FILE_NAMES, declaredLogosByLocale);

  // A dark variant pairs with a declared base mark by NAME, never by its own frontmatter
  // key — a role never declares "logo: nice-dark.svg" itself. So the "reference" this half
  // checks is each declared base logo's OWN derived dark name, reusing the identical
  // publication-boundary function rather than a second copy of its logic: an orphaned dark
  // file (no base mark declares the name it pairs with) is exactly the same shape of finding
  // as an orphaned base mark, one level removed.
  assertEveryAssetIsReferenced(
    EMPLOYER_LOGO_DARK_FILE_NAMES,
    declaredLogosByLocale.map((entries) => entries.map(({ file }) => ({ file: deriveDarkLogoFileName(file) }))),
  );
}

// The About body is the one page body the site renders as prose. Rendering it here rather
// than in the page module keeps astro:content behind this boundary, which is the whole
// point of the boundary — a page receives a component, not a content API.
export async function renderAboutBody(lang: Locale) {
  const { Content } = await render(await getPage(ABOUT_PAGE_SLUG, lang));
  return Content;
}

export async function getExperienceRecord(lang: Locale): Promise<EmploymentEntryContent[]> {
  await assertEmployerLogoAssetsAreAllReferenced();
  const entry = await getPage(EXPERIENCE_PAGE_SLUG, lang);
  const roles = (entry.data.roles ?? []) as Record<string, unknown>[];
  const record = buildEmploymentRecord(
    roles,
    await loadCaseStudyEntries(),
    await listRoutes(),
    lang,
    `${EXPERIENCE_PAGE_SLUG}.${lang}.md`,
    new Set(EMPLOYER_LOGO_BASE_FILE_NAMES),
    new Set(EMPLOYER_LOGO_DARK_FILE_NAMES),
  ) as EmploymentEntryContent[];

  // The core validates and carries the declared FILENAMEs; only the gateway knows what
  // those filenames built into, the same split the stack chips and the about photos
  // already draw. logoDark rides along exactly like logo — resolved when present, left
  // alone (absent) when not.
  return record.map((role) => {
    if (role.logo === undefined) {
      return role;
    }
    const resolved = { ...role, logo: EMPLOYER_LOGO_URL_BY_FILE_NAME.get(role.logo) as string };
    if (role.logoDark !== undefined) {
      resolved.logoDark = EMPLOYER_LOGO_URL_BY_FILE_NAME.get(role.logoDark) as string;
    }
    return resolved;
  });
}

// The home employers strip links every card at the same target the "most recent" badge and
// the rest of the record already point readers toward: the /experience page itself. Resolved
// off the nav's own "experience" item rather than a literal path, the same join
// getBackToWorkHref below uses for "work" — so a locale added there is not spelled out twice.
export function getExperienceHref(lang: Locale): string {
  const experienceItem = NAV_ITEMS.find((item) => item.key === 'experience');
  if (!experienceItem) {
    throw new Error('the nav declares no "experience" item for the employers strip to link to');
  }
  return resolveNavItemHref(experienceItem, { lang, isIndexPage: false }) as string;
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
