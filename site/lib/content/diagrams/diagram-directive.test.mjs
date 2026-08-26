import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDiagramCaption, createDiagramDirectivePlugin } from './diagram-directive.mjs';

test('splits caption from Spec', () => {
  const body = 'Caption shown under the image.\nSpec: what the diagram must show.';
  assert.equal(extractDiagramCaption(body), 'Caption shown under the image.');
});

test('drops every Spec continuation line', () => {
  const body = [
    'System context: mobile clients → BFF → domain microservices → on-premise core.',
    'Spec: show the cloud/on-premise boundary explicitly as the dominant visual element.',
    'Include external actors: identity provider, messaging provider, payment gateway.',
    'No internal service names.',
  ].join('\n');
  assert.equal(
    extractDiagramCaption(body),
    'System context: mobile clients → BFF → domain microservices → on-premise core.'
  );
});

test('caption becomes alt', () => {
  const plugin = createDiagramDirectivePlugin();
  const node = { name: 'diagram', attributes: { id: 'platform-c4-context', type: 'c4-context' } };
  let captured = null;
  const ctx = {
    textContent: () => 'Caption text here.\nSpec: drawing instructions.',
    replaceNode: (_node, newNode) => {
      captured = newNode;
    },
  };
  plugin.containerDirective(node, ctx);
  const img = captured.children.find((child) => child.data.hName === 'img');
  assert.equal(img.data.hProperties.alt, 'Caption text here.');
});

test('directive with only a Spec body yields no figcaption', () => {
  const plugin = createDiagramDirectivePlugin();
  const node = { name: 'diagram', attributes: { id: 'some-id', type: 'flow' } };
  let captured = null;
  const ctx = {
    textContent: () => 'Spec: only instructions, no caption.',
    replaceNode: (_node, newNode) => {
      captured = newNode;
    },
  };
  plugin.containerDirective(node, ctx);
  const figcaption = captured.children.find((child) => child.data && child.data.hName === 'figcaption');
  assert.equal(figcaption, undefined);
  const img = captured.children.find((child) => child.data.hName === 'img');
  assert.equal(img.data.hProperties.alt, '');
});

// The tests above assert the two things a reader would notice. The ones below assert
// the shape of what is emitted, which is what a mutant can quietly change without any
// of the above failing.

function captureReplacement(node, body) {
  const plugin = createDiagramDirectivePlugin();
  let captured = 'nothing was replaced';
  plugin.containerDirective(node, {
    textContent: () => body,
    replaceNode: (_node, newNode) => {
      captured = newNode;
    },
  });
  return captured;
}

test('a directive that is not a diagram is left alone', () => {
  const plugin = createDiagramDirectivePlugin();
  let replaced = false;
  plugin.containerDirective(
    { name: 'aside', attributes: { id: 'x' } },
    { textContent: () => 'some other block', replaceNode: () => { replaced = true; } },
  );

  assert.equal(replaced, false);
});

test('the emitted figure is exactly the element the page needs, attributes included', () => {
  const captured = captureReplacement(
    { name: 'diagram', attributes: { id: 'otp-breakeven', type: 'table' } },
    'Cost curves for serverless versus containers.\nSpec: mark the break-even point.',
  );

  assert.deepEqual(captured.data, {
    hName: 'figure',
    hProperties: { className: ['article-figure'], 'data-diagram-type': 'table' },
  });
  assert.deepEqual(captured.children[0].data, {
    hName: 'img',
    hProperties: {
      src: '/diagrams/otp-breakeven.svg',
      alt: 'Cost curves for serverless versus containers.',
    },
  });
  assert.deepEqual(captured.children[1].data, { hName: 'figcaption' });
  assert.deepEqual(captured.children[1].children, [
    { type: 'text', value: 'Cost curves for serverless versus containers.' },
  ]);
});

test('every type resolves to one .svg, table included', () => {
  for (const type of ['c4-context', 'c4-container', 'c4-component', 'flow', 'table']) {
    const captured = captureReplacement({ name: 'diagram', attributes: { id: 'an-id', type } }, 'A caption.');
    assert.equal(captured.children[0].data.hProperties.src, '/diagrams/an-id.svg');
    assert.equal(captured.data.hProperties['data-diagram-type'], type);
  }
});

test('a caption with no Spec line keeps every one of its lines', () => {
  assert.equal(
    extractDiagramCaption('First line of the caption.\nSecond line of the caption.'),
    'First line of the caption. Second line of the caption.',
  );
});

test('only a line that BEGINS with the marker ends the caption', () => {
  // The word can legitimately appear mid-sentence in a caption. The convention is a
  // line opener, so treating it as a substring would silently truncate real copy.
  assert.equal(
    extractDiagramCaption('The Spec: field is described here.\nSpec: the private half.'),
    'The Spec: field is described here.',
  );
});
