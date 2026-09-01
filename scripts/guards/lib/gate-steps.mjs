// TASK 63's validator: derives structural findings from ANY steps array handed to it, never
// from a hardcoded roster of step names (P-13) — a step named "mutation" gets no special-cased
// logic, and the same rules apply uniformly to whatever the array actually contains. This is
// what makes it possible to check gate.mjs's real STEPS array once every step carries a real
// `redProof`, without this module knowing the twenty names in advance.
//
// What each step must carry to be trusted, and why each is a structural property rather than
// a judgment call:
//
//   protects    a sentence naming the guarantee, so a failure reads as a broken guarantee
//               rather than a broken command (T-09's own convention, already followed by
//               every step in gate.mjs)
//   redProof    { file, test } naming the real test that demonstrates this step fails on a
//               planted defect of its own kind — EVAL-001's largest finding was eight steps
//               that reported PASS while verifying nothing, and this is the mechanism that
//               makes that checkable, mirroring how evals.mjs already checks eval-case proofs
//   skipIf      never silent: a step that can skip must also carry skipNote, or an undeclared
//               skip is the exact silent-pass shape this item exists to close
//   cwd, cmd    resolved paths, checked to exist — gate.mjs's own comments describe a drifted
//               or renamed binary path silently turning into an ENOENT read as a plain FAIL
//               (the npx `.cmd`-shim substitution), and this is the structural check that
//               catches the *class* of mistake ahead of time
//
// A malformed step is reported as a finding, never thrown (G-13) — a validator that crashes
// on bad input is not a boundary.

import { TIERS, PROFILES, tierOf } from './gate.mjs';

/** Matches either path separator, so a resolved path is recognized on POSIX and Windows alike. */
const PATH_SEP = /[\\/]/;

/**
 * @param {object[]} steps        the gate's STEPS array, or any array shaped like it
 * @param {{exists:(p:string)=>boolean, read:(p:string)=>string}} io   injected, so this stays pure
 * @returns {{file:string, message:string, info?:true}[]}
 *   `info: true` marks a currently-skipped step reported for visibility, not a defect — a
 *   caller that wants only hard findings can filter on its absence.
 */
export function validateSteps(steps, io) {
  const findings = [];
  const at = (label, message) => findings.push({ file: label, message });
  const note = (label, message) => findings.push({ file: label, message, info: true });

  for (const [index, step] of steps.entries()) {
    if (!step || typeof step !== 'object') {
      at(`step ${index}`, 'is not a step object and cannot be validated');
      continue;
    }
    const label = typeof step.name === 'string' && step.name.trim() ? step.name : `step ${index}`;

    if (typeof step.protects !== 'string' || !step.protects.trim()) {
      at(label, 'protects is missing or empty — a failure here would read as a broken command, not a broken guarantee');
    }

    // TASK 111. A step with no tier would run in every profile, which is the SAFE
    // default and exactly why it must still be declared: the reader of a 22-step array
    // cannot tell "deliberately runs everywhere" from "nobody thought about it", and the
    // second one is how a step lands in the per-push path by accident. An unknown tier is
    // a finding rather than a fallback — it would defer the step in every profile, which
    // reads as coverage and is not.
    if (step.tier !== undefined && !TIERS.includes(step.tier)) {
      at(label, `tier "${step.tier}" is not one of the declared tiers (${TIERS.join(', ')}) — no profile runs it, so the step would be deferred everywhere and verify nothing`);
    } else if (step.tier === undefined) {
      at(label, `no tier declared — every step says which profiles run it, so a step in the per-push path is there on purpose (declared tiers: ${TIERS.join(', ')})`);
    }

    // TASK 110. The bound is optional (the default applies), but a malformed one is not a
    // small mistake: spawnSync silently ignores a non-numeric `timeout`, so a step meant
    // to be bounded would run unbounded while its declaration claimed otherwise — the
    // shape of every guard in this repository that passed forever while checking nothing.
    if (step.timeoutMs !== undefined && !(typeof step.timeoutMs === 'number' && Number.isFinite(step.timeoutMs) && step.timeoutMs > 0)) {
      at(label, `timeoutMs must be a positive, finite number of milliseconds, got ${JSON.stringify(step.timeoutMs)} — spawnSync ignores anything else and the step would run unbounded`);
    }

    validateRedProof(step, label, io, at);

    if (typeof step.skipIf === 'function') {
      if (typeof step.skipNote !== 'string' || !step.skipNote.trim()) {
        at(label, 'skipIf is declared with no skipNote — an undeclared skip is the exact silent-pass shape this check exists to close');
      }
      if (step.skipIf()) {
        note(label, `this step is presently skipped${step.skipNote ? ` (${step.skipNote})` : ''}`);
      }
    }

    if (step.cwd !== undefined && !(typeof step.cwd === 'string' && io.exists(step.cwd))) {
      at(label, `cwd does not exist: ${step.cwd}`);
    }

    if (Array.isArray(step.cmd)) {
      for (const entry of step.cmd) {
        if (typeof entry !== 'string') continue;
        // A bare command name like 'node' has no path separator and is not a resolved path.
        // A glob ('scripts/guards/**/*.test.mjs') is not a resolved path either — it is
        // handed to the runner itself to expand, and existsSync on a glob string is always
        // false regardless of how many real files it matches, which would flag every
        // test-runner step's own glob as a "missing" binary.
        if (entry.endsWith('.mjs') && PATH_SEP.test(entry) && !entry.includes('*') && !io.exists(entry)) {
          at(label, `cmd names a path that does not exist: ${entry}`);
        }
      }
    }
  }

  findings.push(...crossTierDependencies(steps));

  return findings;
}

