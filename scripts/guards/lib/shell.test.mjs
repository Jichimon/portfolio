import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripDataRegions, tokenize, redirectTargets, basename, commandContexts,
} from './shell.mjs';

// TASK 38: shell.mjs is the tokenizer git-write.mjs (H-01) and path-boundary.mjs
// (H-02/H-03) are both built on, and it had no colocated test file at all — only
// exercised indirectly through those two guards' tests. Every assertion below is
// framed around what those callers actually read off these functions: which
// commands a string contains (commandContexts -> argv/via/env), which paths it
// touches (redirectTargets), and which program a command names (basename) — per
// T-07, not internal bookkeeping the callers never see.

const NL = String.fromCharCode(10);
const GT = String.fromCharCode(62);   // '>' assembled so this file's own source
const GTGT = GT + GT;                 // never contains a literal redirect operator

// -----------------------------------------------------------------------------
// tokenize — turns one segment into the argv a command would receive
// -----------------------------------------------------------------------------

test('tokenize: whitespace-separated words become separate tokens', () => {
  assert.deepEqual(tokenize('git push origin'), ['git', 'push', 'origin']);
  assert.deepEqual(tokenize('a  b\tc' + NL + 'd'), ['a', 'b', 'c', 'd']);
});

test('tokenize: empty and whitespace-only input produce no tokens', () => {
  assert.deepEqual(tokenize(''), []);
  assert.deepEqual(tokenize('   ' + NL + '\t'), []);
});

test('tokenize: double quotes group words into one token and are stripped', () => {
  assert.deepEqual(tokenize('"commit message" -m'), ['commit message', '-m']);
});

test('tokenize: single quotes group words into one token and are stripped', () => {
  assert.deepEqual(tokenize("'commit message' -m"), ['commit message', '-m']);
});

test('tokenize: quoted and unquoted text touching each other form one token', () => {
  // No space between the closing quote and the next char — a real shell concatenates.
  assert.deepEqual(tokenize('a"b c"d'), ['ab cd']);
});

test('tokenize: an empty quoted argument is a real, empty token', () => {
  // Distinguishes "no argument" from "an argument that is the empty string".
  assert.deepEqual(tokenize('git commit -m ""'), ['git', 'commit', '-m', '']);
});

test('tokenize: an unterminated quote still yields whatever it collected', () => {
  assert.deepEqual(tokenize("echo 'unterminated"), ['echo', 'unterminated']);
  assert.deepEqual(tokenize("'"), ['']);
});

test('tokenize: a backslash-escaped quote does not close the quote', () => {
  // segment is: "a\"b"  (six characters) — the escaped quote stays inside the token
  // rather than ending it early, which is what makes `"a\"b" c` two tokens, not three.
  assert.deepEqual(tokenize('"a\\"b" c'), ['a\\"b', 'c']);
});

test('tokenize: Windows paths with backslashes pass through as one token', () => {
  assert.deepEqual(tokenize('C:\\Users\\dev\\git.exe push'), ['C:\\Users\\dev\\git.exe', 'push']);
});

// -----------------------------------------------------------------------------
// redirectTargets — the file a command writes to, quote-aware (TASK 10)
// -----------------------------------------------------------------------------

test('redirectTargets: no operator, no target', () => {
  assert.deepEqual(redirectTargets('echo hello'), []);
});

test('redirectTargets: a plain redirect names its target', () => {
  assert.deepEqual(redirectTargets('echo x ' + GT + ' out.txt'), ['out.txt']);
});

test('redirectTargets: append form names its target the same way', () => {
  assert.deepEqual(redirectTargets('echo x ' + GTGT + ' out.txt'), ['out.txt']);
});

test('redirectTargets: fd duplication (>&2) names no file', () => {
  assert.deepEqual(redirectTargets('echo x ' + GT + '&2'), []);
});

test('redirectTargets: a single-quoted target is still a real redirect', () => {
  // TASK 10's positive case: quoting the destination does not make it data.
  assert.deepEqual(redirectTargets("echo x " + GT + " 'evidence/t'"), ['evidence/t']);
});

test('redirectTargets: a double-quoted target with spaces is captured whole', () => {
  assert.deepEqual(redirectTargets('echo x ' + GT + ' "out file.txt"'), ['out file.txt']);
});

