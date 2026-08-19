// P-07's missing half: a living document that points at a file which does not exist.
//
// The finding that produced this guard: `docs/harness/architecture.md` cited `procedures.md`
// and `metrics.md` **thirteen times**, and neither had ever been written. They were
// destinations in a matrix — *this element lands there* — and the build put the content in
// the skills and the eval template instead, without the matrix ever being reconciled.
//
// Roles' bootstrap paths are checked by `check-agents`; templates' `instances:` by
// `check-templates`. Architecture prose was checked by nobody, which is precisely why it
// was the thing that drifted.
//
// The design constraint is the interesting part. A first hand-run sweep produced seven hits
// of which three were prose — `home.en/es.md` is a way of writing two filenames, not a path.
// A guard that demands files nobody promised gets switched off, so it distinguishes a path
// CLAIM from a naming convention, and keeps a reasoned ignore list for the residue.

const LINK = /\[[^\]]*\]\(([^)]+)\)/g;
const TICK = /`([^`\s]+)`/g;
const EXTENSIONS = /\.(md|mjs|json|ya?ml|sh|txt|js|ts)$/;

/** Anything that marks a reference as a shape rather than a file. */
const PLACEHOLDER = /[<>{}*|]|\bNN\b|0NN|NNN|YYYY|MM-DD|\bslug\b|TASK-N\b|\bN\b|\.\.\./;

/**
 * Path claims in one document.
 *
 * A claim is a markdown link, or a backticked token that looks like a path: it carries a
 * known extension and no placeholder. `H-01`, `status` and `passed` are backticked all over
 * the registry and are not claims; `EC-0NN.yaml` is a shape, not a promise.
 */
export function extractRefs(text) {
  const out = new Set();

  for (const m of String(text).matchAll(LINK)) {
    const raw = m[1].split('#')[0].trim();
    if (!raw || /^(https?:|mailto:)/.test(raw)) continue;
    if (PLACEHOLDER.test(raw)) continue;
    out.add(raw);
  }

  for (const m of String(text).matchAll(TICK)) {
    const raw = m[1].trim();
    if (!EXTENSIONS.test(raw) || PLACEHOLDER.test(raw)) continue;
    if (/^(https?:|mailto:)/.test(raw)) continue;
    // A bare filename in prose — "run `gate.mjs`" — names a file without claiming where it
    // is. Only a reference carrying a directory is claiming a location this can check.
    if (!raw.includes('/')) continue;
    out.add(raw);
  }

  return [...out];
}

/**
 * @param {{file:string, refs:string[]}[]} docs
 * @param {(ref:string, from:string)=>boolean} resolves
 * @param {{ref:string, reason?:string}[]} ignore
 */
export function validateRefs(docs, resolves, ignore = []) {
  const findings = [];
  const ignored = new Map(ignore.map((i) => [i.ref, i.reason]));

  for (const entry of ignore) {
    if (!entry.reason) {
      findings.push({ message: `the doc-link ignore list carries "${entry.ref}" with no reason — a reasonless exemption is one nobody can review, and it is how an ignore list becomes a place to hide things` });
    }
  }

  const seenRefs = new Set();
  for (const { file, refs } of docs) {
    for (const ref of refs) {
      seenRefs.add(ref);
      if (ignored.has(ref)) continue;
      if (resolves(ref, file)) continue;
      findings.push({ message: `${file} cites \`${ref}\`, which does not exist. A living document pointing at a missing file is a claim that has stopped being true (P-07)` });
    }
  }

  // The list has to shrink on its own. An entry kept after the file appeared exempts a path
  // that no longer needs it, and would hide the next time it goes missing.
  for (const entry of ignore) {
    if (entry.reason && seenRefs.has(entry.ref) && resolves(entry.ref, '')) {
      findings.push({ message: `the ignore list still exempts \`${entry.ref}\`, but it resolves now — a stale exemption hides the next time it goes missing` });
    }
  }

  return findings;
}
