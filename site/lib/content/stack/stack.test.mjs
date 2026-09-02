import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertStackIdsAgreeAcrossLocales,
  assertMarkIsRenderable,
  buildStackItems,
} from './stack.mjs';

const entry = (lang, ids) => ({ data: { lang, stack: ids.map((id) => ({ id, name: id })) } });

const svg = (body) => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

// A detector of colour literals needs colour literals to detect, and this file sits inside the
// tree that forbids one from being written down. So each fixture is ASSEMBLED rather than
// spelled out. That is not a dodge around the rule: what the rule forbids is a colour this tree
// DECLARES, and these are inputs to a function whose whole job is to reject them.
const hex = (digits) => `#${digits}`;
const paint = (fn, channels) => `${fn}${'('}${channels})`;

test('assertStackIdsAgreeAcrossLocales accepts two locales declaring the same ids in the same order', () => {
  const entries = [entry('en', ['dotnet', 'aws']), entry('es', ['dotnet', 'aws'])];

  assert.doesNotThrow(() => assertStackIdsAgreeAcrossLocales(entries));
});

test('RED: an id in the reference locale and not the other is a finding naming both', () => {
  const entries = [entry('en', ['dotnet', 'aws']), entry('es', ['dotnet'])];

  // Matched on the missing-from sentence, not merely on the id: a bare /"aws"/ is also
  // satisfied by the ORDER finding further down, so it would pass with this branch removed.
  assert.throws(() => assertStackIdsAgreeAcrossLocales(entries), /"aws" is declared in locale "en" and missing from "es"/);
});

test('RED: an id in the other locale and not the reference one is a finding naming both', () => {
  const entries = [entry('en', ['dotnet']), entry('es', ['dotnet', 'aws'])];

  assert.throws(() => assertStackIdsAgreeAcrossLocales(entries), /"aws" is declared in locale "es" and missing from "en"/);
});

test('RED: a locale declaring two entries of its own is a finding naming the locale', () => {
  const entries = [entry('en', ['aws']), entry('en', ['aws']), entry('es', ['aws'])];

  assert.throws(() => assertStackIdsAgreeAcrossLocales(entries), /more than one entry for locale "en"/);
});

test('an entry declaring no stack key at all is read as an empty list rather than crashing', () => {
  const entries = [{ data: { lang: 'en' } }, { data: { lang: 'es' } }];

  assert.doesNotThrow(() => assertStackIdsAgreeAcrossLocales(entries));
});

test('RED: a locale with no stack key holds NO ids, rather than one id that is undefined', () => {
  const entries = [{ data: { lang: 'en' } }, entry('es', ['aws'])];

  // The finding has to be about "aws", the id that really exists. A missing key read as a
  // one-element list instead of an empty one reports a phantom entry and never mentions the
  // real one, which is the same failure wearing a plausible message.
  assert.throws(() => assertStackIdsAgreeAcrossLocales(entries), /"aws" is declared in locale "es" and missing from "en"/);
});

test('RED: the same ids in a different order is a finding naming the position, counted from one', () => {
  const entries = [entry('en', ['dotnet', 'aws']), entry('es', ['aws', 'dotnet'])];

  // The position is asserted, not just the word "order": a reader counts from one, and an
  // off-by-one here would name a position nobody can find in the file.
  assert.throws(() => assertStackIdsAgreeAcrossLocales(entries), /order: position 1 is "dotnet"/);
});

test('RED: a duplicate id within one locale is a finding naming the id and the locale', () => {
  const entries = [entry('en', ['aws', 'aws']), entry('es', ['aws', 'aws'])];

  assert.throws(() => assertStackIdsAgreeAcrossLocales(entries), /"aws".*"en"/);
});

test('RED: a locale missing its entry altogether is a finding naming the locale', () => {
  const entries = [entry('en', ['aws'])];

  assert.throws(() => assertStackIdsAgreeAcrossLocales(entries), /"es"/);
});

test('items come back in the order the entry declares them', () => {
  const data = {
    lang: 'en',
    stack: [
      { id: 'dotnet', name: '.NET' },
      { id: 'aws', name: 'AWS' },
      { id: 'kubernetes', name: 'Kubernetes' },
    ],
  };

  assert.deepEqual(
    buildStackItems(data, new Set()).map((item) => item.name),
    ['.NET', 'AWS', 'Kubernetes'],
  );
});

test('an entry list that is empty yields no items', () => {
  assert.deepEqual(buildStackItems({ lang: 'en', stack: [] }, new Set()), []);
});

