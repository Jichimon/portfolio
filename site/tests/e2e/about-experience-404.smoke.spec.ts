import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseFrontmatter } from 'yaml';
import { buildLocalizedRoutePath } from '../../lib/content/routes/route-set.mjs';

// Playwright runs under plain Node, not the site's build pipeline, so the gateway is
// unreachable here — it imports a virtual module only the build can resolve. This suite
// reads the same markdown the collection reads, and derives every count and every string
// it asserts from that content rather than restating it. A literal here would keep
// passing on the day the content changes, which is the one thing a test must not do.
const here = path.dirname(fileURLToPath(import.meta.url));
const siteContentDir = path.resolve(here, '..', '..', '..', 'resources', 'site');

function readFrontmatter<T>(fileName: string): T {
  const raw = readFileSync(path.join(siteContentDir, fileName), 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error(`no frontmatter block found in ${fileName}`);
  return parseFrontmatter(match[1]) as T;
}

function readBody(fileName: string): string {
  const raw = readFileSync(path.join(siteContentDir, fileName), 'utf8');
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

interface PhotoEntry {
  file: string;
  slot: string;
  alt: string;
  caption?: string;
}

interface AboutFrontmatter {
  h1: string;
  lead?: string;
  since: string;
  reads_as: string;
  photos?: PhotoEntry[];
}

interface RoleEntry {
  company: string;
  period: string;
  title: string;
  body: string[];
  stack?: string[];
  logo?: string;
  case_studies?: string[];
}

interface ExperienceFrontmatter {
  h1: string;
  intro: string;
  roles: RoleEntry[];
}

interface UiFrontmatter {
  rail: { location: string };
  about: { based_in: string; since: string; reads_as: string };
  not_found: { status_code: string; status_word: string; destinations: { name: string }[] };
}

const aboutEn = readFrontmatter<AboutFrontmatter>('about.en.md');
const aboutEs = readFrontmatter<AboutFrontmatter>('about.es.md');
const experienceEn = readFrontmatter<ExperienceFrontmatter>('experience.en.md');
const experienceEs = readFrontmatter<ExperienceFrontmatter>('experience.es.md');
const experienceEsBody = readBody('experience.es.md');
const uiEn = readFrontmatter<UiFrontmatter>('ui.en.md');
const uiEs = readFrontmatter<UiFrontmatter>('ui.es.md');

// The slug comes from the content file that declares it, not from a literal here: a page
// renamed in the content would otherwise leave this suite testing a path nothing serves.
const aboutSlug = readFrontmatter<{ slug: string }>('about.en.md').slug;
const experienceSlug = readFrontmatter<{ slug: string }>('experience.en.md').slug;

const aboutHref = (lang: string) => buildLocalizedRoutePath(`/${aboutSlug}`, lang);
const experienceHref = (lang: string) => buildLocalizedRoutePath(`/${experienceSlug}`, lang);

const photosInSlot = (entry: AboutFrontmatter, slot: string) =>
  (entry.photos ?? []).filter((photo) => photo.slot === slot);

// A subject set that came back empty would let most of the assertions below pass by
// checking nothing at all.
test('the content this suite derives its expectations from is present', () => {
  expect(experienceEn.roles.length).toBeGreaterThan(0);
  expect(experienceEs.roles.length).toBe(experienceEn.roles.length);
  expect((aboutEn.photos ?? []).length).toBeGreaterThan(0);
  expect(uiEn.not_found.destinations.length).toBeGreaterThan(0);
});

test.describe('about', () => {
  for (const lang of ['en', 'es']) {
    test(`${aboutHref(lang)} responds 200 with no console error`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      const response = await page.goto(aboutHref(lang));

      expect(response, `no response returned for ${aboutHref(lang)}`).not.toBeNull();
      expect(response!.status()).toBe(200);
      expect(consoleErrors, `console errors: ${consoleErrors.join('; ')}`).toEqual([]);
    });
  }

  test('the page has exactly one full-width element, and it is the wide photo figure', async ({ page }) => {
    await page.goto(aboutHref('en'));

    const wideFigures = page.locator('.about-figure--break');
    await expect(wideFigures).toHaveCount(photosInSlot(aboutEn, 'break').length);

    // The rule this page exists to hold: everything else sits on the one centred column,
    // so the wide figure is the only child of the article that is not inside a column.
    const columns = page.locator('.about-article__col');
    await expect(columns).toHaveCount(2);
    await expect(page.locator('.about-article__col .about-figure--break')).toHaveCount(0);
  });

  test('the byline prints its three pairs and reuses the rail location verbatim', async ({ page }) => {
    await page.goto(aboutHref('en'));

    await expect(page.locator('.about-byline__item')).toHaveCount(3);
    await expect(page.locator('.about-byline__key')).toHaveCount(3);

    // The location is one datum for the whole site. Asserting the two AGREE, rather than
    // asserting a literal, is what would catch the page growing its own copy of it.
    //
    // textContent, not innerText: innerText forces a layout pass, which made this assertion
    // fail under full-suite contention while passing in isolation. What is being asserted is
    // what the DOM holds, so reading the DOM is also the truer instrument.
    const bylineText = (
      await page.locator('.about-byline').evaluate((node) => node.textContent ?? '')
    ).replace(/\s+/g, ' ');
    expect(bylineText).toContain(uiEn.rail.location);
    expect(bylineText).toContain(uiEn.about.based_in);
    expect(bylineText).toContain(aboutEn.since);
    expect(bylineText).toContain(aboutEn.reads_as);
  });

  test('the first body paragraph carries the drop treatment and no other paragraph does', async ({ page }) => {
    await page.goto(aboutHref('en'));

    await expect(page.locator('.about-article__drop')).toHaveCount(1);

    // Read the first child's class off the DOM rather than resolving a separate child
    // locator: the child-combinator locator proved load-sensitive under the full suite,
    // and the question here is purely structural.
    const firstChildClass = await page
      .locator('.about-article__prose-part')
      .first()
      .evaluate((node) => node.firstElementChild?.className ?? '');
    expect(firstChildClass).toContain('about-article__drop');
  });

  test('the pull quote renders exactly once', async ({ page }) => {
    await page.goto(aboutHref('en'));
    await expect(page.locator('.about-article__pull')).toHaveCount(1);
  });

  test('every declared photo renders, with its own alt text and no placeholder frame', async ({ page }) => {
    await page.goto(aboutHref('en'));

    const declared = aboutEn.photos ?? [];
    await expect(page.locator('.about-figure')).toHaveCount(declared.length);
    await expect(page.locator('.about-figure--pair')).toHaveCount(photosInSlot(aboutEn, 'pair').length);

    for (const photo of declared) {
      await expect(page.locator(`img[alt="${photo.alt.replace(/"/g, '\\"')}"]`)).toHaveCount(1);
    }

    // A caption exists only where the content wrote one. The mockup's dashed frames
    // announced a slot and an aspect ratio; nothing resembling that may reach the page.
    const captioned = declared.filter((photo) => (photo.caption ?? '').trim().length > 0);
    await expect(page.locator('.about-figure__caption')).toHaveCount(captioned.length);
    await expect(page.getByText(/Photo \d of \d/)).toHaveCount(0);
    await expect(page.getByText(/\d+:\d+ (panoramic|·)/)).toHaveCount(0);
  });

  test('an unwritten lead renders no paragraph at all, in both locales', async ({ page }) => {
    for (const [lang, entry] of [
      ['en', aboutEn],
      ['es', aboutEs],
    ] as const) {
      await page.goto(aboutHref(lang));
      const declaredLead = (entry.lead ?? '').trim();
      await expect(page.locator('.about-article__lead')).toHaveCount(declaredLead.length > 0 ? 1 : 0);
    }
  });

  test('the next-up links resolve to destinations in the page own locale', async ({ page }) => {
    await page.goto(aboutHref('es'));

    const hrefs = await page.locator('.next-up__link').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href') ?? ''),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href.startsWith('/es/'), `"${href}" is not a Spanish destination`).toBe(true);
    }
  });
});

