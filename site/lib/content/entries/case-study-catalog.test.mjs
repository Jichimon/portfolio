import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  listCaseStudyEntriesForLang,
  listCaseStudyStackForLang,
  deriveHomeTiles,
} from './case-study-catalog.mjs';

const catalogEntry = (slug, lang, type, extraData = {}) => ({
  id: `${slug}-${lang}`,
  data: { slug, lang, type, title: `${slug} title`, confidentiality: 'sanitized', ...extraData },
});

test('lists only the entries of the requested locale', () => {
  const entries = [
    catalogEntry('vendor-gateway-swap', 'en', 'case-study', { order: 1 }),
    catalogEntry('vendor-gateway-swap', 'es', 'case-study', { order: 1 }),
    catalogEntry('queue-split-rollout', 'en', 'case-study', { order: 2 }),
  ];
  const listing = listCaseStudyEntriesForLang(entries, 'es');
  assert.equal(listing.length, 1);
  assert.equal(listing[0].data.slug, 'vendor-gateway-swap');
  assert.equal(listing[0].data.lang, 'es');
});

test('leaves an absent optional field undefined', () => {
  const entries = [catalogEntry('platform-rebuild-sample', 'en', 'platform', { order: 1 })];
  const listing = listCaseStudyEntriesForLang(entries, 'en');
  assert.equal(listing[0].data.outcome, undefined);
});

test('distinguishes an absent field from an empty one', () => {
  const entries = [
    catalogEntry('scaleless-case-sample', 'en', 'case-study', { order: 1 }),
    catalogEntry('empty-scale-case-sample', 'en', 'case-study', { order: 2, scale: '' }),
  ];
  const listing = listCaseStudyEntriesForLang(entries, 'en');
  const noScale = listing.find((e) => e.data.slug === 'scaleless-case-sample');
  const emptyScale = listing.find((e) => e.data.slug === 'empty-scale-case-sample');
  assert.equal(noScale.data.scale, undefined);
  assert.equal(emptyScale.data.scale, '');
});

test('includes both the case-study and platform types', () => {
  const entries = [
    catalogEntry('feature-case-sample', 'en', 'case-study', { order: 1 }),
    catalogEntry('umbrella-platform-sample', 'en', 'platform', { order: 2 }),
    catalogEntry('about-page-sample', 'en', 'page', { order: 3 }),
  ];
  const listing = listCaseStudyEntriesForLang(entries, 'en');
  const types = listing.map((e) => e.data.type).sort();
  assert.deepEqual(types, ['case-study', 'platform']);
});

test('orders the listing the same way on every call', () => {
  const first = catalogEntry('alpha-migration-sample', 'en', 'case-study', { order: 1 });
  const second = catalogEntry('beta-rollout-sample', 'en', 'platform', { order: 2 });
  const third = catalogEntry('gamma-cutover-sample', 'en', 'case-study', { order: 3 });

  const orderOne = listCaseStudyEntriesForLang([first, second, third], 'en').map((e) => e.data.slug);
  const orderTwo = listCaseStudyEntriesForLang([third, first, second], 'en').map((e) => e.data.slug);

  assert.deepEqual(orderOne, orderTwo);
});

test('orders by the order field', () => {
  const entries = [
    catalogEntry('epsilon-sample', 'en', 'case-study', { order: 5 }),
    catalogEntry('gamma-sample', 'en', 'case-study', { order: 3 }),
    catalogEntry('alpha-sample', 'en', 'case-study', { order: 1 }),
    catalogEntry('delta-sample', 'en', 'case-study', { order: 4 }),
    catalogEntry('beta-sample', 'en', 'case-study', { order: 2 }),
  ];
  const listing = listCaseStudyEntriesForLang(entries, 'en');
  assert.deepEqual(
    listing.map((e) => e.data.order),
    [1, 2, 3, 4, 5],
  );
});

test('throws when an entry has no order', () => {
  const entries = [
    catalogEntry('alpha-sample', 'en', 'case-study', { order: 1 }),
    catalogEntry('missing-order-sample', 'en', 'case-study'),
  ];
  assert.throws(
    () => listCaseStudyEntriesForLang(entries, 'en'),
    /missing-order-sample/,
  );
});

