// S-01 — every visible string comes from the gateway (ADR-008). TASK 109 split this out of
// the former monolithic site-structure.mjs; nothing here changed behavior. This is the
// largest and most complex of the eight checkers — a hand-rolled scanner for the two regions
// of an .astro file that matter (frontmatter and template), not a general HTML/JS parser.

import { inside, lineAtOffset, code } from './shared.mjs';

/**
 * Splits an .astro file into the two regions that mean something different
 * to this check: `frontmatter` (the JS between the two `---` fences — never a
 * text node) and `template` (everything after it — the only region a reader ever
 * sees). Any `<style>` block inside the template is CSS, not a text node either,
 * so it is blanked character-for-character (every non-newline replaced with a
 * space) rather than removed — the same technique withCommentsBlanked uses, kept
 * for the same reason: a finding still has to name a truthful line number.
 */
function astroFileRegions(text) {
  const fenceMatch = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
  const prefixLength = fenceMatch ? fenceMatch[0].length : 0;
  const frontmatter = fenceMatch ? fenceMatch[0] : '';
  const template = text.slice(prefixLength).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) => m.replace(/[^\n]/g, ' '));
  return { frontmatter, template, prefixLength };
}

/**
 * A local constant this SAME file's frontmatter binds, directly and only, to a
 * quoted string — `const NAME = 'Luis Antelo'`, never `const { label } =
 * Astro.props` (RHS is not a quote) and never a computed or ternary expression.
 * That shape is exactly what distinguishes a literal wearing a variable's name
 * from a value the gateway actually supplied, which is the whole reason this
 * check has to look past the template's own `{ }` boundary at all: `code()` from
 * shared.mjs strips comments first so a commented-out declaration is prose, not a
 * binding.
 */
function frontmatterLiteralConstants(frontmatter) {
  const constants = new Map();
  const re = /\bconst\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(['"])((?:\\.|(?!\2)[^\\])*)\2\s*;/g;
  const blanked = code(frontmatter);
  let m;
  while ((m = re.exec(blanked))) constants.set(m[1], m[3]);
  return constants;
}

/**
 * Reads a `{...}` expression container starting at text[start] === '{', honouring
 * nested braces and quoted strings so a `}` inside an object literal or a string
 * does not end it early — `aria-label={fn({x: 1})}` closes at the real outer `}`.
 * Returns the text between the outer braces and the index just past the closing one.
 */
function readBalancedBraces(text, start) {
  let depth = 0;
  let innerStart = start + 1;
  let i = start;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < text.length && text[i] !== quote) {
        if (text[i] === '\\') i++;
        i++;
      }
      continue;
    }
    if (ch === '{') {
      depth++;
      if (depth === 1) innerStart = i + 1;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) return { inner: text.slice(innerStart, i), end: i + 1 };
    }
  }
  return { inner: text.slice(innerStart), end: text.length };
}

/**
 * What a `{...}` expression is allowed to be without becoming a finding: anything
 * except a BARE identifier that resolves, in THIS file's own frontmatter, to a
 * quoted literal — `{ui.nav.work}`, `{label}` and `LOCALE_CODE[lang]` are none of
 * that shape and pass untouched. A literal spelled directly inside the braces
 * (`{'Some Text'}`) is the same defect with one fewer step of indirection, so it
 * resolves too. Anything else — a member expression, a ternary, a call — cannot
 * be resolved statically and is left alone, which is what keeps every
 * genuinely gateway-sourced expression out of the findings.
 */
