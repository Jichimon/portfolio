import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseFrontmatter } from 'yaml';
import { deriveHomeTiles } from '../../lib/content/entries/case-study-catalog.mjs';
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

function readLocalizedEntries(dir: string, excludeStem?: string): ContentEntry[] {
  const entries: ContentEntry[] = [];
  for (const fileName of readdirSync(dir)) {
    const match = fileName.match(/^(.+)\.(en|es)\.md$/);
    if (!match) continue;
    if (excludeStem && match[1] === excludeStem) continue;
    entries.push(readFrontmatter(path.join(dir, fileName)));
  }
  return entries;
}

const caseStudyEntries = readLocalizedEntries(caseStudiesContentDir);
const pageEntries = readLocalizedEntries(pagesContentDir, 'ui');

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

// HOME-006 — the testimonials column is absent, and no unresolved content marker
// reaches the page in its place.
for (const lang of LOCALES) {
  test(`home has no testimonials block in "${lang}"`, async ({ page }) => {
    await visitHome(page, lang);

    await expect(page.locator('.testimonials, .testimonial, #testimonials')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('NEEDS INPUT');
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
