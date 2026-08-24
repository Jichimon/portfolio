// TASK 15 · the mutation gate's own hole. Stryker's documented comment grammar is:
//
//   // Stryker [disable|restore] [next-line] <mutatorList>[: custom reason]
//
// The reason is OPTIONAL to Stryker — a `disable` comment is syntactically valid with nothing
// after the mutator list. This repository has hit "a suppression mechanism exists, and nobody
// re-reads it" three separate times already (the rules registry's own exception lists, the
// docs ignore-list, the content-check exemptions — each pattern learned the hard way, and each
// now carries a written-reason requirement). `stryker.config.mjs` already says a genuine
// equivalent mutant is excluded "AT THE MUTANT with a written reason, never by lowering this
// number" — this module is what makes that a checked property instead of a convention nobody
// enforces.
//
// `restore` is the mirror op: it RE-ENABLES mutation for the lines that follow a prior
// `disable`. There is nothing to justify about turning a check back on, so it is never a
// finding, in any form — Stryker's own grammar makes the reason optional there too, and this
// guard does not narrow that.

// Mirrors Stryker's own grammar, read from the installed
// `@stryker-mutator/instrumenter/dist/src/transformers/directive-bookkeeper.js` (v10.0.0):
//
//   /^\s?Stryker (disable|restore)(?: (next-line))? ([a-zA-Z, ]+)(?::(.+)?)?/
//
// applied to Babel's `comment.value` for EVERY leading comment node. Babel strips the
// delimiters, so `//` and a block comment reach that regex as the same string — which is why
// this one accepts both. The test file carries a canary that fails if that source stops being
// the thing this mirrors.
//
// Deliberately STRICTER than Stryker in two places, because stricter is the safe direction for
// a boundary: more leading whitespace tolerated than Stryker allows, and case-insensitive where
// Stryker is case-sensitive. Both mean this guard flags things Stryker would not honour. It
// must never be LOOSER, which is exactly the defect the delimiter-specific version had.
const STRYKER_COMMENT = /(?:\/\/|\/\*)\s*Stryker\s+(disable|restore)\b([^\r\n]*)/i;

/**
 * `files`: `[{ path, text }]`. Pure — no filesystem access, so the real-repository scan
 * (which files, read how) lives in the test file, per the precedent `sources.test.mjs` sets.
 *
 * Returns one finding per `disable` comment that carries no written reason: no `:` at all
 * (MS-001), or a `:` followed by nothing but whitespace (MS-002). A `disable` with a real
 * reason (MS-003) and every `restore` comment (MS-004) produce no finding.
 */
export function checkStrykerSuppressions(files) {
  const findings = [];

  for (const { path, text } of files) {
    const lines = String(text).split(/\r?\n/);
    lines.forEach((line, i) => {
      const m = line.match(STRYKER_COMMENT);
      if (!m) return;

      const verb = m[1].toLowerCase();
      if (verb === 'restore') return; // MS-004: never a finding, in any form.

      // A block comment's closing delimiter is not part of the reason. Without this strip, a
      // colon followed only by the delimiter reads as a non-empty reason that says nothing,
      // and MS-002 would wave it through.
      const rest = m[2].replace(/\*\/[\s\S]*$/, '');
      const colon = rest.indexOf(':');
      if (colon === -1) {
        findings.push({
          path,
          line: i + 1,
          message: 'Stryker disable comment carries no reason — no ":" found. A suppression nobody explains is a check that stops checking.',
        });
        return;
      }

      const reason = rest.slice(colon + 1).trim();
      if (!reason) {
        findings.push({
          path,
          line: i + 1,
          message: 'Stryker disable comment has a ":" but no reason after it — whitespace or empty is the same defect as no colon at all.',
        });
      }
    });
  }

  return findings;
}
