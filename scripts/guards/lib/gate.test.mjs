import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGate } from './gate.mjs';

/**
 * A recording runner: returns the `{ code, stdout }` the fixture asked for, and
 * remembers who ran. `outputs` is optional and defaults every step to no stdout,
 * matching a plain guard command that prints nothing a liveness check would parse.
 */
const runnerFor = (codes, outputs = {}) => {
  const ran = [];
  const run = (step) => {
    ran.push(step.name);
    return { code: codes[step.name] ?? 0, stdout: outputs[step.name] ?? '' };
  };
  return { run, ran };
};

const steps = (...names) => names.map((name) => ({ name, protects: `${name} holds` }));

test('RED: a failure in an early step does not stop a later step running', () => {
  // TASK 34's whole finding. gate.mjs used to `break` here, so a long-lived failure
  // at step 9 meant steps 10-13 ran exactly zero times, invisibly.
  const { run, ran } = runnerFor({ two: 1 });
  const r = runGate(steps('one', 'two', 'three', 'four'), run);

  assert.deepEqual(ran, ['one', 'two', 'three', 'four']);
  assert.deepEqual(
    r.results.map((x) => x.status),
    ['PASS', 'FAIL', 'PASS', 'PASS'],
  );
});

test('RED: every step gets a reported verdict, not just the ones before the failure', () => {
  const { run } = runnerFor({ two: 1 });
  const r = runGate(steps('one', 'two', 'three', 'four'), run);

  assert.equal(r.results.length, 4);
  for (const name of ['one', 'two', 'three', 'four']) {
    assert.ok(
      r.results.some((x) => x.step.name === name),
      `${name} has no verdict`,
    );
  }
});

test('RED: more than one failure is reported, not only the first', () => {
  // Reporting everything is not the same as burying the failure - but reporting
  // only the first is how the second one stays invisible for another month.
  const { run } = runnerFor({ two: 1, four: 3 });
  const r = runGate(steps('one', 'two', 'three', 'four'), run);

  assert.deepEqual(
    r.failures.map((x) => x.step.name),
    ['two', 'four'],
  );
});

test('a single failure still exits non-zero', () => {
  const { run } = runnerFor({ three: 1 });
  assert.equal(runGate(steps('one', 'two', 'three'), run).exitCode, 1);
});

test('an all-green run exits zero', () => {
  const { run } = runnerFor({});
  assert.equal(runGate(steps('one', 'two'), run).exitCode, 0);
});

test('RED: a skipped step declares itself, is never run, and leaves the gate incomplete rather than passed', () => {
  // TASK 39: a SKIP is a legitimate verdict, not a failure - but it is also not
  // a pass. Nothing failed here, so exitCode 1 would be wrong; exitCode 0 is the
  // exact bug this item exists to close, because it prints "GATE PASSED" over a
  // step that never ran.
  const { run, ran } = runnerFor({});
  const list = steps('one', 'two');
  list[0].skipIf = () => true;
  list[0].skipNote = 'target does not exist yet';

  const r = runGate(list, run);
  assert.equal(r.results[0].status, 'SKIP');
  assert.equal(r.results[0].note, 'target does not exist yet');
  assert.deepEqual(ran, ['two']);
  assert.deepEqual(r.incomplete.map((x) => x.step.name), ['one']);
  assert.equal(r.exitCode, 2);
});

test('a skip is not a pass: it never enters the failure list, and never hides one', () => {
  const { run } = runnerFor({ two: 1 });
  const list = steps('one', 'two');
  list[0].skipIf = () => true;

  const r = runGate(list, run);
  assert.deepEqual(r.failures.map((x) => x.step.name), ['two']);
  assert.equal(r.exitCode, 1);
});

test('RED: a step declaring a dependency on a FAILED step is BLOCKED, not run', () => {
  // P-13: sequencing is derived from what a step declares, never assumed of the
  // whole list. No step declares one today; the mechanism exists so that the first
  // one that does is handled rather than silently mis-ordered.
  const { run, ran } = runnerFor({ one: 1 });
  const list = steps('one', 'two', 'three');
  list[1].dependsOn = 'one';

  const r = runGate(list, run);
  assert.equal(r.results[1].status, 'BLOCKED');
  assert.match(r.results[1].note, /one/);
  assert.deepEqual(ran, ['one', 'three']);
});

