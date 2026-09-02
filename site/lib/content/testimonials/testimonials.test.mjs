import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertTestimonialIdsAgreeAcrossLocales,
  assertTranslationsCarryTheirOriginal,
  buildTestimonialCards,
  assertExcerptsAreVerbatim,
} from './testimonials.mjs';

const entry = (lang, ids) => ({ data: { lang, testimonials: ids.map((id) => ({ id })) } });

test('assertTestimonialIdsAgreeAcrossLocales accepts two locales declaring the same ids in the same order', () => {
  const entries = [entry('en', ['a', 'b', 'c']), entry('es', ['a', 'b', 'c'])];

  assert.doesNotThrow(() => assertTestimonialIdsAgreeAcrossLocales(entries));
});

test('RED: an id in one locale and not the other is a finding naming it', () => {
  const entries = [entry('en', ['a', 'b']), entry('es', ['a'])];

  assert.throws(() => assertTestimonialIdsAgreeAcrossLocales(entries), /"b"/);
});

test('RED: the same ids in a different order is a finding', () => {
  const entries = [entry('en', ['a', 'b']), entry('es', ['b', 'a'])];

  assert.throws(() => assertTestimonialIdsAgreeAcrossLocales(entries), /order/);
});

test('RED: a duplicate id within one locale is a finding naming the id and the locale', () => {
  const entries = [entry('en', ['a', 'a']), entry('es', ['a', 'a'])];

  assert.throws(() => assertTestimonialIdsAgreeAcrossLocales(entries), /"a".*"en"/);
});

test('RED: a locale missing its entry altogether is a finding naming the locale', () => {
  const entries = [entry('en', ['a'])];

  assert.throws(() => assertTestimonialIdsAgreeAcrossLocales(entries), /"es"/);
});

const testimonial = (overrides) => ({
  id: 'nice-manager-a',
  quote: 'He turned a six-week integration into a two-day one.',
  original_language: 'en',
  name: 'A. Recommender',
  title: 'Engineering Manager',
  company: 'NICE',
  url: 'https://www.linkedin.com/in/example/details/recommendations/1',
  ...overrides,
});

const page = (lang, testimonials) => ({ lang, testimonials });

test('assertTranslationsCarryTheirOriginal accepts a native entry with no original_quote', () => {
  const data = page('en', [testimonial({ original_language: 'en' })]);

  assert.doesNotThrow(() => assertTranslationsCarryTheirOriginal(data, 'testimonials.en.md'));
});

test('assertTranslationsCarryTheirOriginal accepts a translated entry carrying its original', () => {
  const data = page('en', [testimonial({ original_language: 'es', original_quote: 'Convirtió una integración de seis semanas en una de dos días.' })]);

  assert.doesNotThrow(() => assertTranslationsCarryTheirOriginal(data, 'testimonials.en.md'));
});

test('RED: a translated entry with no original_quote is a finding naming its id and the file', () => {
  const data = page('en', [testimonial({ id: 'solidario-po', original_language: 'es' })]);

  assert.throws(
    () => assertTranslationsCarryTheirOriginal(data, 'testimonials.en.md'),
    /"solidario-po".*testimonials\.en\.md/s,
  );
});

test('RED: a native entry carrying an original_quote anyway is a finding', () => {
  const data = page('en', [testimonial({ original_language: 'en', original_quote: 'anything at all' })]);

  assert.throws(() => assertTranslationsCarryTheirOriginal(data, 'testimonials.en.md'), /"nice-manager-a"/);
});

test('RED: an entry declaring an original_language nobody publishes is a finding', () => {
  const data = page('en', [testimonial({ original_language: 'pt', original_quote: 'algo' })]);

  assert.throws(() => assertTranslationsCarryTheirOriginal(data, 'testimonials.en.md'), /"pt"/);
});

