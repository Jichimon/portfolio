// The site's shape, as properties rather than as prose (ADR-008).
//
// Three things this asserts, each one an S-* rule that would otherwise be a
// paragraph nobody runs:
//
//   S-03  no directory under site/ holds maxFilesPerDir or more files
//   S-02  only the gateway imports astro:content
//   (sub-decision 1)  the core imports no framework and never reaches into src/
//
// Everything is DERIVED from the files handed in (P-13). Nothing here names a
// component, a page or a module, so file seven is checked rather than waved through.

/** A directory's own files. Subdirectories are separate directories, not members. */
function byDirectory(files) {
  const dirs = new Map();
  for (const { path } of files) {
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
    dirs.set(dir, (dirs.get(dir) ?? 0) + 1);
  }
  return dirs;
}

/**
 * A directory holding package.json is the root of a package. DERIVED from the same
 * file list the cap reads, so a package created next month is recognised with no edit
 * here and no roster anywhere (P-13).
 */
function packageRoots(files) {
  const roots = new Set();
  for (const { path } of files) {
    if (!path.endsWith('package.json')) continue;
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
    if (`${dir === '.' ? '' : `${dir}/`}package.json` === path) roots.add(dir);
  }
  return roots;
}

/**
 * S-03, in two calibrations. Both come from config, never from a literal here — each
 * number is calibrated in guards.config.json alongside its written reason.
 *
 * The split is not a raised cap wearing a disguise. The ordinary cap governs directories
 * somebody ORGANISED, and its remedy is to split by context. The root of a package is not
 * one of those: npm fixes package.json and its lockfile there, and a tool that resolves its
 * config from the project root fixes that too, so its members share an external requirement
 * rather than a context and the remedy the rule asks for is unavailable to them.
 */
export function checkFileCap(files, { maxFilesPerDir, maxFilesPerPackageRoot }) {
  const roots = packageRoots(files);
  const findings = [];
  for (const [dir, count] of byDirectory(files)) {
    const isPackageRoot = roots.has(dir);
    // G-13: a package root with no calibration configured is a guard that cannot
    // evaluate. Reading undefined as "no limit" would exempt every package root
    // silently, which is the failure this whole surface exists to refuse.
    if (isPackageRoot && typeof maxFilesPerPackageRoot !== 'number') {
      throw new Error(`${dir} is a package root and no maxFilesPerPackageRoot is configured`);
    }
    const cap = isPackageRoot ? maxFilesPerPackageRoot : maxFilesPerDir;
    if (count < cap + 1) continue;
    findings.push({
      dir,
      count,
      message: isPackageRoot
        ? `${dir} is a package root and holds ${count} files. Its cap is ${cap} (S-03). ` +
          `Above it the answer is not a higher number: it is a file that does not have to sit at a package root`
        : `${dir} holds ${count} files. At ${cap + 1} the directory is split into ` +
          `context-named subfolders (S-03). A subfolder that only absorbs the overflow is a finding, not a fix`,
    });
  }
  return findings.sort((a, b) => a.dir.localeCompare(b.dir));
}

/**
 * Comments are prose, and prose is not an import. TASK 10 spent five denials in one
 * day learning that a guard firing on quoted text is a guard people route around —
 * so the source is stripped of comments before anything is matched against it.
 */
