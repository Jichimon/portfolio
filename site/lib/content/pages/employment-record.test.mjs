import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEmploymentRecord,
  collectDeclaredLogoFiles,
  deriveAnchor,
  deriveDarkLogoFileName,
} from './employment-record.mjs';
import { assertEveryAssetIsReferenced } from '../assets/published-photos.mjs';

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

test('an entry with a logo carries it verbatim when an asset backs it', () => {
  const [entry] = buildEmploymentRecord(
    [role({ logo: 'acme.svg' })],
    [],
    [],
    'en',
    'source.md',
    new Set(['acme.svg']),
  );
  assert.equal(Object.hasOwn(entry, 'logo'), true);
  assert.equal(entry.logo, 'acme.svg');
});

// EMP-002 — a declared logo with no real asset behind it is an author typo, not a
// silently-dropped field: the whole point of validating it here is that the record
// never carries a filename nothing can resolve, the same guarantee buildStackItems
// already gives a stack entry's `file`.
test('a declared logo with no asset behind it throws, naming the role and the file', () => {
  assert.throws(
    () =>
      buildEmploymentRecord(
        [role({ company: 'Acme Corp', logo: 'missing.svg' })],
        [],
        [],
        'en',
        'source.md',
        new Set(['some-other-file.svg']),
      ),
    (error) => /Acme Corp/.test(error.message) && /missing\.svg/.test(error.message),
  );
});

// An availableLogoNames the caller never passed defaults to empty rather than to "skip the
// check" — a logo declared against no known asset set fails loudly instead of shipping a
// dangling reference silently, which is the safer of the two failure directions when a
// check cannot tell what is really available.
test('a declared logo throws when no availableLogoNames set is passed at all', () => {
  assert.throws(
    () => buildEmploymentRecord([role({ logo: 'acme.svg' })], [], [], 'en', 'source.md'),
    /acme\.svg/,
  );
});

// EMP-002's second failure direction: an asset in the employer logo folder that no role
// references. collectDeclaredLogoFiles is the adapter from a role list to the {file} shape
// assertEveryAssetIsReferenced already expects — reused verbatim, per the stack and photo
// checks this mirrors, rather than forked into a second copy of the same publication-boundary
// logic.
test('collectDeclaredLogoFiles carries only the roles with a declared logo, as {file}', () => {
  const roles = [role({ logo: 'nice.svg' }), role({ company: 'No Logo Co' })];
  assert.deepEqual(collectDeclaredLogoFiles(roles), [{ file: 'nice.svg' }]);
});

test('collectDeclaredLogoFiles returns an empty list when no role declares a logo', () => {
  assert.deepEqual(collectDeclaredLogoFiles([role(), role({ company: 'Other Co' })]), []);
});

