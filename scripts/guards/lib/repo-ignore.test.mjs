// TASK 112's red-path battery (T-04, P-14). No git, no fixture repository: the runner is
// injected, so every branch here is exercised against a shaped answer rather than against
// whatever the machine running the tests happens to have on disk.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readsAsIgnored, makeIgnoreOracle } from './repo-ignore.mjs';

test('exit 0 means git says the repository ignores this path', () => {
  assert.equal(readsAsIgnored({ status: 0 }), true);
});

test('RED: exit 1 means NOT ignored — the reference stays a finding', () => {
  assert.equal(readsAsIgnored({ status: 1 }), false);
});

test('RED: an unanswerable call is read as not-ignored, never as permission (G-13)', () => {
  // A broken git, a repository that is not a repository, a spawn that never ran. Every one of
  // these is an unanswered question, and an unanswered question must not excuse a missing
  // file — otherwise the day git breaks is the day every dangling citation passes.
  for (const result of [{ status: 128 }, { status: null }, {}, null, undefined]) {
    assert.equal(readsAsIgnored(result), false, `${JSON.stringify(result)} was read as ignored`);
  }
});

test('the oracle answers from the runner', () => {
  const oracle = makeIgnoreOracle((ref) => ({ status: ref.startsWith('private/') ? 0 : 1 }));
  assert.equal(oracle('private/glossary.md'), true);
  assert.equal(oracle('docs/harness/architecture.md'), false);
});

test('RED: a throwing runner is caught and answers false, rather than crashing the guard', () => {
  // A guard that dies on a missing binary reports nothing at all, which is worse than
  // reporting too much: the run goes red for a reason that names the wrong thing.
  const oracle = makeIgnoreOracle(() => { throw new Error('git: command not found'); });
  assert.equal(oracle('private/glossary.md'), false);
});

test('each distinct path is asked exactly once, however many documents cite it', () => {
  // `private/banned-terms.txt` is cited by six living documents. Six spawns of git per gate
  // run, for one answer that cannot change mid-run, is a cost with nothing behind it.
  const asked = [];
  const oracle = makeIgnoreOracle((ref) => { asked.push(ref); return { status: 0 }; });
  oracle('private/banned-terms.txt');
  oracle('private/banned-terms.txt');
  oracle('reports/mutation/mutation.json');
  assert.deepEqual(asked, ['private/banned-terms.txt', 'reports/mutation/mutation.json']);
});

test('a cached FALSE is remembered too, not re-asked as though it were a miss', () => {
  const asked = [];
  const oracle = makeIgnoreOracle((ref) => { asked.push(ref); return { status: 1 }; });
  assert.equal(oracle('docs/nope.md'), false);
  assert.equal(oracle('docs/nope.md'), false);
  assert.deepEqual(asked, ['docs/nope.md']);
});