test('a dependent step runs normally when its predecessor passed', () => {
  const { run, ran } = runnerFor({});
  const list = steps('one', 'two');
  list[1].dependsOn = 'one';

  const r = runGate(list, run);
  assert.equal(r.results[1].status, 'PASS');
  assert.deepEqual(ran, ['one', 'two']);
});

test('a BLOCKED step counts as a failure - an unrun guard is not a passing guard', () => {
  const { run } = runnerFor({ one: 1 });
  const list = steps('one', 'two');
  list[1].dependsOn = 'one';

  const r = runGate(list, run);
  assert.deepEqual(r.failures.map((x) => x.step.name), ['one', 'two']);
  assert.equal(r.exitCode, 1);
});

test('RED: a dependency on a step that does not exist throws rather than passing', () => {
  // G-13's shape: machinery that cannot evaluate must not quietly wave the step through.
  const { run } = runnerFor({});
  const list = steps('one', 'two');
  list[1].dependsOn = 'nope';

  assert.throws(() => runGate(list, run), /nope/);
});

test('RED: a dependency on a LATER step throws - it can never have a verdict yet', () => {
  const { run } = runnerFor({});
  const list = steps('one', 'two');
  list[0].dependsOn = 'two';

  assert.throws(() => runGate(list, run), /two/);
});

test('RED: dependsOn accepts several predecessors and runs when they all pass', () => {
  // TASK 39: the gate now has two test steps, and a step downstream of both (the
  // mutation step, in the real gate) needs to name both rather than picking one.
  const { run, ran } = runnerFor({});
  const list = steps('one', 'two', 'three');
  list[2].dependsOn = ['one', 'two'];

  const r = runGate(list, run);
  assert.equal(r.results[2].status, 'PASS');
  assert.deepEqual(ran, ['one', 'two', 'three']);
});

test('RED: dependsOn with several predecessors is BLOCKED when any one of them did not pass', () => {
  const { run, ran } = runnerFor({ two: 1 });
  const list = steps('one', 'two', 'three');
  list[2].dependsOn = ['one', 'two'];

  const r = runGate(list, run);
  assert.equal(r.results[2].status, 'BLOCKED');
  assert.match(r.results[2].note, /two/);
  assert.deepEqual(ran, ['one', 'two']);
});

test('RED: several predecessors still throws when one of them does not exist', () => {
  const { run } = runnerFor({});
  const list = steps('one', 'two');
  list[1].dependsOn = ['one', 'nope'];

  assert.throws(() => runGate(list, run), /nope/);
});

test('RED: several predecessors still throws when one of them is a LATER step', () => {
  const { run } = runnerFor({});
  const list = steps('one', 'two', 'three');
  list[0].dependsOn = ['two', 'three'];

  assert.throws(() => runGate(list, run), /two/);
});

test('RED: a step whose command exits 0 but ran zero tests does not report PASS', () => {
  // TASK 39: `node --test` on a glob that matches nothing still exits 0. The gate
  // used to read only the exit code, so a renamed or deleted test file silently
  // kept the step green while the check it carried vanished. Derived from the
  // runner's own summary line - node:test's default and TAP reporters both print
  // it - never from a hardcoded per-step count (P-13).
  const { run } = runnerFor({}, { one: 'ℹ tests 0\nℹ pass 0\nℹ fail 0\n' });
  const list = steps('one');

  const r = runGate(list, run);
  assert.notEqual(r.results[0].status, 'PASS');
});

test('a step whose command exits 0 and ran at least one test still passes', () => {
  const { run } = runnerFor({}, { one: 'ℹ tests 3\nℹ pass 3\nℹ fail 0\n' });
  const list = steps('one');

  const r = runGate(list, run);
  assert.equal(r.results[0].status, 'PASS');
});

test('a step whose output carries no test-count line at all is judged on exit code alone', () => {
  // A plain guard (check-content, check-terms, ...) is not a test runner and prints
  // no test-count summary - the absence of the line is not the same claim as "ran
  // zero tests", so it must not be penalized for a property it never had.
  const { run } = runnerFor({}, { one: 'no findings\n' });
  const list = steps('one');

  const r = runGate(list, run);
  assert.equal(r.results[0].status, 'PASS');
});

test('the TAP-reporter form of the same summary line is recognized too', () => {
  const { run } = runnerFor({}, { one: '1..1\n# tests 0\n# pass 0\n# fail 0\n' });
  const list = steps('one');

  const r = runGate(list, run);
  assert.notEqual(r.results[0].status, 'PASS');
});
