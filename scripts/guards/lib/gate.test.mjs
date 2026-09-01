import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runGate,
  formatSummary,
  formatDuration,
  formatStepStart,
  formatStepEnd,
  formatDeferrals,
  PROFILES,
  TIERS,
} from './gate.mjs';

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

// TASK 63: `countTestsRun` recognized only node:test's own summary shape, so the two
// gate steps that run Vitest ('component tests') and Playwright ('e2e smoke') got no
// zero-tests protection at all - judged on exit code alone, the exact escaped-defect
// shape TASK 39 exists to close. The fixtures below are real captured stdout, obtained
// by spawning each tool the same way gate.mjs does (spawnSync, piped, non-TTY - which
// is why neither carries ANSI colour codes) against this repository's real suites.

test('RED: a step whose stdout is Vitest\'s real zero-tests summary does not report PASS', () => {
  // Captured by running `node node_modules/vitest/vitest.mjs run <file>` (via the same
  // spawnSync shape gate.mjs uses) against a real .component.test.ts file containing
  // zero test()/describe() calls. Vitest treats that as "no test suite found" and its
  // own summary reporter (getStateString() in
  // node_modules/vitest/dist/chunks/utils.BS4fH3nR.js) prints the literal "no tests"
  // on the "Tests" line whenever the total collected task count is zero - the same
  // "total, not pass count" shape node:test's own "tests <N>" line carries.
  const { run } = runnerFor(
    {},
    {
      one:
        '\n RUN  v4.1.11 C:/dev/projects/portfolio/site\n\n' +
        ' \u2771 src/behaviour/x.component.test.ts (0 test)\n\n' +
        ' Test Files  1 failed (1)\n' +
        '      Tests  no tests\n' +
        '   Start at  19:47:46\n' +
        '   Duration  3.21s\n',
    },
  );
  const list = steps('one');

  const r = runGate(list, run);
  assert.notEqual(r.results[0].status, 'PASS');
});

test('Vitest\'s real N-tests-passed summary still passes', () => {
  // Captured the same way, running the unmodified command against this repository's
  // real component-test suite (2 files, 15 tests, all passing).
  const { run } = runnerFor(
    {},
    {
      one:
        '\n RUN  v4.1.11 C:/dev/projects/portfolio/site\n\n\n' +
        ' Test Files  2 passed (2)\n' +
        '      Tests  15 passed (15)\n' +
        '   Start at  19:46:44\n' +
        '   Duration  1.48s\n',
    },
  );
  const list = steps('one');

  const r = runGate(list, run);
  assert.equal(r.results[0].status, 'PASS');
});

test('RED: a step whose stdout is Playwright\'s real zero-tests summary does not report PASS', () => {
  // Playwright's own summary line (generateSummaryMessage() in
  // node_modules/playwright/lib/runner/index.js) prints "<N> passed (<duration>)" only
  // when at least one test actually ran (`if (expected) tokens.push(...)`); when every
  // MATCHED test is skipped it prints only "<N> skipped", with no parenthesized
  // duration, and the process exits 0 - captured by running
  // `node node_modules/@playwright/test/cli.js test --project=chromium <file>` (via
  // the same spawnSync shape gate.mjs uses) against a real spec file whose only test is
  // `test.skip(...)`. A glob matching zero spec files is a DIFFERENT code path
  // (runner/index.js throws a plain `Error: No tests found` before any summary is
  // generated, at exit 1) that the gate's existing exit-code check already catches
  // without this function's help - confirmed by running that case too and reading
  // runner/index.js's `throw new Error('No tests found')` site.
  const { run } = runnerFor(
    {},
    {
      one:
        '\nRunning 1 test using 1 worker\n\n' +
        '  -  1 [chromium] \u203a x.smoke.spec.ts:3:6 \u203a never runs\n\n' +
        '  1 skipped\n',
    },
  );
  const list = steps('one');

  const r = runGate(list, run);
  assert.notEqual(r.results[0].status, 'PASS');
});