test('throws on a duplicate order', () => {
  const entries = [
    catalogEntry('first-sample', 'en', 'case-study', { order: 1 }),
    catalogEntry('second-sample', 'en', 'case-study', { order: 2 }),
    catalogEntry('third-sample', 'en', 'case-study', { order: 2 }),
  ];
  assert.throws(
    () => listCaseStudyEntriesForLang(entries, 'en'),
    (error) => error.message.includes('second-sample') && error.message.includes('third-sample'),
  );
});

test('sorts non-contiguous order values the same as contiguous ones', () => {
  const entries = [
    catalogEntry('fourth-sample', 'en', 'case-study', { order: 8 }),
    catalogEntry('first-sample', 'en', 'case-study', { order: 1 }),
    catalogEntry('third-sample', 'en', 'case-study', { order: 4 }),
    catalogEntry('second-sample', 'en', 'case-study', { order: 2 }),
  ];
  const listing = listCaseStudyEntriesForLang(entries, 'en');
  assert.deepEqual(
    listing.map((e) => e.data.slug),
    ['first-sample', 'second-sample', 'third-sample', 'fourth-sample'],
  );
});

test('orders independently per locale', () => {
  const entries = [
    catalogEntry('alpha-sample', 'en', 'case-study', { order: 2 }),
    catalogEntry('beta-sample', 'en', 'case-study', { order: 1 }),
    catalogEntry('alpha-sample', 'es', 'case-study', { order: 1 }),
    catalogEntry('beta-sample', 'es', 'case-study', { order: 2 }),
  ];
  const enListing = listCaseStudyEntriesForLang(entries, 'en').map((e) => e.data.slug);
  const esListing = listCaseStudyEntriesForLang(entries, 'es').map((e) => e.data.slug);
  assert.deepEqual(enListing, ['beta-sample', 'alpha-sample']);
  assert.deepEqual(esListing, ['alpha-sample', 'beta-sample']);
});

test('unions stack values across entries', () => {
  const entries = [
    catalogEntry('first-sample', 'en', 'case-study', { order: 1, stack: ['Node.js', 'PostgreSQL'] }),
    catalogEntry('second-sample', 'en', 'case-study', { order: 2, stack: ['Oracle EBS', 'AWS'] }),
    catalogEntry('third-sample', 'en', 'case-study', { order: 3, stack: ['Kafka'] }),
  ];
  const stack = listCaseStudyStackForLang(entries, 'en');
  assert.deepEqual(
    [...stack].sort(),
    ['AWS', 'Kafka', 'Node.js', 'Oracle EBS', 'PostgreSQL'].sort(),
  );
});

test('deduplicates by exact string', () => {
  const entries = [
    catalogEntry('first-sample', 'en', 'case-study', { order: 1, stack: ['AWS', 'AWS Fargate'] }),
    catalogEntry('second-sample', 'en', 'case-study', { order: 2, stack: ['AWS'] }),
  ];
  const stack = listCaseStudyStackForLang(entries, 'en');
  const awsOccurrences = stack.filter((value) => value === 'AWS');
  assert.equal(awsOccurrences.length, 1);
  assert.ok(stack.includes('AWS Fargate'));
  assert.equal(stack.length, 2);
});

test('tolerates an entry with no stack', () => {
  const entries = [
    catalogEntry('absent-stack-sample', 'en', 'case-study', { order: 1 }),
    catalogEntry('empty-stack-sample', 'en', 'case-study', { order: 2, stack: [] }),
    catalogEntry('has-stack-sample', 'en', 'case-study', { order: 3, stack: ['Terraform'] }),
  ];
  const stack = listCaseStudyStackForLang(entries, 'en');
  assert.deepEqual(stack, ['Terraform']);
});

test('returns a stable order', () => {
  const entries = [
    catalogEntry('first-sample', 'en', 'case-study', { order: 1, stack: ['Node.js', 'AWS', 'Kafka'] }),
    catalogEntry('second-sample', 'en', 'case-study', { order: 2, stack: ['PostgreSQL', 'AWS'] }),
    catalogEntry('third-sample', 'en', 'case-study', { order: 3, stack: ['Terraform', 'Node.js'] }),
  ];
  const first = listCaseStudyStackForLang(entries, 'en');
  const second = listCaseStudyStackForLang(entries, 'en');
  assert.deepEqual(first, second);
});

// --- home tiles ---------------------------------------------------------------
// The bento's three shapes are derivable from the content and nothing else: the
// platform entry anchors the featured group, its siblings are numbered in published
// order, and a non-featured entry stands alone below the label. Deriving it here
// rather than in the page is what lets a sixth case study change the bento without
// a template edit.

