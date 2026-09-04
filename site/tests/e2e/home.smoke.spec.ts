import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseFrontmatter } from 'yaml';
import { deriveHomeTiles } from '../../lib/content/entries/case-study-catalog.mjs';
import { buildTestimonialCards } from '../../lib/content/testimonials/testimonials.mjs';
import { buildStackItems } from '../../lib/content/stack/stack.mjs';
import { deriveDarkLogoFileName, deriveAnchor } from '../../lib/content/pages/employment-record.mjs';
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

const derivedRoutes = deriveRouteSetFromEntries(
  [...pageEntries, ...caseStudyEntries],
  ROUTED_PAGE_SLUGS,
  INDEX_PAGE_SLUG,
) as { slug: string; lang: string; path: string }[];

const homeRoutes = derivedRoutes.filter((route) => route.slug === INDEX_PAGE_SLUG);

function homePathFor(lang: Locale): string {
  const route = homeRoutes.find((candidate) => candidate.lang === lang);
  if (!route) throw new Error(`no home route derived for locale "${lang}"`);
  return route.path;
}

function experiencePathFor(lang: Locale): string {
  const route = derivedRoutes.find((candidate) => candidate.slug === 'experience' && candidate.lang === lang);
  if (!route) throw new Error(`no experience route derived for locale "${lang}"`);
  return route.path;
}

// EMP-009 — the destination a card is meant to reach: that locale's experience route,
// plus the role's own anchor when its company name derives one. Built from the same
// pure function the record itself calls, never restated as a literal, so the expected
// href moves by itself if a company name or the derivation ever changes.
function experienceAnchorHrefFor(lang: Locale, company: string): string {
  const anchor = deriveAnchor(company);
  return anchor === undefined ? experiencePathFor(lang) : `${experiencePathFor(lang)}#${anchor}`;
}

// Regex-escapes a literal path so it can anchor a URL pattern without its own
// characters (the "." in a locale-prefixed path, for instance) being read as regex syntax.
function escapeForRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// EMP-001/002 — the roles the employers strip renders, read straight off experience.<lang>.md
// rather than restated here, so a fifth employer or a newly-declared logo moves every
// assertion below by itself.
function rolesFor(lang: Locale): { company: string; period: string; logo?: string }[] {
  const entry = pageEntries.find((candidate) => candidate.data.slug === 'experience' && candidate.data.lang === lang);
  if (!entry) throw new Error(`no experience entry for locale "${lang}"`);
  return (entry.data.roles ?? []) as { company: string; period: string; logo?: string }[];
}

// EMP-002's dark-theme sibling convention carries no frontmatter key at all — it is a real
// second file or it is nothing — so "which roles have one" cannot be read off the roles
// above and is instead read off the same folder content-queries.ts globs.
const employerLogosDir = path.join(repoRoot, 'resources', 'logos', 'employers');
const employerLogoFileNames = new Set(readdirSync(employerLogosDir));