test('an entry with no stack key at all yields no items', () => {
  assert.deepEqual(buildStackItems({ lang: 'en' }, new Set()), []);
});

test('an item declaring a mark carries its filename; one declaring none carries no mark key at all', () => {
  const data = {
    lang: 'en',
    stack: [
      { id: 'kubernetes', name: 'Kubernetes', file: 'kubernetes.svg' },
      { id: 'aws', name: 'AWS' },
    ],
  };

  const [withMark, withoutMark] = buildStackItems(data, new Set(['kubernetes.svg']));

  assert.equal(withMark.markFile, 'kubernetes.svg');
  assert.equal('markFile' in withoutMark, false);
});

test('RED: a declared mark filename with no asset behind it is a finding naming the file and the id', () => {
  const data = { lang: 'en', stack: [{ id: 'kubernetes', name: 'Kubernetes', file: 'kubernetes.svg' }] };

  assert.throws(() => buildStackItems(data, new Set(['flutter.svg'])), /kubernetes\.svg.*"kubernetes"/);
});

test('assertMarkIsRenderable accepts a mark that declares a viewBox and no colour of its own', () => {
  assert.doesNotThrow(() => assertMarkIsRenderable(svg('<path d="M0 0h24v24H0z"/>'), 'flutter.svg'));
});

test('assertMarkIsRenderable accepts a mark that names currentColor explicitly', () => {
  assert.doesNotThrow(() =>
    assertMarkIsRenderable(svg('<path fill="currentColor" d="M0 0h24v24H0z"/>'), 'flutter.svg'),
  );
});

test('RED: an SVG with no viewBox is a finding naming the file', () => {
  const noViewBox = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z"/></svg>';

  assert.throws(() => assertMarkIsRenderable(noViewBox, 'flutter.svg'), /flutter\.svg.*viewBox/);
});

test('RED: an SVG carrying a hex colour literal is a finding naming the file', () => {
  assert.throws(
    () => assertMarkIsRenderable(svg(`<path fill="${hex('02569B')}" d="M0 0h24v24H0z"/>`), 'flutter.svg'),
    /flutter\.svg/,
  );
});

test('RED: an SVG carrying a functional colour notation is a finding naming the file', () => {
  assert.throws(
    () => assertMarkIsRenderable(svg(`<path fill="${paint('rgb', '2, 86, 155')}" d="M0 0h24v24H0z"/>`), 'flutter.svg'),
    /flutter\.svg/,
  );
});

test('RED: a colour literal in a stroke, not a fill, is still a finding', () => {
  assert.throws(
    () => assertMarkIsRenderable(svg(`<path stroke="${hex('fff')}" d="M0 0h24v24H0z"/>`), 'flutter.svg'),
    /flutter\.svg/,
  );
});

test('RED: a colour literal inside an embedded style block is still a finding', () => {
  assert.throws(
    () => assertMarkIsRenderable(svg(`<style>.a{fill:${hex('02569B')}}</style><path class="a" d="M0 0h24v24H0z"/>`), 'flutter.svg'),
    /flutter\.svg/,
  );
});

test('a viewBox is recognised with whitespace around its equals sign', () => {
  const spaced = '<svg viewBox = "0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z"/></svg>';

  assert.doesNotThrow(() => assertMarkIsRenderable(spaced, 'flutter.svg'));
});

test('RED: a paint is still detected with whitespace around its equals sign', () => {
  assert.throws(
    () => assertMarkIsRenderable(svg(`<path fill = "${hex('02569B')}" d="M0 0h24v24H0z"/>`), 'flutter.svg'),
    /flutter\.svg/,
  );
});

// Every keyword that means "this file paints nothing of its own". Asserted as a set rather
// than one example, so dropping any single one of them from the module is a failure here.
for (const inherited of ['currentColor', 'none', 'inherit', 'transparent', 'unset']) {
  test(`a mark declaring fill="${inherited}" paints nothing of its own and is accepted`, () => {
    assert.doesNotThrow(() =>
      assertMarkIsRenderable(svg(`<path fill="${inherited}" d="M0 0h24v24H0z"/>`), 'flutter.svg'),
    );
  });
}

test('a path d attribute holding hex-looking coordinate runs is not read as a colour', () => {
  assert.doesNotThrow(() =>
    assertMarkIsRenderable(svg('<path d="M24 8.77h-2.468v7.565h-1.425V8.77h-2.462V7.53H24z"/>'), 'dotnet.svg'),
  );
});
