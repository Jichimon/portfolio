import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deriveRouteSetFromEntries,
  ROUTED_PAGE_SLUGS,
  INDEX_PAGE_SLUG,
} from '../../lib/content/routes/route-set.mjs';
import { readLocalizedMarkdownEntries } from '../../lib/content/routes/route-source.mjs';

// Playwright runs specs under plain Node, not Astro's Vite pipeline, so importing
// the gateway directly fails: it imports astro:content, a virtual module only
// Astro's own dev/build process can resolve. This suite reads the same markdown
// files the content collection reads and feeds them through the same
// route-derivation function the gateway calls, so a route added to the content
// source is picked up here without anyone editing this file.
//
// The reading half moved into lib/content/routes/route-source.mjs: the
// post-deploy route verifier needs the SAME set against a live URL, and two
// derivations that could disagree would mean it verifies something else.
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const pagesContentDir = path.join(repoRoot, 'resources', 'site');
const caseStudiesContentDir = path.join(repoRoot, 'resources', 'case-studies');
const guardsConfigPath = path.join(repoRoot, 'scripts', 'guards', 'guards.config.json');

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
const pendingRoutes = derivedRoutes.filter((route) => pendingSlugs.has(route.slug));

// A route set with nothing live would let every test below pass by iterating zero
// times — this is what stops the suite from silently proving nothing the day the
// derivation breaks.
//
// The pending half is deliberately NOT asserted to be non-empty. An empty pending list
// is the healthy end state: it means every designed page is routed, and demanding at
// least one would turn arriving there into a failure. What is worth asserting instead
// is coherence — a slug still listed as pending that the derivation no longer produces
// is a stale entry, and nothing else would report it.
test('the derived route set has a live route to check, and every pending slug is real', () => {
  expect(liveRoutes.length).toBeGreaterThan(0);
  for (const slug of pendingSlugs) {
    expect(
      derivedRoutes.some((route) => route.slug === slug),
      `pendingRoutes names "${slug}", which the route set no longer derives`,
    ).toBe(true);
  }
});

for (const route of liveRoutes) {
  test(`GET ${route.path} responds 200 with no console error (slug "${route.slug}", lang "${route.lang}")`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const response = await page.goto(route.path);

    expect(response, `no response returned for ${route.path}`).not.toBeNull();
    expect(response!.status(), `expected 200 for ${route.path}`).toBe(200);
    expect(consoleErrors, `console errors on ${route.path}: ${consoleErrors.join('; ')}`).toEqual([]);
  });
}

for (const route of pendingRoutes) {
  test(`GET ${route.path} still 404s while pending (slug "${route.slug}", lang "${route.lang}")`, async ({ page }) => {
    const response = await page.goto(route.path);

    expect(response, `no response returned for ${route.path}`).not.toBeNull();
    expect(response!.status(), `expected 404 for pending route ${route.path} — remove it from pendingRoutes once it is routed`).toBe(404);
  });
}

test('an invented path returns a real 404 status, not a 200 carrying error copy', async ({ page }) => {
  const response = await page.goto('/this-path-matches-no-derived-route-and-never-will');

  expect(response).not.toBeNull();
  expect(response!.status()).toBe(404);
});