function resolveExpressionLiteral(inner, literalConstants) {
  const trimmed = inner.trim();
  if (/^[A-Za-z_$][\w$]*$/.test(trimmed) && literalConstants.has(trimmed)) return literalConstants.get(trimmed);
  const quoted = /^(['"])((?:\\.|(?!\1)[^\\])*)\1$/.exec(trimmed);
  if (quoted) return quoted[2];
  return null;
}

/** HTML entities carry no letters for this purpose — `&middot;` is punctuation, not copy. */
function withEntitiesStripped(text) {
  return text.replace(/&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, '');
}

/**
 * Reads every `attr=value` pair out of one already-extracted tag (`<a href=... >`),
 * recording only the ones named in the allowlist. A quoted value is read as-is;
 * a `{...}` value is resolved the same way a text node's expression is, so
 * `aria-label={groupLabel}` and `aria-label="Language"` are judged by the same rule.
 */
function scanAttributesInTag(tagText, tagOffset, attrSet, literalConstants, record) {
  const re = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*/g;
  let m;
  while ((m = re.exec(tagText))) {
    const name = m[1];
    const valueStart = re.lastIndex;
    const opener = tagText[valueStart];
    if (opener === '"' || opener === "'") {
      let k = valueStart + 1;
      while (k < tagText.length && tagText[k] !== opener) k++;
      if (attrSet.has(name)) record(tagText.slice(valueStart + 1, k), tagOffset + valueStart + 1, `carries in its "${name}" attribute`);
      re.lastIndex = k + 1;
    } else if (opener === '{') {
      const { inner, end } = readBalancedBraces(tagText, valueStart);
      if (attrSet.has(name)) {
        const resolved = resolveExpressionLiteral(inner, literalConstants);
        if (resolved !== null) record(resolved, tagOffset + valueStart, `carries in its "${name}" attribute`);
      }
      re.lastIndex = end;
    }
  }
}

/**
 * Walks one text-node run, alternating literal spans (checked directly) and
 * `{...}` expression spans (resolved the same way an attribute's is).
 */
function scanTextRun(segment, baseOffset, literalConstants, record) {
  let i = 0;
  while (i < segment.length) {
    if (segment[i] === '{') {
      const { inner, end } = readBalancedBraces(segment, i);
      const resolved = resolveExpressionLiteral(inner, literalConstants);
      if (resolved !== null) record(resolved, baseOffset + i, 'renders');
      i = end;
      continue;
    }
    let j = i;
    while (j < segment.length && segment[j] !== '{') j++;
    record(segment.slice(i, j), baseOffset + i, 'renders');
    i = j;
  }
}

/**
 * Lexes the template region into tags and text-node runs. Not a full HTML parser
 * — it does not need to be one, because the only two things it must never
 * misjudge are "am I inside a tag's `< >`" and "am I inside a `{ }` or a quoted
 * string while there", and both are tracked directly. An HTML comment is skipped
 * outright: it is neither markup a reader sees nor a text node. A component tag
 * (`<RailNav ... />`) is indistinguishable from an HTML one at this level, which
 * is correct — its attributes are checked by the same rule either way.
 */
function scanTemplate(text, attrSet, literalConstants, record) {
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (text[i] === '<') {
      if (text.startsWith('!--', i + 1)) {
        const end = text.indexOf('-->', i);
        i = end === -1 ? n : end + 3;
        continue;
      }
      const tagStart = i;
      let j = i + 1;
      while (j < n && text[j] !== '>') {
        if (text[j] === "'" || text[j] === '"') {
          const quote = text[j];
          j++;
          while (j < n && text[j] !== quote) j++;
          j++;
          continue;
        }
        if (text[j] === '{') {
          j = readBalancedBraces(text, j).end;
          continue;
        }
        j++;
      }
      j = Math.min(j + 1, n);
      scanAttributesInTag(text.slice(tagStart, j), tagStart, attrSet, literalConstants, record);
      i = j;
      continue;
    }
    let j = i;
    while (j < n && text[j] !== '<') j++;
    scanTextRun(text.slice(i, j), i, literalConstants, record);
    i = j;
  }
}

/**
 * S-01. No .astro file outside the gateway declares a string a reader can see —
 * not as a literal text node, not as the value of a human-readable attribute,
 * and not as a local frontmatter constant relayed into either through a bare
 * `{identifier}`. Everything the gateway hands down through a prop reaches the
 * template as an expression this check cannot and does not try to resolve, so
 * every genuinely gateway-sourced string passes untouched.
 *
 * `humanReadableAttributes` absent from cfg entirely means this property was not
 * asked for, the same convention checkColourAndBreakpointLiteralsAreDeclaredOnce
 * uses for `tokenStylesheet` — staying silent about a property nobody requested
 * is not a quiet pass. Once it IS asked for, `gateway` becomes load-bearing: with
 * no boundary to exempt, every .astro file — including the gateway's own — would
 * be scanned, so a guard that cannot evaluate denies rather than doing that (G-13).
 */
export function checkVisibleStringLiteralsComeFromTheGateway(files, { gateway, humanReadableAttributes } = {}) {
  if (!humanReadableAttributes) return [];
  if (!gateway) {
    throw new Error(
      'checkVisibleStringLiteralsComeFromTheGateway needs `gateway` to know which files are exempt (S-01) — ' +
        'denying rather than risk scanning the gateway itself',
    );
  }
  const attrSet = new Set(humanReadableAttributes);
  const findings = [];

  for (const f of files) {
    if (!f.path.endsWith('.astro')) continue;
    if (inside(f.path, gateway)) continue;

    const { frontmatter, template, prefixLength } = astroFileRegions(f.text);
    const literalConstants = frontmatterLiteralConstants(frontmatter);

    const record = (rawSegment, offsetInTemplate, where) => {
      const value = withEntitiesStripped(rawSegment).trim();
      if (!/\p{L}/u.test(value)) return;
      const line = lineAtOffset(f.text, prefixLength + offsetInTemplate);
      findings.push({
        file: f.path,
        line,
        value,
        message:
          `${f.path}:${line} ${where} the visible string "${value}" outside the gateway (S-01) — ` +
          'every string a reader can see is declared once in the interface strings collection and reaches a page through it',
      });
    };

    scanTemplate(template, attrSet, literalConstants, record);
  }
  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