test('an asset under the employers folder that no role references is a finding naming the file', () => {
  const roles = [role({ logo: 'nice.svg' })];
  assert.throws(
    () => assertEveryAssetIsReferenced(['nice.svg', 'orphan.svg'], [collectDeclaredLogoFiles(roles)]),
    /orphan\.svg/,
  );
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

// The dark-variant convention: a declared logo's basename, with "-dark" inserted before
// the extension. Pure string derivation — whether the derived name actually exists as an
// asset is the caller's question, answered against availableDarkLogoNames below.
test('deriveDarkLogoFileName inserts -dark before the extension', () => {
  assert.equal(deriveDarkLogoFileName('nice.svg'), 'nice-dark.svg');
});

test('deriveDarkLogoFileName appends -dark when the file name carries no extension', () => {
  assert.equal(deriveDarkLogoFileName('nice'), 'nice-dark');
});

// A dark variant is an enhancement, never a requirement: an absent one is the same
// supported "no dark rendering" state the wordmark-alone fallback already models for a
// missing base logo, so it carries no key at all rather than a falsy placeholder.
test('a logo with a dark sibling available carries logoDark', () => {
  const [entry] = buildEmploymentRecord(
    [role({ logo: 'nice.svg' })],
    [],
    [],
    'en',
    'source.md',
    new Set(['nice.svg']),
    new Set(['nice-dark.svg']),
  );
  assert.equal(entry.logoDark, 'nice-dark.svg');
});

test('a logo with no dark sibling available carries no logoDark key', () => {
  const [entry] = buildEmploymentRecord(
    [role({ logo: 'mamaya-tech.svg' })],
    [],
    [],
    'en',
    'source.md',
    new Set(['mamaya-tech.svg']),
    new Set(['nice-dark.svg']),
  );
  assert.equal(Object.hasOwn(entry, 'logoDark'), false);
});

test('an entry with no logo at all carries no logoDark key, regardless of what is available', () => {
  const [entry] = buildEmploymentRecord(
    [role()],
    [],
    [],
    'en',
    'source.md',
    new Set(),
    new Set(['nice-dark.svg']),
  );
  assert.equal(Object.hasOwn(entry, 'logoDark'), false);
});

// availableDarkLogoNames the caller never passed defaults to empty: a dark variant is
// never assumed present, only ever confirmed present — the opposite failure direction
// from the base logo's default, and correctly so, since an absent dark variant is not a
// build failure, it is the ordinary, fully-supported case.
test('a dark variant is never assumed when availableDarkLogoNames is not passed at all', () => {
  const [entry] = buildEmploymentRecord(
    [role({ logo: 'nice.svg' })],
    [],
    [],
    'en',
    'source.md',
    new Set(['nice.svg']),
  );
  assert.equal(Object.hasOwn(entry, 'logoDark'), false);
});

// EMP-008 — deriveAnchor takes the company name and nothing else: no locale, no role
// object, no index. These two real company names between them exercise every rule the
// derivation has: 'Avícola Sofía' folds its accents rather than escaping them, and
// 'Banco Solidario S.A.' collapses each run of punctuation to one hyphen and trims the
// one a trailing "." leaves at the end — the same guarantee deriveDarkLogoFileName gives
// a logo's basename, applied to a company name instead.
test('accents fold and punctuation collapses — Avícola Sofía, Banco Solidario S.A.', () => {
  assert.equal(deriveAnchor('Avícola Sofía'), 'avicola-sofia');
  assert.equal(deriveAnchor('Banco Solidario S.A.'), 'banco-solidario-s-a');
});

// EMP-008 — the happy path across the record's own four employer names, so the wiring
// from role to entry is asserted against the real record rather than a synthetic one.
test('an anchor is derived for every role, from the company name alone', () => {
  const roles = [
    role({ company: 'NICE' }),
    role({ company: 'Banco Solidario S.A.' }),
    role({ company: 'Mamaya Tech' }),
    role({ company: 'Avícola Sofía' }),
  ];
  const entries = buildEmploymentRecord(roles, [], [], 'en', 'source.md');
  assert.deepEqual(
    entries.map((entry) => entry.anchor),
    ['nice', 'banco-solidario-s-a', 'mamaya-tech', 'avicola-sofia'],
  );
});

// EMP-008 — two stints at one employer is a real thing this record can hold, and a reader
// clicking the second card and silently landing on the first is a broken promise no test
// would catch. The two source names below are deliberately not identical strings — they
// collide only once punctuation collapses — so the assertion is on the derived anchor, not
// on the roles happening to share raw text.
test('two roles deriving the same anchor is a finding naming both', () => {
  const roles = [role({ company: 'Acme Corp.' }), role({ company: 'Acme Corp!' })];
  assert.throws(
    () => buildEmploymentRecord(roles, [], [], 'en', 'source.md'),
    (error) => error.message.includes('Acme Corp.') && error.message.includes('Acme Corp!'),
  );
});

// EMP-008 — a company name with no letter or digit in it (whitespace-only, punctuation-only)
// yields no usable slug. The entry carries no anchor key at all rather than an empty
// fragment: a card linking to '#' is worse than one linking to the page.
test('a company name that yields no usable slug produces no anchor rather than an empty one', () => {
  const [entry] = buildEmploymentRecord([role({ company: '   ' })], [], [], 'en', 'source.md');
  assert.equal(Object.hasOwn(entry, 'anchor'), false);
});

// EMP-008 — an anchor-less entry carries no fragment for a reader to land on, so two of
// them are never a collision, however similar their unusable names look. Without this,
// the collision guard's own skip condition is unverified: dropping it entirely would make
// two anchor-less roles collide on the shared absence, and nothing here would notice.
test('two anchor-less roles do not collide with each other', () => {
  const roles = [role({ company: '   ' }), role({ company: '!!!' })];
  assert.doesNotThrow(() => buildEmploymentRecord(roles, [], [], 'en', 'source.md'));
});

// EMP-008 — several non-alphanumeric characters in a row are one run, not several. The two
// real names already in this suite each carry single-character separators, so neither
// exercises the "+" that makes a run collapse to ONE hyphen instead of one hyphen per
// character.
test('a run of several punctuation characters collapses to a single hyphen', () => {
  assert.equal(deriveAnchor('Acme & Co.'), 'acme-co');
});