function hasDarkVariant(logoFileName: string): boolean {
  return employerLogoFileNames.has(deriveDarkLogoFileName(logoFileName));
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

// EMP-001 — one card per declared role, in declared order, each linking to this locale's
// /experience route. The count and the order are read off the content, never written down
// here, so a fifth employer moves this assertion by itself rather than going stale beside it.
for (const lang of LOCALES) {
  test(`home renders one employer card per declared role, in declared order, in "${lang}"`, async ({ page }) => {
    const roles = rolesFor(lang);
    expect(roles.length, 'no role to check').toBeGreaterThan(0);

    await visitHome(page, lang);

    const cards = page.locator('#employers .employer-card');
    await expect(cards).toHaveCount(roles.length);
    const names = await cards.locator('.employer-card__name').allTextContents();
    expect(names.map((name) => name.trim())).toEqual(roles.map((role) => role.company));
  });

  test(`each employer card links to the "${lang}" experience route`, async ({ page }) => {
    const roles = rolesFor(lang);
    test.skip(roles.length === 0, 'no role to check');
    // Anchored (EMP-009) rather than bare: every card now points at that locale's
    // experience route, with its own role's fragment folded on where one exists — the
    // exact fragment per card is EMP-009's own, more precise assertion below. This test
    // stays scoped to what EMP-001 promised: the correct locale route.
    const expectedRoute = new RegExp(`^${escapeForRegExp(experiencePathFor(lang))}(#.+)?$`);

    await visitHome(page, lang);

    const cards = page.locator('#employers .employer-card');
    // A card count that disagrees with the content is this test's own failure mode, not
    // the other test's problem to catch — an empty section must fail here too, or the loop
    // below runs zero times and the test passes having asserted nothing.
    await expect(cards).toHaveCount(roles.length);
    for (let index = 0; index < roles.length; index += 1) {
      await expect(cards.nth(index)).toHaveAttribute('href', expectedRoute);
    }
  });
}

// EMP-009 — the strip's promise made good: each card reaches its OWN role, not merely
// the right page. All four roles are asserted per locale, never the first alone — the
// first card is the one that would still look correct with the whole mechanism broken,
// because the NICE role already sits at the top of /experience.
for (const lang of LOCALES) {
  test(`EMP-009 each employer card links to its own anchor on the "${lang}" experience route`, async ({ page }) => {
    const roles = rolesFor(lang);
    test.skip(roles.length === 0, 'no role to check');

    await visitHome(page, lang);

    const cards = page.locator('#employers .employer-card');
    await expect(cards).toHaveCount(roles.length);
    for (let index = 0; index < roles.length; index += 1) {
      const expectedHref = experienceAnchorHrefFor(lang, roles[index].company);
      await expect(
        cards.nth(index),
        `card ${index} ("${roles[index].company}") does not link to its own anchor`,
      ).toHaveAttribute('href', expectedHref);
    }
  });

  test(`EMP-009 the "${lang}" experience page carries a target element for every role's anchor`, async ({ page }) => {
    const roles = rolesFor(lang);
    test.skip(roles.length === 0, 'no role to check');

    const response = await page.goto(experiencePathFor(lang), { waitUntil: 'networkidle' });
    expect(response?.status(), `${experiencePathFor(lang)} did not answer 200`).toBe(200);

    for (const role of roles) {
      const anchor = deriveAnchor(role.company);
      expect(anchor, `role "${role.company}" derives no anchor to check`).toBeDefined();
      // The id sits on the role's own container, not on a heading nested inside it — the
      // same element EmploymentEntry.astro renders once per role.
      const target = page.locator(`.employment-entry#${anchor}`);
      await expect(target, `no role container carries id "${anchor}" for role "${role.company}"`).toHaveCount(1);
    }
  });

  test(`EMP-009 following a non-first employer card scrolls the "${lang}" experience page past its top`, async ({ page }) => {
    const roles = rolesFor(lang);
    test.skip(roles.length < 2, 'fewer than two roles to check a non-first card');

    await visitHome(page, lang);

    const cards = page.locator('#employers .employer-card');
    await expect(cards).toHaveCount(roles.length);

    // The first card is excluded on purpose: the NICE role sits at the top of
    // /experience regardless of anchors, so it is the one card that would appear to
    // work with the whole mechanism broken. This asserts the promise itself — the
    // page actually scrolled — not merely that the href and the target both exist.
    const nonFirstIndex = 1;
    await cards.nth(nonFirstIndex).click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(
      new RegExp(`${escapeForRegExp(experiencePathFor(lang))}#${deriveAnchor(roles[nonFirstIndex].company)}$`),
    );

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(
      scrollY,
      `clicking employer card ${nonFirstIndex} ("${roles[nonFirstIndex].company}") did not scroll the experience page past its top`,
    ).toBeGreaterThan(0);
  });
}

// EMP-002 — a role with a declared logo renders an <img> inside the fixed logo slot; a role
// without renders the wordmark (its name) alone, with no broken image and no placeholder box
// standing in for the missing mark.
for (const lang of LOCALES) {
  test(`an employer card with a logo renders an img and one without renders the wordmark alone in "${lang}"`, async ({ page }) => {
    const roles = rolesFor(lang);
    test.skip(roles.length === 0, 'no role to check');
    const withLogo = roles.filter((role) => role.logo !== undefined);
    const withoutLogo = roles.filter((role) => role.logo === undefined);

    await visitHome(page, lang);

    const cards = page.locator('#employers .employer-card');
    // The light/base image, which every logo-carrying card renders exactly once
    // regardless of whether it also carries a dark variant — that half is EMP-002's own
    // test below.
    await expect(cards.locator('.employer-card__logo-img--light')).toHaveCount(withLogo.length);
    const declaredFileNames = new Set(withLogo.map((role) => role.logo));
    // Every <img> the logo slot renders must resolve to a real, build-processed asset URL —
    // never the bare frontmatter filename a browser could never find under /, which is
    // exactly the gap EMP-002 exists to close.
    for (const src of await cards.locator('.employer-card__logo-img--light').evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')))) {
      expect(src, 'a logo <img> carries no resolvable src').toBeTruthy();
      expect(src?.startsWith('/'), `logo src "${src}" is not an absolute, servable URL`).toBeTruthy();
      expect(declaredFileNames.has(src ?? ''), `logo src "${src}" is the bare declared filename, not a built asset URL`).toBeFalsy();
    }
    // A role without a logo renders no logo slot at all — not an empty one.
    await expect(page.locator('#employers .employer-card:not(:has(.employer-card__logo))')).toHaveCount(
      withoutLogo.length,
    );
  });
}

// EMP-002's dark-theme half — the defect a DOM-only assertion could not have caught, since
// a full-colour <img> loaded from a separate SVG document does not inherit this page's CSS
// colour the way an inlined mark would. Both images exist in the DOM as soon as a themed
// card renders; only their visibility depends on the theme, so this asserts BOTH states
// rather than trusting the CSS rule to be the right one.
for (const lang of LOCALES) {
  test(`a role whose logo has a dark-theme variant swaps to it under the dark theme, and the rest stay single-image in "${lang}"`, async ({ page }) => {
    const roles = rolesFor(lang);
    const withLogo = roles.filter((role) => role.logo !== undefined);
    const withDarkVariant = withLogo.filter((role) => hasDarkVariant(role.logo as string));
    const withoutDarkVariant = withLogo.filter((role) => !hasDarkVariant(role.logo as string));
    expect(withDarkVariant.length, 'no role with a dark-theme logo variant to check').toBeGreaterThan(0);

    const cardFor = (company: string) =>
      page.locator('#employers .employer-card').filter({ has: page.locator('.employer-card__name', { hasText: company }) });

    // Light theme first — BaseLayout's own default when nothing is stored. Both images are
    // already in the DOM for a themed card; only the light one is visible.
    await visitHome(page, lang);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    for (const role of withDarkVariant) {
      const card = cardFor(role.company);
      await expect(card.locator('.employer-card__logo-img--light')).toBeVisible();
      await expect(card.locator('.employer-card__logo-img--dark')).toBeHidden();
    }
    for (const role of withoutDarkVariant) {
      // No dark sibling exists, so no second <img> was ever rendered — not a hidden one
      // waiting on a file that does not exist.
      await expect(cardFor(role.company).locator('.employer-card__logo-img')).toHaveCount(1);
    }

    // Now the dark theme, forced by seeding storage before navigation the same way the
    // screenshot suite does — BaseLayout resolves the theme from it before first paint, so
    // prefers-color-scheme cannot stand in for the real, runtime-set attribute.
    await page.addInitScript((storedTheme) => {
      window.localStorage.setItem('theme', storedTheme);
    }, 'dark');
    await visitHome(page, lang);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    for (const role of withDarkVariant) {
      const card = cardFor(role.company);
      await expect(card.locator('.employer-card__logo-img--dark')).toBeVisible();
      await expect(card.locator('.employer-card__logo-img--light')).toBeHidden();
    }
    for (const role of withoutDarkVariant) {
      await expect(cardFor(role.company).locator('.employer-card__logo-img')).toHaveCount(1);
    }
  });
}

// EMP-004 — the logo is now the card's dominant element and the name reads as its
// caption. Measured on the rendered page rather than read off the stylesheet: the
// slot's own bounding box against the name's computed font-size, so a stylesheet edit
// that quietly re-inverts the relationship is caught here rather than trusted by name.
for (const lang of LOCALES) {
  test(`the employer logo box renders materially larger than the company name's font-size in "${lang}"`, async ({ page }) => {
    const roles = rolesFor(lang);
    const withLogo = roles.filter((role) => role.logo !== undefined);
    expect(withLogo.length, 'no role with a logo to check').toBeGreaterThan(0);

    await visitHome(page, lang);

    const cards = page.locator('#employers .employer-card:has(.employer-card__logo)');
    await expect(cards).toHaveCount(withLogo.length);

    const count = await cards.count();
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const logoBox = await card.locator('.employer-card__logo').boundingBox();
      expect(logoBox, `card ${index}'s logo slot has no rendered box`).not.toBeNull();
      const nameFontSizePx = await card
        .locator('.employer-card__name')
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
      // "Materially larger", not merely larger — a factor of two rejects the relationship
      // this behavior replaces too: a 32px slot against a 21px name would fail this exact
      // bound (32 is not greater than 21 * 2), which is the regression this test exists
      // to catch rather than a threshold picked to make today's numbers pass.
      expect(logoBox!.width, `card ${index}'s logo box is not materially larger than its name`).toBeGreaterThan(
        nameFontSizePx * 2,
      );
      expect(logoBox!.height, `card ${index}'s logo box is not materially larger than its name`).toBeGreaterThan(
        nameFontSizePx * 2,
      );
    }
  });
}

