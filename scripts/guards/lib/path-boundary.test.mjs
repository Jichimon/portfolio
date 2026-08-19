import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInside, checkPath, checkBashPaths, normalize } from './path-boundary.mjs';

const B = { write: ['resources', 'evidence', '.git'], read: ['private'] };
const ROOT = 'c:/dev/projects/portfolio';

const wDenied = (p) => assert.equal(checkPath(p, B, 'write', ROOT).allowed, false, `should DENY write: ${p}`);
const wAllowed = (p) => assert.equal(checkPath(p, B, 'write', ROOT).allowed, true, `should ALLOW write: ${p}`);

// --- boundary matching is segment-aware -------------------------------------

test('a boundary matches itself and its descendants', () => {
  assert.equal(isInside('resources', 'resources'), true);
  assert.equal(isInside('resources/case-studies/x.md', 'resources'), true);
});

test('RED: a sibling with a shared prefix is NOT inside the boundary', () => {
  // "resources-draft" must not be protected just because it starts with "resources",
  // and more importantly "evidenceX" must not be MISTAKEN for "evidence".
  assert.equal(isInside('resources-draft/x.md', 'resources'), false);
  assert.equal(isInside('evidenceX/trace.jsonl', 'evidence'), false);
});

// --- file tool vector -------------------------------------------------------

test('RED: writes inside every protected boundary are denied', () => {
  ['resources/case-studies/x.en.md', 'evidence/runs/r1/trace.jsonl', '.git/config',
   '.git/hooks/pre-commit'].forEach(wDenied);
});

test('RED: path spellings that reach the same place are denied', () => {
  // The boundary is the location, not the string the agent happened to type.
  wDenied('./resources/x.md');
  wDenied('resources\\case-studies\\x.md');
  wDenied('c:/dev/projects/portfolio/resources/x.md');
});

test('writes outside the boundaries pass', () => {
  ['docs/harness/architecture.md', 'scripts/gate.mjs', 'TASKS.md',
   '.gitignore', '.gitattributes'].forEach(wAllowed);
});

test('.gitignore is not inside .git — a segment boundary, not a prefix', () => {
  // Editing .gitignore is ordinary work; editing .git/config rewrites the repository.
  wAllowed('.gitignore');
  wDenied('.git/config');
});

test('read boundaries are separate from write boundaries', () => {
  assert.equal(checkPath('private/glossary.md', B, 'read', ROOT).allowed, false);
  assert.equal(checkPath('resources/x.md', B, 'read', ROOT).allowed, true);
});

// --- bash vector ------------------------------------------------------------

const bDenied = (c) => assert.equal(checkBashPaths(c, B, ROOT).allowed, false, `should DENY: ${c}`);
const bAllowed = (c) => assert.equal(checkBashPaths(c, B, ROOT).allowed, true, `should ALLOW: ${c}`);

test('RED: redirects into a boundary are denied', () => {
  ['echo x > resources/case-studies/a.md', 'echo x >> evidence/runs/r1/trace.jsonl',
   'cat f > .git/config', 'echo x 2> evidence/log'].forEach(bDenied);
});

test('RED: mutators targeting a boundary are denied', () => {
  ['rm -rf resources/', 'mv a.md resources/b.md', 'cp x evidence/y',
   'truncate -s 0 evidence/runs/r1/trace.jsonl', 'tee evidence/runs/r1/trace.jsonl',
   'sed -i s/a/b/ resources/x.md'].forEach(bDenied);
});

test('RED: the same write hidden behind a chain or a wrapper is denied', () => {
  bDenied('echo ok && rm -rf resources/');
  bDenied('sh -c "rm -rf evidence"');
});

test('reading inside a write-boundary is fine — the boundary is on writes', () => {
  // An agent must be able to READ resources/; it is the input the site is built from.
  ['cat resources/case-studies/x.md', 'grep -r thesis resources/',
   'node scripts/gate.mjs', 'ls evidence/runs'].forEach(bAllowed);
});

test('writes outside the boundaries pass', () => {
  ['echo x > docs/notes.md', 'rm /tmp/scratch', 'mv a.md b.md'].forEach(bAllowed);
});

test('the finding names the boundary and how it was reached', () => {
  const r = checkBashPaths('echo x > resources/a.md', B, ROOT);
  assert.equal(r.allowed, false);
  assert.equal(r.findings[0].boundary, 'resources');
  assert.equal(r.findings[0].how, 'redirect');
});

test('a script the agent wrote and then runs is NOT caught — stated, not hidden', () => {
  // Residual risk, recorded deliberately: this guard reads commands, and cannot follow
  // execution into a file. architecture.md §L states the blast radius that follows.
  bAllowed('node ./scratch/writer.mjs');
});

