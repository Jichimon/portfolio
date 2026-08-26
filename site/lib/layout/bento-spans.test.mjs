import test from 'node:test';
import assert from 'node:assert/strict';

import { fillLastRow } from './bento-spans.mjs';

test('leaves a set that already fills its rows exactly untouched', () => {
  assert.deepEqual(fillLastRow([2, 1, 1, 1, 1], 3), [2, 1, 1, 1, 1]);
});

test('widens the last tile to close the gap its row would otherwise leave', () => {
  // 2 + 1 fills row one; 1 opens row two and would leave two columns empty.
  assert.deepEqual(fillLastRow([2, 1, 1, 1], 3), [2, 1, 1, 2]);
});

test('gives the last tile a whole row when the ones before it end on a boundary', () => {
  assert.deepEqual(fillLastRow([2, 1, 1], 3), [2, 1, 3]);
  assert.deepEqual(fillLastRow([2, 1, 1, 1, 1, 1], 3), [2, 1, 1, 1, 1, 3]);
});

test('closes the gap at every column count, not only three', () => {
  assert.deepEqual(fillLastRow([2, 1, 1, 1], 2), [2, 1, 1, 2]);
  assert.deepEqual(fillLastRow([1, 1, 1], 4), [1, 1, 2]);
});

test('gives a lone tile the full width rather than a fraction of a row', () => {
  assert.deepEqual(fillLastRow([2], 3), [3]);
});

test('returns an empty set unchanged', () => {
  assert.deepEqual(fillLastRow([], 3), []);
});

test('never lets a base span exceed the columns available to it', () => {
  assert.deepEqual(fillLastRow([5, 1], 3), [3, 3]);
  assert.deepEqual(fillLastRow([3, 3], 2), [2, 2]);
});

test('treats a single column as a real grid, since the narrowest layout is one', () => {
  assert.deepEqual(fillLastRow([2, 1, 1], 1), [1, 1, 1]);
});

test('rejects a column count that cannot describe a grid', () => {
  assert.throws(() => fillLastRow([1], 0), /column/i);
  assert.throws(() => fillLastRow([1], -3), /column/i);
});