test.describe('experience', () => {
  for (const lang of ['en', 'es']) {
    test(`${experienceHref(lang)} responds 200 with no console error`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      const response = await page.goto(experienceHref(lang));

      expect(response, `no response returned for ${experienceHref(lang)}`).not.toBeNull();
      expect(response!.status()).toBe(200);
      expect(consoleErrors, `console errors: ${consoleErrors.join('; ')}`).toEqual([]);
    });
  }

  test('one entry renders per declared role, in the declared order', async ({ page }) => {
    await page.goto(experienceHref('en'));

    await expect(page.locator('.employment-entry')).toHaveCount(experienceEn.roles.length);

    const companies = await page.locator('.employment-entry__company').evaluateAll((nodes) =>
      nodes.map((node) => node.textContent?.trim() ?? ''),
    );
    expect(companies).toEqual(experienceEn.roles.map((role) => role.company));
  });

  test('the most-recent badge appears exactly once, on the first entry', async ({ page }) => {
    await page.goto(experienceHref('en'));

    await expect(page.locator('.employment-entry__badge')).toHaveCount(1);
    await expect(page.locator('.employment-entry').first().locator('.employment-entry__badge')).toHaveCount(1);
  });

  test('no text from the markdown body reaches the page', async ({ page }) => {
    await page.goto(experienceHref('es'));

    // That body is a traceability note rendered by nothing. Its opening claim is the
    // most distinctive phrase in it, and it must not appear anywhere on the page.
    const bodyMarker = 'Nada renderiza este cuerpo';
    expect(experienceEsBody).toContain(bodyMarker);
    await expect(page.getByText(bodyMarker)).toHaveCount(0);
  });

  test('the Spanish record links only to Spanish articles, with Spanish titles', async ({ page }) => {
    await page.goto(experienceHref('es'));

    const hrefs = await page.locator('.employment-entry__case-studies a').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('href') ?? ''),
    );

    const declaredRowCount = experienceEs.roles.reduce(
      (total, role) => total + (role.case_studies?.length ?? 0),
      0,
    );
    expect(hrefs).toHaveLength(declaredRowCount);
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href.startsWith('/es/case-studies/'), `"${href}" is not a Spanish article`).toBe(true);
    }

    // The row title comes from the linked entry's own file, so the Spanish page must not
    // be able to print an English one. Read the linked article and compare.
    const firstSlug = hrefs[0].replace('/es/case-studies/', '');
    const linked = readFileSync(
      path.resolve(here, '..', '..', '..', 'resources', 'case-studies', `${firstSlug}.es.md`),
      'utf8',
    );
    const spanishTitle = parseFrontmatter(linked.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)![1]).title as string;
    await expect(page.locator('.employment-entry__case-studies a').first()).toContainText(spanishTitle);
  });

  test('a role that declares no logo renders no logo square', async ({ page }) => {
    await page.goto(experienceHref('en'));

    const rolesWithLogo = experienceEn.roles.filter((role) => role.logo !== undefined);
    await expect(page.locator('.employment-entry__logo')).toHaveCount(rolesWithLogo.length);
  });

  test('a role that declares no stack renders no technology line', async ({ page }) => {
    await page.goto(experienceHref('en'));

    const rolesWithStack = experienceEn.roles.filter((role) => role.stack !== undefined);
    await expect(page.locator('.employment-entry__stack')).toHaveCount(rolesWithStack.length);
  });
});

