import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInside, checkPath, checkBashPaths, normalize, readArgsForPattern } from './path-boundary.mjs';

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

// --- TASK 61: write-intent decided by argument ROLE, not exec name or position -----
// sed/perl/awk without an in-place flag are READS; dd only writes through `of=`; cp/ln/
// install only write their DESTINATION (the source is read). mv still writes both ends —
// H-02 forbids "moves", not just writes.

test('RED: sed/perl/awk without an in-place flag are reads, not writes', () => {
  bAllowed("sed -n '1,200p' resources/site/ui.en.md");
  bAllowed("sed -n '9p' evidence/runs/x/y.jsonl");
  bAllowed("awk '{print}' resources/x.md");
  bAllowed('perl -ne print resources/x.md');
});

test('RED: cp/ln read their source, write only their destination', () => {
  bAllowed('cp resources/site/ui.en.md /tmp/ui.md');
  bAllowed('ln -s resources/x.md /tmp/l');
});

test('RED: dd reads if=, and writing only through of= elsewhere is fine', () => {
  bAllowed('dd if=evidence/x of=/tmp/y');
});

test('RED: dd of= into a boundary is denied — the folded live bypass', () => {
  bDenied('dd of=resources/x.md');
  bDenied('dd if=/dev/null of=evidence/runs/t.jsonl');
});

test('anti-regression: in-place edits and destination writes into a boundary stay denied', () => {
  bDenied("sed -i 's/a/b/' resources/x.md");
  bDenied('sed --in-place=.bak s/a/b/ resources/x.md');
  bDenied('perl -pi -e s/a/b/ resources/x.md');
  bDenied('cp /tmp/x.md resources/y.md');
  bDenied('cp -t resources/ /tmp/x.md');
  bDenied('mv resources/a.md /tmp/a.md');
  bDenied('mv /tmp/a.md resources/a.md');
  bDenied('rm -rf resources/');
  bDenied('tee evidence/runs/t.jsonl');
});

// Verify-time backfill (T-03): mutation testing on the closing run found two branches of
// the new logic with no test exercising them — not a defect (checked directly against the
// real code first), a coverage gap. `awk`'s in-place flag is symmetric to sed/perl's and
// untested; `destinationArgs`' positional fallback was only ever exercised with the
// destination as the LAST token, so a mutant collapsing its `.filter(...)` to a no-op still
// picked the right element by coincidence.

test('RED: awk in-place flags are denied exactly like sed/perl, not just recognized when absent', () => {
  bDenied("awk -i inplace '{print}' resources/x.md");
  bDenied("awk --include=x '{print}' resources/x.md");
});

test('RED: a flag AFTER the destination does not defeat the positional fallback', () => {
  bDenied('cp /tmp/x.md resources/y.md -v');
});

// TASK 87. `destinationArgs` filters `args.filter((a) => !a.startsWith('-'))` and takes the
// LAST survivor as "the destination" — the identical raw-text-before-resolution mistake
// TASK 86 fixed in the 'all'/'inplace' loops, but worse: when the real destination is itself
// flag-shaped and reachable only through `..`, the filter drops it, leaving only the SOURCE
// as the sole positional candidate — so the check runs, and passes, against the wrong
// argument entirely. TASK 86's fix ("stop filtering, check everything") does not transplant:
// destinationArgs must still pick exactly ONE argument, and the anti-regression test just
// above (a real trailing flag like `-v` must NOT become "the destination") depends on the
// filter excluding SOMETHING. What distinguishes a real flag from a destination merely
// disguised as one is `/`: no real cp/ln/install flag contains it, and a `..`-climb cannot
// resolve to anything without one.
test('RED: a flag-shaped destination that resolves through .. into a boundary is still denied', () => {
  bDenied('cp /tmp/x.md -/../resources/y.md');
  bDenied('ln -s /tmp/x.md -/../resources/y.md');
});

