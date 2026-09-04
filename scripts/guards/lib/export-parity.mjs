// TASK 9 · the harness export ships one body in two documents, and this is what keeps them
// one body.
//
// Invariant 3 forbids restating a rule: two copies drift, and both become untrustworthy. The
// export deliberately makes two copies anyway, because the control-plane half cannot be
// written once for two agent tools — so the drift the invariant warns about is prevented by a
// check rather than by an author remembering.
//
// THE PROPERTY, not a roster (P-13). Every markdown file under the export root that carries a
// begin marker must carry its end, and every core so extracted must be byte-identical. The
// file set is derived from the directory, so a third bootstrap is covered the day it exists
// and an index file carrying no markers needs no exemption.
//
// Pure — no filesystem access, in the shape the rest of lib/ uses. The caller reads.

/** Where a marker sits in a document, and how many times it appears. */
function occurrences(text, marker) {
  const at = [];
  let from = 0;
  for (;;) {
    const i = text.indexOf(marker, from);
    if (i === -1) return at;
    at.push(i);
    from = i + marker.length;
  }
}

/**
 * The shared body of one document, or the reason it has none.
 *
 * A file with no begin marker is not a bootstrap and is not an error — that is what lets the
 * export directory hold its own index without an exemption list, and an exemption list is
 * where things get hidden.
 *
 * @returns {{core: string|null, findings: {file:string, message:string}[]}}
 */
export function extractCore(file, beginMarker, endMarker) {
  const { path, text } = file;
  const begins = occurrences(text, beginMarker);
  const ends = occurrences(text, endMarker);
  const findings = [];
  const at = (message) => findings.push({ file: path, message });

  if (begins.length === 0) {
    if (ends.length > 0) {
      at(`carries the end marker with no begin marker — half a delimiter pair extracts nothing, and a file that silently contributes no core is the one way this check can pass while asserting less than it looks like`);
    }
    return { core: null, findings };
  }

  if (begins.length > 1) at(`carries ${begins.length} begin markers. One pair per document, or "the core" names more than one thing`);
  if (ends.length === 0) {
    at(`carries a begin marker with no end marker — the core would run to the end of the file, swallowing the tool-specific appendix that is supposed to differ`);
    return { core: null, findings };
  }
  if (ends.length > 1) at(`carries ${ends.length} end markers. One pair per document, or "the core" names more than one thing`);
  if (findings.length > 0) return { core: null, findings };

  const start = begins[0] + beginMarker.length;
  const end = ends[0];
  // Stryker disable next-line EqualityOperator: the two markers are asserted distinct before any
  // document is read, and two distinct strings cannot start at the same index, so end === begins[0]
  // is unreachable — < and <= cannot differ on any input this function can be handed.
  if (end < begins[0]) {
    at('closes the shared core before it opens it');
    return { core: null, findings };
  }

  const core = text.slice(start, end);
  if (core.trim() === '') {
    at('has an empty shared core. Two identical empty cores agree about nothing, which is the same shape as an empty conjunction being true of everything (P-03)');
    return { core: null, findings };
  }

  return { core, findings };
}

/** The first position at which two strings differ, with a little context from each. */
function firstDifference(a, b) {
  // Stryker disable next-line MethodExpression: min and max cannot differ here. This is only
  // called for two strings already known to be different, and past the shorter one's length
  // exactly one side indexes to undefined — so the character comparison stops the scan at the
  // same index under either bound. Verified by hand against the prefix case, which is the only
  // one where the two bounds are not already equal.
  const shorter = Math.min(a.length, b.length);
  let i = 0;
  // Stryker disable next-line EqualityOperator,ConditionalExpression: the same reachability
  // argument. At i === shorter one side is undefined and the other is a character, so the
  // comparison ends the loop whether the bound is < or <= and whether or not it is checked.
  while (i < shorter && a[i] === b[i]) i++;
  const line = a.slice(0, i).split('\n').length;
  const window = (s) => JSON.stringify(s.slice(i, i + 60));
  return { offset: i, line, a: window(a), b: window(b) };
}

/**
 * Every bootstrap under the export root carries the same shared core.
 *
 * @param {{path:string, text:string}[]} files   every markdown file under the export root
 * @param {{beginMarker:string, endMarker:string, minFiles:number}} cfg
 * @returns {{file:string, message:string}[]}
 */
export function validateExportParity(files, cfg) {
  const findings = [];
  const { beginMarker, endMarker, minFiles } = cfg ?? {};

  // G-13: a check that cannot read its own configuration has validated nothing, and passing
  // in that state is INC-07 again — a green result that asserts no property at all.
  if (!beginMarker || !endMarker || !Number.isInteger(minFiles)) {
    throw new Error('export parity is unconfigured: beginMarker, endMarker and an integer minFiles are all required, and deriving a core without them would compare nothing while reporting a pass (G-13)');
  }
  if (beginMarker === endMarker) {
    throw new Error('export parity is misconfigured: the begin and end markers are the same string, so no document can delimit a core (G-13)');
  }

  const carriers = [];
  for (const file of files) {
    const { core, findings: own } = extractCore(file, beginMarker, endMarker);
    findings.push(...own);
    if (core !== null) carriers.push({ path: file.path, core });
  }

  if (carriers.length < minFiles) {
    findings.push({
      file: 'docs/harness/export',
      message: `${carriers.length} document(s) carry a shared core; the export is defined as at least ${minFiles}. A parity check over one document is a check that can never fail`,
    });
    return findings;
  }

  const [reference, ...rest] = carriers;
  for (const other of rest) {
    if (other.core === reference.core) continue;
    const d = firstDifference(reference.core, other.core);
    findings.push({
      file: other.path,
      message: `its shared core differs from ${reference.path} at byte ${d.offset} (line ${d.line}). ${reference.path} has ${d.a}; this file has ${d.b}. Edit one core, copy the block to the other, and run this again — the two documents install the same harness or they install two`,
    });
  }

  return findings;
}
