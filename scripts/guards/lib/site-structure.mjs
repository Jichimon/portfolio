// The site's shape, as properties rather than as prose (ADR-008).
//
// TASK 109: this used to be the whole implementation — 877 lines, eight unrelated S-* rule
// checkers in one file, and a header comment that claimed "three things" while the file did
// eight. The audit that found it (TASK 108's session) also found it was the single largest
// and worst-covered file in the mutation surface: 1126 mutants, 16.2% of scripts/guards/lib/**,
// worst kill rate among large files. Split into `site-structure/`, one module per rule, so a
// reader finds S-01's ~250 lines beside S-01's own tests rather than inside a file that also
// enforces S-03 and TASK 89's config rule. This file is now a barrel: every import site outside
// this directory (check-site.mjs, gate.mjs's redProof, ADR-008, 00-hard-rules.md's registry)
// keeps citing `scripts/guards/lib/site-structure.mjs` and needs no edit for the split itself.
export * from './site-structure/index.mjs';
