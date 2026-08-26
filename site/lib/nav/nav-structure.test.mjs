import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS, NO_NAV_HREF, resolveNavItemHref, SECTION_NAV_KEY_FOR_ARTICLES } from './nav-structure.mjs';

// --- Composition: does the resolver compose an href correctly for each kind? ---
// Exercised with invented items carrying invented slugs and targets, never a real
// content slug. The point here is the resolver's logic, not today's page set, and
// an invented slug the content collection does not know is exactly what keeps this
// file off check-site's radar: a real slug spelled out anywhere but the collection
// is a hardcoded route, whether it lives in a page or in a test fixture.

test('composition: a route item composes its href by joining a leading slash to the slug, then localizing', () => {
  const syntheticRouteItem = { key: 'sample-nav-route', kind: 'route', slug: 'sample-invented-route' };

  assert.equal(resolveNavItemHref(syntheticRouteItem, { lang: 'en', isIndexPage: false }), '/sample-invented-route');
  assert.equal(
    resolveNavItemHref(syntheticRouteItem, { lang: 'es', isIndexPage: false }),
    '/es/sample-invented-route',
  );
});

test('composition: a route item resolves the same way whether or not the current page is the index', () => {
  const syntheticRouteItem = { key: 'sample-nav-route', kind: 'route', slug: 'sample-invented-route' };

  assert.equal(resolveNavItemHref(syntheticRouteItem, { lang: 'en', isIndexPage: true }), '/sample-invented-route');
  assert.equal(resolveNavItemHref(syntheticRouteItem, { lang: 'en', isIndexPage: false }), '/sample-invented-route');
});

test('composition: on the index page an anchor item stays a bare fragment, in both locales', () => {
  const syntheticAnchorItem = { key: 'sample-nav-anchor', kind: 'anchor', target: '#sample-invented-section' };

  assert.equal(resolveNavItemHref(syntheticAnchorItem, { lang: 'en', isIndexPage: true }), '#sample-invented-section');
  assert.equal(resolveNavItemHref(syntheticAnchorItem, { lang: 'es', isIndexPage: true }), '#sample-invented-section');
});

test('composition: off the index page an anchor item resolves to the home page plus fragment, in English', () => {
  const syntheticAnchorItem = { key: 'sample-nav-anchor', kind: 'anchor', target: '#sample-invented-section' };

  assert.equal(
    resolveNavItemHref(syntheticAnchorItem, { lang: 'en', isIndexPage: false }),
    '/#sample-invented-section',
  );
});

test('composition: off the index page an anchor item resolves to the home page plus fragment, in Spanish', () => {
  const syntheticAnchorItem = { key: 'sample-nav-anchor', kind: 'anchor', target: '#sample-invented-section' };

  assert.equal(
    resolveNavItemHref(syntheticAnchorItem, { lang: 'es', isIndexPage: false }),
    '/es/#sample-invented-section',
  );
});

test('composition: a reserved item resolves to the no-link sentinel, not a truthy stand-in, regardless of locale or page', () => {
  const syntheticReservedItem = { key: 'sample-nav-reserved', kind: 'reserved' };

  for (const lang of ['en', 'es']) {
    for (const isIndexPage of [true, false]) {
      const resolved = resolveNavItemHref(syntheticReservedItem, { lang, isIndexPage });
      assert.equal(resolved, NO_NAV_HREF);
      assert.notEqual(resolved, '#');
      assert.notEqual(resolved, '');
    }
  }
});

test('NO_NAV_HREF is specifically null, not merely falsy: Astro omits a null attribute entirely rather than rendering the literal string "null"', () => {
  assert.equal(NO_NAV_HREF, null);
});

test('composition: resolveNavItemHref throws naming the item key when the kind is not one it recognizes', () => {
  const malformedItem = { key: 'sample-unknown-item', kind: 'not-a-real-kind' };
  assert.throws(
    () => resolveNavItemHref(malformedItem, { lang: 'en', isIndexPage: false }),
    /sample-unknown-item/,
  );
});

