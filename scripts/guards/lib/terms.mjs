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
// Substring matching by default (TASK 37 kept it deliberately for package names and
// resolved URLs). TASK 45 adds a PER-TERM opt-in: a line wrapped `\b <term> \b` matches
// only at a word boundary, for the one term that collides with a short, unrelated public
// identifier (a package name on the public npm registry). Every other term is unaffected —
// this is a per-term human decision, never a global switch. A global switch would trade
// today's false positive for a class of false negatives in compound identifiers, which is
// exactly where an internal system name would appear.

const WORD_BOUNDARY_OPEN = '\\b ';
const WORD_BOUNDARY_CLOSE = ' \\b';

/**
 * Terms with their line in banned-terms.txt, so a finding is lookup-able without the term.
 * A term recognizes the `\b <term> \b` flag (both markers required) and carries
 * `wordBoundary: true` when it does. A line with only ONE of the two markers is malformed
 * and fails the run rather than being read as a literal — a guard that cannot evaluate its
 * own term list must deny, not silently protect nothing (G-13). This is what today's live
 * defect was: the un-parsed line `\b <term> \b` read as one literal term, escaped, and
 * matched against nothing, while `check-terms` still reported PASS.
 */
export function parseTerms(text) {
  const out = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const line = i + 1;
    const opens = trimmed.startsWith(WORD_BOUNDARY_OPEN);
    const closes = trimmed.endsWith(WORD_BOUNDARY_CLOSE);
    if (opens !== closes) {
      throw new Error(
        `private/banned-terms.txt:${line}: malformed \\b flag — a flagged line must both ` +
        `open with "\\b " and close with " \\b"; this line has only one of the two markers.`,
      );
    }
    if (opens && closes) {
      const term = trimmed.slice(WORD_BOUNDARY_OPEN.length, -WORD_BOUNDARY_CLOSE.length).trim();
      out.push({ term, line, wordBoundary: true });
    } else {
      out.push({ term: trimmed, line });
    }
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
 * The pattern for one parsed term. `wordBoundary` wraps the escaped term in `\b`, so a
 * flagged term matches "ShortTerm" but not "ShortTerm5" or "node_modules/ShortTerm5" — the
 * exact collision TASK 45 exists to fix. Unflagged terms are unchanged: a bare substring,
 * matching inside a compound identifier exactly as before (TASK 45's per-term contrast).
 */
function termPattern({ term, wordBoundary }) {
  const body = escapeRe(term);
  return wordBoundary ? `\\b${body}\\b` : body;
}

/**
 * Blocks of the term's own length, so the position stays visible and the term does not.
 * Exported because the evidence trace scrubs with it too: a trace of a session that touched
 * private/ would recreate the exact leak this repository exists to prevent (H-04).
 *
 * Honours each term's own word-boundary flag. Masking with plain substring matching while
 * scanText matches only at a boundary would blank characters that were never a real finding
 * (e.g. "ShortTerm5" for a flagged "ShortTerm"), which prints a context line where the
 * masked block no longer corresponds to the reported column.
 */
export function mask(line, terms) {
  let out = line;
  for (const term of terms) {
    out = out.replace(new RegExp(termPattern(term), 'gi'), (m) => '█'.repeat(m.length));
  }
  return out;
}

/**
 * Values of generated, opaque fields are blanked before matching — by FIELD NAME, read
 * from config, never by a "looks like a hash" heuristic that would widen itself over time.
 *
 * INC-15's family, in a second place. A sha512 integrity hash is base64 of a digest, so
 * every short character sequence is reachable by chance and a short banned term turns up
 * in one eventually. Two did, in a lockfile, on 2026-08-24 — a true string match carrying
 * no confidentiality risk. A check people learn to dismiss is a check that stops being read.
 *
 * The value is replaced with same-length filler, so a finding elsewhere on the line still
 * reports the column it actually occupies.
 */
export function blankOpaqueValues(line, fields = []) {
  let out = line;
  for (const field of fields) {
    const re = new RegExp(`("${escapeRe(field)}"\\s*:\\s*")([^"]*)(")`, 'g');
    out = out.replace(re, (_, open, value, close) => open + ' '.repeat(value.length) + close);
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
export function scanText(text, terms, { opaqueFields = [] } = {}) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    // Blanked for MATCHING only. The context printed in a finding is the real line,
    // masked against every term, so a human still sees where they are.
    const searchable = blankOpaqueValues(line, opaqueFields);
    for (const term of terms) {
      const re = new RegExp(termPattern(term), 'gi');
      for (const m of searchable.matchAll(re)) {
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
