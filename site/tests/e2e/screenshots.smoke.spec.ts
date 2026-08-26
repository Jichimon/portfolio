import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseFrontmatter } from 'yaml';
import {
  deriveRouteSetFromEntries,
  ROUTED_PAGE_SLUGS,
  INDEX_PAGE_SLUG,
} from '../../lib/content/routes/route-set.mjs';

// Same reason as the two suites next door: Playwright runs under plain Node, so the
// gateway cannot be imported — it reaches for astro:content, which only Astro's own
// pipeline resolves. This reads the markdown the collection reads and feeds it through
// the very function the gateway calls, so the route set captured here is never a second,
// hand-maintained list.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const pagesContentDir = path.join(repoRoot, 'resources', 'site');
const caseStudiesContentDir = path.join(repoRoot, 'resources', 'case-studies');
const guardsConfigPath = path.join(repoRoot, 'scripts', 'guards', 'guards.config.json');

// The one declared output directory every screenshot in this suite writes through —
// named ONCE, here, rather than left to whatever a caller happens to pass. An earlier
// run produced three PNGs under `site/undefined/`, which is what an unasserted,
// undefined path variable looks like once it is string-coerced into a join() call.
// assertNonEmptyString below is what stands between a future refactor doing the same
// thing and a directory silently reappearing under that name.
const SCREENSHOTS_DIR = path.join(repoRoot, 'site', 'screenshots');

function assertNonEmptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name} must be a non-empty string, got ${JSON.stringify(value)}`);
  }
}
assertNonEmptyString(SCREENSHOTS_DIR, 'SCREENSHOTS_DIR');

interface FrontmatterEntry {
  data: { slug: string; lang: string; type: string };
}

function readFrontmatterEntry(filePath: string): FrontmatterEntry {
  const raw = readFileSync(filePath, 'utf8');
  const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!frontmatterMatch) {
    throw new Error(`no frontmatter block found in ${filePath}`);
  }
  const data = parseFrontmatter(frontmatterMatch[1]) as FrontmatterEntry['data'];
  return { data };
}

// Mirrors the two loaders content.config.ts declares: locale-suffixed markdown,
// with the interface-strings file excluded from the page loader by name.
function readLocalizedMarkdownEntries(dir: string, excludeStem?: string): FrontmatterEntry[] {
  const entries: FrontmatterEntry[] = [];
  for (const fileName of readdirSync(dir)) {
    const match = fileName.match(/^(.+)\.(en|es)\.md$/);
    if (!match) continue;
    const [, stem] = match;
    if (excludeStem && stem === excludeStem) continue;
    entries.push(readFrontmatterEntry(path.join(dir, fileName)));
  }
  return entries;
}

interface DerivedRoute {
  slug: string;
  lang: string;
  path: string;
}

function deriveRoutes(): DerivedRoute[] {
  const pageEntries = readLocalizedMarkdownEntries(pagesContentDir, 'ui');
  const caseStudyEntries = readLocalizedMarkdownEntries(caseStudiesContentDir);
  return deriveRouteSetFromEntries([...pageEntries, ...caseStudyEntries], ROUTED_PAGE_SLUGS, INDEX_PAGE_SLUG) as DerivedRoute[];
}

interface PendingRouteEntry {
  slug: string;
  reason: string;
}

// Same source routes.smoke.spec.ts reads (site.pendingRoutes), read-only: another
// slice edits that list in this same working tree, and this suite only ever
// subtracts what it names, never writes to it.
function readPendingRouteSlugs(): Set<string> {
  const guardsConfig = JSON.parse(readFileSync(guardsConfigPath, 'utf8'));
  const pendingRoutes: PendingRouteEntry[] | undefined = guardsConfig?.site?.pendingRoutes;
  if (!Array.isArray(pendingRoutes)) {
    throw new Error('guards.config.json has no site.pendingRoutes list to read');
  }
  for (const entry of pendingRoutes) {
    if (!entry.reason) {
      throw new Error(`pendingRoutes entry for slug "${entry.slug}" has no reason`);
    }
  }
  return new Set(pendingRoutes.map((entry) => entry.slug));
}

const derivedRoutes = deriveRoutes();
const pendingSlugs = readPendingRouteSlugs();
const liveRoutes = derivedRoutes.filter((route) => !pendingSlugs.has(route.slug));

// A route set with nothing live would let the loop below run zero times and the whole
// file report green while capturing nothing — the same silent-pass shape routes.smoke
// guards against, and the reason this assertion is not optional.
test('the derived route set has at least one live route to screenshot', () => {
  expect(liveRoutes.length).toBeGreaterThan(0);
});

// The three sanctioned widths this suite captures, and the two themes BaseLayout resolves.
const WIDTHS = [1440, 1024, 390] as const;
const VIEWPORT_HEIGHT = 900;
const THEMES = ['light', 'dark'] as const;

test.beforeAll(() => {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  // The directory is printed once, up front, so a human running this suite does not
  // have to already know where the images go in order to find them.
  // eslint-disable-next-line no-console
  console.log(`screenshots.smoke: images will be written to ${SCREENSHOTS_DIR}`);
});

for (const route of liveRoutes) {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      test(`captures ${route.path} (slug "${route.slug}", lang "${route.lang}") at ${width}px in ${theme}`, async ({
        page,
        browserName,
      }) => {
        // Captured once, on chromium. Three engines writing to the same declared path in
        // parallel would race on the same file — a flake this suite has no reason to carry,
        // since the deliverable is images for a human to look at, not cross-engine parity.
        test.skip(browserName !== 'chromium', 'screenshots are captured once, on chromium');

        // BaseLayout resolves the theme from localStorage before first paint, so the theme
        // is forced by seeding storage before navigation rather than relying on
        // prefers-color-scheme, which this suite's environment does not control.
        await page.addInitScript((storedTheme) => {
          window.localStorage.setItem('theme', storedTheme);
        }, theme);

        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });

        const response = await page.goto(route.path, { waitUntil: 'networkidle' });
        expect(response, `no response returned for ${route.path}`).not.toBeNull();
        expect(response!.status(), `expected 200 for ${route.path}`).toBe(200);

        // Confirms the forced theme actually resolved, rather than trusting the seed to
        // have taken — the same distinction the file's own header comment draws between
        // an undefined path and an asserted one.
        const resolvedTheme = await page.locator('html').getAttribute('data-theme');
        expect(resolvedTheme, `theme did not resolve to "${theme}" on ${route.path}`).toBe(theme);

        const fileName = `${route.slug}.${route.lang}.${width}.${theme}.png`;
        const filePath = path.join(SCREENSHOTS_DIR, fileName);
        await page.screenshot({ path: filePath, fullPage: true });

        expect(existsSync(filePath), `screenshot was not written to ${filePath}`).toBe(true);
      });
    }
  }
}
