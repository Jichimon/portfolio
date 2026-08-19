// INC-08's guard. The incident, in full, because it decides everything below:
//
//   Two workflows filtered on `paths:` for their own directories. A guard added at the
//   repository root ran in CI exactly ZERO times since it was written, and nobody could
//   tell, because the local gate was green.
//
// That is why this file's first assertion is that the workflow carries no path filter at
// all. A gate protecting the repository has to run for every change to the repository, and
// the cost of running it on a doc-only commit is a few seconds — set against a guard that
// silently never fires.
//
// Dependency-free by line inspection rather than a YAML parser: the properties asserted are
// structural and shallow, and a parser would be a dependency added for four regexes (D6).

const FILTERS = ['paths', 'paths-ignore'];

/**
 * @param {string} text  the workflow file
 * @param {{gateCommand:string, minNode?:number}} opts
 */
export function validateWorkflow(text, opts = {}) {
  const findings = [];
  const lines = String(text).split(/\r?\n/);

  if (!text.trim()) {
    return [{ message: 'the workflow file is empty — CI that does not exist cannot be a done-dimension' }];
  }

  for (const f of FILTERS) {
    const hit = lines.findIndex((l) => new RegExp(`^\\s+${f}\\s*:`).test(l));
    if (hit >= 0) {
      findings.push({
        message: `line ${hit + 1}: \`${f}:\` filters which changes run CI. This is INC-08 exactly — a repo-root guard ran zero times for months behind one of these, and the local gate stayed green the whole time`,
      });
    }
  }

  for (const trigger of ['push', 'pull_request']) {
    if (!new RegExp(`^\\s+${trigger}\\s*:`, 'm').test(text)) {
      findings.push({ message: `no \`${trigger}:\` trigger — the gate would not run on ${trigger === 'push' ? 'a direct push' : 'a proposed change'}` });
    }
  }

  if (opts.gateCommand && !text.includes(opts.gateCommand)) {
    findings.push({ message: `the workflow never runs \`${opts.gateCommand}\` — CI parity means the same one command, not a similar set of steps (T-09)` });
  }

  if (opts.minNode) {
    const m = text.match(/node-version:\s*['"]?(\d+)/);
    if (!m) {
      findings.push({ message: `no \`node-version\` pinned — CI would drift onto whatever the runner defaults to, and a failure would read as a guard defect rather than an environment one` });
    } else if (Number(m[1]) < opts.minNode) {
      findings.push({ message: `node-version ${m[1]} is below the ${opts.minNode} the guards require` });
    }
  }

  return findings;
}