test('Playwright\'s real N-tests-passed summary still passes', () => {
  // Captured the same way, running the unmodified command (chromium project only)
  // against this repository's real e2e suite: 171 tests, all passing.
  const { run } = runnerFor(
    {},
    {
      one: '\n  ok 1 [chromium] \u203a x.smoke.spec.ts:1:1 \u203a name\n\n  171 passed (2.6m)\n',
    },
  );
  const list = steps('one');

  const r = runGate(list, run);
  assert.equal(r.results[0].status, 'PASS');
});

test('the widened regex still leaves plain guard output unrecognized', () => {
  // Confirms the existing "no test-count line at all" case is unaffected: a plain
  // guard's PASS-shaped prose contains neither runner's summary shape, so it must
  // still be judged on exit code alone rather than accidentally matching one.
  const { run } = runnerFor({}, { one: 'PASS  check-content  no violations found\n' });
  const list = steps('one');

  const r = runGate(list, run);
  assert.equal(r.results[0].status, 'PASS');
});

// ---------------------------------------------------------------------------
// TASK 110 - a step that hangs must fail naming its bound, not eat the budget.
// INC-18: three GitHub runs were cancelled at their job timeout (once at the
// 6-hour default) because `e2e smoke` blocked forever in globalSetup. The job
// died having verified nothing and printed nothing. A bound per step is what
// turns that into a named failure while someone is still watching.
// ---------------------------------------------------------------------------

/** A runner that reports one named step as having exceeded its bound. */
const timingOutRunner = (name, timeoutMs) => {
  const ran = [];
  const run = (step) => {
    ran.push(step.name);
    return step.name === name
      ? { code: 0, stdout: '', timedOut: true, timeoutMs }
      : { code: 0, stdout: '' };
  };
  return { run, ran };
};

test('RED: a step that exceeds its declared time bound fails, naming the bound', () => {
  const { run } = timingOutRunner('two', 900_000);
  const r = runGate(steps('one', 'two', 'three'), run);

  assert.equal(r.results[1].status, 'FAIL');
  assert.match(r.results[1].note, /timed out after 15m00s/);
  assert.equal(r.exitCode, 1);
});

test('RED: a timed-out step fails even though the killed process exited 0', () => {
  // The precedence is the whole point: a killed process's exit status says nothing,
  // and reading the code first would report the hung step as a PASS.
  const { run } = timingOutRunner('one', 60_000);
  const r = runGate(steps('one'), run);

  assert.equal(r.results[0].status, 'FAIL');
  assert.match(r.results[0].note, /timed out/);
});

test('RED: a timed-out step with no bound in the result falls back to the step, then to the default', () => {
  const fromStep = () => ({ code: 0, stdout: '', timedOut: true });
  const list = steps('one');
  list[0].timeoutMs = 120_000;
  assert.match(runGate(list, fromStep).results[0].note, /2m00s/);

  const bare = steps('two');
  assert.match(runGate(bare, fromStep).results[0].note, /5m00s/);
});

test('a step that does not time out is unaffected by the mechanism', () => {
  const { run } = timingOutRunner('nobody', 1000);
  const r = runGate(steps('one', 'two'), run);
  assert.deepEqual(r.results.map((x) => x.status), ['PASS', 'PASS']);
});

test('every step result carries how long it took', () => {
  // The summary prints it, and a CI log is the only place the per-step cost of a run
  // has ever been readable (TASK 107 asked for this and did not get it).
  let clock = 0;
  const run = () => { clock += 250; return { code: 0, stdout: '' }; };
  const r = runGate(steps('one', 'two'), run, { now: () => clock });

  assert.deepEqual(r.results.map((x) => x.elapsedMs), [250, 250]);
});

// ---------------------------------------------------------------------------
// TASK 111 - profiles. A step the profile does not run is DEFER, never SKIP.
// ---------------------------------------------------------------------------

const tiered = (spec) =>
  Object.entries(spec).map(([name, tier]) => ({ name, tier, protects: `${name} holds` }));

test('RED: a deep step is DEFERRED in the fast profile, and never runs', () => {
  const { run, ran } = runnerFor({});
  const r = runGate(tiered({ one: 'fast', two: 'deep' }), run, { profile: 'fast' });

  assert.equal(r.results[1].status, 'DEFER');
  assert.deepEqual(ran, ['one']);
});