// A placeholder is not yet a claim about anything, so demanding its original would force the
// author to invent a second placeholder for text that does not exist. The invariant fires the
// moment the real quote lands, which is the moment the card starts telling a reader something.
test('a placeholder quote is exempt from the translation invariant', () => {
  const data = page('en', [testimonial({ quote: '[NEEDS INPUT] waiting on the permalink', original_language: 'es' })]);

  assert.doesNotThrow(() => assertTranslationsCarryTheirOriginal(data, 'testimonials.en.md'));
});

test('cards come back in the order the entry declares them', () => {
  const data = page('en', [
    testimonial({ id: 'third' }),
    testimonial({ id: 'first' }),
    testimonial({ id: 'second' }),
  ]);

  const cards = buildTestimonialCards(data);

  assert.deepEqual(cards.map((card) => card.id), ['third', 'first', 'second']);
});

test('a card carries title and company as separate values, with no separator baked in', () => {
  const data = page('en', [testimonial({ title: 'Engineering Manager', company: 'NICE' })]);

  const [card] = buildTestimonialCards(data);

  assert.equal(card.title, 'Engineering Manager');
  assert.equal(card.company, 'NICE');
  assert.equal(Object.values(card).some((value) => String(value).includes('·')), false);
});

test('a card carries the quote, the name and the permalink verbatim', () => {
  const data = page('en', [testimonial()]);

  const [card] = buildTestimonialCards(data);

  assert.equal(card.quote, 'He turned a six-week integration into a two-day one.');
  assert.equal(card.name, 'A. Recommender');
  assert.equal(card.url, 'https://www.linkedin.com/in/example/details/recommendations/1');
});

test('a native entry carries no translatedFrom', () => {
  const data = page('en', [testimonial({ original_language: 'en' })]);

  const [card] = buildTestimonialCards(data);

  assert.equal(Object.hasOwn(card, 'translatedFrom'), false);
});

test('a translated entry names the language it was translated from', () => {
  const data = page('en', [testimonial({ original_language: 'es', original_quote: 'el original' })]);

  const [card] = buildTestimonialCards(data);

  assert.equal(card.translatedFrom, 'es');
});

test('the original is preserved in the record but never becomes rendered card copy', () => {
  const data = page('es', [testimonial({ original_language: 'en', original_quote: 'the english original' })]);

  const [card] = buildTestimonialCards(data);

  assert.equal(Object.values(card).some((value) => String(value).includes('the english original')), false);
});

test('an entry whose quote begins with the marker is omitted', () => {
  const data = page('en', [
    testimonial({ id: 'ready' }),
    testimonial({ id: 'waiting', quote: '[NEEDS INPUT] the permalink' }),
  ]);

  const cards = buildTestimonialCards(data);

  assert.deepEqual(cards.map((card) => card.id), ['ready']);
});

test('a quote that merely mentions the marker words later is kept', () => {
  const data = page('en', [testimonial({ quote: 'He would ask what the [NEEDS INPUT] of a spec really was.' })]);

  assert.equal(buildTestimonialCards(data).length, 1);
});

test('an entry list that is entirely markers yields no cards', () => {
  const data = page('en', [
    testimonial({ id: 'a', quote: '[NEEDS INPUT] one' }),
    testimonial({ id: 'b', quote: '[NEEDS INPUT] two' }),
  ]);

  assert.deepEqual(buildTestimonialCards(data), []);
});

test('an entry declaring no testimonials at all yields no cards', () => {
  assert.deepEqual(buildTestimonialCards({ lang: 'en' }), []);
});

const QUOTE = 'Although he joined as a backend developer, he quickly proved himself\nhighly capable in frontend tasks as well, delivering high-quality work\nwith speed and reliability across multiple teams simultaneously.';

