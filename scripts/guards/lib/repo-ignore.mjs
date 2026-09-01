// A path the repository DELIBERATELY excludes is not a path a checkout can verify.
//
// TASK 112, and the reason it exists is that CI reached these two guards for the first time
// on 2026-09-01. Until then the gate hung at step 5 (INC-18) and steps 16 and 18 had never
// run on a runner at all. When they finally did, they reported twelve findings, every one of
// them the same shape: a living document citing `private/glossary.md`, `private/banned-terms.txt`,
// `reports/mutation/mutation.json` or `resources/site/intake.md` — four files that exist on
// the author's machine, are gitignored on purpose, and can never reach a runner.
//
// Those citations are correct and must stay. `H-04`'s own rule row names `private/glossary.md`;
// deleting the reference to make a checker happy would be the tail wagging the dog. What was
// wrong is the guard's question. "Does this file exist?" is a question about a machine. The
// question a checkout can answer is "does the repository claim to contain this?" — and for a
// path git deliberately ignores, the answer is no, on every machine, by design.
//
// So a missing reference is still a finding, EXCEPT when git itself says the repository
// excludes it, in which case it is reported by name as a machine-local reference and does not
// fail the gate. Derived from git, never from a list of paths (P-13): the day somebody adds a
// new ignored directory, this keeps working with no edit here.
//
// THE RESIDUAL, STATED RATHER THAN ENGINEERED AROUND (P-19). A *typo* inside an ignored path
// — `private/glossry.md` — is excused by this rule too, on every machine, because it is
// indistinguishable from a real machine-local citation without asking a human which files
// that directory is supposed to hold. The mitigation is that every excused reference is
// PRINTED BY NAME on every gate run, so a wrong one is visible to anyone reading the output,
// rather than silently dropped. A stricter version was designed and declined: it would parse
// `git check-ignore -v`'s matched pattern and demand the ignored directory be absent before
// excusing anything under it, which buys strictness for one narrow case at the cost of a
// pattern parser nobody asked for.

/**
 * `git check-ignore -q <path>` exits 0 when the path is ignored, 1 when it is not, and
 * something else (128, or no status at all when the spawn itself failed) when git could not
 * answer. Only a literal 0 means ignored.
 *
 * G-13: a guard that cannot evaluate must not wave anything through. An unreadable answer is
 * read as "not ignored", so the reference stays a hard finding and a broken git is loud
 * rather than silently permissive.
 *
 * @param {{status:number|null}|null|undefined} result  a spawnSync-shaped result
 */
export function readsAsIgnored(result) {
  return result?.status === 0;
}

/**
 * Builds the predicate the two guards take, from an injected runner. The runner is injected
 * rather than imported so this module stays pure and its battery needs no git, no fixture
 * repository and no temp directory.
 *
 * @param {(ref:string)=>{status:number|null}} runCheckIgnore
 * @returns {(ref:string)=>boolean}
 */
export function makeIgnoreOracle(runCheckIgnore) {
  const answers = new Map();
  return (ref) => {
    if (answers.has(ref)) return answers.get(ref);
    let verdict = false;
    try {
      verdict = readsAsIgnored(runCheckIgnore(ref));
    } catch {
      // Same fail-closed reasoning as readsAsIgnored: a thrown spawn is an unanswered
      // question, and an unanswered question does not excuse a missing file.
      verdict = false;
    }
    answers.set(ref, verdict);
    return verdict;
  };
}
