import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listCaseStudyEntriesForLang } from './case-study-catalog.mjs';

const catalogEntry = (slug, lang, type, extraData = {}) => ({
  id: `${slug}-${lang}`,
  data: { slug, lang, type, title: `${slug} title`, confidentiality: 'sanitized', ...extraData },
});

test('lists only the entries of the requested locale', () => {
  const entries = [
    catalogEntry('vendor-gateway-swap', 'en', 'case-study'),
    catalogEntry('vendor-gateway-swap', 'es', 'case-study'),
    catalogEntry('queue-split-rollout', 'en', 'case-study'),
  ];
  const listing = listCaseStudyEntriesForLang(entries, 'es');
  assert.equal(listing.length, 1);
  assert.equal(listing[0].data.slug, 'vendor-gateway-swap');
  assert.equal(listing[0].data.lang, 'es');
});

test('leaves an absent optional field undefined', () => {
  const entries = [catalogEntry('platform-rebuild-sample', 'en', 'platform')];
  const listing = listCaseStudyEntriesForLang(entries, 'en');
  assert.equal(listing[0].data.outcome, undefined);
});

test('distinguishes an absent field from an empty one', () => {
  const entries = [
    catalogEntry('scaleless-case-sample', 'en', 'case-study'),
    catalogEntry('empty-scale-case-sample', 'en', 'case-study', { scale: '' }),
  ];
  const listing = listCaseStudyEntriesForLang(entries, 'en');
  const noScale = listing.find((e) => e.data.slug === 'scaleless-case-sample');
  const emptyScale = listing.find((e) => e.data.slug === 'empty-scale-case-sample');
  assert.equal(noScale.data.scale, undefined);
  assert.equal(emptyScale.data.scale, '');
});

test('includes both the case-study and platform types', () => {
  const entries = [
    catalogEntry('feature-case-sample', 'en', 'case-study'),
    catalogEntry('umbrella-platform-sample', 'en', 'platform'),
    catalogEntry('about-page-sample', 'en', 'page'),
  ];
  const listing = listCaseStudyEntriesForLang(entries, 'en');
  const types = listing.map((e) => e.data.type).sort();
  assert.deepEqual(types, ['case-study', 'platform']);
});

test('orders the listing the same way on every call', () => {
  const first = catalogEntry('alpha-migration-sample', 'en', 'case-study');
  const second = catalogEntry('beta-rollout-sample', 'en', 'platform');
  const third = catalogEntry('gamma-cutover-sample', 'en', 'case-study');

  const orderOne = listCaseStudyEntriesForLang([first, second, third], 'en').map((e) => e.data.slug);
  const orderTwo = listCaseStudyEntriesForLang([third, first, second], 'en').map((e) => e.data.slug);

  assert.deepEqual(orderOne, orderTwo);
});