const homeTileEntry = (slug, lang, order, { type = 'case-study', featured = true, ...rest } = {}) => ({
  id: `${slug}-${lang}`,
  data: { slug, lang, type, featured, order, title: `${slug} title`, ...rest },
});

test('anchors the featured group on the platform entry', () => {
  const entries = [
    homeTileEntry('platform-sample', 'en', 1, { type: 'platform' }),
    homeTileEntry('first-deep-dive-sample', 'en', 2),
  ];
  const tiles = deriveHomeTiles(entries, 'en');
  assert.equal(tiles.featured[0].variant, 'anchor');
  assert.equal(tiles.featured[0].slug, 'platform-sample');
});

test('numbers the featured non-platform tiles in published order, from one', () => {
  const entries = [
    homeTileEntry('platform-sample', 'en', 1, { type: 'platform' }),
    homeTileEntry('second-deep-dive-sample', 'en', 3),
    homeTileEntry('first-deep-dive-sample', 'en', 2),
  ];
  const tiles = deriveHomeTiles(entries, 'en');
  assert.deepEqual(
    tiles.featured.filter((tile) => tile.variant === 'numbered').map((tile) => tile.positionNumber),
    [1, 2],
  );
  assert.equal(tiles.featured[1].slug, 'first-deep-dive-sample');
});

test('puts a non-featured entry in the standalone group as a full-width tile', () => {
  const entries = [
    homeTileEntry('platform-sample', 'en', 1, { type: 'platform' }),
    homeTileEntry('unrelated-employer-sample', 'en', 2, { featured: false }),
  ];
  const tiles = deriveHomeTiles(entries, 'en');
  assert.equal(tiles.standalone.length, 1);
  assert.equal(tiles.standalone[0].variant, 'full');
  assert.equal(tiles.featured.length, 1);
});

test('returns an empty standalone group when every entry is featured', () => {
  const entries = [homeTileEntry('platform-sample', 'en', 1, { type: 'platform' })];
  assert.deepEqual(deriveHomeTiles(entries, 'en').standalone, []);
});

test('carries the optional fields through and leaves absent ones undefined', () => {
  const entries = [
    homeTileEntry('platform-sample', 'en', 1, { type: 'platform', scale: 'Hundreds of thousands', role: 'Architect' }),
    homeTileEntry('bare-sample', 'en', 2),
  ];
  const [anchor, bare] = deriveHomeTiles(entries, 'en').featured;
  assert.equal(anchor.scaleFigure, 'Hundreds of thousands');
  assert.equal(anchor.roleLine, 'Architect');
  assert.equal(bare.scaleFigure, undefined);
  assert.equal(bare.roleLine, undefined);
});

test('joins the outcome and the period rather than letting one hide the other', () => {
  const entries = [
    homeTileEntry('joined-sample', 'en', 1, { outcome: 'Millions of records', period: '2024' }),
  ];
  assert.equal(deriveHomeTiles(entries, 'en').featured[0].highlightLine, 'Millions of records · 2024');
});

test('falls back to whichever of the outcome and the period exists alone', () => {
  const entries = [
    homeTileEntry('outcome-only-sample', 'en', 1, { outcome: 'Zero incidents' }),
    homeTileEntry('period-only-sample', 'en', 2, { period: '2023–2025' }),
    homeTileEntry('neither-sample', 'en', 3),
  ];
  const [withOutcome, withPeriod, withNeither] = deriveHomeTiles(entries, 'en').featured;
  assert.equal(withOutcome.highlightLine, 'Zero incidents');
  assert.equal(withPeriod.highlightLine, '2023–2025');
  assert.equal(withNeither.highlightLine, undefined);
});

test('carries the scale caption alongside the figure it belongs to', () => {
  const entries = [
    homeTileEntry('captioned-sample', 'en', 1, {
      type: 'platform',
      scale: '100,000s',
      scale_caption: 'active users',
    }),
    homeTileEntry('uncaptioned-sample', 'en', 2, { type: 'platform', scale: '100,000s' }),
  ];
  const [captioned, uncaptioned] = deriveHomeTiles(entries, 'en').featured;
  assert.equal(captioned.scaleCaption, 'active users');
  assert.equal(uncaptioned.scaleCaption, undefined);
});
