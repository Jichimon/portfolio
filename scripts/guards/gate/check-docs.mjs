#!/usr/bin/env node
// Step 10's second acceptance check: every path a LIVING document points at exists, and the
// CI workflow carries no path filter.
//
// Two guards in one CLI because they share a subject — the documents and the workflow are
// both places a claim can quietly stop being true, and neither had anything checking it.
//
// Dated work logs are deliberately excluded from the link check. A log citing a since-renamed
// path is correct history, and rewriting one is falsifying a record rather than reconciling
// a document. The filter is a property — a log is a dated file — not a roster.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractRefs, validateRefs } from '../lib/doc-links.mjs';
import { validateWorkflow } from '../lib/ci.mjs';
import { logDate } from '../lib/procedures.mjs';
import { makeIgnoreOracle } from '../lib/repo-ignore.mjs';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const WORKFLOW = '.github/workflows/harness.yml';

const cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).docs ?? {};
const findings = [];

/** Every living markdown document: not a dated log, not an excluded historical file. */
function livingDocs(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    const rel = relative(ROOT, abs).split('\\').join('/');
    if ((cfg.exclude ?? []).some((x) => rel === x || rel.startsWith(x + '/'))) continue;
    if (e.isDirectory()) { livingDocs(abs, out); continue; }
    if (!/\.(md|ya?ml)$/.test(e.name)) continue;
    if (logDate(e.name)) continue; // a dated log is history, not a living document
    out.push(rel);
  }
  return out;
}

const roots = (cfg.roots ?? []).filter((r) => existsSync(join(ROOT, r)));
const docs = [];
for (const r of roots) {
  const abs = join(ROOT, r);
  const files = statSync(abs).isDirectory() ? livingDocs(abs) : [r];
  for (const f of files) {
    docs.push({ file: f, refs: extractRefs(readFileSync(join(ROOT, f), 'utf8')) });
  }
}

/** A reference resolves against the repository root or against the citing file's directory. */
const resolves = (ref, from) =>
  existsSync(join(ROOT, ref)) || (from && existsSync(join(ROOT, dirname(from), ref)));

// TASK 112. `git check-ignore` is the repository's own answer to "do you deliberately
// exclude this path?", asked once per distinct reference and cached. It is the same source
// of truth the checkout obeys, which is why it is asked rather than a list of paths kept
// here (P-13). The `-q` form is silent and answers with its exit status alone.
const ignoresPath = makeIgnoreOracle((ref) =>
  spawnSync('git', ['check-ignore', '-q', '--', ref], { cwd: ROOT, encoding: 'utf8' }),
);

findings.push(...validateRefs(docs, resolves, cfg.ignore ?? [], ignoresPath));

// --- the workflow -----------------------------------------------------------
const wf = join(ROOT, WORKFLOW);
if (!existsSync(wf)) {
  findings.push({ message: `${WORKFLOW} does not exist — CI cannot be a done-dimension that is merely intended` });
} else {
  for (const f of validateWorkflow(readFileSync(wf, 'utf8'), { gateCommand: 'node scripts/gate.mjs', minNode: 24 })) {
    findings.push({ message: `${WORKFLOW}: ${f.message}` });
  }
}

const refCount = docs.reduce((n, d) => n + d.refs.length, 0);
// `info` findings are not defects: they are references into paths the repository excludes on
// purpose, and printing every one BY NAME is the whole mitigation for excusing them at all
// (repo-ignore.mjs states the residual). Split before the verdict, never counted as failures.
const machineLocal = findings.filter((f) => f.info);
const defects = findings.filter((f) => !f.info);

console.log(`      ${docs.length} living document(s), ${refCount} path reference(s) resolved · ${(cfg.ignore ?? []).length} reasoned exemption(s)`);
if (machineLocal.length) {
  console.log(`      ${machineLocal.length} machine-local reference(s) the repository deliberately excludes — not verifiable from a checkout:`);
  for (const f of machineLocal) console.log(`        ${f.message}`);
}
console.log(`      ${WORKFLOW}: no path filter, runs the gate — live against a real remote since TASK 30/106 (T-10)`);

if (defects.length === 0) {
  console.log('PASS  check-docs');
  process.exit(0);
}
console.error(`FAIL  check-docs  ${defects.length} finding(s)`);
for (const f of defects) console.error(`  ${f.message}`);
process.exit(1);
