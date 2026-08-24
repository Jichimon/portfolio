import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGate } from './gate.mjs';

/** A recording runner: returns the exit code the fixture asked for, and remembers who ran. */
const runnerFor = (codes) => {
  const ran = [];
  const run = (step) => {
    ran.push(step.name);
    return codes[step.name] ?? 0;
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

test('a skipped step declares itself and is never run', () => {
  const { run, ran } = runnerFor({});
  const list = steps('one', 'two');
  list[0].skipIf = () => true;
  list[0].skipNote = 'target does not exist yet';

  const r = runGate(list, run);
  assert.equal(r.results[0].status, 'SKIP');
  assert.equal(r.results[0].note, 'target does not exist yet');
  assert.deepEqual(ran, ['two']);
  assert.equal(r.exitCode, 0);
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