// The identical bypass with a backslash-separated destination. `tokenize()` (shell.mjs) does
// not treat an unquoted `\` as an escape character at all — an unquoted char is appended
// as-is regardless — so the backslash survives into the argument intact and this is a live
// bypass through the same entry point, not a hypothetical one; verified directly before
// writing this test rather than assumed.
test('RED: the same trick with a backslash-separated destination', () => {
  bDenied('cp /tmp/x.md -\\..\\resources\\y.md');
});

// Anti-regression, restated for this fix specifically: an ordinary trailing flag with no
// separator still stays a flag, never the presumed destination, and a flag-shaped argument
// that does NOT resolve into a boundary stays harmless.
test('anti-regression: an ordinary flag never becomes the presumed destination', () => {
  bDenied('cp /tmp/x.md resources/y.md -v');
  bAllowed('cp /tmp/x.md /tmp/y.md -v');
  bAllowed('cp /tmp/x.md -v');
});

test("RED: a flag AFTER an 'all'-mode target does not defeat the loop", () => {
  bDenied('rm -rf resources/ -v');
  bDenied('mv resources/a.md /tmp/a.md -v');
});

// TASK 83, validated by hand-mutating :175 and rerunning: the two commands above kill
// neither of TASK 61's own surviving mutants at the identical shape (:185) — the target
// is already flagged before the trailing flag is even reached, so the loop's skip logic
// on THAT argument never gets exercised. A target whose own name ends in '-' does: it is
// the one shape where `endsWith('-')` disagrees with `startsWith('-')` about whether the
// TARGET itself is a flag.
test("RED: a target ending in '-' is not itself mistaken for a flag", () => {
  bDenied("rm -rf 'resources/file-'");
});

// TASK 86. The `startsWith('-')` skip runs on an argument's RAW text, before any path
// resolution — so an argument crafted to start with '-' but resolve, once joined to root
// and `..`-resolved, into a protected boundary is skipped outright and never reaches
// `flag()`/`repoRelative` at all. Same evasion class the guard already defends against for
// ordinary arguments ("RED: a path that climbs out and back in is still inside the
// boundary", above) reaching the same tree through a second, unguarded door: the
// flag/target classification itself.
test('RED: a flag-shaped argument that resolves through .. into a boundary is still denied', () => {
  bDenied('rm -rf -/../resources');
  bDenied('mv -/../resources/a.md /tmp/a.md');
});

test('RED: the same trick against the in-place loop', () => {
  bDenied("sed -i 's/a/b/' -/../resources/x.md");
});

// Anti-regression: an ordinary flag is still just a flag, and checking it instead of
// skipping it never turns a legitimate command into a false denial — no realistic flag
// resolves, once joined to root, to a path that equals or starts with a protected boundary.
test('an ordinary flag stays harmless once every argument is checked', () => {
  bAllowed('rm -rf docs/harness -v');
  bAllowed("sed -i 's/a/b/' -v docs/harness/architecture.md");
});

// The `false` mutant (never skip anything) cannot be killed the same way: skipping fewer
// arguments only ever adds MORE flag() calls, and an ordinary flag (`-rf`, `-v`) never
// resolves to a path inside a boundary, so `allowed`/`findings` are identical either way.
// The one construction that does distinguish it is an argument that starts with '-' (so
// `startsWith('-')` skips it, unresolved) but resolves through `..` into the boundary once
// joined to root — `-/../resources`. That is a genuine, separate bypass in the CURRENT
// code, not a test gap: fixing it means resolving an argument's path before deciding it
// looks like a flag, which is a production change outside this item's declared scope
// (test-only, per the TASK 83 hand-off). Tracked as its own item — TASK 86 — rather than
// silently patched in here (P-06) or claimed killed when it was not (P-11).

