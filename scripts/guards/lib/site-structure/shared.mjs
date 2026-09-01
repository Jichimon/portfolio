// Primitives shared by more than one S-* checker (TASK 109). Each of these was defined once
// in the pre-split site-structure.mjs and used by several of the checkers below it; splitting
// that file into one module per rule (S-01, S-02, S-03, S-05, S-08, sub-decision 1, TASK 89)
// left exactly these four with more than one importer, which is what earns them a home here
// rather than in whichever rule file happened to need them first.

/**
 * Comments are prose, and prose is not an import. TASK 10 spent five denials in one
 * day learning that a guard firing on quoted text is a guard people route around —
 * so the source is stripped of comments before anything is matched against it.
 */
export function code(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/** `from 'x'`, `import('x')` and bare `import 'x'` — the three ways a module arrives. */
export function importsFrom(text, pattern) {
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
export const inside = (path, boundary) =>
  (Array.isArray(boundary) ? boundary : [boundary]).some((p) => path === p || path.startsWith(`${p}/`));

/** The 1-based line a character offset falls on, counting newlines up to it. */
export function lineAtOffset(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text[i] === '\n') line++;
  return line;
}