// --- Data well-formedness: is the real item list shaped the way the resolver expects? ---
// No path literal appears here. A route item is checked for a bare slug, never for
// where that slug ends up, which is what keeps this file off check-site's radar
// while still protecting the real list against a malformed entry.

const findNavItem = (key) => NAV_ITEMS.find((item) => item.key === key);

test('data: every item has a non-empty key and a kind the resolver recognizes', () => {
  assert.ok(NAV_ITEMS.length > 0);
  for (const item of NAV_ITEMS) {
    assert.equal(typeof item.key, 'string');
    assert.ok(item.key.length > 0);
    assert.ok(['route', 'anchor', 'reserved'].includes(item.kind));
  }
});

test('data: every route item carries a bare slug, a plain segment and never a path', () => {
  const routeItems = NAV_ITEMS.filter((item) => item.kind === 'route');
  assert.ok(routeItems.length > 0);
  for (const item of routeItems) {
    assert.equal(typeof item.slug, 'string');
    assert.ok(item.slug.length > 0);
    assert.ok(!item.slug.startsWith('/'));
    assert.ok(!item.slug.includes('/'));
    assert.equal(item.target, undefined);
  }
});

test('data: every anchor item carries a fragment target, never a bare identifier', () => {
  const anchorItems = NAV_ITEMS.filter((item) => item.kind === 'anchor');
  assert.ok(anchorItems.length > 0);
  for (const item of anchorItems) {
    assert.equal(typeof item.target, 'string');
    assert.ok(item.target.startsWith('#'));
    assert.equal(item.slug, undefined);
  }
});

test('data: every reserved item carries neither a slug nor a target', () => {
  const reservedItems = NAV_ITEMS.filter((item) => item.kind === 'reserved');
  assert.ok(reservedItems.length > 0);
  for (const item of reservedItems) {
    assert.equal(item.slug, undefined);
    assert.equal(item.target, undefined);
  }
});

test('data: every real item resolves without throwing, in both locales and both page positions', () => {
  for (const item of NAV_ITEMS) {
    for (const lang of ['en', 'es']) {
      for (const isIndexPage of [true, false]) {
        assert.doesNotThrow(() => resolveNavItemHref(item, { lang, isIndexPage }));
      }
    }
  }
});

test('data: the item list carries no duplicate keys, so a caller can index items by key', () => {
  const keys = NAV_ITEMS.map((item) => item.key);
  assert.equal(new Set(keys).size, keys.length);
});

test('data: the nav leads with the work anchor, because the work is the whole argument of the site', () => {
  assert.equal(NAV_ITEMS[0].key, 'work');
  assert.equal(findNavItem('work').kind, 'anchor');
});

test('data: the nav ends with contact', () => {
  assert.equal(NAV_ITEMS[NAV_ITEMS.length - 1].key, 'contact');
});

test('data: the reserved slots form one contiguous block, and that block is neither first nor last', () => {
  const reservedIndices = NAV_ITEMS
    .map((item, index) => (item.kind === 'reserved' ? index : -1))
    .filter((index) => index !== -1);

  assert.ok(reservedIndices.length > 0);
  for (let position = 1; position < reservedIndices.length; position += 1) {
    assert.equal(reservedIndices[position], reservedIndices[position - 1] + 1);
  }
  assert.notEqual(reservedIndices[0], 0);
  assert.notEqual(reservedIndices[reservedIndices.length - 1], NAV_ITEMS.length - 1);
});

test('data: the section an article belongs under names a real nav item', () => {
  assert.equal(SECTION_NAV_KEY_FOR_ARTICLES, 'work');
  assert.equal(
    NAV_ITEMS.some((item) => item.key === SECTION_NAV_KEY_FOR_ARTICLES),
    true,
    'an article would otherwise be marked as belonging to a section the nav does not have',
  );
});