test('an excerpt whose every fragment appears in the quote is accepted', () => {
  const data = page('en', [testimonial({
    quote: QUOTE,
    excerpt: 'Although he joined as a backend developer, he quickly proved himself highly capable in frontend tasks as well, delivering high-quality work […] across multiple teams simultaneously.',
  })]);

  assert.doesNotThrow(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'));
});

test('an excerpt spanning a line break in the quote is accepted', () => {
  const data = page('en', [testimonial({
    quote: QUOTE,
    excerpt: 'he quickly proved himself highly capable in frontend tasks',
  })]);

  assert.doesNotThrow(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'));
});

test('RED: an excerpt fragment absent from the quote is a finding naming the id', () => {
  const data = page('en', [testimonial({
    id: 'nice-manager-a',
    quote: QUOTE,
    excerpt: 'He rewrote the entire payments platform over a weekend.',
  })]);

  assert.throws(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'), /"nice-manager-a"/);
});

test('RED: a paraphrase that changes one word is a finding', () => {
  const data = page('en', [testimonial({
    quote: QUOTE,
    // "exceptionally capable" for "highly capable" — the realistic error, and the one a
    // reader could never catch.
    excerpt: 'he quickly proved himself exceptionally capable in frontend tasks',
  })]);

  assert.throws(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'), /verbatim/);
});

test('RED: only the offending fragment is named, not the whole excerpt', () => {
  const data = page('en', [testimonial({
    quote: QUOTE,
    excerpt: 'Although he joined as a backend developer […] and rewrote the deployment pipeline',
  })]);

  assert.throws(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'), /rewrote the deployment pipeline/);
});

test('RED: an excerpt on a placeholder entry is a finding', () => {
  const data = page('en', [testimonial({
    quote: '[NEEDS INPUT] waiting on the text',
    excerpt: 'anything at all',
  })]);

  assert.throws(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'), /placeholder/);
});

test('an entry with no excerpt is accepted and renders its full quote', () => {
  const data = page('en', [testimonial({ quote: QUOTE })]);

  assert.doesNotThrow(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'));
  assert.equal(buildTestimonialCards(data)[0].quote, QUOTE);
});

test('a card renders its excerpt when one exists', () => {
  const excerpt = 'he quickly proved himself highly capable in frontend tasks';
  const data = page('en', [testimonial({ quote: QUOTE, excerpt })]);

  assert.equal(buildTestimonialCards(data)[0].quote, excerpt);
});

// Wrapping a quotation in quotation marks is what a person writes without thinking about it,
// and the marks are DELIMITERS rather than words — the card draws its own. Refusing them
// treated punctuation as paraphrase, which is not what the invariant is for.
test('an excerpt wrapped in quotation marks is accepted', () => {
  const data = page('en', [testimonial({
    quote: QUOTE,
    excerpt: '"he quickly proved himself highly capable in frontend tasks"',
  })]);

  assert.doesNotThrow(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'));
});

test('a wrapped excerpt renders without its delimiters, so the card never shows two opening marks', () => {
  const data = page('en', [testimonial({
    quote: QUOTE,
    excerpt: '“he quickly proved himself highly capable in frontend tasks”',
  })]);

  assert.equal(buildTestimonialCards(data)[0].quote, 'he quickly proved himself highly capable in frontend tasks');
});

test('a wrapped quote with no excerpt also renders without its delimiters', () => {
  const data = page('en', [testimonial({ quote: '"' + QUOTE + '"' })]);

  assert.equal(buildTestimonialCards(data)[0].quote.startsWith('"'), false);
});

test('RED: the finding delimits the fragment so a quote character inside it stays readable', () => {
  const data = page('en', [testimonial({ quote: QUOTE, excerpt: 'nowhere "in" the quote' })]);

  assert.throws(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'), /→ nowhere "in" the quote ←/);
});

test('a fragment that differs by more than its quotation marks is still the plain finding', () => {
  const data = page('en', [testimonial({ quote: QUOTE, excerpt: 'he rewrote the pipeline' })]);

  assert.throws(() => assertExcerptsAreVerbatim(data, 'testimonials.en.md'), /does not appear/);
});