test('redirectTargets: the operator INSIDE quotes is text, not a redirect', () => {
  // TASK 10's negative case: `echo 'x > evidence/t'` must find nothing.
  assert.deepEqual(redirectTargets("echo 'x " + GT + " evidence/t'"), []);
});

test('redirectTargets: every redirect in a segment is reported', () => {
  assert.deepEqual(
    redirectTargets('echo x ' + GT + ' a.txt 2' + GT + ' b.txt'),
    ['a.txt', 'b.txt'],
  );
});

test('redirectTargets: an unquoted target stops at the next separator', () => {
  assert.deepEqual(redirectTargets('echo x' + GT + 'a.txt;ls'), ['a.txt']);
  assert.deepEqual(redirectTargets('echo x ' + GT + ' a.txt | cat'), ['a.txt']);
});

test('redirectTargets: a dangling operator with nothing after it names no target', () => {
  assert.deepEqual(redirectTargets('echo x ' + GT), []);
});

test('redirectTargets: Windows paths with backslashes are captured whole, quoted or not', () => {
  assert.deepEqual(
    redirectTargets("echo x " + GT + " 'C:\\Users\\evidence\\t.txt'"),
    ['C:\\Users\\evidence\\t.txt'],
  );
  assert.deepEqual(
    redirectTargets('echo x ' + GT + ' C:\\Users\\evidence\\t.txt'),
    ['C:\\Users\\evidence\\t.txt'],
  );
});

// -----------------------------------------------------------------------------
// basename — the program name a wrapper or guard matches against
// -----------------------------------------------------------------------------

test('basename: strips a Unix directory path', () => {
  assert.equal(basename('/usr/bin/git'), 'git');
});

test('basename: strips a Windows directory path and a known extension', () => {
  assert.equal(basename('C:\\Users\\dev\\git.exe'), 'git');
});

test('basename: extension matching is case-insensitive, and so is the result', () => {
  assert.equal(basename('GIT.CMD'), 'git');
  assert.equal(basename('script.PS1'), 'script');
});

test('basename: an unknown extension is not stripped, only lowercased', () => {
  assert.equal(basename('noext'), 'noext');
  assert.equal(basename('README.MD'), 'readme.md');
});

test('basename: empty input names no program', () => {
  assert.equal(basename(''), '');
});

test('basename: mixed separators still resolve to the last segment', () => {
  assert.equal(basename('a/b\\c.CMD'), 'c');
});

// -----------------------------------------------------------------------------
// stripDataRegions — heredoc bodies and quote contents are DATA, not command text
// -----------------------------------------------------------------------------

test('stripDataRegions(segments): every heredoc body is dropped, expanding or not', () => {
  const expanding = ['cat <<EOF', 'git push', 'EOF'].join(NL);
  const literal = ["cat <<'EOF'", 'git push', 'EOF'].join(NL);
  assert.equal(stripDataRegions(expanding, 'segments').includes('git push'), false);
  assert.equal(stripDataRegions(literal, 'segments').includes('git push'), false);
  // the marker lines themselves survive — only the body between them is removed
  assert.equal(stripDataRegions(expanding, 'segments'), ['cat <<EOF', 'EOF'].join(NL));
});

test('stripDataRegions(substitutions): an EXPANDING heredoc body is kept', () => {
  // <<EOF still expands $() and backticks, so command substitutions inside it are real.
  const cmd = ['cat <<EOF', 'git push', 'EOF'].join(NL);
  assert.equal(stripDataRegions(cmd, 'substitutions').includes('git push'), true);
});

test('stripDataRegions(substitutions): a LITERAL heredoc body is dropped', () => {
  // <<'EOF'/<<"EOF" never expands, so nothing inside it can be a substitution.
  const cmd = ["cat <<'EOF'", 'git push', 'EOF'].join(NL);
  assert.equal(stripDataRegions(cmd, 'substitutions').includes('git push'), false);
});

test('stripDataRegions(substitutions): single-quoted contents are blanked, quotes and length kept', () => {
  const out = stripDataRegions("echo 'git push'", 'substitutions');
  assert.equal(out.includes('git push'), false);
  assert.equal(out, "echo '" + ' '.repeat('git push'.length) + "'");
});

