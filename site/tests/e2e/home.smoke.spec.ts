import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseFrontmatter } from 'yaml';
import { deriveHomeTiles } from '../../lib/content/entries/case-study-catalog.mjs';
import { buildTestimonialCards } from '../../lib/content/testimonials/testimonials.mjs';
import { buildStackItems } from '../../lib/content/stack/stack.mjs';
import {
  deriveRouteSetFromEntries,
  ROUTED_PAGE_SLUGS,
  INDEX_PAGE_SLUG,
} from '../../lib/content/routes/route-set.mjs';

// Same reason as the route suite next door: Playwright runs under plain Node, so the
// gateway cannot be imported — it reaches for astro:content, which only Astro's own
// pipeline resolves. This reads the markdown the collection reads and feeds it through
// the very functions the gateway calls, so what the page is expected to show is derived
// from the same source the page derives it from, never restated here.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const pagesContentDir = path.join(repoRoot, 'resources', 'site');
const caseStudiesContentDir = path.join(repoRoot, 'resources', 'case-studies');

const LOCALES = ['en', 'es'] as const;
type Locale = (typeof LOCALES)[number];

interface ContentEntry {
  data: Record<string, unknown> & { slug: string; lang: string; type: string };
}

function readFrontmatter(filePath: string): ContentEntry {
  const raw = readFileSync(filePath, 'utf8');
  const block = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!block) throw new Error(`no frontmatter block found in ${filePath}`);
  return { data: parseFrontmatter(block[1]) as ContentEntry['data'] };
}

function readLocalizedEntries(dir: string): ContentEntry[] {
  const entries: ContentEntry[] = [];
  for (const fileName of readdirSync(dir)) {
    const match = fileName.match(/^(.+)\.(en|es)\.md$/);
    if (!match) continue;
    entries.push(readFrontmatter(path.join(dir, fileName)));
  }
  return entries;
}

const caseStudyEntries = readLocalizedEntries(caseStudiesContentDir);
// Pages, by the type they declare rather than by excluding one filename: this directory
// also holds the interface strings and the testimonial pair, which share the shape and
// the locale suffix of a page and are not one.
const pageEntries = readLocalizedEntries(pagesContentDir).filter((entry) => entry.data.type === 'page');

function uiStringsFor(lang: Locale): Record<string, any> {
  return readFrontmatter(path.join(pagesContentDir, `ui.${lang}.md`)).data;
}

const homeRoutes = (
  deriveRouteSetFromEntries(
    [...pageEntries, ...caseStudyEntries],
    ROUTED_PAGE_SLUGS,
    INDEX_PAGE_SLUG,
  ) as { slug: string; lang: string; path: string }[]
).filter((route) => route.slug === INDEX_PAGE_SLUG);

function homePathFor(lang: Locale): string {
  const route = homeRoutes.find((candidate) => candidate.lang === lang);
  if (!route) throw new Error(`no home route derived for locale "${lang}"`);
  return route.path;
}

async function visitHome(page: Page, lang: Locale) {
  const response = await page.goto(homePathFor(lang), { waitUntil: 'networkidle' });
  expect(response?.status(), `${homePathFor(lang)} did not answer 200`).toBe(200);
}

// HOME-003 — the two bento groups, with the counts taken from the content rather
// than written down here, so a sixth case study moves this assertion by itself.
for (const lang of LOCALES) {
  test(`home renders both bento groups in "${lang}"`, async ({ page }) => {
    const { featured, standalone } = deriveHomeTiles(caseStudyEntries, lang) as {
      featured: unknown[];
      standalone: unknown[];
    };
    // A content source with one of the groups empty would let the counts below pass
    // by matching zero against zero, which is the shape of a test proving nothing.
    expect(featured.length, 'no featured case study to check').toBeGreaterThan(0);
    expect(standalone.length, 'no standalone case study to check').toBeGreaterThan(0);

    await visitHome(page, lang);

    const grids = page.locator('.work-bento__grid');
    await expect(grids).toHaveCount(2);
    await expect(grids.nth(0).locator('.case-tile')).toHaveCount(featured.length);
    await expect(grids.nth(1).locator('.case-tile')).toHaveCount(standalone.length);
    await expect(page.locator('.work-bento__standalone-label')).toHaveCount(1);
  });
}

