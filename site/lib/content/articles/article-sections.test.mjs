import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isBoldLeadDefinitionList,
  findLastSectionStart,
  buildServicesGridNode,
  createArticleSectionsPlugin,
} from './article-sections.mjs';

const heading = (value) => ({ type: 'heading', depth: 2, children: [{ type: 'text', value }] });
const paragraph = (value) => ({ type: 'paragraph', children: [{ type: 'text', value }] });

const definitionItem = (name, description) => ({
  type: 'listItem',
  children: [
    {
      type: 'paragraph',
      children: [
        { type: 'strong', children: [{ type: 'text', value: name }] },
        { type: 'text', value: ` — ${description}` },
      ],
    },
  ],
});

const plainItem = (value) => ({
  type: 'listItem',
  children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
});

const linkItem = (slug) => ({
  type: 'listItem',
  children: [
    {
      type: 'paragraph',
      children: [{ type: 'link', url: `/case-studies/${slug}`, children: [{ type: 'text', value: slug }] }],
    },
  ],
});

const list = (...items) => ({ type: 'list', children: items });

function recordingContext(frontmatter) {
  const operations = [];
  return {
    operations,
    data: { astro: { frontmatter } },
    removeNode: (node) => operations.push({ op: 'remove', node }),
    replaceNode: (node, newNode) => operations.push({ op: 'replace', node, newNode }),
    insertBefore: (node, newNode) => operations.push({ op: 'insertBefore', node, newNode }),
    insertAfter: (node, newNode) => operations.push({ op: 'insertAfter', node, newNode }),
  };
}

test('detects a bold-lead definition list', () => {
  const servicesList = list(
    definitionItem('BFF for the mobile channel', 'orchestration and queue consumption.'),
    definitionItem('Identity gateway', 'abstracts a commercial identity provider.'),
    definitionItem('Credentials service', 'creation, reset and lifecycle.'),
  );

  assert.equal(isBoldLeadDefinitionList(servicesList), true);
});

test('rejects a mixed list', () => {
  const mixed = list(
    definitionItem('BFF for the mobile channel', 'orchestration and queue consumption.'),
    plainItem('Every generation attempt must be auditable.'),
  );

  assert.equal(isBoldLeadDefinitionList(mixed), false);
});

test('rejects a list of plain links, which is what a deep-dives section is', () => {
  assert.equal(isBoldLeadDefinitionList(list(linkItem('otp-provider-decoupling'))), false);
});

test('rejects an empty list rather than treating it as vacuously bold-lead', () => {
  assert.equal(isBoldLeadDefinitionList(list()), false);
});

test('rejects a bold lead that is not followed by an em dash', () => {
  const notADefinition = list({
    type: 'listItem',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'strong', children: [{ type: 'text', value: 'Cost.' }] },
          { type: 'text', value: ' The vendor was the largest line item.' },
        ],
      },
    ],
  });

  assert.equal(isBoldLeadDefinitionList(notADefinition), false);
});

test('splits the body at its last h2', () => {
  const children = [
    heading('Context'),
    paragraph('one'),
    heading('Result'),
    paragraph('two'),
    heading('What I would do differently'),
    paragraph('three'),
    paragraph('four'),
  ];

  assert.equal(findLastSectionStart(children), 4);
});

test('splits positionally, not on the heading text, so the Spanish body splits the same way', () => {
  const children = [heading('Contexto'), paragraph('uno'), heading('Qué haría distinto hoy'), paragraph('dos')];

  assert.equal(findLastSectionStart(children), 2);
});

test('a body with no h2 has no last section', () => {
  assert.equal(findLastSectionStart([paragraph('only prose')]), -1);
});

test('the services grid keeps the name and the description apart, and drops the em dash', () => {
  const grid = buildServicesGridNode(
    list(definitionItem('Identity gateway', 'abstracts a commercial identity provider.')),
  );

  assert.equal(grid.data.hName, 'div');
  const [item] = grid.children;
  const [name, description] = item.children;
  assert.deepEqual(name.children, [{ type: 'text', value: 'Identity gateway' }]);
  assert.deepEqual(description.children, [{ type: 'text', value: 'abstracts a commercial identity provider.' }]);
});