test('stripDataRegions(substitutions): double-quoted contents are KEPT — the shell expands them', () => {
  const cmd = 'echo "$(git push)"';
  assert.equal(stripDataRegions(cmd, 'substitutions'), cmd);
});

test('stripDataRegions(segments): quoted text is untouched — only heredoc bodies are segment data', () => {
  const cmd = "echo 'git push' " + GT + " x";
  assert.equal(stripDataRegions(cmd, 'segments'), cmd);
});

// -----------------------------------------------------------------------------
// commandContexts — every real command hiding in a shell string, per T-07's
// framing: what a caller like checkGitWrite reads is argv[0] (via basename),
// the rest of argv, and `via` (how deep and through what it was found).
// -----------------------------------------------------------------------------

test('commandContexts: a single command is one context', () => {
  const [ctx] = commandContexts('git status');
  assert.deepEqual(ctx.argv, ['git', 'status']);
  assert.deepEqual(ctx.via, []);
  assert.deepEqual(ctx.env, []);
});

test('commandContexts: empty or whitespace-only input finds no commands', () => {
  assert.deepEqual(commandContexts(''), []);
  assert.deepEqual(commandContexts('   ' + NL), []);
});

for (const [name, sep] of [
  ['semicolon', ';'], ['pipe', '|'], ['newline', NL],
]) {
  test('commandContexts: ' + name + ' separates two commands', () => {
    const found = commandContexts('git status' + sep + 'git push')
      .map((c) => c.argv.join(' '));
    assert.deepEqual(found, ['git status', 'git push']);
  });
}

test('commandContexts: && and || separate two commands', () => {
  assert.deepEqual(
    commandContexts('echo ok && git push').map((c) => c.argv.join(' ')),
    ['echo ok', 'git push'],
  );
  assert.deepEqual(
    commandContexts('false || git push').map((c) => c.argv.join(' ')),
    ['false', 'git push'],
  );
});

test('commandContexts: a separator character INSIDE quotes does not split the command', () => {
  for (const sep of [';', '|', '&&']) {
    const ctxs = commandContexts("echo 'a " + sep + " b'");
    assert.equal(ctxs.length, 1, sep + ' should not have split the command');
    assert.deepEqual(ctxs[0].argv, ['echo', 'a ' + sep + ' b']);
  }
});

test('commandContexts: a VAR=value prefix binds the environment, not the command', () => {
  const [ctx] = commandContexts('FOO=bar git push');
  assert.deepEqual(ctx.argv, ['git', 'push']);
  assert.deepEqual(ctx.env, ['FOO=bar']);
});

test('commandContexts: multiple VAR=value prefixes are all captured as env, not argv', () => {
  const [ctx] = commandContexts('A=1 B=2 git push');
  assert.deepEqual(ctx.argv, ['git', 'push']);
  assert.deepEqual(ctx.env, ['A=1', 'B=2']);
});

test('commandContexts: an env assignment with no command finds nothing', () => {
  assert.deepEqual(commandContexts('FOO=bar'), []);
});

test('commandContexts: a $() substitution is found as its own command, marked via substitution', () => {
  const found = commandContexts('echo $(git push)');
  const inner = found.find((c) => c.argv[0] === 'git');
  assert.ok(inner, 'the substituted command must be found');
  assert.deepEqual(inner.argv, ['git', 'push']);
  assert.deepEqual(inner.via, ['substitution']);
});

test('commandContexts: a backtick substitution is found the same way', () => {
  const found = commandContexts('echo `git push`');
  const inner = found.find((c) => c.argv[0] === 'git');
  assert.ok(inner, 'the substituted command must be found');
  assert.deepEqual(inner.via, ['substitution']);
});

test('commandContexts: a substitution nested inside a substitution is still found', () => {
  const found = commandContexts('echo $(echo $(git push))');
  const inner = found.find((c) => c.argv[0] === 'git');
  assert.ok(inner, 'the doubly-nested command must be found');
  assert.deepEqual(inner.argv, ['git', 'push']);
  assert.deepEqual(inner.via, ['substitution', 'substitution']);
});

