// Sub-decision 1 — the core imports no framework and never reaches into src/ (ADR-008).
// TASK 109 split this out of the former monolithic site-structure.mjs; nothing here changed
// behavior.

import { inside, importsFrom, code } from './shared.mjs';

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