test('the services grid preserves inline markup inside a description', () => {
  const withEmphasis = {
    type: 'listItem',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'strong', children: [{ type: 'text', value: 'Identity gateway' }] },
          { type: 'text', value: ' — abstracts a ' },
          { type: 'emphasis', children: [{ type: 'text', value: 'commercial' }] },
          { type: 'text', value: ' provider.' },
        ],
      },
    ],
  };

  const [item] = buildServicesGridNode(list(withEmphasis)).children;
  const [, description] = item.children;
  assert.equal(description.children.length, 3);
  assert.deepEqual(description.children[0], { type: 'text', value: 'abstracts a ' });
  assert.equal(description.children[1].type, 'emphasis');
});

test('splits after deep dives are removed', () => {
  const deepDivesHeading = heading('Deep dives');
  const deepDivesList = list(linkItem('otp-provider-decoupling'), linkItem('qr-collections-for-merchants'));
  const critiqueHeading = heading('What I would do differently');
  const critiqueBody = paragraph('the self-critique');
  const children = [heading('Results'), paragraph('one'), critiqueHeading, critiqueBody, deepDivesHeading, deepDivesList];

  const plugin = createArticleSectionsPlugin();
  const ctx = recordingContext({ type: 'platform' });
  plugin.after({ children }, ctx);

  const removed = ctx.operations.filter((operation) => operation.op === 'remove').map((operation) => operation.node);
  assert.deepEqual(removed, [deepDivesHeading, deepDivesList]);

  const opened = ctx.operations.find((operation) => operation.op === 'insertBefore');
  assert.equal(opened.node, critiqueHeading, 'the block opens before the self-critique, not before Deep dives');

  const closed = ctx.operations.find((operation) => operation.op === 'insertAfter');
  assert.equal(closed.node, critiqueBody, 'the block closes after the last node that survived the strip');
});

test('the deep-dive slugs travel out on the frontmatter, in body order', () => {
  const children = [
    heading('Results'),
    heading('Deep dives'),
    list(linkItem('qr-collections-for-merchants'), linkItem('otp-provider-decoupling')),
  ];

  const plugin = createArticleSectionsPlugin();
  const ctx = recordingContext({ type: 'platform' });
  plugin.after({ children }, ctx);

  assert.deepEqual(ctx.data.astro.frontmatter.deepDiveSlugs, [
    'qr-collections-for-merchants',
    'otp-provider-decoupling',
  ]);
});

test('a case study renders its bold-lead lists as prose lists, not as a services grid', () => {
  const servicesShaped = list(definitionItem('Verification', 'the full OTP lifecycle.'));
  const children = [heading('Approach'), servicesShaped, heading('What I would do differently'), paragraph('x')];

  const plugin = createArticleSectionsPlugin();
  const ctx = recordingContext({ type: 'case-study' });
  plugin.after({ children }, ctx);

  assert.equal(
    ctx.operations.some((operation) => operation.op === 'replace'),
    false,
    'the grid is a platform treatment; the case-study bodies carry lists of the same shape',
  );
});

test('the platform replaces its bold-lead list with the grid', () => {
  const servicesShaped = list(definitionItem('Identity gateway', 'abstracts a provider.'));
  const children = [heading('Services I designed and owned'), servicesShaped, heading('Results'), paragraph('x')];

  const plugin = createArticleSectionsPlugin();
  const ctx = recordingContext({ type: 'platform' });
  plugin.after({ children }, ctx);

  const replaced = ctx.operations.find((operation) => operation.op === 'replace');
  assert.equal(replaced.node, servicesShaped);
  assert.equal(replaced.newNode.data.hProperties.className[0], 'service-grid');
});

test('a body with no deep-dives section reports no slugs and removes nothing', () => {
  const children = [heading('Context'), paragraph('one'), heading('What I would do differently'), paragraph('two')];

  const plugin = createArticleSectionsPlugin();
  const ctx = recordingContext({ type: 'case-study' });
  plugin.after({ children }, ctx);

  assert.deepEqual(ctx.data.astro.frontmatter.deepDiveSlugs, []);
  assert.equal(
    ctx.operations.some((operation) => operation.op === 'remove'),
    false,
  );
});

test('a body with no h2 is left unwrapped rather than wrapped from nowhere', () => {
  const plugin = createArticleSectionsPlugin();
  const ctx = recordingContext({ type: 'case-study' });
  plugin.after({ children: [paragraph('only prose')] }, ctx);

  assert.equal(
    ctx.operations.some((operation) => operation.op === 'insertBefore' || operation.op === 'insertAfter'),
    false,
  );
});