test('RED: a DEFER is not a SKIP - it never makes the gate incomplete', () => {
  // Folding the two together would exit 2 on every fast run, and CI accepts exit 2
  // only when `confidentiality` is the single skip - so an arbitrary skip would then
  // have to be accepted alongside it. That is INC-08's shape arriving through a
  // verdict name.
  const { run } = runnerFor({});
  const r = runGate(tiered({ one: 'fast', two: 'deep' }), run, { profile: 'fast' });

  assert.deepEqual(r.incomplete, []);
  assert.deepEqual(r.failures, []);
  assert.deepEqual(r.deferred.map((x) => x.step.name), ['two']);
  assert.equal(r.exitCode, 0);
});

test('RED: a deferral names the profile that DOES run the step', () => {
  // A deferral that does not say where the step runs is the same blindness in a new
  // costume - the reader cannot tell "runs nightly" from "runs nowhere".
  const { run } = runnerFor({});
  const r = runGate(tiered({ one: 'deep' }), run, { profile: 'fast' });

  assert.match(r.results[0].note, /deep/);
  assert.match(r.results[0].note, /"full"/);
});

test('the full profile runs every tier', () => {
  const { run, ran } = runnerFor({});
  const r = runGate(tiered({ one: 'fast', two: 'deep' }), run, { profile: 'full' });

  assert.deepEqual(ran, ['one', 'two']);
  assert.deepEqual(r.results.map((x) => x.status), ['PASS', 'PASS']);
  assert.deepEqual(r.deferred, []);
});

test('a step declaring no tier runs in every profile', () => {
  const { run, ran } = runnerFor({});
  runGate(steps('one'), run, { profile: 'fast' });
  runGate(steps('one'), run, { profile: 'full' });
  assert.deepEqual(ran, ['one', 'one']);
});

test('RED: an unknown profile throws rather than quietly running a subset', () => {
  // G-13: a gate that cannot evaluate its own selector must not guess one. Falling
  // back to `fast` would verify less than the caller asked for and still say PASSED.
  const { run } = runnerFor({});
  assert.throws(() => runGate(steps('one'), run, { profile: 'nightly' }), /nightly/);
});

test('RED: a step depending on a DEFERRED step is BLOCKED, not passed', () => {
  // Nothing in the real gate does this today, and gate-steps.mjs reports it as a
  // finding before it can. This is what happens if one ever slips through: the
  // dependent is blocked, never waved through on a predecessor that did not run.
  const { run } = runnerFor({});
  const list = tiered({ one: 'deep', two: 'fast' });
  list[1].dependsOn = 'one';

  const r = runGate(list, run, { profile: 'fast' });
  assert.equal(r.results[1].status, 'BLOCKED');
});

test('the default profile is fast - the bare command is the cheap one', () => {
  const { run, ran } = runnerFor({});
  const r = runGate(tiered({ one: 'fast', two: 'deep' }), run);

  assert.equal(r.profile, 'fast');
  assert.deepEqual(ran, ['one']);
});

test('LIVENESS: every declared tier is run by at least one declared profile', () => {
  // Derived from the two tables rather than asserted about today's contents (P-13):
  // a tier added with no profile that runs it would make every step carrying it
  // permanently deferred, which reads as coverage and is not.
  for (const tier of TIERS) {
    assert.ok(
      Object.values(PROFILES).some((tiers) => tiers.includes(tier)),
      `tier "${tier}" is run by no declared profile`,
    );
  }
});

test('a deferred step never has its precondition read', () => {
  // Calling skipIf on a step this profile was never going to run reports a
  // precondition nobody acted on, and on the real gate those predicates touch disk.
  let asked = false;
  const { run } = runnerFor({});
  const list = tiered({ one: 'deep' });
  list[0].skipIf = () => { asked = true; return true; };
  list[0].skipNote = 'not this profile';

  const r = runGate(list, run, { profile: 'fast' });
  assert.equal(r.results[0].status, 'DEFER');
  assert.equal(asked, false);
});

// ---------------------------------------------------------------------------
// Formatting - the only place a human reads any of the above.
// ---------------------------------------------------------------------------

