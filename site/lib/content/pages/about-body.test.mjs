import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAboutBodyPlugin, buildPullQuoteNode, buildDropParagraphNode } from './about-body.mjs';

const paragraph = (value) => ({ type: 'paragraph', children: [{ type: 'text', value }] });
const heading = (value) => ({ type: 'heading', depth: 2, children: [{ type: 'text', value }] });
const thematicBreak = () => ({ type: 'thematicBreak' });
const blockquote = (value) => ({
  type: 'blockquote',
  children: [{ type: 'paragraph', children: [{ type: 'text', value }] }],
});

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

const pageFrontmatter = { type: 'page' };

test('splits the body at the single thematic break', () => {
  const first = paragraph('one');
  const brk = thematicBreak();
  const second = paragraph('two');
  const children = [first, brk, second];

  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({ children }, ctx);

  const opensBefore = ctx.operations.find((operation) => operation.op === 'insertBefore' && operation.node === first);
  const closesBeforeBreak = ctx.operations.find(
    (operation) => operation.op === 'insertBefore' && operation.node === brk,
  );
  const opensAfterBreak = ctx.operations.find(
    (operation) => operation.op === 'insertAfter' && operation.node === brk,
  );
  const closesAfterLast = ctx.operations.find(
    (operation) => operation.op === 'insertAfter' && operation.node === second,
  );
  const removed = ctx.operations.find((operation) => operation.op === 'remove');

  assert.ok(opensBefore, 'part one opens before the first node');
  assert.ok(closesBeforeBreak, 'part one closes where the break was');
  assert.ok(opensAfterBreak, 'part two opens where the break was');
  assert.ok(closesAfterLast, 'part two closes after the last node');
  assert.equal(removed.node, brk, 'the break itself is removed');
});

test('emits one wrapper when the body has no thematic break', () => {
  const first = paragraph('one');
  const second = paragraph('two');
  const children = [first, second];

  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({ children }, ctx);

  const inserts = ctx.operations.filter(
    (operation) => operation.op === 'insertBefore' || operation.op === 'insertAfter',
  );
  assert.equal(inserts.length, 2, 'exactly one open and one close, no split');
  assert.ok(inserts.find((operation) => operation.op === 'insertBefore' && operation.node === first));
  assert.ok(inserts.find((operation) => operation.op === 'insertAfter' && operation.node === second));
});

test('throws naming the node type on a second thematic break', () => {
  const children = [paragraph('one'), thematicBreak(), paragraph('two'), thematicBreak(), paragraph('three')];

  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);

  assert.throws(() => plugin.after({ children }, ctx), /thematicBreak/);
});

test('replaces the single blockquote with the pull node, keeping its inline children', () => {
  const quote = {
    type: 'blockquote',
    children: [
      {
        type: 'paragraph',
        children: [
          { type: 'text', value: 'before ' },
          { type: 'emphasis', children: [{ type: 'text', value: 'emphasised' }] },
        ],
      },
    ],
  };
  const children = [heading('Intro'), quote, paragraph('after')];

  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({ children }, ctx);

  const replaced = ctx.operations.find((operation) => operation.op === 'replace' && operation.node === quote);
  assert.ok(replaced, 'the blockquote was replaced');
  assert.equal(replaced.newNode.data.hName, 'p');
  assert.equal(replaced.newNode.data.hProperties.className[0], 'about-article__pull');
  assert.deepEqual(replaced.newNode.children, [
    { type: 'text', value: 'before ' },
    { type: 'emphasis', children: [{ type: 'text', value: 'emphasised' }] },
  ]);
});

test('emits no pull node when the body has no blockquote', () => {
  const children = [paragraph('one'), paragraph('two')];

  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({ children }, ctx);

  assert.equal(
    ctx.operations.some((operation) => operation.op === 'replace' && operation.newNode.data?.hProperties?.className?.[0] === 'about-article__pull'),
    false,
  );
});

test('throws naming the node type on a second blockquote', () => {
  const children = [blockquote('one'), paragraph('between'), blockquote('two')];

  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);

  assert.throws(() => plugin.after({ children }, ctx), /blockquote/);
});