// --- TASK 84: the shell READ vector for H-04 -------------------------------
// checkBashPaths consulted boundaries.write only; boundaries.read was never checked at all,
// so `cat private/glossary.md` (and every other reader) returned allowed:true. Verified
// directly against the unmodified code before writing this battery (progress/handoff/
// 2026-08-30-task84.md, and progress/2026-08-30-03-task84-read-vector.md).

test('RED: the minimum reproduction from the Done line', () => {
  bDenied('cat private/glossary.md');
  bDenied('grep -r x private/');
  bDenied("sed -n '1p' private/glossary.md");
});

test('RED: the rest of the reader roster reads private/** just as easily', () => {
  ['head private/glossary.md', 'tail private/glossary.md', 'less private/glossary.md',
   'more private/glossary.md', 'tac private/glossary.md', 'od private/glossary.md',
   'xxd private/glossary.md', 'strings private/glossary.md', 'wc private/glossary.md',
   'base64 private/glossary.md', 'diff private/glossary.md /tmp/x',
   'cmp private/glossary.md /tmp/x', "awk '{print}' private/glossary.md",
   'perl -ne print private/glossary.md'].forEach(bDenied);
});

test('RED: cp/ln/install read their SOURCE — the exfiltration shape', () => {
  bDenied('cp private/glossary.md /tmp/out.md');
  bDenied('ln -s private/glossary.md /tmp/l');
  bDenied('install private/glossary.md /tmp/');
});

test('RED: the flag-shaped ..-climb bypass reaches the read boundary too', () => {
  // The identical TASK 86 evasion class, on the read vector instead of the write one: an
  // argument crafted to start with '-' but resolve through '..' into the boundary must not
  // be the one argument the pattern-skip logic exempts, and must not be skipped by an 'all'
  // mode reader either.
  bDenied('cat -/../private/glossary.md');
  bDenied("grep x -/../private/glossary.md");
});

test('RED: an in-place edit of a private file is denied via the READ finding', () => {
  // private is absent from boundaries.write, so the existing 'inplace' WRITES check alone
  // does not catch this — resolved here because sed always reads its target, in-place or not.
  bDenied("sed -i 's/a/b/' private/glossary.md");
});

test('anti-regression: a legitimate search for the word "private" is not mistaken for a read', () => {
  // The documentation trap this fix must not recreate on the read side: the PATTERN argument
  // names "private", but no FILE argument resolves inside the boundary.
  bAllowed('grep -r "private" resources/');
  bAllowed('grep -r "private/glossary.md" docs/');
  bAllowed("sed -n '1p' " + "'the word private is not a path'");
});

test('anti-regression: the new reader commands stay allowed outside private/', () => {
  ['head resources/x.md', 'tail evidence/runs/t.jsonl', 'diff resources/a.md resources/b.md',
   'cp resources/x.md /tmp/y.md', 'ln -s resources/x.md /tmp/l'].forEach(bAllowed);
});

test('RED: egrep/fgrep are pattern-mode readers exactly like grep', () => {
  bDenied('egrep x private/glossary.md');
  bDenied('fgrep x private/glossary.md');
});

// --- adversarial-auditor findings, 2026-08-30: the position-only pattern-skip was wrong -----
// The first version of this fix exempted "the first non-flag-shaped argument" as if it were
// always the pattern. An independent audit found that breaks the instant the pattern is GLUED
// to its flag: the FILE becomes the first non-flag token once the pattern no longer is one.
// Confirmed directly against the real function before the rewrite, not assumed.

test('RED: a pattern glued to its flag no longer exempts the file that follows it', () => {
  bDenied('grep -e. private/glossary.md');
  bDenied('grep --regexp=. private/glossary.md');
  bDenied('sed --expression=p private/glossary.md');
  bDenied('perl -pe1 private/glossary.md');
  bDenied('awk --source={print} private/glossary.md');
});

test('RED: grep/sed -f reads a PATTERN FILE — the flag exempts nothing, the value is a read', () => {
  bDenied('grep -f private/glossary.md /etc/hosts');
  bDenied('grep --file=private/glossary.md /etc/hosts');
  bDenied('sed -f private/glossary.md /etc/hosts');
});