/**
 * A step can only depend on one that runs whenever it does. A `fast` step naming a
 * `deep` predecessor is BLOCKED in every fast run — permanently, invisibly, and for a
 * reason nobody reading the step would guess. Derived from the profile table rather
 * than from a list of known-bad pairs (P-13): whether a tier's steps run in a given
 * profile is exactly what PROFILES says.
 */
function crossTierDependencies(steps) {
  const tierByName = new Map(steps.map((s) => [s?.name, tierOf(s)]));
  const profilesRunning = (tier) => Object.keys(PROFILES).filter((p) => PROFILES[p].includes(tier));
  const findings = [];

  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const deps = step.dependsOn === undefined ? [] : [].concat(step.dependsOn);
    for (const dep of deps) {
      if (!tierByName.has(dep)) continue; // the resolve check already owns this case
      const mine = profilesRunning(tierOf(step));
      const theirs = new Set(profilesRunning(tierByName.get(dep)));
      const orphaned = mine.filter((p) => !theirs.has(p));
      if (orphaned.length) {
        findings.push({
          file: step.name ?? 'step',
          message: `depends on "${dep}", which its own profile(s) ${orphaned.map((p) => `"${p}"`).join(', ')} do not run — the step would be BLOCKED there every time, silently`,
        });
      }
    }
  }
  return findings;
}

/** Split out so the main loop reads as one property per line. */
function validateRedProof(step, label, io, at) {
  const proof = step.redProof;
  const shaped = proof && typeof proof === 'object' &&
    typeof proof.file === 'string' && typeof proof.test === 'string';

  if (!shaped) {
    at(label, 'redProof is missing or malformed — expected { file, test } naming the real proof that this step fails on a planted defect of its own kind');
    return;
  }
  if (!io.exists(proof.file)) {
    at(label, `redProof file does not exist: ${proof.file}`);
    return;
  }
  if (!io.read(proof.file).includes(proof.test)) {
    // Existence alone passes forever against a renamed test — evals.mjs's own reasoning for
    // the equivalent check on eval-case proofs, mirrored here for gate-step proofs.
    at(label, `proof file ${proof.file} contains no test named "${proof.test}" — the demonstration this step claims does not run`);
  }
}
