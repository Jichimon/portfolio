import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveHeadingId, createHeadingIdsPlugin, deriveTableOfContents } from './toc.mjs';

test('derives one entry per h2', () => {
  const headings = [
    { depth: 2, slug: 'context', text: 'Context' },
    { depth: 2, slug: 'the-central-constraint', text: 'The central constraint' },
    { depth: 2, slug: 'architecture', text: 'Architecture' },
    { depth: 2, slug: 'results', text: 'Results' },
    { depth: 2, slug: 'what-i-would-do-differently', text: 'What I would do differently' },
  ];

  assert.deepEqual(deriveTableOfContents(headings), [
    { id: 'context', label: 'Context' },
    { id: 'the-central-constraint', label: 'The central constraint' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'results', label: 'Results' },
    { id: 'what-i-would-do-differently', label: 'What I would do differently' },
  ]);
});

test('ignores h3', () => {
  const headings = [
    { depth: 2, slug: 'approach', text: 'Approach' },
    { depth: 3, slug: 'decomposition', text: 'Decomposition' },
    { depth: 3, slug: 'the-compute-decision', text: 'The compute decision' },
    { depth: 2, slug: 'result', text: 'Result' },
  ];

  assert.deepEqual(deriveTableOfContents(headings), [
    { id: 'approach', label: 'Approach' },
    { id: 'result', label: 'Result' },
  ]);
});

test('the label is the heading text verbatim, however long', () => {
  const longHeading = 'One decision worth explaining: two services, not one';
  const headings = [{ depth: 2, slug: 'one-decision-worth-explaining-two-services-not-one', text: longHeading }];

  assert.equal(deriveTableOfContents(headings)[0].label, longHeading);
});

test('disambiguates duplicate heading text', () => {
  const taken = new Set();
  const first = deriveHeadingId('Approach', taken);
  taken.add(first);
  const second = deriveHeadingId('Approach', taken);
  taken.add(second);
  const third = deriveHeadingId('Approach', taken);

  assert.equal(first, 'approach');
  assert.equal(second, 'approach-2');
  assert.equal(third, 'approach-3');
});

test('ids are locale-native', () => {
  assert.equal(deriveHeadingId('Context', new Set()), 'context');
  assert.equal(deriveHeadingId('Contexto', new Set()), 'contexto');
  assert.equal(deriveHeadingId('Qué haría distinto hoy', new Set()), 'qué-haría-distinto-hoy');
  assert.equal(deriveHeadingId('Servicios que diseñé y mantuve', new Set()), 'servicios-que-diseñé-y-mantuve');
});

test('punctuation is dropped and whitespace runs collapse to one hyphen', () => {
  assert.equal(
    deriveHeadingId('One decision worth explaining: two services, not one', new Set()),
    'one-decision-worth-explaining-two-services-not-one',
  );
  assert.equal(deriveHeadingId('  Results  ', new Set()), 'results');
});

test('a heading whose text carries no id-able character still gets a usable id', () => {
  const taken = new Set();
  const first = deriveHeadingId('—', taken);
  taken.add(first);

  assert.notEqual(first, '');
  assert.equal(deriveHeadingId('***', taken), `${first}-2`);
});

test('the plugin assigns every heading an id, at both depths', () => {
  const plugin = createHeadingIdsPlugin();
  const assigned = [];
  const ctx = {
    textContent: (node) => node.text,
    setProperty: (node, key, value) => assigned.push({ text: node.text, key, value }),
  };

  plugin.heading({ depth: 2, text: 'Approach' }, ctx);
  plugin.heading({ depth: 3, text: 'Decomposition' }, ctx);

  assert.deepEqual(assigned, [
    { text: 'Approach', key: 'data', value: { hProperties: { id: 'approach' } } },
    { text: 'Decomposition', key: 'data', value: { hProperties: { id: 'decomposition' } } },
  ]);
});

test('the plugin does not reuse an id already assigned in the same document', () => {
  const plugin = createHeadingIdsPlugin();
  const assigned = [];
  const ctx = {
    textContent: (node) => node.text,
    setProperty: (_node, _key, value) => assigned.push(value.hProperties.id),
  };

  plugin.heading({ depth: 2, text: 'Approach' }, ctx);
  plugin.heading({ depth: 3, text: 'Approach' }, ctx);

  assert.deepEqual(assigned, ['approach', 'approach-2']);
});

test('two documents do not share a taken-id set', () => {
  const assignedIds = (plugin) => {
    const ids = [];
    plugin.heading({ depth: 2, text: 'Context' }, {
      textContent: (node) => node.text,
      setProperty: (_node, _key, value) => ids.push(value.hProperties.id),
    });
    return ids;
  };

  assert.deepEqual(assignedIds(createHeadingIdsPlugin()), ['context']);
  assert.deepEqual(assignedIds(createHeadingIdsPlugin()), ['context']);
});

test('runs of whitespace and of hyphens each collapse to exactly one hyphen', () => {
  assert.equal(deriveHeadingId('Two  spaces', new Set()), 'two-spaces');
  assert.equal(deriveHeadingId('a - b', new Set()), 'a-b');
  assert.equal(deriveHeadingId('One — two', new Set()), 'one-two');
});

test('an id never begins or ends with a hyphen', () => {
  assert.equal(deriveHeadingId('- Results -', new Set()), 'results');
  assert.equal(deriveHeadingId('...Results...', new Set()), 'results');
});

test('the fallback for an unsluggable heading is a real word, not an empty id', () => {
  assert.equal(deriveHeadingId('***', new Set()), 'section');
});

test('digits are kept, because a heading can legitimately lead with one', () => {
  assert.equal(deriveHeadingId('3 phases', new Set()), '3-phases');
});

test('an entry carries the id to link to and the label to print, and nothing else', () => {
  assert.deepEqual(deriveTableOfContents([{ depth: 2, slug: 'context', text: 'Context' }]), [
    { id: 'context', label: 'Context' },
  ]);
});

test('a heading list with no h2 yields no entries at all', () => {
  assert.deepEqual(deriveTableOfContents([{ depth: 3, slug: 'a', text: 'A' }]), []);
  assert.deepEqual(deriveTableOfContents([]), []);
});
