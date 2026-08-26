import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseFrontmatter } from 'yaml';
import { buildLocalizedRoutePath } from '../../lib/content/routes/route-set.mjs';

// Playwright runs under plain Node, not the site's build pipeline, so the gateway is
// unreachable here — it imports a virtual module only the build can resolve. This suite
// reads the same markdown the collection reads and picks its subjects by TYPE rather
// than by name, so a sixth article, or a renamed one, is covered without editing this.
const here = path.dirname(fileURLToPath(import.meta.url));
const caseStudiesContentDir = path.resolve(here, '..', '..', '..', 'resources', 'case-studies');

interface ArticleEntry {
  slug: string;
  lang: string;
  type: string;
  skills?: string[];
  scale?: string;
}

function readArticleEntries(): ArticleEntry[] {
  return readdirSync(caseStudiesContentDir)
    .filter((fileName) => /\.(en|es)\.md$/.test(fileName))
    .map((fileName) => {
      const raw = readFileSync(path.join(caseStudiesContentDir, fileName), 'utf8');
      const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
      if (!frontmatterMatch) throw new Error(`no frontmatter block found in ${fileName}`);
      return parseFrontmatter(frontmatterMatch[1]) as ArticleEntry;
    });
}

const articleEntries = readArticleEntries();

function oneEntryOfType(type: string, lang: string): ArticleEntry {
  const match = articleEntries.find((entry) => entry.type === type && entry.lang === lang);
  if (!match) throw new Error(`no "${type}" entry in locale "${lang}" to exercise`);
  return match;
}

const ARTICLE_PATH_PREFIX = '/case-studies';
const articleHref = (entry: ArticleEntry) =>
  buildLocalizedRoutePath(`${ARTICLE_PATH_PREFIX}/${entry.slug}`, entry.lang);

const englishPlatform = oneEntryOfType('platform', 'en');
const spanishPlatform = oneEntryOfType('platform', 'es');
const englishCaseStudy = oneEntryOfType('case-study', 'en');
const spanishCaseStudy = oneEntryOfType('case-study', 'es');

// A subject set that came back empty would let every test below pass by asserting
// nothing, which is what this stops.
test('there is one entry of each type, in each locale, to exercise', () => {
  expect(articleEntries.length).toBeGreaterThan(0);
  expect(englishPlatform.slug).toBeTruthy();
  expect(englishCaseStudy.slug).toBeTruthy();
});

test('each type renders its own template', async ({ page }) => {
  await page.goto(articleHref(englishPlatform));
  await expect(page.locator('.scale-block')).toHaveCount(1);
  await expect(page.locator('.deep-dives')).toHaveCount(1);

  await page.goto(articleHref(englishCaseStudy));
  await expect(page.locator('.article-masthead')).toHaveCount(1);
  await expect(page.locator('.scale-block')).toHaveCount(0);
  await expect(page.locator('.deep-dives')).toHaveCount(0);
});

test('the platform header carries the scale block', async ({ page }) => {
  await page.goto(articleHref(englishPlatform));

  const figure = page.locator('.scale-block__figure');
  await expect(figure).toHaveCount(1);
  expect((await figure.innerText()).trim()).toBe(englishPlatform.scale);
  await expect(page.locator('.scale-block__caption')).toHaveCount(1);
});

for (const entry of [englishCaseStudy, spanishCaseStudy]) {
  test(`back link targets the local home (${entry.lang})`, async ({ page }) => {
    await page.goto(articleHref(entry));

    const backHref = await page.locator('.article__back-link').getAttribute('href');
    expect(backHref).toBe(`${buildLocalizedRoutePath('/', entry.lang)}#work`);
  });
}

test('skills render with no label', async ({ page }) => {
  await page.goto(articleHref(englishCaseStudy));

  const chips = page.locator('.skill-chips__chip');
  await expect(chips).toHaveCount((englishCaseStudy.skills ?? []).length);

  // No heading, no label, no caption: not one artboard gives this section one, and
  // asserting its absence is what stops a later change from inventing one.
  const chipList = page.locator('.skill-chips');
  const labelledBy = await chipList.getAttribute('aria-label');
  expect(labelledBy).toBeNull();
  await expect(chipList.locator('h2, h3, [class*="heading"], [class*="label"]')).toHaveCount(0);
});

for (const entry of [englishPlatform, spanishPlatform]) {
  test(`the deep-dives section renders once (${entry.lang})`, async ({ page }) => {
    await page.goto(articleHref(entry));

    await expect(page.locator('.deep-dives')).toHaveCount(1);
    await expect(page.locator('.deep-dive-card')).toHaveCount(3);

    // The grid is built from the body's own link list, so the body must no longer
    // carry it — otherwise the page shows the cards and the plain list underneath.
    await expect(page.locator(`.article-prose a[href*="${ARTICLE_PATH_PREFIX}/"]`)).toHaveCount(0);

    // ...and the cards point at THIS locale's routes, never at the href the markdown
    // wrote, which is the English path in both locales.
    const expectedPrefix = buildLocalizedRoutePath(`${ARTICLE_PATH_PREFIX}/`, entry.lang);
    for (const href of await page.locator('.deep-dive-card').evaluateAll((cards) =>
      cards.map((card) => card.getAttribute('href') ?? ''),
    )) {
      expect(href.startsWith(expectedPrefix)).toBe(true);
    }
  });
}

const SPEC_MARKER = 'Spec:';

for (const entry of [englishPlatform, spanishPlatform, englishCaseStudy, spanishCaseStudy]) {
  test(`no drawing-spec text reaches the page (${entry.type}, ${entry.lang})`, async ({ page }) => {
    await page.goto(articleHref(entry));

    // The half of a diagram tag that instructs whoever draws it is private. Asserted
    // on the rendered text AND on the markup, because it must not survive in an alt
    // or a title attribute either.
    const renderedText = await page.locator('body').innerText();
    for (const line of renderedText.split('\n')) {
      expect(line.trimStart().startsWith(SPEC_MARKER)).toBe(false);
    }
    expect(await page.content()).not.toContain(SPEC_MARKER);
  });
}

const COMPACT_WIDTH = 390;

for (const entry of [englishPlatform, englishCaseStudy]) {
  test(`no horizontal body scroll at ${COMPACT_WIDTH} (${entry.type})`, async ({ page }) => {
    await page.setViewportSize({ width: COMPACT_WIDTH, height: 900 });
    await page.goto(articleHref(entry));

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.body.clientWidth,
    }));
    expect(scrollWidth).toBe(clientWidth);
  });
}

test(`a diagram figure scrolls inside its own container at ${COMPACT_WIDTH}`, async ({ page }) => {
  await page.setViewportSize({ width: COMPACT_WIDTH, height: 900 });
  await page.goto(articleHref(englishPlatform));

  // The other half of the clause above: the page must not scroll sideways AND the
  // figure must, rather than clipping the diagram or shrinking it to illegibility.
  const figure = page.locator('.article-figure').first();
  const overflow = await figure.evaluate((element) => ({
    overflowX: getComputedStyle(element).overflowX,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(overflow.overflowX).toBe('auto');
  expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
});

test('the table of contents is tracked by the shared position spy', async ({ page }) => {
  await page.goto(articleHref(englishPlatform));

  const spyClass = await page.locator('.article-toc').getAttribute('data-spy');
  expect(spyClass).toBeTruthy();
  await expect(page.locator(`.${spyClass}`)).toHaveCount(1);
});