// --- the dot-dot escape -----------------------------------------------------
// Found by a sibling guard's test, not by reading this one. `isInside` compared normalized
// STRINGS, so a path that leaves a directory and comes back reached the protected tree while
// failing the prefix test. Live in H-02 and H-03 enforcement from step 6 until step 8.

test('RED: a path that climbs out and back in is still inside the boundary', () => {
  for (const p of [
    'docs/../resources/case-studies/x.en.md',
    'a/b/../../evidence/runs/t.jsonl',
    'scripts/./../.git/config',
  ]) {
    assert.equal(checkPath(p, B, 'write', '').allowed, false, `${p} escaped the boundary`);
  }
});

test('RED: a relative path that leaves the repository and re-enters it is caught', () => {
  // Only recognizable with the root in hand: resolved in isolation this is
  // `portfolio/resources/x.md`, which matches no boundary.
  const root = 'c:/dev/projects/portfolio';
  assert.equal(checkPath('docs/../../portfolio/resources/x.md', B, 'write', root).allowed, false);
  assert.equal(checkPath('c:/dev/projects/portfolio/resources/x.md', B, 'write', root).allowed, false);
  assert.equal(checkPath('docs/notes.md', B, 'write', root).allowed, true);
});

test('RED: the same trick against the read boundary', () => {
  assert.equal(checkPath('docs/../private/glossary.md', B, 'read', '').allowed, false);
});

test('RED: the same trick through a shell redirect', () => {
  assert.equal(checkBashPaths('echo x > docs/../resources/a.md', B, '').allowed, false);
});

test('a dot-dot that genuinely leaves the boundary is not flagged', () => {
  // The fix must not over-correct into denying ordinary relative paths.
  assert.equal(checkPath('resources/../docs/notes.md', B, 'write', '').allowed, true);
  assert.equal(checkPath('./docs/./notes.md', B, 'write', '').allowed, true);
});

test('normalize resolves . and .. segments', () => {
  assert.equal(normalize('a/b/../c/./d'), 'a/c/d');
  assert.equal(normalize('a/b/'), 'a/b');
  assert.equal(normalize('.//a'), 'a');
});

// --- TASK 10: a redirect written INSIDE data is not a redirect --------------
// The other half. checkBashPaths scanned the whole command with a raw regex, so documenting
// a command — `Remove-Item ... evidence/runs` inside a string being written to a log — fired
// H-03. That happened while writing the log that recorded the previous occurrence.

const NL2 = String.fromCharCode(10);
const RD = String.fromCharCode(62);           // assembled so this file itself stays writable
const APP = RD + RD;

test('RED: a redirect inside a single-quoted string is text, not a redirect', () => {
  const cmd = "echo 'write it with x " + RD + " evidence/runs/t.jsonl'";
  assert.equal(checkBashPaths(cmd, B, '').allowed, true,
    JSON.stringify(checkBashPaths(cmd, B, '').findings));
});

test('RED: a redirect inside a literal heredoc body is documentation', () => {
  const cmd = ["cat <<'EOF'", 'to reset it, run: x ' + APP + ' evidence/runs/t.jsonl', 'EOF'].join(NL2);
  assert.equal(checkBashPaths(cmd, B, '').allowed, true,
    JSON.stringify(checkBashPaths(cmd, B, '').findings));
});

test('RED: a mutator named inside quoted text is not a mutator', () => {
  const cmd = "echo 'the command is rm -rf resources/case-studies'";
  assert.equal(checkBashPaths(cmd, B, '').allowed, true);
});

// --- and every real write must still be denied -------------------------------

test('a real redirect into a boundary is still denied', () => {
  assert.equal(checkBashPaths('echo x ' + RD + ' evidence/runs/t.jsonl', B, '').allowed, false);
  assert.equal(checkBashPaths('echo x ' + APP + ' resources/a.md', B, '').allowed, false);
});

test('a redirect whose TARGET is quoted is still denied — the quote is on the path', () => {
  // Quoting the destination does not make the redirect data. This is the case that would be
  // lost by blanking every quoted span instead of understanding where the redirect operator
  // sits, and losing it would trade a false positive for a real bypass.
  assert.equal(checkBashPaths('echo x ' + RD + " 'evidence/runs/t.jsonl'", B, '').allowed, false);
});

test('a real mutator is still denied', () => {
  assert.equal(checkBashPaths('rm -rf evidence/runs', B, '').allowed, false);
  assert.equal(checkBashPaths('mv notes.md resources/a.md', B, '').allowed, false);
});

test('a redirect inside an EXPANDING heredoc substitution is still denied', () => {
  const cmd = ['cat <<EOF', 'x: $(echo y ' + RD + ' evidence/runs/t.jsonl)', 'EOF'].join(NL2);
  assert.equal(checkBashPaths(cmd, B, '').allowed, false);
});