function code(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** `from 'x'`, `import('x')` and bare `import 'x'` — the three ways a module arrives. */
function importsFrom(text, pattern) {
  const src = code(text);
  const quoted = `['"]${pattern}['"]`;
  return (
    new RegExp(`\\bfrom\\s*${quoted}`).test(src) ||
    new RegExp(`\\bimport\\s*\\(\\s*${quoted}\\s*\\)`).test(src) ||
    new RegExp(`\\bimport\\s+${quoted}`).test(src)
  );
}

/**
 * A boundary is a SET of places, declared in config — one or many.
 *
 * The gateway is not a single folder by nature: Astro requires the collection
 * definition to sit at `src/content.config.ts` and to import `astro:content`, so that
 * file is part of the content-access layer by construction, not by preference. Naming
 * the set is declaring where the boundary runs; it is not a roster of components, which
 * is the thing P-13 forbids.
 */
const inside = (path, boundary) =>
  (Array.isArray(boundary) ? boundary : [boundary]).some((p) => path === p || path.startsWith(`${p}/`));

/**
 * S-02. One module family fetches content; everything downstream receives props.
 * The gateway is the only place allowed to know that Astro is what loaded them.
 */
export function checkGatewayBoundary(files, { gateway, core }) {
  return files
    .filter(
      (f) =>
        !inside(f.path, gateway) &&
        // The core has its own, stricter rule below. One violation, one finding:
        // reporting the same file twice teaches people to skim the output.
        !inside(f.path, core) &&
        importsFrom(f.text, 'astro:content'),
    )
    .map((f) => ({
      file: f.path,
      message:
        `${f.path} imports astro:content directly. Only ${gateway}/** may (S-02) — ` +
        `a page or component receives props, so a locale-join defect has one place to live rather than many`,
    }));
}

/**
 * Sub-decision 1. The core is outside src/ so that node:test can run it, which is
 * only true while it imports no framework and never reaches back into the Astro
 * tree. The dependency runs one way: src/ imports lib/, never the reverse.
 */
export function checkCoreIsFrameworkFree(files, { core }) {
  const findings = [];
  for (const f of files.filter((x) => inside(x.path, core))) {
    if (importsFrom(f.text, 'astro:[a-z-]+') || importsFrom(f.text, 'astro')) {
      findings.push({
        file: f.path,
        message: `${f.path} imports Astro. ${core}/** is framework-free by design — it is what node:test runs and Stryker mutates`,
      });
      continue;
    }
    if (/\bfrom\s*['"][^'"]*\bsrc\/[^'"]*['"]/.test(code(f.text))) {
      findings.push({
        file: f.path,
        message: `${f.path} imports from site/src. The dependency runs one way: src/ imports lib/, never the reverse`,
      });
    }
  }
  return findings;
}

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

/**
 * Comments blanked IN PLACE — every non-comment character keeps its original index
 * and every newline survives — so a match found in the result still maps to a
 * truthful line number in the source. `code()` above cannot be reused here: it
 * DELETES comment text, which shifts every line number after a multi-line block
 * comment. Quote-aware for the same reason importsFrom is (TASK 10): a `/*` or `//`
 * sitting inside a real quoted string — an attribute value, a CSS string — is not a
 * comment opener, so quote content is kept rather than dropped (unlike
 * commentsByLine, which only needs to DETECT comments and can safely discard it).
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
      if (state === 'line' || state === 'quote') state = 'code';
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

/** The 1-based line a character offset falls on, counting newlines up to it. */
function lineAtOffset(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text[i] === '\n') line++;
  return line;
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

/**
 * S-01. Splits an .astro file into the two regions that mean something different
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
 * check has to look past the template's own `{ }` boundary at all: `code()`
 * strips comments first so a commented-out declaration is prose, not a binding.
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

/** @param {{path:string,text:string}[]} files  every file under site/, minus the config's exclusions */
export function checkSite(files, cfg) {
  return {
    scanned: files.length,
    dirs: byDirectory(files).size,
    findings: [
      ...checkFileCap(files, cfg),
      ...checkGatewayBoundary(files, cfg),
      ...checkCoreIsFrameworkFree(files, cfg),
      ...checkCommentsCarryNoExternalReference(files, cfg),
      ...checkRouteLiteralsAreDerived(files, cfg),
      ...checkColourAndBreakpointLiteralsAreDeclaredOnce(files, cfg),
      ...checkVisibleStringLiteralsComeFromTheGateway(files, cfg),
    ],
  };
}

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
      if (state === 'line' || state === 'quote') state = 'code';
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
