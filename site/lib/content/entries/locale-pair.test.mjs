import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findEntryBySlugAndLang,
  findAlternateLocaleEntry,
  assertEverySlugHasBothLocales,
  assertEveryPairAgreesOnOrder,
} from './locale-pair.mjs';

const entry = (slug, lang, id) => ({
  id: id ?? `${slug}-${lang}`,
  data: { slug, lang, type: 'case-study', title: `${slug} (${lang})`, confidentiality: 'sanitized' },
});

test('finds the entry for a slug in the requested locale', () => {
  const entries = [entry('sample-widget-rollout', 'en'), entry('sample-widget-rollout', 'es')];
  const found = findEntryBySlugAndLang(entries, 'sample-widget-rollout', 'en');
  assert.equal(found.data.lang, 'en');
  assert.equal(found.data.slug, 'sample-widget-rollout');
});

test('finds the alternate-locale entry for a slug', () => {
  const entries = [entry('queue-consolidation-pilot', 'en'), entry('queue-consolidation-pilot', 'es')];
  const enEntry = findEntryBySlugAndLang(entries, 'queue-consolidation-pilot', 'en');
  const alternate = findAlternateLocaleEntry(entries, enEntry);
  assert.equal(alternate.data.lang, 'es');
  assert.equal(alternate.data.slug, 'queue-consolidation-pilot');
});

test('throws naming the slug when only one locale exists', () => {
  const entries = [entry('orphaned-ledger-sync', 'en')];
  assert.throws(() => assertEverySlugHasBothLocales(entries), /orphaned-ledger-sync/);
});

test('distinguishes absent-from-both from present-in-one', () => {
  const presentInOne = [entry('half-migrated-report', 'en')];
  const absentFromBoth = [entry('mislabeled-entry', 'pt')];

  let presentInOneMessage = '';
  let absentFromBothMessage = '';
  try {
    assertEverySlugHasBothLocales(presentInOne);
  } catch (err) {
    presentInOneMessage = err.message;
  }
  try {
    assertEverySlugHasBothLocales(absentFromBoth);
  } catch (err) {
    absentFromBothMessage = err.message;
  }

  // The wording itself must carry the distinction — two messages about two different
  // slugs would always differ from each other regardless of which branch produced them.
  assert.match(presentInOneMessage, /present only in "en", missing "es"/);
  assert.match(absentFromBothMessage, /has no entry in any of its expected locales/);
});

test('rejects a slug duplicated within one locale', () => {
  const entries = [
    entry('duplicate-vendor-cutover', 'en'),
    entry('duplicate-vendor-cutover', 'en', 'second-file-en'),
    entry('duplicate-vendor-cutover', 'es'),
  ];
  // The es entry is present and singular, so a missing-locale failure cannot fire here —
  // the only remaining reason to throw is the duplicate within en.
  assert.throws(() => assertEverySlugHasBothLocales(entries), /duplicated within locale "en"/);
});

test('joins on the slug field and not on a filename-derived id', () => {
  const entries = [
    { id: 'unrelated-filename-en', data: { slug: 'renamed-after-migration', lang: 'en', type: 'case-study', title: 'x', confidentiality: 'sanitized' } },
    { id: 'renamed-after-migration-en', data: { slug: 'a-totally-different-slug', lang: 'en', type: 'case-study', title: 'y', confidentiality: 'sanitized' } },
  ];
  const found = findEntryBySlugAndLang(entries, 'renamed-after-migration', 'en');
  assert.equal(found.id, 'unrelated-filename-en');
  assert.equal(found.data.slug, 'renamed-after-migration');
});

test('throws naming the slug and locale when the targeted query finds nothing', () => {
  const entries = [entry('single-locale-only-sample', 'en')];
  assert.throws(
    () => findEntryBySlugAndLang(entries, 'single-locale-only-sample', 'es'),
    /no entry found for slug "single-locale-only-sample" in locale "es"/,
  );
});

test('throws when the targeted query finds two entries for one slug in one locale', () => {
  const entries = [
    entry('duplicate-query-target-sample', 'en'),
    entry('duplicate-query-target-sample', 'en', 'second-file-en'),
  ];
  assert.throws(
    () => findEntryBySlugAndLang(entries, 'duplicate-query-target-sample', 'en'),
    /duplicated within locale "en"/,
  );
});

// A pair whose two halves disagree about `order` renders the same list in two
// different sequences, one per locale. Nothing downstream can notice: each locale's
// listing is internally consistent and plausible, which is the shape of defect this
// repository keeps finding late. The pair is the only place both halves are visible.
const orderedEntry = (slug, lang, order) => ({
  id: `${slug}-${lang}`,
  data: { slug, lang, type: 'case-study', title: `${slug} (${lang})`, confidentiality: 'sanitized', order },
});

test('throws naming the slug and both values when a pair disagrees about order', () => {
  const entries = [
    orderedEntry('order-mismatch-sample', 'en', 2),
    orderedEntry('order-mismatch-sample', 'es', 3),
  ];
  assert.throws(
    () => assertEveryPairAgreesOnOrder(entries),
    /slug "order-mismatch-sample" carries order 2 in "en" and 3 in "es"/,
  );
});

test('accepts a pair whose halves carry the same order', () => {
  const entries = [
    orderedEntry('order-agreement-sample', 'en', 4),
    orderedEntry('order-agreement-sample', 'es', 4),
  ];
  assert.doesNotThrow(() => assertEveryPairAgreesOnOrder(entries));
});

test('ignores entries that carry no order, leaving that to the catalog listing', () => {
  const entries = [entry('no-order-sample', 'en'), entry('no-order-sample', 'es')];
  assert.doesNotThrow(() => assertEveryPairAgreesOnOrder(entries));
});