// Shape and boundary assertions. What the plugin emits is markup, and a mutant can
// change a class name or a tag without any behavioural test above noticing.

test('the services grid emits exactly the elements the stylesheet targets', () => {
  const grid = buildServicesGridNode(list(definitionItem('Identity gateway', 'abstracts a provider.')));

  assert.deepEqual(grid.data, { hName: 'div', hProperties: { className: ['service-grid'] } });
  const [item] = grid.children;
  assert.deepEqual(item.data, { hName: 'div', hProperties: { className: ['service-grid__item'] } });
  const [name, description] = item.children;
  assert.deepEqual(name.data, { hName: 'div', hProperties: { className: ['service-grid__name'] } });
  assert.deepEqual(description.data, {
    hName: 'div',
    hProperties: { className: ['service-grid__description'] },
  });
});

test('the critique block opens and closes with real, balanced HTML that is not re-parsed', () => {
  const critiqueHeading = heading('What I would do differently');
  const last = paragraph('the critique');
  const plugin = createArticleSectionsPlugin();
  const ctx = recordingContext({ type: 'case-study' });
  plugin.after({ children: [heading('Context'), paragraph('one'), critiqueHeading, last] }, ctx);

  const opened = ctx.operations.find((operation) => operation.op === 'insertBefore');
  const closed = ctx.operations.find((operation) => operation.op === 'insertAfter');
  assert.deepEqual(opened.newNode, { raw: '<div class="article-critique">', mdxExpressions: false });
  assert.deepEqual(closed.newNode, { raw: '</div>', mdxExpressions: false });
});

test('the plugin announces itself by name, which is how it is identified in the pipeline', () => {
  assert.equal(createArticleSectionsPlugin().name, 'article-sections');
});

test('a list item whose first block is not a paragraph is not a definition list', () => {
  const notAParagraph = {
    type: 'listItem',
    children: [
      {
        type: 'heading',
        depth: 3,
        children: [
          { type: 'strong', children: [{ type: 'text', value: 'Name' }] },
          { type: 'text', value: ' — description' },
        ],
      },
    ],
  };
  assert.equal(isBoldLeadDefinitionList(list(notAParagraph)), false);
});

test('a bold run with nothing after it is not a definition', () => {
  const boldOnly = {
    type: 'listItem',
    children: [{ type: 'paragraph', children: [{ type: 'strong', children: [{ type: 'text', value: 'Name' }] }] }],
  };
  assert.equal(isBoldLeadDefinitionList(list(boldOnly)), false);
});

test('a non-listItem in the list is not a definition', () => {
  assert.equal(isBoldLeadDefinitionList(list({ type: 'paragraph', children: [] })), false);
});

test('the separator is dropped only from a leading text node, and only once', () => {
  const twoDashes = {
    type: 'listItem',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'strong', children: [{ type: 'text', value: 'Name' }] },
          { type: 'text', value: ' — a description — with its own dash' },
        ],
      },
    ],
  };

  const [item] = buildServicesGridNode(list(twoDashes)).children;
  assert.deepEqual(item.children[1].children, [
    { type: 'text', value: 'a description — with its own dash' },
  ]);
});

test('a description that opens with markup rather than text is carried across untouched', () => {
  const opensBold = {
    type: 'listItem',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'strong', children: [{ type: 'text', value: 'Name' }] },
          { type: 'text', value: ' — ' },
          { type: 'emphasis', children: [{ type: 'text', value: 'emphasised' }] },
        ],
      },
    ],
  };

  const [item] = buildServicesGridNode(list(opensBold)).children;
  assert.equal(item.children[1].children[0].value, '');
  assert.equal(item.children[1].children[1].type, 'emphasis');
});

test('the last section is found whether it opens the body or ends it', () => {
  assert.equal(findLastSectionStart([heading('Only')]), 0);
  assert.equal(findLastSectionStart([paragraph('a'), paragraph('b'), heading('Last')]), 2);
  assert.equal(findLastSectionStart([]), -1);
});

test('an h3 does not open a section', () => {
  const children = [heading('Context'), { type: 'heading', depth: 3, children: [] }, paragraph('x')];
  assert.equal(findLastSectionStart(children), 0);
});
