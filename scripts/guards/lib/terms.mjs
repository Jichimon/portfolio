// C-05 · no term from private/banned-terms.txt reaches a publishable file.
//
// Ported from check-terms.sh, which had two defects this file exists to fix:
//
//   1. It scanned a HARDCODED ROSTER of five paths. docs/, .claude/ and scripts/ were
//      unguarded, and silently so — the exact shape of INC-07, and the reason C-05 says
//      the check runs over the whole repository minus an explicit EXCLUSION list (P-13).
//      Forgetting to add a path to an exclusion list makes a scan noisier, never blinder.
//
//   2. It printed the matched term and the full matched line. Run by an agent, that copies
//      the confidentiality mapping straight into the transcript — private/ leaking through
//      the guard that protects it (H-04). Findings now carry the LOCATION and mask the term.
//
// Substring matching, deliberately, exactly as the shell version did: a false positive is
// noise a human dismisses in one look, a false negative is a published leak.

/** Terms with their line in banned-terms.txt, so a finding is lookup-able without the term. */
export function parseTerms(text) {
  const out = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const term = raw.trim();
    if (term && !term.startsWith('#')) out.push({ term, line: i + 1 });
  });
  return out;
}

const norm = (p) => String(p).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');

/** Segment-aware, so privateer/ is not private/ and evidence/README.md is still scanned. */
export function isExcluded(relPath, exclusions) {
  const p = norm(relPath);
  return exclusions.some(({ path }) => {
    const e = norm(path);
    return p === e || p.startsWith(e + '/');
  });
}

/** A NUL byte in the head of a file means binary. Same heuristic as grep -I. */
export function isBinary(buf) {
  return buf.subarray(0, 8192).includes(0);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Blocks of the term's own length, so the position stays visible and the term does not.
 * Exported because the evidence trace scrubs with it too: a trace of a session that touched
 * private/ would recreate the exact leak this repository exists to prevent (H-04).
 */
export function mask(line, terms) {
  let out = line;
  for (const { term } of terms) {
    out = out.replace(new RegExp(escapeRe(term), 'gi'), (m) => '█'.repeat(m.length));
  }
  return out;
}

/**
 * Every occurrence of every term, with enough context to act and none to leak.
 *
 * The context is masked against EVERY term at scan time, not against the one that matched.
 * Masking per finding leaves a second term on the same line printed in the clear — found by
 * the test, and the reason an unmasked context never exists on the returned object at all.
 */
export function scanText(text, terms) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const term of terms) {
      const re = new RegExp(escapeRe(term.term), 'gi');
      for (const m of line.matchAll(re)) {
        hits.push({ line: i + 1, column: m.index + 1, term, context: mask(line, terms) });
      }
    }
  });
  return hits;
}

/**
 * A finding a human can act on and an agent cannot learn from: where the leak is, and which
 * line of banned-terms.txt defines the term. The human opens that line; the agent cannot.
 */
export function formatFinding(file, hit) {
  return `${norm(file)}:${hit.line}:${hit.column}  banned-terms.txt:${hit.term.line}\n      ${hit.context.trim().slice(0, 120)}`;
}