// HOME-005 — absent means no section, no heading and no empty row. The heading text
// is read from the interface strings so this cannot pass by the string having changed.
for (const lang of LOCALES) {
  test(`home has no employers section in "${lang}"`, async ({ page }) => {
    const employersHeading = uiStringsFor(lang).home.employers_heading as string;
    expect(employersHeading, 'no employers heading in the interface strings').toBeTruthy();

    await visitHome(page, lang);

    await expect(page.locator('#employers')).toHaveCount(0);
    await expect(page.locator('.employers, .employer-row')).toHaveCount(0);
    await expect(page.getByText(employersHeading, { exact: false })).toHaveCount(0);
  });
}

// HOME-006 — the testimonials column renders exactly the recommendations the content
// declares, and never a marker in place of one.
//
// THIS TEST WAS INVERTED, not repaired. Until the recommendations were transcribed it
// asserted that no card and no column existed anywhere, because a column with nothing real
// in it would have had to invent what three people said. That assertion was correct then
// and is the wrong way round now.
//
// The count is DERIVED, so the same assertion holds at every stage of the transcription: a
// file of nothing but markers renders no column at all, one finished recommendation renders
// one card, and the day all three land it renders three — with no edit here. The marker
// assertion is unchanged, and it is the half that proves the omission is real rather than
// merely untested.
const testimonialCardsFor = (lang: Locale) =>
  buildTestimonialCards(readFrontmatter(path.join(pagesContentDir, `testimonials.${lang}.md`)).data) as {
    id: string;
    name: string;
    title: string;
    url: string;
    translationNote?: string;
    translatedFrom?: string;
  }[];

for (const lang of LOCALES) {
  test(`home renders one testimonial card per declared recommendation in "${lang}"`, async ({ page }) => {
    const cards = testimonialCardsFor(lang);

    await visitHome(page, lang);

    await expect(page.locator('.testimonial')).toHaveCount(cards.length);
    await expect(page.locator('body')).not.toContainText('NEEDS INPUT');

    // An empty content file must produce no column and no empty grid cell, not a column
    // whose cards happen to number zero.
    if (cards.length === 0) {
      await expect(page.locator('.testimonials')).toHaveCount(0);
      return;
    }

    await expect(page.locator('.testimonials')).toHaveCount(1);
    for (const card of cards) {
      const cardLocator = page.locator('.testimonial', { hasText: card.name });
      await expect(cardLocator).toHaveCount(1);
      await expect(cardLocator.locator('.testimonial__link')).toHaveAttribute('href', card.url);
    }
  });
}

// STACK-001 / STACK-002 — the strip renders the curated list and nothing else.
//
// The list used to be the deduplicated union of every case study's own stack, which carried
// standards, notations and practices under a heading that names technologies. The second
// assertion below is the one that matters most: no chip may carry a name the content pair does
// not declare. A count alone would still pass the day somebody reintroduced the aggregate and
// the two totals happened to agree.
//
// Everything is DERIVED from the same files and the same function the page derives from, so
// curating the list moves these assertions by itself and needs no edit here.
const stackChipsFor = (lang: Locale) => {
  const entry = readFrontmatter(path.join(pagesContentDir, `stack.${lang}.md`)).data;
  const declaredMarks = new Set(
    ((entry.stack ?? []) as { file?: string }[]).map((technology) => technology.file).filter(Boolean) as string[],
  );
  return buildStackItems(entry, declaredMarks) as { name: string; markFile?: string }[];
};

for (const lang of LOCALES) {
  test(`home renders one strip chip per declared technology in "${lang}"`, async ({ page }) => {
    const chips = stackChipsFor(lang);

    await visitHome(page, lang);

    if (chips.length === 0) {
      await expect(page.locator('.stack-strip')).toHaveCount(0);
      return;
    }

    // The track is rendered twice so the marquee loop closes on itself; the second pass is
    // hidden from assistive technology, and it is what a reader is not counting either.
    const visibleChips = page.locator('.stack-strip__chip:not([aria-hidden])');
    await expect(visibleChips).toHaveCount(chips.length);

    const declaredNames = new Set(chips.map((chip) => chip.name));
    const renderedNames = await visibleChips.locator('.stack-strip__name').allTextContents();
    expect(renderedNames.map((name) => name.trim())).toEqual(chips.map((chip) => chip.name));
    for (const name of renderedNames) {
      expect(declaredNames.has(name.trim())).toBe(true);
    }
  });

  test(`a chip renders a mark when the content declares one and a dot when it does not in "${lang}"`, async ({ page }) => {
    const chips = stackChipsFor(lang);
    test.skip(chips.length === 0, 'no technology has been curated yet');

    await visitHome(page, lang);

    const withMark = chips.filter((chip) => chip.markFile !== undefined);
    const visible = '.stack-strip__chip:not([aria-hidden])';
    await expect(page.locator(`${visible} .stack-strip__mark--logo svg`)).toHaveCount(withMark.length);
    await expect(page.locator(`${visible} .stack-strip__mark:not(.stack-strip__mark--logo)`)).toHaveCount(
      chips.length - withMark.length,
    );
  });
}

