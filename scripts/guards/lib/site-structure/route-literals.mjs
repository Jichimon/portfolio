// CONTENT-006 — a route literal naming a real slug lives only in its declaration site.
// TASK 109 split this out of the former monolithic site-structure.mjs; nothing here changed
// behavior.

import { inside } from './shared.mjs';

/**
 * Every top-level string or template literal that opens in CODE, never inside a
 * comment — the same quote/comment state machine as commentsByLine, run for the
 * opposite reason: a route literal quoted inside a comment is prose, not code, so
 * it is excluded the same way S-08 excludes prose from carrying a reference.
 *
 * A template literal is reported with hasInterpolation when it contains `${` — the
 * derivation building a path from a variable, which nobody can evaluate statically.
 * Single- and double-quoted literals cannot legally contain a raw newline, so an
 * unterminated one recovers at the newline; a template literal spans lines for real.
 */
function codeStringLiteralsByLine(text) {
  const literals = [];
  let line = 1;
  let state = 'code';
  let quote = '';
  let startLine = 0;
  let buffer = '';
  let hasInterpolation = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '\n') {
      line++;
      if (state === 'line') state = 'code';
      else if (state === 'quote' && quote === '`') buffer += ch;
      else if (state === 'quote') state = 'code';
      continue;
    }

    if (state === 'quote') {
      if (ch === '\\') {
        buffer += ch + (next ?? '');
        i++;
        continue;
      }
      if (ch === quote) {
        literals.push({ line: startLine, literal: buffer, hasInterpolation });
        state = 'code';
        continue;
      }
      if (quote === '`' && ch === '$' && next === '{') hasInterpolation = true;
      buffer += ch;
      continue;
    }
    if (state === 'line') continue;
    if (state === 'block') {
      if (ch === '*' && next === '/') {
        state = 'code';
        i++;
      }
      continue;
    }
    if (state === 'html') {
      if (ch === '-' && next === '-' && text[i + 2] === '>') {
        state = 'code';
        i += 2;
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      state = 'quote';
      quote = ch;
      startLine = line;
      buffer = '';
      hasInterpolation = false;
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
  return literals;
}

/**
 * The one-datum-one-declaration-site rule for routes. The route set is derived from
 * the collection (CONTENT-005); a source file that spells a path out by hand is
 * asking nothing, which is the exact defect this catches whether the file is a page
 * or a test — a test that hardcodes the route set is the same defect wearing a
 * different hat.
 *
 * `contentSlugs` is opaque input data, never a name this function knows — the real
 * slug set is DERIVED from the filenames under the content roots by the CLI (P-13),
 * so a sixth case study is covered with no edit here.
 */
export function checkRouteLiteralsAreDerived(files, { routeDeclarationSites, contentSlugs, locales }) {
  const findings = [];
  for (const f of files) {
    if (inside(f.path, routeDeclarationSites)) continue;
    for (const { line, literal, hasInterpolation } of codeStringLiteralsByLine(f.text)) {
      if (hasInterpolation) continue;
      if (!literal.startsWith('/')) continue;
      const segments = literal.split('/').filter(Boolean);
      while (segments.length > 0 && locales.includes(segments[0])) segments.shift();
      const namedSlug = segments.find((segment) => contentSlugs.includes(segment));
      if (!namedSlug) continue;
      findings.push({
        file: f.path,
        line,
        literal,
        message:
          `${f.path}:${line} hardcodes "${literal}", naming the real slug "${namedSlug}". ` +
          `The route set is derived from the collection — ask it, rather than spelling the path out here`,
      });
    }
  }
  return findings;
}
