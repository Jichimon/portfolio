#!/usr/bin/env node
// C-05 · confidentiality. Thin CLI over lib/terms.mjs.
//
// Scans the WHOLE repository minus guards.config.json's exclusion list. The shell version
// this replaces scanned a hardcoded roster of five paths, so docs/, .claude/ and scripts/
// were never checked and nothing said so (P-13, INC-07).
//
// This process reads private/banned-terms.txt; no agent does. The findings it prints carry
// the location and mask the term, so the guard cannot become the leak (H-04).

import { readFileSync, readdirSync, statSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseTerms, isExcluded, isBinary, scanText, formatFinding } from '../lib/terms.mjs';

// `--root <dir>` scans another tree. It exists for this guard's OWN tests, which build a
// fixture repository with fixture terms — the only way to prove the walk and the masking in
// red without a real banned term entering the transcript (P-14, H-04). A fixture run skips
// the git checks below, which are about THIS repository, and says so in its output.
const OVERRIDE = process.argv.indexOf('--root') >= 0 ? process.argv[process.argv.indexOf('--root') + 1] : null;
const ROOT = OVERRIDE ? resolve(OVERRIDE) : join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const TERMS_FILE = 'private/banned-terms.txt';

const fail = (msg) => { console.error(`FAIL  check-terms  ${msg}`); process.exit(1); };

const termsPath = join(ROOT, TERMS_FILE);
if (!existsSync(termsPath)) {
  fail(`${TERMS_FILE} not found. Cannot verify, so refusing to pass — a confidentiality check that cannot read its own term list must never report clean.`);
}

const terms = parseTerms(readFileSync(termsPath, 'utf8'));
if (terms.length === 0) fail(`${TERMS_FILE} defines no terms. An empty list makes every scan pass, which is worse than no scan at all.`);

const exclusions = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).exclusions.paths;

/** Head of the file only — enough for the binary heuristic, cheap for large assets. */
function head(path, n = 8192) {
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(n);
    return buf.subarray(0, readSync(fd, buf, 0, n, 0));
  } finally { closeSync(fd); }
}

const findings = [];
let scanned = 0;
let skippedBinary = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    const rel = relative(ROOT, abs);
    if (isExcluded(rel, exclusions)) continue;
    if (entry.isDirectory()) { walk(abs); continue; }
    if (!entry.isFile()) continue;
    if (statSync(abs).size === 0) continue;
    if (isBinary(head(abs))) { skippedBinary++; continue; }
    scanned++;
    for (const hit of scanText(readFileSync(abs, 'utf8'), terms)) findings.push(formatFinding(rel, hit));
  }
}
walk(ROOT);

// A scan that covered nothing must not print PASS. INC-08's shape: the guard that ran zero
// times while everything looked green.
if (scanned === 0) fail('scanned 0 files. Either the exclusion list swallowed the repository or the walk is broken.');

if (!OVERRIDE) {
  const git = (...args) => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
  if (git('check-ignore', '-q', 'private').status !== 0) {
    findings.push('private/ is NOT gitignored — the mapping is one commit away from being published.');
  }
  if (git('ls-files', '--error-unmatch', 'private').status === 0) {
    findings.push('private/ is tracked by git. Run: git rm -r --cached private');
  }
}

console.log(`      ${terms.length} terms × ${scanned} files scanned (${skippedBinary} binary skipped), whole repo minus ${exclusions.length} exclusions${OVERRIDE ? ' — FIXTURE ROOT, git checks skipped' : ''}`);

if (findings.length === 0) {
  console.log('PASS  check-terms');
  process.exit(0);
}
console.error(`FAIL  check-terms  ${findings.length} finding(s) — terms are masked; open the cited banned-terms.txt line to identify one`);
for (const f of findings) console.error(`  ${f}`);
console.error('\nConfidentiality check FAILED. Do not publish.');
process.exit(1);