// TESTIMONIAL-002 — a translated quote says so, and a native one does not. The set of cards
// carrying the note is read off the content rather than written down here, so a
// recommendation that changes language moves this assertion by itself.
for (const lang of LOCALES) {
  test(`the translation note appears on exactly the translated cards in "${lang}"`, async ({ page }) => {
    const cards = testimonialCardsFor(lang);
    const translated = cards.filter((card) => card.translatedFrom !== undefined);
    test.skip(cards.length === 0, 'no recommendation has been transcribed yet');

    await visitHome(page, lang);

    await expect(page.locator('.testimonial__translation')).toHaveCount(translated.length);
    for (const card of translated) {
      await expect(
        page.locator('.testimonial', { hasText: card.name }).locator('.testimonial__translation'),
      ).toHaveCount(1);
    }
  });
}

// HOME-008 — the form now submits to an endpoint and CAN say what happened, so it renders
// the announcement channel it previously had to do without. The mail action stays as the
// fallback for a browser that never ran the script.
//
// THIS TEST WAS INVERTED, not repaired. Until the endpoint existed it asserted that no
// result state was rendered anywhere, because a form that cannot observe an outcome must
// not claim one. That assertion was correct then and is the wrong way round now; it was
// written to fail on exactly this change.
for (const lang of LOCALES) {
  test(`contact form keeps the mail fallback and renders a result channel in "${lang}"`, async ({ page }) => {
    const contactEmail = uiStringsFor(lang).home?.contact_email as string | undefined;
    expect(
      contactEmail,
      'the contact address is not in the interface strings, so the template is holding it',
    ).toBeTruthy();

    await visitHome(page, lang);

    const form = page.locator('.contact-section__form');
    await expect(form).toHaveCount(1);
    // Still mailto in the served HTML. The submit listener intercepts it; nothing rewrites
    // the attribute, so a browser that ran no script submits exactly as it always did.
    await expect(form).toHaveAttribute('action', `mailto:${contactEmail}`);

    // A result state announces an outcome. Whatever it is called, it either speaks to
    // assistive technology or it is invisible — so the assertion is on the announcement
    // channel, not on a list of class names somebody might rename.
    await expect(page.locator('.contact-section [role="status"][aria-live]')).toHaveCount(1);

    // Empty on arrival. A region that already says something is a page claiming an outcome
    // for a submission nobody made.
    await expect(page.locator('.contact-section [role="status"]')).toBeEmpty();
  });
}

// HOME-008b — the trap is present, reachable by nothing a person uses, and named nothing a
// browser would fill in on their behalf.
for (const lang of LOCALES) {
  test(`contact form carries a honeypot hidden from people in "${lang}"`, async ({ page }) => {
    await visitHome(page, lang);

    const trap = page.locator('.contact-section__form .contact-section__trap');
    await expect(trap).toHaveCount(1);
    await expect(trap).toHaveAttribute('aria-hidden', 'true');
    await expect(trap).toHaveAttribute('tabindex', '-1');
    await expect(trap).toHaveAttribute('autocomplete', 'off');
    // Off-screen, never display:none — a bot that skips hidden fields is the one worth
    // catching, so the field has to be in the layout while being invisible in it.
    await expect(trap).not.toBeInViewport();
  });
}

// HOME-009 — each index route renders its own locale and points at the other, with
// both paths derived from the route set rather than spelled out.
test('both index routes return 200 and cross-link to each other', async ({ page }) => {
  for (const lang of LOCALES) {
    const other = LOCALES.find((candidate) => candidate !== lang) as Locale;
    await visitHome(page, lang);

    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('.site-rail__lang-link')).toHaveAttribute(
      'href',
      homePathFor(other),
    );
  }
});