// EMP-004's other edge case: the caption must never become a paragraph. At each
// sanctioned artboard width, the row must not scroll horizontally — a column forced
// wider than its own share of the grid never wraps onto a second row, it overflows the
// viewport instead — and no name, the longest included, sets on more than two lines.
const ARTBOARD_WIDTHS = [390, 1024, 1440] as const;
for (const lang of LOCALES) {
  for (const width of ARTBOARD_WIDTHS) {
    test(`no employer card overflows its grid cell at ${width}px in "${lang}"`, async ({ page }) => {
      const roles = rolesFor(lang);
      expect(roles.length, 'no role to check').toBeGreaterThan(0);

      await page.setViewportSize({ width, height: 900 });
      await visitHome(page, lang);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(scrollWidth, `the page scrolls horizontally at ${width}px`).toBe(clientWidth);

      const cards = page.locator('#employers .employer-card');
      await expect(cards).toHaveCount(roles.length);
      const count = await cards.count();
      for (let index = 0; index < count; index += 1) {
        const name = cards.nth(index).locator('.employer-card__name');
        const { lineBoxHeight, lineHeightPx } = await name.evaluate((element) => ({
          lineBoxHeight: element.getBoundingClientRect().height,
          lineHeightPx: parseFloat(getComputedStyle(element).lineHeight),
        }));
        expect(lineBoxHeight, `card ${index}'s name set on more than two lines at ${width}px`).toBeLessThanOrEqual(
          lineHeightPx * 2 + 1,
        );
      }
    });
  }
}

