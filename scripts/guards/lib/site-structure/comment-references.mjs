// S-08 — a comment carries no reference to a document outside site/ (ADR-008, TASK 31). TASK
// 109 split this out of the former monolithic site-structure.mjs, and fixed a real divergence
// found while doing it — see commentsByLine below (the same bug design-tokens.mjs's
// withCommentsBlanked had, and route-literals.mjs's codeStringLiteralsByLine did not).

/**
 * Quote-aware comment extraction, one entry per line.
 *
 * Per-line rather than per-block because a finding has to name the line the
 * reference sits on, not the line the block opened on. Quote-aware because of
 * TASK 10: a guard that fires on quoted text is a guard people route around, and
 * `base: '../resources/site'` is the code doing its job rather than a pointer.
 *
 * Two deliberate limits, both failing toward a miss rather than a false alarm:
 * `//` preceded by `:` is a URL scheme and not a comment, and an unterminated
 * single or double quote ends at the newline — which is what stops an apostrophe
 * in .astro template prose from swallowing the rest of the file.
 *
 * FIXED (TASK 109): a backtick-quoted template literal spans real newlines, and this
 * function used to end ANY quote at the next `\n`, backticks included — see
 * design-tokens.mjs's withCommentsBlanked for the full account of how a multi-line
 * template literal then desyncs the whole state machine downstream (its own closing
 * backtick gets read as OPENING a new quote), silently swallowing a real trailing
 * comment — and this file's own reference to it — into "inside a string", where a
 * comment scanner never looks. comment-references.test.mjs's regression test plants
 * exactly that and fails without the `quote !== '\`'` exception below.
 */
function commentsByLine(text) {
  const byLine = new Map();
  let line = 1;
  let state = 'code';
  let quote = '';

  const keep = (ch) => byLine.set(line, (byLine.get(line) ?? '') + ch);

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '\n') {
      line++;
      if (state === 'line') state = 'code';
      else if (state === 'quote' && quote !== '`') state = 'code';
      continue;
    }

    if (state === 'quote') {
      if (ch === '\\') i++;
      else if (ch === quote) state = 'code';
      continue;
    }
    if (state === 'line') {
      keep(ch);
      continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') {
        state = 'code';
        i++;
      } else keep(ch);
      continue;
    }
    if (state === 'html') {
      if (ch === '-' && next === '-' && text[i + 2] === '>') {
        state = 'code';
        i += 2;
      } else keep(ch);
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      state = 'quote';
      quote = ch;
    } else if (ch === '/' && next === '/' && text[i - 1] !== ':') {
      state = 'line';
      i++;
    } else if (ch === '/' && next === '*') {
      state = 'block';
      i++;
    } else if (ch === '<' && text.startsWith('!--', i + 1)) {
      state = 'html';
      i += 3;
    }
  }
  return [...byLine].map(([at, body]) => ({ line: at, text: body }));
}

/**
 * S-08. A comment explains the code in front of it; it never points at a document
 * somewhere else in the repository. The reference runs the other way — a living
 * document cites the code, and check-docs keeps that citation resolving.
 *
 * The reference set is DERIVED by the caller from the repository's own top-level
 * entries (P-13), so a directory added next month is covered without editing this.
 */
export function checkCommentsCarryNoExternalReference(files, { externalDocumentReferences, recordIdPattern }) {
  const recordId = new RegExp(recordIdPattern);
  const findings = [];
  for (const f of files) {
    for (const { line, text } of commentsByLine(f.text)) {
      const reference = externalDocumentReferences.find((r) => text.includes(r)) ?? text.match(recordId)?.[0];
      if (!reference) continue;
      findings.push({
        file: f.path,
        line,
        reference,
        message:
          `${f.path}:${line} comments "${reference}". A comment carries no reference to anything outside site/ (S-08) — ` +
          `the citation belongs in the document, pointing at the code, where check-docs keeps it alive`,
      });
    }
  }
  return findings;
}
