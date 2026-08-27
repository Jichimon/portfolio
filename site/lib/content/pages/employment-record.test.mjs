import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEmploymentRecord } from './employment-record.mjs';

function role(overrides = {}) {
  return {
    company: 'Acme Corp',
    period: '2020–2021',
    title: 'Engineer',
    body: ['Did a thing.'],
    ...overrides,
  };
}

test('an entry without a stack carries no stack key', () => {
  const [entry] = buildEmploymentRecord([role()], [], [], 'en', 'source.md');
  assert.equal(Object.hasOwn(entry, 'stack'), false);
});

test('an entry without a logo carries no logo key', () => {
  const [entry] = buildEmploymentRecord([role()], [], [], 'en', 'source.md');
  assert.equal(Object.hasOwn(entry, 'logo'), false);
});

test('the most-recent flag is derived from position, not from a field', () => {
  const roles = [role({ company: 'Newest' }), role({ company: 'Older' })];
  const [first, second] = buildEmploymentRecord(roles, [], [], 'en', 'source.md');
  assert.equal(first.isMostRecent, true);
  assert.equal(second.isMostRecent, false);
});

test('rows are rebuilt from the linked entry, not from the referring file', () => {
  const roleWithCaseStudy = role({ case_studies: ['a-worked-example'] });
  const caseStudyEntries = [
    { data: { slug: 'a-worked-example', lang: 'en', title: 'The title the linked entry carries' } },
  ];
  const routes = [{ slug: 'a-worked-example', lang: 'en', path: '/case-studies/a-worked-example' }];

  const [entry] = buildEmploymentRecord([roleWithCaseStudy], caseStudyEntries, routes, 'en', 'source.md');

  assert.deepEqual(entry.caseStudyRows, [
    { title: 'The title the linked entry carries', href: '/case-studies/a-worked-example' },
  ]);
});

test('the Spanish build resolves Spanish titles and Spanish paths', () => {
  const roleWithCaseStudy = role({ case_studies: ['a-worked-example'] });
  const caseStudyEntries = [
    { data: { slug: 'a-worked-example', lang: 'en', title: 'English title' } },
    { data: { slug: 'a-worked-example', lang: 'es', title: 'Título en español' } },
  ];
  const routes = [
    { slug: 'a-worked-example', lang: 'en', path: '/case-studies/a-worked-example' },
    { slug: 'a-worked-example', lang: 'es', path: '/es/case-studies/a-worked-example' },
  ];

  const [entry] = buildEmploymentRecord([roleWithCaseStudy], caseStudyEntries, routes, 'es', 'source.md');

  assert.deepEqual(entry.caseStudyRows, [
    { title: 'Título en español', href: '/es/case-studies/a-worked-example' },
  ]);
});

test('a slug with no case study in this locale throws naming the slug', () => {
  const roleWithCaseStudy = role({ case_studies: ['missing-case-study'] });
  assert.throws(
    () => buildEmploymentRecord([roleWithCaseStudy], [], [], 'en', 'experience.en.md'),
    /missing-case-study/,
  );
});

test('a slug with no route in this locale throws naming the slug', () => {
  const roleWithCaseStudy = role({ case_studies: ['a-worked-example'] });
  const caseStudyEntries = [
    { data: { slug: 'a-worked-example', lang: 'en', title: 'English title' } },
  ];
  assert.throws(
    () => buildEmploymentRecord([roleWithCaseStudy], caseStudyEntries, [], 'en', 'experience.en.md'),
    /a-worked-example/,
  );
});

test('case_studies absent yields no caseStudyRows key', () => {
  const [entry] = buildEmploymentRecord([role()], [], [], 'en', 'source.md');
  assert.equal(Object.hasOwn(entry, 'caseStudyRows'), false);
});

test('an empty roles array returns an empty array', () => {
  const record = buildEmploymentRecord([], [], [], 'en', 'source.md');
  assert.deepEqual(record, []);
});

// The suite above asserts what an ABSENT key does. Without the mirror assertions a
// mutant that copies every optional field unconditionally, or none of them, survives:
// absence alone cannot tell "the guard works" from "the field is never carried".
test('an entry with a stack carries it verbatim', () => {
  const stack = ['One', 'Two'];
  const [entry] = buildEmploymentRecord([role({ stack })], [], [], 'en', 'source.md');
  assert.equal(Object.hasOwn(entry, 'stack'), true);
  assert.deepEqual(entry.stack, stack);
});

test('an entry with a logo carries it verbatim', () => {
  const [entry] = buildEmploymentRecord([role({ logo: 'acme.svg' })], [], [], 'en', 'source.md');
  assert.equal(Object.hasOwn(entry, 'logo'), true);
  assert.equal(entry.logo, 'acme.svg');
});

test('an entry carries its company, period, title and paragraphs unchanged', () => {
  const source = role({ body: ['First.', 'Second.'] });
  const [entry] = buildEmploymentRecord([source], [], [], 'en', 'source.md');
  assert.equal(entry.company, source.company);
  assert.equal(entry.period, source.period);
  assert.equal(entry.title, source.title);
  assert.deepEqual(entry.paragraphs, source.body);
});

test('a case study present only in the other locale throws rather than falling back to it', () => {
  const roles = [role({ case_studies: ['a-worked-example'] })];
  const entries = [{ data: { slug: 'a-worked-example', lang: 'en', title: 'English only' } }];
  const routes = [
    { slug: 'a-worked-example', lang: 'en', path: '/x' },
    { slug: 'a-worked-example', lang: 'es', path: '/es/x' },
  ];
  assert.throws(() => buildEmploymentRecord(roles, entries, routes, 'es', 'source.md'), /a-worked-example/);
});

test('a route present only in the other locale throws rather than falling back to it', () => {
  const roles = [role({ case_studies: ['a-worked-example'] })];
  const entries = [
    { data: { slug: 'a-worked-example', lang: 'en', title: 'English' } },
    { data: { slug: 'a-worked-example', lang: 'es', title: 'Spanish' } },
  ];
  const routes = [{ slug: 'a-worked-example', lang: 'en', path: '/x' }];
  assert.throws(() => buildEmploymentRecord(roles, entries, routes, 'es', 'source.md'), /a-worked-example/);
});

