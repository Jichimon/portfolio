// Verifies that declared contracts are ENFORCED, not merely written.
//
// The failure this prevents: a contracts document that describes six beautiful
// obligations, none of which any artifact checks. "We will enforce it later" quietly
// becomes "we never did", and nothing in the repository notices — the same shape as a
// rule claiming a rung it never earned (G-11).
//
// Property-based (P-13): the table is the source. Nothing here names a contract.

const ROW = /^\|\s*([A-Z][A-Za-z ]*?)\s*\|\s*(.+?)\s*\|\s*([^|]*?)\s*\|(?:\s*([^|]*?)\s*\|)?\s*$/;
const PATHS = /`([^`]+)`/g;
const STEP = /\bstep\s+(\d+)/i;

/** Extract the enforcement table: rows of { contract, enforcers[], status }. */
export function parseEnforcementTable(text) {
  const section = text.split(/^##\s+/m).find((s) => /^Enforcement status/i.test(s));
  if (!section) return [];

  const rows = [];
  for (const line of section.split(/\r?\n/)) {
    const m = line.match(ROW);
    if (!m) continue;
    const [, contract, enforcedBy, status, uncovered] = m;
    if (/^-+$/.test(contract) || /^Contract$/i.test(contract)) continue;
    rows.push({
      contract,
      enforcers: [...enforcedBy.matchAll(PATHS)].map((x) => x[1]),
      status: status.replace(/\*/g, '').trim(),
      uncovered: (uncovered ?? '').trim(),
    });
  }
  return rows;
}

/**
 * @param {string} contractsText   contents of contracts.md
 * @param {(p:string)=>boolean} exists  path predicate, injected so this stays pure
 */
export function validateContracts(contractsText, exists) {
  const findings = [];
  const rows = parseEnforcementTable(contractsText);

  if (rows.length === 0) {
    findings.push({ contract: '-', message: 'no enforcement table found — every contract must name what enforces it' });
    return { rows, findings, counts: { built: 0, partial: 0, pending: 0 }, enforced: 0 };
  }

  const counts = { built: 0, partial: 0, pending: 0 };
  for (const r of rows) {
    if (r.enforcers.length === 0) {
      findings.push({ contract: r.contract, message: 'names no enforcing artifact' });
      continue;
    }

    const missing = r.enforcers.filter((p) => !exists(p));
    const allPresent = missing.length === 0;
    const claimsBuilt = /built/i.test(r.status);
    const claimsPartial = /partial/i.test(r.status);
    const step = r.status.match(STEP);

    // Partial is the honest middle: the enforcer exists and covers part of the contract.
    // It has to name the part it does NOT cover, or it is "built" with extra words, hiding
    // exactly what "built" would have hidden (G-11: partial mechanization says which half).
    if (claimsPartial) {
      counts.partial++;
      if (!allPresent) {
        findings.push({ contract: r.contract, message: `claims partial, but the enforcer does not exist: ${missing.join(', ')}` });
      }
      if (!r.uncovered || r.uncovered === '—' || r.uncovered === '-') {
        findings.push({ contract: r.contract, message: 'claims partial without naming what is uncovered — partial with no named gap conceals as much as an overclaim' });
      }
      continue;
    }

    if (allPresent) {
      counts.built++;
      // A row still pointing at a future step while its enforcer exists is stale
      // bookkeeping: the gap closed and nobody updated the claim.
      if (step) {
        findings.push({
          contract: r.contract,
          message: `enforcer exists but status still reads "${r.status}" — update the claim (G-11)`,
        });
      }
      continue;
    }

    if (claimsBuilt) {
      findings.push({
        contract: r.contract,
        message: `claims built, but the enforcer does not exist: ${missing.join(', ')}`,
      });
    } else if (step) {
      counts.pending++;
    } else {
      // Neither built nor scheduled. That is an untracked gap, which is the exact
      // thing this check exists to make impossible.
      findings.push({
        contract: r.contract,
        message: `not enforced and no blueprint step named — an untracked gap (status: "${r.status}")`,
      });
    }
  }

  return { rows, findings, counts, enforced: counts.built };
}

/**
 * The document summarizes its own table in a sentence, and a sentence is a claim.
 *
 * This exists because the table was checked for two whole steps while the paragraph under it
 * still read "2 of 6 enforced ... the Run row still reads step 6" — both false, both invisible,
 * because nothing validated the prose against the artifact it describes (P-07).
 */
export function validateRatioProse(text, counts) {
  const m = text.match(/(\d+)\s+fully enforced,\s*(\d+)\s+partial,\s*(\d+)\s+pending/i);
  if (!m) {
    return [{ contract: '-', message: 'no ratio sentence found — the document must state "N fully enforced, N partial, N pending" so the summary can be checked against the table' }];
  }
  const claimed = { built: +m[1], partial: +m[2], pending: +m[3] };
  const wrong = Object.keys(counts).filter((k) => claimed[k] !== counts[k]);
  if (wrong.length === 0) return [];
  return [{
    contract: '-',
    message: `the prose claims ${claimed.built} fully enforced, ${claimed.partial} partial, ${claimed.pending} pending; the table yields ${counts.built}, ${counts.partial}, ${counts.pending}`,
  }];
}