test('readArgsForPattern exempts the pattern by FLAG, not by raw position, when a flag names it', () => {
  // Kills the same class of ArrayDeclaration/StringLiteral mutant the position-only version
  // needed direct unit coverage for, and documents the flag-aware contract precisely.
  assert.deepEqual(readArgsForPattern('grep', ['-r', 'thesis', 'resources/']), ['-r', 'resources/']);
  assert.deepEqual(readArgsForPattern('grep', ['thesis', 'resources/']), ['resources/']);
  assert.deepEqual(readArgsForPattern('grep', ['-n', '-v']), ['-n', '-v']);
  assert.deepEqual(readArgsForPattern('grep', ['-e.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('grep', ['-f', 'private/x', '/etc/hosts']), ['private/x', '/etc/hosts']);
  assert.deepEqual(readArgsForPattern('perl', ['-pe1', 'private/x']), ['private/x']);
});

// --- direct coverage per tool and per form, so every TEXT_FLAG_*/FILE_FLAG_* entry and every
// split/glued branch has a test that would notice it changing or disappearing -----------------

test('readArgsForPattern: every tool recognizes its OWN text-flag letter, glued', () => {
  assert.deepEqual(readArgsForPattern('grep', ['-e.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('egrep', ['-e.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('fgrep', ['-e.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('sed', ['-e.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('perl', ['-e.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('awk', ['x', 'private/x']), ['private/x']); // awk has no -e
});

test('readArgsForPattern: the text-flag letter, SPLIT form, and a dangling flag with no value', () => {
  assert.deepEqual(readArgsForPattern('grep', ['-e', 'x', 'private/y']), ['private/y']);
  assert.deepEqual(readArgsForPattern('grep', ['-e']), []); // nothing follows — nothing to consume
});

test('readArgsForPattern: every tool recognizes its OWN long text-flag form, split and glued', () => {
  assert.deepEqual(readArgsForPattern('grep', ['--regexp=.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('egrep', ['--regexp=.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('fgrep', ['--regexp=.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('sed', ['--expression=.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('awk', ['--source=.', 'private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('grep', ['--regexp', '.', 'private/x']), ['private/x']);
});

test('readArgsForPattern: every tool recognizes its OWN file-flag letter, glued and split', () => {
  assert.deepEqual(readArgsForPattern('grep', ['-fprivate/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('egrep', ['-fprivate/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('fgrep', ['-fprivate/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('sed', ['-fprivate/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('awk', ['-fprivate/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('grep', ['-f', 'private/x']), ['private/x']);
});

test('readArgsForPattern: every tool recognizes its OWN long file-flag form, split and glued', () => {
  assert.deepEqual(readArgsForPattern('grep', ['--file=private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('egrep', ['--file=private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('fgrep', ['--file=private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('sed', ['--file=private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('awk', ['--file=private/x']), ['private/x']);
  assert.deepEqual(readArgsForPattern('grep', ['--file', 'private/x']), ['private/x']);
});

test('readArgsForPattern: a file-flag anywhere suppresses the bare-positional exemption too', () => {
  // grep -f PATFILE FILE has no positional pattern at all — FILE must stay checked, not
  // wrongly exempted as if it were an implicit bare pattern (the second real audit finding).
  assert.deepEqual(readArgsForPattern('grep', ['-f', 'private/x', '/etc/hosts']), ['private/x', '/etc/hosts']);
});

test('RED: cp -t glued to its value (no space) still resolves the real destination', () => {
  // destinationArgs' glued short-`-t` gap: `-t/tmp` fell through to the positional fallback
  // unrecognized, and — since it contains '/' — TASK 87's own rule kept it as a candidate,
  // leaving the real SOURCE to be picked as the presumed destination and excluded from reads.
  bDenied('cp -t/tmp private/glossary.md');
});

test('RED: ln with a single positional and no explicit target links the SOURCE, not a destination', () => {
  // destinationArgs' fallback was built for cp/install, which need two positionals to do
  // anything. `ln SOURCE` alone is valid and links SOURCE into the cwd — the one argument IS
  // the source being read, and treating it as an implicit destination excluded the only thing
  // there was to check.
  bDenied('ln private/glossary.md');
  bDenied('ln -sf private/glossary.md');
});

test('anti-regression: cp/ln keep excluding an explicit destination correctly', () => {
  bAllowed('cp resources/x.md /tmp/y.md');
  bAllowed('ln -s resources/x.md /tmp/l');
  bAllowed('cp -t /tmp resources/x.md');
  bDenied('cp -t /tmp private/glossary.md');
  bDenied('cp -t/tmp private/glossary.md');
  bDenied('cp -tprivate private/glossary.md'); // glued -t with no separator still hits the short branch
});

test('hasExplicitTargetFlag finds -t among several arguments — not only when every argument is it', () => {
  // Kills the .some -> .every mutant. `ln -t private/x` has an explicit target (`-t`
  // consuming the ONE remaining argument as the directory, not a source), so nothing is left
  // to check — real code stays allowed. Under `.every`, '-t' present alongside a non-matching
  // argument makes hasExplicitTargetFlag WRONGLY false, the ln single-positional special case
  // fires instead, and the very same argument gets checked and denied.
  bAllowed('ln -t private/x');
});

test('a cp/ln/install DESTINATION inside private/ is not itself flagged as a source read', () => {
  // sourceArgs must exclude the resolved destination, not just filter it coincidentally.
  // Writing INTO private/ is a real, separate, and already-tracked gap (private/ carries no
  // write boundary at all) — H-04 governs reading, and this command reads only /tmp/x.md.
  bAllowed('cp /tmp/x.md private/out.md');
});

test('the ln single-positional special case is scoped to ln — not cp/install too', () => {
  // A single positional means something different for each: cp/install need TWO positionals
  // to do anything real, so a lone one is invalid usage that reads nothing either way; only
  // ln's single-argument form is valid AND actually reads that one argument.
  bAllowed('install private/glossary.md');
});

test('hasExplicitTargetFlag: every -t spelling is recognized on its own, not only in combination', () => {
  bDenied('ln --target-directory /tmp private/glossary.md');
  bAllowed('ln --target-directory private/x'); // consumed as -t's OWN value, nothing left to read
  bDenied('ln -t. private/glossary.md');       // glued short -t with a single-char value
});

test('mv is not a READS-roster command — moving a private/** path is a tracked, separate gap', () => {
  // Documents the boundary deliberately, per the approved plan: mv writes both ends (WRITES
  // 'all'), but private/ carries no write boundary either, so this stays allowed today. Also
  // kills the ConditionalExpression mutant that would fold every unlisted head into the
  // 'source' branch once rmode fails to match 'all'/'pattern' first.
  bAllowed('mv private/glossary.md /tmp/dest');
});

test('the how reason names the deciding argument, not the bare command name', () => {
  const sedR = checkBashPaths("sed -i 's/a/b/' resources/x.md", B, ROOT);
  assert.equal(sedR.allowed, false);
  assert.equal(sedR.findings.find((f) => f.boundary === 'resources').how, 'sed -i');

  const cpR = checkBashPaths('cp /tmp/x.md resources/y.md', B, ROOT);
  assert.equal(cpR.allowed, false);
  assert.equal(cpR.findings.find((f) => f.boundary === 'resources').how, 'cp (destination)');

  const ddR = checkBashPaths('dd of=resources/x.md', B, ROOT);
  assert.equal(ddR.allowed, false);
  assert.equal(ddR.findings.find((f) => f.boundary === 'resources').how, 'dd of=');
});
