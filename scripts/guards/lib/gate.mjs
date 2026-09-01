// The gate's run loop, extracted so it can be tested without spawning sixteen
// processes (TASK 34).
//
// INC-08's shape, in a new place: `check-trace` failed on 2026-08-19 and gate.mjs
// stopped at the first failure, so the four steps behind it ran exactly zero times
// for five days and nobody could see it. "The gate passes up to the known failure"
// had been reading as "the gate passes". T-09 calls the gate CI parity, and a gate
// that silently verifies nine steps out of sixteen is parity with nothing.
//
// Fail-fast was a choice, not a bug - it makes a broken repository cheap to
// diagnose. So the loud exit stays and only the blindness goes: every step runs,
// every step reports, and the exit code still makes one failure impossible to miss.
//
// TASK 111 adds a SECOND way for a step not to run, and the distinction between the
// two is the whole reason it is a separate verdict rather than another SKIP:
//
//     SKIP   the precondition was absent  ->  nothing verified this, anywhere
//     DEFER  another profile runs it      ->  not verified HERE, and here is where
//
// A DEFER that does not name where the step does run is the same blindness in a new
// costume, so the note carries it and the CLI prints it in the headline.

/** The declared tier vocabulary. A step outside it is a finding, never a default. */
export const TIERS = ['fast', 'deep'];

/**
 * Which tiers each profile runs. Derived from this table everywhere else in the
 * module - a tier added above with no profile that runs it would make every step
 * carrying it permanently deferred, which is why gate-steps.mjs checks the pairing
 * rather than trusting it (P-13).
 */
export const PROFILES = {
  fast: ['fast'],
  full: ['fast', 'deep'],
};

/**
 * The bound a step inherits when it declares none. It is a CHOSEN bound, not a
 * measured one (C-01): five minutes is longer than any fast step has taken on the
 * machines this repository has been run on, and short enough that a hung step fails
 * while someone is still watching. The first CI run with per-step timing is what
 * corrects it.
 */
export const DEFAULT_STEP_TIMEOUT_MS = 5 * 60_000;

/**
 * A step that declares no tier runs in every profile. `validateSteps` requires the
 * declaration on the real STEPS array, so this default is a courtesy to fixtures and
 * never a way for a real step to slip its tier.
 */
export function tierOf(step) {
  return step?.tier ?? 'fast';
}

