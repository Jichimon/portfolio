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

/**
 * Sequencing is DERIVED from what a step declares, never assumed of the whole list
 * (P-13). A step that genuinely consumes a predecessor's output says so with
 * `dependsOn`; the rest do not inherit the constraint. TASK 15 is the mechanism's
 * first user: the mutation step declares dependsOn 'guard tests', so one broken
 * guard test reports as one root cause instead of two. The other fifteen steps read
 * the repository independently and declare nothing.
 *
 * @param {{name:string, protects?:string, dependsOn?:(string|string[]), skipIf?:()=>boolean, skipNote?:string}[]} steps
 * @param {(step:object)=>{code:number, stdout:string}} run  runs one step, returns its exit code and captured stdout
 */
export function runGate(steps, run) {
  assertDependenciesResolve(steps);

  const results = [];
  const verdict = new Map();

  for (const step of steps) {
    const result = evaluate(step, verdict, run);
    verdict.set(step.name, result.status);
    results.push(result);
  }

  const failures = results.filter((r) => r.status === 'FAIL' || r.status === 'BLOCKED');
  // A SKIP is a legitimate verdict (`check-site` skipped honestly for weeks before
  // `site/` existed) but it is not a pass either - the step's check did not run, and
  // "nothing failed" is not the same claim as "everything was verified" (TASK 39).
  const incomplete = results.filter((r) => r.status === 'SKIP');
  const exitCode = failures.length ? 1 : incomplete.length ? 2 : 0;
  return { results, failures, incomplete, exitCode };
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

function evaluate(step, verdict, run) {
  if (step.skipIf?.()) {
    return { step, status: 'SKIP', note: step.skipNote ?? 'precondition absent' };
  }
  const unmet = dependencies(step).filter((dep) => verdict.get(dep) !== 'PASS');
  if (unmet.length) {
    const names = unmet.map((dep) => `"${dep}"`).join(', ');
    return { step, status: 'BLOCKED', note: `depends on ${names}, which did not pass` };
  }
  const { code, stdout } = run(step);
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
 */
function countTestsRun(stdout) {
  const match = /^[ℹ#]\s*tests\s+(\d+)\s*$/m.exec(stdout ?? '');
  return match ? Number(match[1]) : null;
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
    ({ step, status, note }) =>
      `  ${status.padEnd(7)} ${step.name.padEnd(width)}${note ? `  (${note})` : ''}`,
  );
}
