import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveRouteSetFromEntries, buildLocalizedRoutePath } from './route-set.mjs';

const routedEntry = (slug, lang, type = 'page') => ({
  id: `${slug}-${lang}`,
  data: { slug, lang, type, title: `${slug} title`, confidentiality: 'sanitized' },
});

test('derives a route per entry per locale', () => {
  const entries = [
    routedEntry('sample-landing-page', 'en', 'page'),
    routedEntry('sample-landing-page', 'es', 'page'),
    routedEntry('sample-migration-story', 'en', 'case-study'),
    routedEntry('sample-migration-story', 'es', 'case-study'),
  ];
  const routes = deriveRouteSetFromEntries(entries, ['sample-landing-page'], 'sample-landing-page');

  assert.equal(routes.length, 4);
  const pageRoutes = routes.filter((route) => route.slug === 'sample-landing-page');
  const caseStudyRoutes = routes.filter((route) => route.slug === 'sample-migration-story');
  assert.equal(pageRoutes.length, 2);
  assert.equal(caseStudyRoutes.length, 2);
  assert.deepEqual(pageRoutes.map((route) => route.lang).sort(), ['en', 'es']);
  assert.deepEqual(caseStudyRoutes.map((route) => route.lang).sort(), ['en', 'es']);
});

test('leaves the default locale unprefixed and prefixes the other', () => {
  const entries = [
    routedEntry('sample-index-page', 'en', 'page'),
    routedEntry('sample-index-page', 'es', 'page'),
    routedEntry('sample-secondary-page', 'en', 'page'),
    routedEntry('sample-secondary-page', 'es', 'page'),
    routedEntry('sample-vendor-swap', 'en', 'platform'),
    routedEntry('sample-vendor-swap', 'es', 'platform'),
  ];
  const routes = deriveRouteSetFromEntries(
    entries,
    ['sample-index-page', 'sample-secondary-page'],
    'sample-index-page',
  );

  const findPath = (slug, lang) => routes.find((route) => route.slug === slug && route.lang === lang).path;

  // the named index page slug is the index route: root for English, /es/ for Spanish
  assert.equal(findPath('sample-index-page', 'en'), '/');
  assert.equal(findPath('sample-index-page', 'es'), '/es/');
  // every other routed page slug and every case-study/platform slug is a normal segment
  assert.equal(findPath('sample-secondary-page', 'en'), '/sample-secondary-page');
  assert.equal(findPath('sample-secondary-page', 'es'), '/es/sample-secondary-page');
  assert.equal(findPath('sample-vendor-swap', 'en'), '/case-studies/sample-vendor-swap');
  assert.equal(findPath('sample-vendor-swap', 'es'), '/es/case-studies/sample-vendor-swap');
});

test('identifies the index page by name, not by position: reordering the routed page slugs produces the same route set', () => {
  const entries = [
    routedEntry('sample-index-page', 'en', 'page'),
    routedEntry('sample-index-page', 'es', 'page'),
    routedEntry('sample-secondary-page', 'en', 'page'),
    routedEntry('sample-secondary-page', 'es', 'page'),
  ];

  const indexFirst = deriveRouteSetFromEntries(
    entries,
    ['sample-index-page', 'sample-secondary-page'],
    'sample-index-page',
  );
  const indexSecond = deriveRouteSetFromEntries(
    entries,
    ['sample-secondary-page', 'sample-index-page'],
    'sample-index-page',
  );

  const asComparableSet = (routes) => routes.map((route) => `${route.slug}|${route.lang}|${route.path}`).sort();

  assert.deepEqual(asComparableSet(indexFirst), asComparableSet(indexSecond));

  const findPath = (routes, slug, lang) => routes.find((route) => route.slug === slug && route.lang === lang).path;
  assert.equal(findPath(indexSecond, 'sample-index-page', 'en'), '/');
  assert.equal(findPath(indexSecond, 'sample-secondary-page', 'en'), '/sample-secondary-page');
});

test('grows when a content pair is added, with no code change', () => {
  const baseEntries = [
    routedEntry('sample-index-page', 'en', 'page'),
    routedEntry('sample-index-page', 'es', 'page'),
    routedEntry('sample-first-case-study', 'en', 'case-study'),
    routedEntry('sample-first-case-study', 'es', 'case-study'),
  ];
  const grownEntries = [
    ...baseEntries,
    routedEntry('sample-newly-added-case-study', 'en', 'case-study'),
    routedEntry('sample-newly-added-case-study', 'es', 'case-study'),
  ];

  const baseRoutes = deriveRouteSetFromEntries(baseEntries, ['sample-index-page'], 'sample-index-page');
  const grownRoutes = deriveRouteSetFromEntries(grownEntries, ['sample-index-page'], 'sample-index-page');

  assert.equal(grownRoutes.length, baseRoutes.length + 2);
  assert.ok(grownRoutes.some((route) => route.path === '/case-studies/sample-newly-added-case-study'));
  assert.ok(grownRoutes.some((route) => route.path === '/es/case-studies/sample-newly-added-case-study'));
});

test('emits no index route for the collection', () => {
  const entries = [
    routedEntry('sample-index-page', 'en', 'page'),
    routedEntry('sample-index-page', 'es', 'page'),
    routedEntry('sample-catalog-entry-a', 'en', 'case-study'),
    routedEntry('sample-catalog-entry-a', 'es', 'case-study'),
    routedEntry('sample-catalog-entry-b', 'en', 'platform'),
    routedEntry('sample-catalog-entry-b', 'es', 'platform'),
  ];
  const routes = deriveRouteSetFromEntries(entries, ['sample-index-page'], 'sample-index-page');

  assert.ok(!routes.some((route) => route.path === '/case-studies'));
  assert.ok(!routes.some((route) => route.path === '/es/case-studies'));
});

test('throws naming the slug when a routed page slug has no matching entry', () => {
  const entries = [routedEntry('sample-index-page', 'en', 'page'), routedEntry('sample-index-page', 'es', 'page')];
  assert.throws(
    () => deriveRouteSetFromEntries(entries, ['sample-index-page', 'sample-mistyped-page'], 'sample-index-page'),
    /sample-mistyped-page/,
  );
});

test('throws naming the index page slug when it is not among the routed page slugs', () => {
  const entries = [routedEntry('sample-index-page', 'en', 'page'), routedEntry('sample-index-page', 'es', 'page')];
  assert.throws(
    () => deriveRouteSetFromEntries(entries, ['sample-index-page'], 'sample-mistyped-index-page'),
    /sample-mistyped-index-page/,
  );
});

test('buildLocalizedRoutePath is the sole place a route path is concatenated for a locale', () => {
  assert.equal(buildLocalizedRoutePath('/sample-secondary-page', 'en'), '/sample-secondary-page');
  assert.equal(buildLocalizedRoutePath('/sample-secondary-page', 'es'), '/es/sample-secondary-page');
  assert.equal(buildLocalizedRoutePath('/', 'es'), '/es/');
});