/**
 * Human-readable, and deliberately not locale-aware: this string lands in a CI log
 * and in a failure note, where "11m04s" is read by a person scanning for the step
 * that ate the budget.
 */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return 'an unknown bound';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m${String(seconds).padStart(2, '0')}s`;
}

/**
 * Sequencing is DERIVED from what a step declares, never assumed of the whole list
 * (P-13). A step that genuinely consumes a predecessor's output says so with
 * `dependsOn`; the rest do not inherit the constraint. TASK 15 is the mechanism's
 * first user: the mutation step declares dependsOn 'guard tests', so one broken
 * guard test reports as one root cause instead of two. The other fifteen steps read
 * the repository independently and declare nothing.
 *
 * @param {{name:string, protects?:string, tier?:string, timeoutMs?:number, dependsOn?:(string|string[]), skipIf?:()=>boolean, skipNote?:string}[]} steps
 * @param {(step:object)=>{code:number, stdout:string, timedOut?:boolean, timeoutMs?:number}} run  runs one step
 * @param {{profile?:string, onStepStart?:Function, onStepEnd?:Function, now?:()=>number}} [opts]
 */
export function runGate(steps, run, opts = {}) {
  const profile = opts.profile ?? 'fast';
  // G-13: machinery that cannot evaluate must not guess. An unknown profile falling
  // back to `fast` would run a subset while reporting whatever the caller asked for,
  // which is a gate that lies about what it verified.
  if (!Object.hasOwn(PROFILES, profile)) {
    throw new Error(
      `unknown gate profile "${profile}" - declared profiles are ${Object.keys(PROFILES).join(', ')}`,
    );
  }
  assertDependenciesResolve(steps);

  const active = new Set(PROFILES[profile]);
  const now = opts.now ?? (() => Date.now());
  const results = [];
  const verdict = new Map();

  for (const [index, step] of steps.entries()) {
    const deferral = deferralFor(step, profile, active);
    if (deferral) {
      // The verdict map records DEFER rather than nothing, so a dependent step is
      // BLOCKED rather than silently waved through in a profile that never ran its
      // predecessor.
      verdict.set(step.name, 'DEFER');
      results.push(deferral);
      continue;
    }

    opts.onStepStart?.({ step, index, total: steps.length, tier: tierOf(step) });
    const startedAt = now();
    const result = evaluate(step, verdict, run);
    result.elapsedMs = now() - startedAt;
    verdict.set(step.name, result.status);
    results.push(result);
    opts.onStepEnd?.({ ...result, index, total: steps.length });
  }

  const failures = results.filter((r) => r.status === 'FAIL' || r.status === 'BLOCKED');
  // A SKIP is a legitimate verdict (`check-site` skipped honestly for weeks before
  // `site/` existed) but it is not a pass either - the step's check did not run, and
  // "nothing failed" is not the same claim as "everything was verified" (TASK 39).
  const incomplete = results.filter((r) => r.status === 'SKIP');
  // A DEFER is neither. It is not incomplete, because the profile it belongs to runs
  // it and the note says which; folding it into `incomplete` would make every fast
  // run exit 2, and CI's own rule - exit 2 accepted only when `confidentiality` is
  // the single skip - would then have to accept arbitrary skips alongside it.
  const deferred = results.filter((r) => r.status === 'DEFER');
  const exitCode = failures.length ? 1 : incomplete.length ? 2 : 0;
  return { results, failures, incomplete, deferred, exitCode, profile };
}

/**
 * `dependsOn` is one predecessor or several - a step downstream of two independent
 * test tiers (the mutation step, in the real gate) needs to name both, or a broken
 * step it does not actually depend on silently reports as its root cause instead
 * of the one it does. Normalized here so the rest of the module reads a plain list.
 */
function dependencies(step) {
  if (!step.dependsOn) return [];
  return Array.isArray(step.dependsOn) ? step.dependsOn : [step.dependsOn];
}

/**
 * DEFER is decided before the precondition is read, deliberately: a step this profile
 * does not run has nothing to say about whether its target exists, and calling
 * `skipIf` would report a precondition the profile was never going to act on.
 */
function deferralFor(step, profile, active) {
  const tier = tierOf(step);
  if (active.has(tier)) return null;
  const runners = Object.keys(PROFILES).filter((p) => PROFILES[p].includes(tier));
  const where = runners.length ? runners.map((p) => `"${p}"`).join(', ') : 'no declared profile';
  return {
    step,
    status: 'DEFER',
    note: `tier "${tier}" does not run in profile "${profile}" - it runs in ${where}`,
  };
}

function evaluate(step, verdict, run) {
  if (step.skipIf?.()) {
    return { step, status: 'SKIP', note: step.skipNote ?? 'precondition absent' };
  }
  const unmet = dependencies(step).filter((dep) => verdict.get(dep) !== 'PASS');
  if (unmet.length) {
    const names = unmet.map((dep) => `"${dep}"`).join(', ');
    return { step, status: 'BLOCKED', note: `depends on ${names}, which did not pass` };
  }
  const { code, stdout, timedOut, timeoutMs } = run(step);
  // Read BEFORE the exit code, and that ordering is the point (INC-18). A killed
  // process's exit status says nothing useful, so a run stopped for exceeding its
  // bound must not be reported as a plain failure of the check it carries. The bound
  // is named, so a reader knows whether to fix the step or the number.
  if (timedOut) {
    const bound = timeoutMs ?? step.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
    return {
      step,
      status: 'FAIL',
      note: `timed out after ${formatDuration(bound)}, its declared bound`,
    };
  }
  if (code !== 0) return { step, status: 'FAIL' };

  const testsRun = countTestsRun(stdout);
  // `null` means the step's own output carries no test-count line at all - a plain
  // guard (check-content, check-terms, ...) is not a test runner and never printed
  // one, so its absence is not evidence of anything and the step is judged on exit
  // code alone, as before. `0` is a positive claim from the runner itself - "tests
  // ran: none" - and that claim survives a zero exit code (TASK 39: `node --test`
  // on a glob matching no files exits 0 with nothing to check).
  if (testsRun === 0) return { step, status: 'FAIL', note: 'ran zero tests' };

  return { step, status: 'PASS' };
}

/**
 * Derives whether a step's command was a test runner and, if so, how many tests it
 * ran - from the runner's own summary line, never from a hardcoded per-step count
 * (P-13). `node:test`'s default reporter and its TAP reporter both print one, as
 * "<marker> tests <N>" where <marker> is "ℹ" (spec/default) or "#" (TAP).
 *
 * TASK 63 widened this to two more runners, whose stdout the pattern above never
 * matched at all - so the 'component tests' (Vitest) and 'e2e smoke' (Playwright)
 * gate steps had NO zero-tests protection, judged on exit code alone. Both additions
 * are derived from the installed tool's own reporter source and a real invocation
 * (spawned the same way gate.mjs spawns them), never guessed:
 *
 * Vitest's summary reporter (`getStateString()`,
 * node_modules/vitest/dist/chunks/utils.BS4fH3nR.js) prints a "Tests" line reading
 * "<breakdown> (<total>)" once at least one test ran - e.g. "Tests  15 passed (15)" -
 * and the literal "no tests" instead when the total collected task count is zero,
 * with no parenthesized count at all. Both confirmed live: the N-passed form against
 * this repository's real component suite, the zero form against a real
 * .component.test.ts file containing no test()/describe() calls.
 *
 * Playwright's summary line (`generateSummaryMessage()`,
 * node_modules/playwright/lib/runner/index.js) prints "<N> passed (<duration>)" only
 * when at least one test actually ran; when every MATCHED test is skipped it prints
 * only "<N> skipped", with no parenthesized duration, at exit 0. Both confirmed live:
 * the N-passed form against this repository's real e2e suite, the zero form against a
 * real spec file whose only test is `test.skip(...)`. (A glob matching zero spec
 * files is a different code path - runner/index.js throws a plain `Error: No tests
 * found` before any summary line is generated, at exit 1 - which the gate's existing
 * exit-code check already catches without this function's help.) The "passed" check
 * runs first so a run that both skipped some tests and passed others is still
 * credited with what it actually verified, rather than read as zero.
 */
function countTestsRun(stdout) {
  const text = stdout ?? '';

  const nodeTest = /^[ℹ#]\s*tests\s+(\d+)\s*$/m.exec(text);
  if (nodeTest) return Number(nodeTest[1]);

  if (/^\s*Tests\s+no tests\s*$/m.test(text)) return 0;
  const vitest = /^\s*Tests\s+\S.*\((\d+)\)\s*$/m.exec(text);
  if (vitest) return Number(vitest[1]);

  const playwrightPassed = /^\s*(\d+)\s+passed(?:\s*\([^)]*\))?\s*$/m.exec(text);
  if (playwrightPassed) return Number(playwrightPassed[1]);
  if (/^\s*\d+\s+skipped\s*$/m.test(text)) return 0;

  return null;
}

/**
 * A dependency naming a step that does not exist, or one that runs later, can never
 * be satisfied - so the loop would either block that step forever or wave it through.
 * Both are silent. Refusing to run at all is the loud, correct answer (G-13).
 */
function assertDependenciesResolve(steps) {
  const seen = new Set();
  for (const step of steps) {
    for (const dep of dependencies(step)) {
      if (!seen.has(dep)) {
        throw new Error(
          `gate step "${step.name}" declares dependsOn: "${dep}", which is not an earlier step`,
        );
      }
    }
    seen.add(step.name);
  }
}

/** The one-line-per-step summary. Kept here so the CLI has no formatting logic of its own. */
export function formatSummary(results) {
  const width = Math.max(...results.map((r) => r.step.name.length));
  return results.map(
    ({ step, status, note, elapsedMs }) =>
      `  ${status.padEnd(7)} ${step.name.padEnd(width)}${
        Number.isFinite(elapsedMs) ? `  ${formatDuration(elapsedMs).padStart(7)}` : ''
      }${note ? `  (${note})` : ''}`,
  );
}

/**
 * The live progress lines, written to stderr WHILE a step runs rather than to the
 * captured stdout printed after it (INC-18). gate.mjs pipes stdout so `countTestsRun`
 * can read a runner's own summary line; the consequence, unnoticed until a real CI
 * run went 89 minutes without printing anything, is that a step in flight is
 * invisible. stderr is inherited, so these are the only two lines a hung run leaves.
 */
export function formatStepStart({ step, index, total, tier }) {
  const bound = step.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;
  return `> [${index + 1}/${total}] ${step.name}  (${tier}, bound ${formatDuration(bound)})`;
}

export function formatStepEnd({ step, status, elapsedMs, note }) {
  return `< [${status}] ${step.name}  ${formatDuration(elapsedMs)}${note ? `  (${note})` : ''}`;
}

/**
 * The deferral block, printed on EVERY outcome rather than only on a pass.
 *
 * It lived in the passing branch of the CLI for about an hour, which was wrong in exactly
 * the environment that matters most: CI always exits INCOMPLETE, because
 * private/banned-terms.txt is gitignored by design and the confidentiality step skips there
 * (H-04). So the one log a reader actually audits would have been the one log that never
 * said which steps this profile did not run. A property that holds on the happy path only
 * is not the property.
 */
export function formatDeferrals(deferred, profile) {
  if (!deferred.length) return [];
  const names = deferred.map((d) => d.step.name).join(', ');
  return [
    '',
    `${deferred.length} step(s) deferred by profile "${profile}": ${names}`,
    '  they run in `node scripts/gate.mjs --profile full` - nightly in CI, on demand, and',
    '  in the local run that closes a work item. Deferred is not verified.',
  ];
}
