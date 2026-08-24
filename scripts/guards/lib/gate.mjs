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
 * @param {{name:string, protects?:string, dependsOn?:string, skipIf?:()=>boolean, skipNote?:string}[]} steps
 * @param {(step:object)=>number} run  runs one step, returns its exit code
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
  return { results, failures, exitCode: failures.length ? 1 : 0 };
}

function evaluate(step, verdict, run) {
  if (step.skipIf?.()) {
    return { step, status: 'SKIP', note: step.skipNote ?? 'precondition absent' };
  }
  if (step.dependsOn && verdict.get(step.dependsOn) !== 'PASS') {
    return { step, status: 'BLOCKED', note: `depends on "${step.dependsOn}", which did not pass` };
  }
  return { step, status: run(step) === 0 ? 'PASS' : 'FAIL' };
}

/**
 * A dependency naming a step that does not exist, or one that runs later, can never
 * be satisfied - so the loop would either block that step forever or wave it through.
 * Both are silent. Refusing to run at all is the loud, correct answer (G-13).
 */
function assertDependenciesResolve(steps) {
  const seen = new Set();
  for (const step of steps) {
    if (step.dependsOn && !seen.has(step.dependsOn)) {
      throw new Error(
        `gate step "${step.name}" declares dependsOn: "${step.dependsOn}", which is not an earlier step`,
      );
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