test('marks the first paragraph with the drop treatment and no other paragraph', () => {
  const first = paragraph('one');
  const second = paragraph('two');
  const children = [first, second];

  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({ children }, ctx);

  const dropReplacements = ctx.operations.filter(
    (operation) => operation.op === 'replace' && operation.newNode.data?.hProperties?.className?.[0] === 'about-article__drop',
  );
  assert.equal(dropReplacements.length, 1);
  assert.equal(dropReplacements[0].node, first);
});

test("marks nothing when the body's first block is not a paragraph", () => {
  const children = [heading('Intro'), paragraph('one')];

  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({ children }, ctx);

  assert.equal(
    ctx.operations.some((operation) => operation.op === 'replace' && operation.newNode.data?.hProperties?.className?.[0] === 'about-article__drop'),
    false,
  );
});

test('does nothing at all when the frontmatter type is not page', () => {
  const children = [heading('Context'), blockquote('quoted'), thematicBreak(), paragraph('after')];

  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext({ type: 'case-study' });
  plugin.after({ children }, ctx);

  assert.deepEqual(ctx.operations, []);
});

// Everything above asserts that a mutation HAPPENED. None of it asserts what was
// emitted, so a mutant could rename every class, empty the wrapper tags or swap the
// rendered element and survive untouched. These assert the shape.

const classNameOf = (node) => node?.data?.hProperties?.className ?? [];

test('the prose wrapper opens and closes with real markup carrying the declared class', () => {
  const only = paragraph('one');
  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({ children: [only] }, ctx);

  const opens = ctx.operations.find((op) => op.op === 'insertBefore' && op.node === only);
  const closes = ctx.operations.find((op) => op.op === 'insertAfter' && op.node === only);

  assert.equal(opens.newNode.raw, '<div class="about-article__prose-part">');
  assert.equal(opens.newNode.mdxExpressions, false);
  assert.equal(closes.newNode.raw, '</div>');
});

test('the split emits a close and a fresh open around the break, not two of the same', () => {
  const first = paragraph('one');
  const brk = thematicBreak();
  const second = paragraph('two');
  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({ children: [first, brk, second] }, ctx);

  const closeAtBreak = ctx.operations.find((op) => op.op === 'insertBefore' && op.node === brk);
  const openAtBreak = ctx.operations.find((op) => op.op === 'insertAfter' && op.node === brk);

  assert.equal(closeAtBreak.newNode.raw, '</div>');
  assert.equal(openAtBreak.newNode.raw, '<div class="about-article__prose-part">');
});

test('the pull node renders as a paragraph carrying the pull class', () => {
  const quote = blockquote('a line');
  const node = buildPullQuoteNode(quote);

  assert.equal(node.data.hName, 'p');
  assert.deepEqual(classNameOf(node), ['about-article__pull']);
  assert.deepEqual(node.children, quote.children[0].children);
});

test('a blockquote whose first block is not a paragraph carries its own children across', () => {
  const quote = { type: 'blockquote', children: [heading('not a paragraph')] };
  const node = buildPullQuoteNode(quote);

  assert.deepEqual(node.children, quote.children);
});

test('a blockquote with no children at all yields an empty pull node rather than throwing', () => {
  const node = buildPullQuoteNode({ type: 'blockquote' });
  assert.deepEqual(node.children, []);
});

test('the drop node renders as a paragraph carrying the drop class and its own children', () => {
  const first = paragraph('opening');
  const node = buildDropParagraphNode(first);

  assert.equal(node.data.hName, 'p');
  assert.deepEqual(classNameOf(node), ['about-article__drop']);
  assert.deepEqual(node.children, first.children);
});

test('a paragraph with no children yields an empty drop node rather than throwing', () => {
  const node = buildDropParagraphNode({ type: 'paragraph' });
  assert.deepEqual(node.children, []);
});

test('an empty body is left completely untouched', () => {
  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({ children: [] }, ctx);

  assert.deepEqual(ctx.operations, []);
});

test('a body with no children key at all is left untouched rather than throwing', () => {
  const plugin = createAboutBodyPlugin();
  const ctx = recordingContext(pageFrontmatter);
  plugin.after({}, ctx);

  assert.deepEqual(ctx.operations, []);
});

test('the plugin declares a stable name', () => {
  assert.equal(createAboutBodyPlugin().name, 'about-body');
});

