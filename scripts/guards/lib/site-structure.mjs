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
 * S-03. The cap comes from config, never from a literal here — the number is
 * calibrated in guards.config.json alongside its written reason.
 */
export function checkFileCap(files, { maxFilesPerDir }) {
  const findings = [];
  for (const [dir, count] of byDirectory(files)) {
    if (count < maxFilesPerDir + 1) continue;
    findings.push({
      dir,
      count,
      message:
        `${dir} holds ${count} files. At ${maxFilesPerDir + 1} the directory is split into ` +
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
