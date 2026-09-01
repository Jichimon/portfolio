// A config file declares; it does not act (TASK 89). TASK 109 split this out of the former
// monolithic site-structure.mjs; nothing here changed behavior.
//
// site/astro.config.mjs swept stale cache directories from its MODULE BODY, which meant the
// sweep ran in every process that loaded the config — not only `astro build`, but `astro
// check`, `astro preview`, `vitest run` (through `getViteConfig()`), and anything running
// inside a Stryker sandbox, whose `site/node_modules` is a symlink to the real one.
// Demonstrated rather than argued: two directories planted in the real `site/node_modules`
// were both deleted by a plain `vitest run`. A test runner garbage-collecting a build cache
// is an ordering hazard, and the only thing that made it possible was the config reaching
// for `rmSync`.
//
// So the property is about the FILE, not about the line: a config may not reach a mutating
// filesystem API at all. That needs no scope analysis and no brace counting, and it cannot be
// walked around by wrapping the call in a top-level IIFE.
//
// The allowlist is INVERTED on purpose — it names the read-only APIs, so an API nobody
// thought of is a finding by default rather than a silent pass (P-13). A namespace or default
// import is a finding for the same reason `G-13` makes a guard that cannot evaluate deny:
// nobody can see statically what `fs.*` reaches for.

import { code } from './shared.mjs';

/** @param {{path:string,text:string}[]} files  every file under site/, minus the config's exclusions */
export function checkConfigsDeclareRatherThanAct(files, { configFileMarker, readOnlyFsApis }) {
  const findings = [];
  const isConfig = (path) => path.split('/').pop().includes(configFileMarker);
  // 'fs', 'node:fs' and either of them with a /promises suffix are one boundary under
  // four names; a rule that knew only the one in front of it would be a roster.
  const fsImport = /import\s+([^'"]+?)\s+from\s*['"](?:node:)?fs(?:\/promises)?['"]/g;

  for (const f of files.filter((x) => isConfig(x.path))) {
    for (const [, clause] of code(f.text).matchAll(fsImport)) {
      const named = clause.match(/\{([^}]*)\}/);
      if (!named) {
        findings.push({
          file: f.path,
          message:
            `${f.path} imports the filesystem module as a namespace or default. A config declares, it does not act ` +
            `(TASK 89) — and nobody can see statically what such an import reaches for, so it is a finding rather than a pass`,
        });
        continue;
      }
      const reached = named[1]
        .split(',')
        .map((entry) => entry.split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
      const mutating = reached.filter((api) => !readOnlyFsApis.includes(api));
      if (mutating.length) {
        findings.push({
          file: f.path,
          message:
            `${f.path} imports ${mutating.join(', ')} from the filesystem module. A config file is loaded by every ` +
            `consumer of it — a build, a check, a preview, a test runner, a mutation sandbox — so anything it can do, ` +
            `all of them do (TASK 89). Move the action behind a hook the caller chooses to run`,
        });
      }
    }
  }
  return findings;
}