// EMP-005 — a role with no declared logo renders its name at the card's original,
// pre-caption size rather than at caption size, with no placeholder standing in for
// the missing mark. The branch itself is real (EmployerCard.astro's own hasLogo
// conditional and its --standalone modifier), but all four roles currently declare a
// logo, so no real role exists today to exercise it from — a declared coverage gap,
// not an assertion that would pass whether or not the branch existed.
for (const lang of LOCALES) {
  test(`a card with no logo renders its name at the full size, not the caption size, in "${lang}"`, async ({ page }) => {
    const roles = rolesFor(lang);
    const withoutLogo = roles.filter((role) => role.logo === undefined);
    test.skip(
      withoutLogo.length === 0,
      'no role without a declared logo exists in the real content to exercise this branch — a declared coverage gap',
    );

    await visitHome(page, lang);

    for (const role of withoutLogo) {
      const name = page
        .locator('#employers .employer-card')
        .filter({ has: page.locator('.employer-card__name', { hasText: role.company }) })
        .locator('.employer-card__name');
      await expect(name).toHaveClass(/employer-card__name--standalone/);
    }
  });

  test(`RED: a card with no logo renders no placeholder element in the slot's position, in "${lang}"`, async ({ page }) => {
    const roles = rolesFor(lang);
    const withoutLogo = roles.filter((role) => role.logo === undefined);
    test.skip(
      withoutLogo.length === 0,
      'no role without a declared logo exists in the real content to exercise this branch — a declared coverage gap',
    );

    await visitHome(page, lang);

    for (const role of withoutLogo) {
      const card = page
        .locator('#employers .employer-card')
        .filter({ has: page.locator('.employer-card__name', { hasText: role.company }) });
      await expect(card.locator('.employer-card__logo')).toHaveCount(0);
    }
  });
}

// EMP-003 — the employers section sits between the hero and the work bento in the built
// DOM, matching the id="employers" position every artboard carries.
for (const lang of LOCALES) {
  test(`the employers section falls between the hero and the work bento in "${lang}"`, async ({ page }) => {
    const roles = rolesFor(lang);
    expect(roles.length, 'no role to check').toBeGreaterThan(0);

    await visitHome(page, lang);

    const sectionClasses = await page
      .locator('.page-shell__main > section')
      .evaluateAll((nodes) => nodes.map((node) => node.className.split(' ')[0]));

    const heroIndex = sectionClasses.indexOf('home-hero');
    const employersIndex = sectionClasses.indexOf('employers-section');
    const workIndex = sectionClasses.indexOf('work-bento');

    expect(heroIndex, 'no hero section found').toBeGreaterThanOrEqual(0);
    expect(employersIndex, 'employers section did not fall after the hero').toBeGreaterThan(heroIndex);
    expect(workIndex, 'work bento did not fall after the employers section').toBeGreaterThan(employersIndex);
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