test('commandContexts: sh -c "..." hides a whole command in a flag argument', () => {
  const found = commandContexts('sh -c "git push origin main"');
  const inner = found.find((c) => c.argv[0] === 'git');
  assert.ok(inner, 'the wrapped command must be found');
  assert.deepEqual(inner.argv, ['git', 'push', 'origin', 'main']);
  assert.deepEqual(inner.via, ['sh']);
});

test('commandContexts: bash -c and other flag wrappers behave the same way', () => {
  const found = commandContexts("bash -c 'git push'");
  const inner = found.find((c) => c.argv[0] === 'git');
  assert.ok(inner);
  assert.deepEqual(inner.via, ['bash']);
});

test('commandContexts: env/timeout/sudo-style wrappers offer every suffix as a candidate', () => {
  // Their own flag grammars are not parsed reliably, so over-reporting is deliberate (INC-07):
  // `timeout 5 git push` must surface a context whose argv actually starts with "git".
  const found = commandContexts('timeout 5 git push');
  const candidate = found.find((c) => c.argv[0] === 'git' && c.argv[1] === 'push');
  assert.ok(candidate, 'a git-push candidate must be among the offered suffixes');
  assert.deepEqual(candidate.via, ['timeout']);
});

test('commandContexts: env git push is found as a git command reached through env', () => {
  const found = commandContexts('env git push');
  const candidate = found.find((c) => c.argv[0] === 'git' && c.argv[1] === 'push');
  assert.ok(candidate);
  assert.deepEqual(candidate.via, ['env']);
});

test('commandContexts: text inside a heredoc body is documentation, not a command', () => {
  // TASK 10: writing a document that quotes a command must not trip a guard.
  const cmd = ['cat <<EOF', 'git push', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, false);
});

test('commandContexts: an unterminated heredoc body is NOT recognized as a heredoc at all', () => {
  // No closing delimiter means heredocSpans finds no span, so the body is read as an
  // ordinary command line rather than silently swallowed or silently exposed by accident.
  const cmd = ['cat <<EOF', 'git push'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, true);
});

test('commandContexts: a command inside an EXPANDING heredoc substitution is still found', () => {
  const cmd = ['cat <<EOF', 'x: $(git push)', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, true);
});

test('commandContexts: a command inside a LITERAL heredoc substitution is not found', () => {
  const cmd = ["cat <<'EOF'", 'x: $(git push)', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, false);
});

test('commandContexts: a Windows path with spaces, quoted, is one program token', () => {
  const [ctx] = commandContexts('"C:\\Program Files\\git.exe" push');
  assert.equal(basename(ctx.argv[0]), 'git');
  assert.deepEqual(ctx.argv.slice(1), ['push']);
});

test('commandContexts: a Windows path with backslashes, unquoted (no spaces), is one program token', () => {
  const [ctx] = commandContexts('C:\\Git\\bin\\git.exe push');
  assert.equal(basename(ctx.argv[0]), 'git');
  assert.deepEqual(ctx.argv.slice(1), ['push']);
});

test('commandContexts: pathological nesting depth is bounded rather than followed forever', () => {
  // depth is the function's own recursion parameter: at 6 it still processes normally,
  // past 6 it refuses outright ("pathological nesting is not a legitimate command").
  assert.deepEqual(
    commandContexts('git push', [], 6).map((c) => c.argv.join(' ')),
    ['git push'],
  );
  assert.deepEqual(commandContexts('git push', [], 7), []);
});

test('commandContexts: a redirect target reached through checkBashPaths-style usage survives quoting', () => {
  // Integration-shaped: the exact pairing path-boundary.mjs relies on — decompose, then
  // read redirectTargets off each context's raw text.
  const ctxs = commandContexts("echo x " + GT + " 'evidence/t.jsonl'");
  const targets = ctxs.flatMap((c) => redirectTargets(c.raw));
  assert.deepEqual(targets, ['evidence/t.jsonl']);
});

test('commandContexts: a git subcommand hidden behind a chained wrapper is still reachable', () => {
  // Mirrors path-boundary.test.mjs / git-write.test.mjs's own chained-wrapper case.
  const found = commandContexts('echo ok && sh -c "git push"')
    .some((c) => c.argv[0] === 'git' && c.argv[1] === 'push');
  assert.equal(found, true);
});