test.describe('not found', () => {
  for (const unmatched of ['/a-path-that-was-never-routed', '/es/a-path-that-was-never-routed']) {
    test(`GET ${unmatched} responds with a real 404 status`, async ({ page }) => {
      const response = await page.goto(unmatched);

      expect(response, `no response returned for ${unmatched}`).not.toBeNull();
      // The status, never the copy: a soft 404 serves the same words with a 200 and is
      // indexed as a real page.
      expect(response!.status()).toBe(404);
    });
  }

  test('both locale panels render, each complete and carrying its own language', async ({ page }) => {
    await page.goto('/a-path-that-was-never-routed');

    const panels = page.locator('.not-found-panel');
    await expect(panels).toHaveCount(2);
    await expect(panels.nth(0)).toHaveAttribute('lang', 'en');
    await expect(panels.nth(1)).toHaveAttribute('lang', 'es');

    for (const [index, ui] of [uiEn, uiEs].entries()) {
      const panel = panels.nth(index);
      await expect(panel.locator('.not-found-panel__heading')).toHaveCount(1);
      await expect(panel.locator('.not-found-panel__body')).toHaveCount(1);
      await expect(panel.locator('.not-found-panel__destination')).toHaveCount(ui.not_found.destinations.length);
    }
  });

  test('the status line carries the code once and both locales wording', async ({ page }) => {
    await page.goto('/a-path-that-was-never-routed');

    const status = page.locator('.not-found-panels__status');
    await expect(status).toContainText(uiEn.not_found.status_code);
    await expect(status).toContainText(uiEn.not_found.status_word);
    await expect(status).toContainText(uiEs.not_found.status_word);
  });

  test('neither locale is marked current, and both are links', async ({ page }) => {
    await page.goto('/a-path-that-was-never-routed');

    await expect(page.locator('[aria-current]')).toHaveCount(0);
    await expect(page.locator('.site-rail__lang-current')).toHaveCount(0);
    await expect(page.locator('.site-rail__lang-link')).toHaveCount(2);
  });

  test('a normal page still marks its own locale current', async ({ page }) => {
    // The contrast is the point: without this, the assertion above would also pass on a
    // page where the switcher had simply stopped rendering.
    await page.goto(aboutHref('en'));

    await expect(page.locator('.site-rail__lang-current')).toHaveCount(1);
    await expect(page.locator('.site-rail__lang-link')).toHaveCount(1);
  });

  test('the Spanish panel destinations point at Spanish paths', async ({ page }) => {
    await page.goto('/a-path-that-was-never-routed');

    const hrefs = await page
      .locator('.not-found-panel[lang="es"] .not-found-panel__destination-link')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));

    expect(hrefs.length).toBe(uiEs.not_found.destinations.length);
    for (const href of hrefs) {
      expect(href.startsWith('/es/'), `"${href}" is not a Spanish destination`).toBe(true);
    }
  });
});