test('formatDuration reads as a duration at every magnitude', () => {
  assert.equal(formatDuration(0), '0ms');
  assert.equal(formatDuration(450), '450ms');
  assert.equal(formatDuration(12_400), '12.4s');
  assert.equal(formatDuration(60_000), '1m00s');
  assert.equal(formatDuration(664_000), '11m04s');
  assert.equal(formatDuration(90 * 60_000), '90m00s');
});

test('RED: formatDuration refuses to invent a number it does not have', () => {
  assert.equal(formatDuration(undefined), 'an unknown bound');
  assert.equal(formatDuration(NaN), 'an unknown bound');
  assert.equal(formatDuration(-1), 'an unknown bound');
});

test('the summary carries the verdict, the name, the time and the note', () => {
  const { run } = runnerFor({});
  let t = 0;
  const r = runGate(tiered({ one: 'fast', two: 'deep' }), run, {
    profile: 'fast',
    now: () => (t += 1500),
  });
  const lines = formatSummary(r.results);

  assert.match(lines[0], /PASS\s+one/);
  assert.match(lines[0], /1\.5s/);
  assert.match(lines[1], /DEFER\s+two/);
  assert.match(lines[1], /full/);
});

test('RED: the progress lines name the step, its tier and its bound before it runs', () => {
  // INC-18: stdout is captured and printed after a step finishes, so a step in
  // flight left no trace at all. These two lines go to stderr, which is inherited.
  const step = { name: 'e2e smoke', protects: 'x', tier: 'fast', timeoutMs: 900_000 };
  const start = formatStepStart({ step, index: 4, total: 21, tier: 'fast' });

  assert.match(start, /\[5\/21\]/);
  assert.match(start, /e2e smoke/);
  assert.match(start, /fast/);
  assert.match(start, /15m00s/);
});

test('the closing progress line carries the verdict and the real elapsed time', () => {
  const step = { name: 'mutation', protects: 'x', tier: 'deep' };
  const end = formatStepEnd({ step, status: 'PASS', elapsedMs: 664_000 });

  assert.match(end, /PASS/);
  assert.match(end, /mutation/);
  assert.match(end, /11m04s/);
});

test('a step with no bound of its own reports the default in its progress line', () => {
  const step = { name: 'content', protects: 'x', tier: 'fast' };
  assert.match(formatStepStart({ step, index: 0, total: 1, tier: 'fast' }), /5m00s/);
});

test('RED: the deferral block names the steps and the profile that runs them', () => {
  const { run } = runnerFor({});
  const r = runGate(tiered({ one: 'fast', two: 'deep', three: 'deep' }), run, { profile: 'fast' });
  const lines = formatDeferrals(r.deferred, r.profile).join('\n');

  assert.match(lines, /2 step\(s\) deferred/);
  assert.match(lines, /two, three/);
  assert.match(lines, /"fast"/);
  assert.match(lines, /--profile full/);
});

test('a run with nothing deferred prints no deferral block at all', () => {
  const { run } = runnerFor({});
  const r = runGate(tiered({ one: 'fast' }), run, { profile: 'full' });
  assert.deepEqual(formatDeferrals(r.deferred, r.profile), []);
});

test('RED: the deferral block is built from the run, so it is printable on ANY outcome', () => {
  // It sat in the CLI's passing branch for an hour, which is wrong in exactly the place
  // that matters: CI always exits INCOMPLETE, because private/banned-terms.txt is
  // gitignored by design and the confidentiality step skips there. The one log anybody
  // audits would have been the one log that never said what this profile skipped. Proven
  // here by asking for the block on a run that FAILED and on one that is INCOMPLETE.
  const failing = runnerFor({ one: 1 }).run;
  const failed = runGate(tiered({ one: 'fast', two: 'deep' }), failing, { profile: 'fast' });
  assert.equal(failed.exitCode, 1);
  assert.match(formatDeferrals(failed.deferred, failed.profile).join('\n'), /two/);

  const list = tiered({ one: 'fast', two: 'deep' });
  list[0].skipIf = () => true;
  list[0].skipNote = 'precondition absent';
  const incomplete = runGate(list, runnerFor({}).run, { profile: 'fast' });
  assert.equal(incomplete.exitCode, 2);
  assert.match(formatDeferrals(incomplete.deferred, incomplete.profile).join('\n'), /two/);
});
