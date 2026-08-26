import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDeepDives, buildDeepDiveCards, buildParentTitleLookup } from './deep-dives.mjs';

// Node shapes as satteri hands them to us: a heading is `{ type: 'heading', depth, children }`,
// a deep-dive list item is a listItem whose single paragraph child holds exactly one link child.

const heading = (depth, text) => ({ type: 'heading', depth, children: [{ type: 'text', value: text }] });

const deepDiveListItem = (href, text) => ({
  type: 'listItem',
  children: [
    {
      type: 'paragraph',
      children: [{ type: 'link', url: href, children: [{ type: 'text', value: text }] }],
    },
  ],
});

const list = (items) => ({ type: 'list', children: items });

const paragraph = (text) => ({ type: 'paragraph', children: [{ type: 'text', value: text }] });

test('extracts three slugs from the section', () => {
  const children = [
    heading(2, 'Results'),
    paragraph('Some results.'),
    heading(2, 'Deep dives'),
    list([
      deepDiveListItem('/case-studies/first-fixture-child', 'QR collections'),
      deepDiveListItem('/case-studies/second-fixture-child', 'OTP decoupling'),
      deepDiveListItem('/case-studies/third-fixture-child', 'Legacy migration'),
    ]),
  ];

  const { slugs } = extractDeepDives(children);

  assert.deepEqual(slugs, [
    'first-fixture-child',
    'second-fixture-child',
    'third-fixture-child',
  ]);
});

test('returns empty for a body with no section', () => {
  // Shaped like the standalone case study's body: a services-like list is present, but
  // no heading/list pair is every-item-a-case-studies-link, so there is no deep-dives
  // section to find. This is the normal case — all four case-study bodies hit it.
  const children = [
    heading(2, 'Context'),
    paragraph('An agro-industrial holding operated several plants.'),
    heading(2, 'Approach'),
    list([
      { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'strong', children: [{ type: 'text', value: 'Modular monolith' }] }, { type: 'text', value: ' — chosen for the team size.' }] }] },
    ]),
    heading(2, 'What I would do differently'),
    paragraph('Would validate the escape hatch before building it.'),
  ];

  const { slugs, body } = extractDeepDives(children);

  assert.deepEqual(slugs, []);
  assert.deepEqual(body, children);
});

test('strips the section from the body it returns', () => {
  // The heading and list must both be removed, or the page shows the card grid and then
  // the plain list underneath it — everything else in the body stays, in order.
  const resultsHeading = heading(2, 'Results');
  const resultsParagraph = paragraph('Some results.');
  const deepDivesHeading = heading(2, 'Deep dives');
  const deepDivesList = list([
    deepDiveListItem('/case-studies/first-fixture-child', 'QR collections'),
    deepDiveListItem('/case-studies/second-fixture-child', 'OTP decoupling'),
    deepDiveListItem('/case-studies/third-fixture-child', 'Legacy migration'),
  ]);
  const children = [resultsHeading, resultsParagraph, deepDivesHeading, deepDivesList];

  const { body } = extractDeepDives(children);

  assert.deepEqual(body, [resultsHeading, resultsParagraph]);
});

// --- joining the extracted slugs against the real entries ---------------------

const catalogEntry = (slug, extraData = {}) => ({
  id: `${slug}-en`,
  data: { slug, lang: 'en', type: 'case-study', title: `${slug} title`, confidentiality: 'sanitized', ...extraData },
});

const routeFor = (slug, path) => ({ slug, lang: 'en', path });

test('throws naming a slug with no entry', () => {
  const entries = [catalogEntry('first-fixture-child')];
  const routes = [routeFor('first-fixture-child', '/case-studies/first-fixture-child')];

  assert.throws(
    () => buildDeepDiveCards(['first-fixture-child', 'nonexistent-slug'], entries, routes),
    /nonexistent-slug/,
  );
});

test('builds a card from the linked entry\'s own frontmatter and the route set', () => {
  const entries = [
    catalogEntry('second-fixture-child', {
      title: 'Taking second-factor authentication back from a vendor',
      role: 'Solution Architect',
      period: '2025',
    }),
  ];
  const routes = [routeFor('second-fixture-child', '/case-studies/second-fixture-child')];

  const [card] = buildDeepDiveCards(['second-fixture-child'], entries, routes);

  assert.equal(card.title, 'Taking second-factor authentication back from a vendor');
  assert.equal(card.meta, 'Solution Architect · 2025');
  assert.equal(card.href, '/case-studies/second-fixture-child');
});

// --- mapping child slugs back to their parent, CASE-006 -----------------------
// The inverse of the same extracted list: given a summary per platform (its slug, its
// title, and the child slugs its own deep-dives section names — the same `slugs` array
// extractDeepDives returns), a case-study page can ask "which platform, if any, names
// me?". No frontmatter carries the relation and none can be added (the frozen-content boundary).

