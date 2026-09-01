// S-05 — colour and breakpoint literals have one declaration site (ADR-008). TASK 109 split
// this out of the former monolithic site-structure.mjs, and fixed a real divergence found
// while doing it — see withCommentsBlanked below.

import { lineAtOffset } from './shared.mjs';

/**
 * Comments blanked IN PLACE — every non-comment character keeps its original index
 * and every newline survives — so a match found in the result still maps to a
 * truthful line number in the source. `code()` in shared.mjs cannot be reused here: it
 * DELETES comment text, which shifts every line number after a multi-line block
 * comment. Quote-aware for the same reason importsFrom is (TASK 10): a `/*` or `//`
 * sitting inside a real quoted string — an attribute value, a CSS string — is not a
 * comment opener, so quote content is kept rather than dropped (unlike
 * commentsByLine, which only needs to DETECT comments and can safely discard it).
 *
 * FIXED (TASK 109): a backtick-quoted template literal spans real newlines — single-
 * and double-quoted strings cannot — and this function's newline handling used to
 * close ANY quote at the next `\n`, template literals included. comment-references.mjs's
 * commentsByLine had the identical bug; route-literals.mjs's codeStringLiteralsByLine
 * did not, which is what exposed the other two while splitting this file into modules
 * and diffing them side by side rather than moving each one unread. Demonstrated, not
 * just reasoned about: a multi-line template literal containing a `//`-shaped run of
 * characters used to desync quote tracking badly enough that the literal's own closing
 * backtick was read as OPENING a new quote — silently swallowing every real colour
 * literal after it in the same file into "inside a string", where this function never
 * looks (design-tokens.test.mjs's regression test plants exactly this and fails
 * without the one-line fix below: `quote !== '\`'` where the old code had no such
 * exception).
 */
function withCommentsBlanked(text) {
  let out = '';
  let state = 'code';
  let quote = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '\n') {
      out += '\n';
      if (state === 'line') state = 'code';
      else if (state === 'quote' && quote !== '`') state = 'code';
      continue;
    }

    if (state === 'quote') {
      if (ch === '\\') {
        out += ch + (next ?? '');
        i++;
        continue;
      }
      out += ch;
      if (ch === quote) state = 'code';
      continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') {
        state = 'code';
        out += '  ';
        i++;
      } else out += ' ';
      continue;
    }
    if (state === 'html') {
      if (ch === '-' && next === '-' && text[i + 2] === '>') {
        state = 'code';
        out += '   ';
        i += 2;
      } else out += ' ';
      continue;
    }
    if (state === 'line') {
      out += ' ';
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      state = 'quote';
      quote = ch;
      out += ch;
    } else if (ch === '/' && next === '/' && text[i - 1] !== ':') {
      state = 'line';
      out += '  ';
      i++;
    } else if (ch === '/' && next === '*') {
      state = 'block';
      out += '  ';
      i++;
    } else if (ch === '<' && text.startsWith('!--', i + 1)) {
      state = 'html';
      out += '    ';
      i += 3;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * S-05, colour half. `#hex`, `rgb(`, `rgba(`, `hsl(`, `hsla(` and `oklch(` are the
 * five ways CSS spells a colour. No name derivation is needed here — unlike the
 * breakpoint half below, ANY of these five is banned outside the token stylesheet,
 * regardless of what token it would otherwise have named.
 */
function colourLiteralMatches(blanked) {
  const re = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b|\brgba?\(|\bhsla?\(|\boklch\(/g;
  const matches = [];
  let m;
  while ((m = re.exec(blanked))) matches.push({ index: m.index, literal: m[0] });
  return matches;
}

/**
 * S-05, breakpoint half. The sanctioned set is DERIVED from the token stylesheet:
 * every custom property whose ENTIRE value is a bare pixel length (P-13) — today
 * that is exactly the three --breakpoint-* declarations, and a twelfth token, or a
 * fourth breakpoint, costs no edit here. `--type-display-l: 500 42px var(...)`
 * is excluded on purpose: its value is a shorthand, not a bare width.
 */
function sanctionedBreakpointWidthsPx(tokenStylesheetText) {
  const widths = new Set();
  const re = /--[\w-]+\s*:\s*([^;]+);/g;
  const blanked = withCommentsBlanked(tokenStylesheetText);
  let m;
  while ((m = re.exec(blanked))) {
    const bareWidth = m[1].trim().match(/^(\d+(?:\.\d+)?)px$/);
    if (bareWidth) widths.add(bareWidth[1]);
  }
  return widths;
}

/**
 * S-05, breakpoint half. Only the parenthesised CONDITION between `@media` and its
 * opening `{` is in scope — a `max-width`/`min-width` CSS PROPERTY in the block's
 * body, or anywhere else, is a content-width cap, not a breakpoint, and stays legal.
 */
function breakpointLiteralMatches(blanked, sanctionedWidths) {
  const mediaRe = /@media[^{]*\{/g;
  const matches = [];
  let mediaMatch;
  while ((mediaMatch = mediaRe.exec(blanked))) {
    const condition = mediaMatch[0];
    const widthRe = /\b(?:max|min)-width\s*:\s*(\d+(?:\.\d+)?)px/g;
    let widthMatch;
    while ((widthMatch = widthRe.exec(condition))) {
      const width = widthMatch[1];
      if (sanctionedWidths.has(width)) continue;
      matches.push({ index: mediaMatch.index + widthMatch.index, width });
    }
  }
  return matches;
}

/**
 * S-05. The token stylesheet is the one declaration site for colour and breakpoint
 * literals; every other file under site/ names a token instead of writing one.
 *
 * `tokenStylesheet` absent from cfg entirely means this property was not asked
 * for — callers exercising the other checkSite properties in isolation do not
 * carry one, and staying silent about a property nobody requested is not a quiet
 * pass. But once a path IS named, a guard that cannot evaluate must deny (G-13):
 * if that file is not among the ones handed in, or is empty, there is nothing to
 * derive the sanctioned breakpoint set from, so this throws rather than silently
 * treating every width as a finding — or worse, none.
 */
export function checkColourAndBreakpointLiteralsAreDeclaredOnce(files, { tokenStylesheet } = {}) {
  if (!tokenStylesheet) return [];
  const stylesheet = files.find((f) => f.path === tokenStylesheet);
  if (!stylesheet || !stylesheet.text) {
    throw new Error(
      `${tokenStylesheet} is missing or unreadable — cannot derive the sanctioned breakpoint set (S-05). Denying rather than passing quietly`,
    );
  }
  const sanctionedWidths = sanctionedBreakpointWidthsPx(stylesheet.text);

  const findings = [];
  for (const f of files) {
    if (f.path === tokenStylesheet) continue;
    const blanked = withCommentsBlanked(f.text);

    for (const { index, literal } of colourLiteralMatches(blanked)) {
      const line = lineAtOffset(blanked, index);
      findings.push({
        file: f.path,
        line,
        literal,
        message:
          `${f.path}:${line} writes the colour literal "${literal}" outside ${tokenStylesheet}. ` +
          `Name a --color-* token instead (S-05) — the token stylesheet is the one declaration site`,
      });
    }
    for (const { index, width } of breakpointLiteralMatches(blanked, sanctionedWidths)) {
      const line = lineAtOffset(blanked, index);
      findings.push({
        file: f.path,
        line,
        width,
        message:
          `${f.path}:${line} names an @media breakpoint of ${width}px, which ${tokenStylesheet} does not declare (S-05). ` +
          `Sanctioned widths: ${[...sanctionedWidths].sort((a, b) => b - a).join('px, ')}px`,
      });
    }
  }
  return findings;
}
