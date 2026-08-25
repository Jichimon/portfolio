#!/usr/bin/env node
// Thin CLI over lib/site-structure.mjs. Walks site/, minus the config's exclusions,
// and hands every file to the property checks (ADR-008, rules S-02 and S-03).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSite } from '../lib/site-structure.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const guardsConfig = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8'));
const cfg = guardsConfig.site;
const contentCfg = guardsConfig.content;

const repoPath = (abs) => relative(ROOT, abs).split(sep).join('/');

/**
 * Only source text can carry an import; a stylesheet cannot, but the token check needs
 * to read one anyway to derive the sanctioned breakpoint set (S-05). Two disjoint lists
 * rather than one widened one, because sourceExtensions is scoped by a stated property —
 * only these can carry an import — and folding .css into it would leave the three import
 * checks scanning a file their own rationale says they should not.
 */
const readsContentFor = (name) =>
  cfg.sourceExtensions.includes(extname(name)) || cfg.styleExtensions.includes(extname(name));

function walk(abs, out = []) {
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (cfg.exclusions.includes(entry.name)) continue;
    const child = join(abs, entry.name);
    if (entry.isDirectory()) walk(child, out);
    else out.push({ path: repoPath(child), text: readsContentFor(entry.name) ? readFileSync(child, 'utf8') : '' });
  }
  return out;
}

const siteRoot = join(ROOT, cfg.root);
if (!existsSync(siteRoot)) {
  // Declared, never silent (P-03). gate.mjs also skips this step, so the two agree.
  console.log(`      ${cfg.root}/ does not exist yet — nothing to check`);
  console.log('SKIP  check-site');
  process.exit(0);
}

/**
 * S-08's reference set, DERIVED from the repository's own top level rather than listed
 * (P-13): every sibling directory of site/, plus the Markdown documents beside it. A
 * directory added next month is covered without anyone remembering to edit a roster.
 */
function externalDocumentReferences() {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.name !== cfg.root)
    .filter((e) => e.isDirectory() || extname(e.name) === '.md')
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
}

/**
 * CONTENT-006. The slug set, DERIVED from the filenames under the content roots —
 * never listed anywhere — so a sixth case study is covered with no edit (P-13). A
 * locale-suffixed markdown filename names a slug; a diagram, the profile README and
 * the intake questionnaire carry no locale suffix and are excluded by that shape,
 * never by naming the file.
 */
function contentSlugsFromDisk(roots, locales) {
  const localeSuffixed = new RegExp(`^(.+)\\.(?:${locales.join('|')})\\.md$`);
  const slugs = new Set();
  function walkForSlugs(abs) {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const child = join(abs, entry.name);
      if (entry.isDirectory()) walkForSlugs(child);
      else {
        const match = entry.name.match(localeSuffixed);
        if (match) slugs.add(match[1]);
      }
    }
  }
  for (const root of roots) walkForSlugs(join(ROOT, root));
  return [...slugs];
}

const r = checkSite(walk(siteRoot), {
  ...cfg,
  externalDocumentReferences: externalDocumentReferences(),
  recordIdPattern: cfg.commentRecordIdPattern,
  contentSlugs: contentSlugsFromDisk(contentCfg.roots, contentCfg.locales),
  locales: contentCfg.locales,
});

console.log(
  `      ${r.scanned} file(s) across ${r.dirs} director(ies) · cap ${cfg.maxFilesPerDir} · gateway ${cfg.gateway} · core ${cfg.core}`,
);

if (r.findings.length === 0) {
  console.log('PASS  check-site');
  process.exit(0);
}
console.error(`FAIL  check-site  ${r.findings.length} finding(s)`);
for (const f of r.findings) console.error(`  ${f.message}`);
process.exit(1);