test('maps each child slug back to its parent', () => {
  const platformSummaries = [
    {
      slug: 'mobile-banking-platform',
      title: "Rebuilding a bank's mobile platform in-house",
      childSlugs: [
        'qr-collections-for-merchants',
        'otp-provider-decoupling',
        'legacy-payment-data-migration',
      ],
    },
  ];

  const parentTitleForSlug = buildParentTitleLookup(platformSummaries);

  assert.equal(parentTitleForSlug('qr-collections-for-merchants'), "Rebuilding a bank's mobile platform in-house");
  assert.equal(parentTitleForSlug('otp-provider-decoupling'), "Rebuilding a bank's mobile platform in-house");
  assert.equal(parentTitleForSlug('legacy-payment-data-migration'), "Rebuilding a bank's mobile platform in-house");
});

test('a standalone case study has no parent', () => {
  const platformSummaries = [
    {
      slug: 'mobile-banking-platform',
      title: "Rebuilding a bank's mobile platform in-house",
      childSlugs: [
        'qr-collections-for-merchants',
        'otp-provider-decoupling',
        'legacy-payment-data-migration',
      ],
    },
  ];

  const parentTitleForSlug = buildParentTitleLookup(platformSummaries);

  assert.equal(parentTitleForSlug('multi-tenant-biometric-attendance'), undefined);
});

// Shape and boundary assertions. The tests above prove the behaviour a reader would
// notice; these prove the cases where a wrong answer looks like a right one.

test('a card carries only the half of the meta line the entry actually has', () => {
  const routes = [routeFor('only-role', '/a'), routeFor('only-period', '/b'), routeFor('neither', '/c')];
  const entries = [
    catalogEntry('only-role', { title: 'A', role: 'Solution Architect' }),
    catalogEntry('only-period', { title: 'B', period: '2024' }),
    catalogEntry('neither', { title: 'C' }),
  ];

  const [roleOnly, periodOnly, neither] = buildDeepDiveCards(
    ['only-role', 'only-period', 'neither'],
    entries,
    routes,
  );
  assert.equal(roleOnly.meta, 'Solution Architect');
  assert.equal(periodOnly.meta, '2024');
  assert.equal(neither.meta, undefined);
  assert.equal(roleOnly.title, 'A');
});

test('a slug with an entry but no route in this locale throws naming it', () => {
  const entries = [catalogEntry('routed-nowhere')];
  assert.throws(() => buildDeepDiveCards(['routed-nowhere'], entries, []), /routed-nowhere/);
});

test('a link that only looks internal is not a deep dive', () => {
  for (const url of [
    '/elsewhere/case-studies/a-child',
    '/case-studies/a-child/and-more',
    'https://example.com/case-studies/a-child',
    '/case-studies/',
  ]) {
    const children = [
      { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Deep dives' }] },
      {
        type: 'list',
        children: [
          {
            type: 'listItem',
            children: [{ type: 'paragraph', children: [{ type: 'link', url, children: [] }] }],
          },
        ],
      },
    ];
    assert.deepEqual(extractDeepDives(children).slugs, [], `"${url}" should not read as a deep dive`);
  }
});

test('a list item carrying anything besides one bare link is not a deep dive', () => {
  const link = { type: 'link', url: '/case-studies/a-child', children: [] };
  const malformedItems = [
    { type: 'listItem', children: [{ type: 'paragraph', children: [link, { type: 'text', value: ' and more' }] }] },
    { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'no link at all' }] }] },
    { type: 'listItem', children: [{ type: 'heading', depth: 3, children: [link] }] },
    { type: 'listItem', children: [] },
    { type: 'paragraph', children: [] },
  ];

  for (const item of malformedItems) {
    const children = [
      { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Deep dives' }] },
      { type: 'list', children: [item] },
    ];
    assert.deepEqual(extractDeepDives(children).slugs, []);
  }
});

test('the section is found when it is the very last thing in the body', () => {
  const children = [
    { type: 'paragraph', children: [{ type: 'text', value: 'prose' }] },
    { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Deep dives' }] },
    {
      type: 'list',
      children: [
        {
          type: 'listItem',
          children: [
            { type: 'paragraph', children: [{ type: 'link', url: '/case-studies/a-child', children: [] }] },
          ],
        },
      ],
    },
  ];

  const { slugs, body } = extractDeepDives(children);
  assert.deepEqual(slugs, ['a-child']);
  assert.equal(body.length, 1);
});

test('a heading not followed by a list, and a list not preceded by a heading, are both ignored', () => {
  const list = {
    type: 'list',
    children: [
      { type: 'listItem', children: [{ type: 'paragraph', children: [{ type: 'link', url: '/case-studies/a-child', children: [] }] }] },
    ],
  };

  // A bare list with no heading above it.
  assert.deepEqual(extractDeepDives([list]).slugs, []);
  // An h3 above it is not a section heading.
  assert.deepEqual(
    extractDeepDives([{ type: 'heading', depth: 3, children: [] }, list]).slugs,
    [],
  );
  // A heading with prose after it, not a list.
  assert.deepEqual(
    extractDeepDives([
      { type: 'heading', depth: 2, children: [] },
      { type: 'paragraph', children: [] },
    ]).slugs,
    [],
  );
});

test('an empty list is not a deep-dives section, rather than vacuously being one', () => {
  const children = [
    { type: 'heading', depth: 2, children: [{ type: 'text', value: 'Deep dives' }] },
    { type: 'list', children: [] },
  ];
  assert.deepEqual(extractDeepDives(children).slugs, []);
});
