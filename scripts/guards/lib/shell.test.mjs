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

// -----------------------------------------------------------------------------
// TASK 92 — a heredoc marker inside a comment (or a quote) is not real shell syntax,
// and heredocSpans must not treat it as one. Found by an adversarial-auditor pass on
// TASK 84, independently re-verified before being recorded (P-11).
// -----------------------------------------------------------------------------

test('commandContexts: a `<<EOF` inside a comment is not a real heredoc opener', () => {
  // Bash treats line 1 as an ordinary comment and executes line 2 for real — the
  // guard must see the same thing, not swallow line 2 as a fake heredoc body.
  const cmd = ['# <<EOF', 'cat private/glossary.md', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'cat');
  assert.equal(found, true);
});

test('commandContexts: a comment-hidden heredoc marker does not swallow a git command either', () => {
  // The same shape, proven against a second, unrelated rule (H-01) — the fix lives
  // in the shared decomposition, not in a boundary-specific patch.
  const cmd = ['# <<EOF', 'git commit -m x', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, true);
});

test('commandContexts: a mid-word `#` inside the heredoc BODY does not itself become a command', () => {
  const cmd = ['cat <<EOF', 'x#not a comment', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.raw.includes('x#not a comment'));
  assert.equal(found, false, 'the heredoc body must still be dropped as data');
});

test('commandContexts: a `#` that is not a comment start (mid-word, on the OPENER line) does not disable a real heredoc', () => {
  // `x#y` — the `#` is glued to `x`, not preceded by whitespace or line start, so bash
  // does NOT treat it as a comment start. The real `<<EOF` right after it still counts.
  const cmd = ['cat x#y <<EOF', 'git push', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, false, 'the # is mid-word, not a comment, so this is still a real heredoc');
});

test('commandContexts: a real comment with no space before the heredoc marker is still a comment', () => {
  // The look-back must inspect the character BEFORE the `#` (whitespace = a real
  // comment start), not the one after it — `x #<<EOF` has no space between them.
  const cmd = ['x #<<EOF', 'cat private/glossary.md', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'cat');
  assert.equal(found, true, 'a real bash comment — the fake heredoc must not swallow line 2');
});

test('commandContexts: a `<<EOF`-shaped string sitting inside a quote is not a real heredoc opener', () => {
  // `echo "<<EOF"` just prints the literal text; there is no real heredoc here, so
  // nothing after it should be swallowed as a heredoc body.
  const cmd = ['echo "<<EOF"', 'cat private/glossary.md', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'cat');
  assert.equal(found, true);
});

test('commandContexts: a real heredoc opener preceded by a quoted `#` still works', () => {
  // The `#` is data inside single quotes, not a comment start — the heredoc that
  // follows on the same line is real and its body must still be dropped.
  const cmd = ["echo '#' <<EOF", 'git push', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, false, 'a real heredoc body is still documentation, not a command');
});

test('commandContexts: a multi-character quoted word closes properly right before a real heredoc', () => {
  // No space between the closing quote and `<<` — a real shell still recognizes the
  // operator. Mutant-killing for the quote-close tracking's off-by-one and comparisons.
  const cmd = ["echo 'ab'<<EOF", 'git push', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, false, 'the quote closes correctly, so this is still a real heredoc');
});

test('commandContexts: a backslash-escaped quote inside a double-quoted span does not close it early', () => {
  // `"a\"b"` is ONE token — the escaped quote at position 3 must not be read as the
  // closing quote, or the real closing quote three characters later gets misread as a
  // fresh opening and the heredoc that follows is wrongly rejected.
  const cmd = ['echo "a\\"b" <<EOF', 'cat private/glossary.md', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'cat');
  assert.equal(found, false, 'the quote closes correctly, so this is still a real heredoc');
});

test('commandContexts: a `#` inside a single-quoted string never starts a comment', () => {
  const cmd = ["echo ' # x' <<EOF", 'git push', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, false, 'the # is inside quotes, so this is still a real heredoc');
});

test('commandContexts: a `#` inside a double-quoted string never starts a comment either', () => {
  const cmd = ['echo " # x" <<EOF', 'git push', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, false, 'the # is inside quotes, so this is still a real heredoc');
});

// -----------------------------------------------------------------------------
// TASK 93 — `eval "COMMAND STRING"` hides a whole command the way `sh -c "..."`
// does, but `eval` was in neither wrapper set, so commandContexts never descended
// into it. Same audit as TASK 92, independently re-verified.
// -----------------------------------------------------------------------------

test('commandContexts: eval "..." hides a whole command exactly as sh -c does', () => {
  const found = commandContexts('eval "cat private/glossary.md"');
  const inner = found.find((c) => c.argv[0] === 'cat');
  assert.ok(inner, 'the wrapped command must be found');
  assert.deepEqual(inner.argv, ['cat', 'private/glossary.md']);
  assert.deepEqual(inner.via, ['eval']);
});

test('commandContexts: eval reaches a git write hidden in its argument', () => {
  const found = commandContexts('eval "git commit -m x"')
    .some((c) => c.argv[0] === 'git' && c.argv[1] === 'commit');
  assert.equal(found, true);
});

test('commandContexts: eval joins unquoted arguments with a space before re-parsing them', () => {
  // `eval cat private/glossary.md` (no quotes) is exactly as real in bash as the
  // quoted form — eval concatenates all of its arguments before evaluating them.
  const found = commandContexts('eval cat private/glossary.md')
    .some((c) => c.argv[0] === 'cat' && c.argv[1] === 'private/glossary.md');
  assert.equal(found, true);
});

test('commandContexts: eval re-parses shell metacharacters in its joined string', () => {
  // The joined string is a real command line, not one opaque argv — a `;` inside it
  // must still split into two separate commands, the same as top-level input would.
  const found = commandContexts('eval "cat private/glossary.md; rm -rf resources"');
  assert.ok(found.some((c) => c.argv[0] === 'cat'));
  assert.ok(found.some((c) => c.argv[0] === 'rm'));
});

test('commandContexts: eval with no argument at all finds nothing extra', () => {
  const found = commandContexts('eval');
  assert.deepEqual(found.map((c) => c.argv), [['eval']]);
});

test('commandContexts: the eval-wrapper recursion only fires for eval itself, not any two-argument command', () => {
  // Gated on EVAL_WRAPPERS.has(head) — a plain command with two arguments must never
  // have its second argument reinterpreted as a brand-new command.
  const found = commandContexts('cat private/glossary.md');
  assert.deepEqual(found.map((c) => c.argv), [['cat', 'private/glossary.md']]);
});

test('commandContexts: eval increments the nesting depth counter like every other wrapper', () => {
  const shallow = commandContexts('eval "git push"', [], 5).some((c) => c.argv[0] === 'git');
  assert.equal(shallow, true, 'depth 5 -> 6 is inside the cap, the wrapped command must be found');
  const deep = commandContexts('eval "git push"', [], 6).some((c) => c.argv[0] === 'git');
  assert.equal(deep, false, 'depth 6 -> 7 exceeds the cap, matching every other wrapper');
});

// -----------------------------------------------------------------------------
// adversarial-auditor findings on TASK 92/93's own fix — F1-F4, each independently
// re-verified against real bash before being recorded (P-11). The first version of
// both fixes was too narrow: comment detection only recognized whitespace/line-start
// as a word boundary, quote state reset on every physical line, an unquoted
// backslash before `<<` was never considered, and eval's leading `--` was joined
// into the command string instead of being consumed the way bash's eval consumes it.
// -----------------------------------------------------------------------------

test('F1: a comment starting right after `;`, `&`, `)` or `|` is still a real comment', () => {
  for (const opener of [
    ['echo a ;# <<EOF', 'git commit -m x', 'EOF'],
    ['true;#<<EOF', 'git push', 'EOF'],
    ['echo a &# <<EOF', 'git commit -m x', 'EOF'],
    ['(echo a)# <<EOF', 'git commit -m x', 'EOF'],
    ['echo a |# <<EOF', 'git commit -m x', 'EOF'],
  ]) {
    const found = commandContexts(opener.join(NL)).some((c) => c.argv[0] === 'git');
    assert.equal(found, true, `expected a real command to survive: ${opener[0]}`);
  }
});

test('F2: a quoted string that genuinely spans more than one physical line carries its quote state across lines', () => {
  const cmd = ['echo "', '<<EOF', '"', 'git commit -m x', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, true, 'the << sits inside an open quote that only closes two lines later');
});

test('F2b: the same cross-line quote tracking applies to single quotes and a read boundary', () => {
  const cmd = ["echo '", '<<EOF', "'", 'cat private/glossary.md', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'cat');
  assert.equal(found, true);
});

test('F3: an unquoted backslash right before `<<` makes it a literal `<` plus a single real redirect, not a heredoc', () => {
  const cmd = ['echo \\<<EOF', 'git commit -m x', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, true, 'bash reads \\< as literal and the lone < as a failing redirect, not a heredoc opener');
});

test('the comment look-back inspects the character BEFORE the `#`, not after it', () => {
  const cmd = ['x #z<<EOF', 'git push', 'EOF'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, true, 'a real bash comment — the fake heredoc must not swallow line 2');
});

test('a herestring (`<<<word`) is never misread as a heredoc opener with a delimiter later in the text', () => {
  // Without the run-length guard, scanning finds a `<<` at the SECOND `<` of the
  // triple and treats "word" as a delimiter to search for — silently swallowing
  // everything up to the next line that happens to read exactly "word".
  const cmd = ['cat <<<word', 'git push', 'word'].join(NL);
  const found = commandContexts(cmd).some((c) => c.argv[0] === 'git');
  assert.equal(found, true, 'a herestring has no body to swallow; line 2 is a real, live command');
});

test('F4: eval -- consumed as end-of-options, exactly like bash\'s own no_options()', () => {
  const found = commandContexts('eval -- "git commit -m x"')
    .some((c) => c.argv[0] === 'git' && c.argv[1] === 'commit');
  assert.equal(found, true);
});

test('F4b: eval -- also reaches a read-boundary command', () => {
  const found = commandContexts('eval -- "cat private/glossary.md"').some((c) => c.argv[0] === 'cat');
  assert.equal(found, true);
});

test('F4c: only a LEADING eval -- is consumed — a lone dash is not, and a second -- is not', () => {
  // Matches bash exactly: `eval - "x"` tries to run a command literally named `-`;
  // `eval -- -- "x"` consumes only the first `--`, and `--` becomes the command name.
  const dash = commandContexts('eval - "git commit -m x"');
  assert.equal(dash.some((c) => c.argv[0] === 'git'), false);
  assert.ok(dash.some((c) => c.argv[0] === '-'));

  const doubleDash = commandContexts('eval -- -- "git commit -m x"');
  assert.equal(doubleDash.some((c) => c.argv[0] === 'git'), false);
  assert.ok(doubleDash.some((c) => c.argv[0] === '--'));
});

// -----------------------------------------------------------------------------
// TASK 95 — a DIRECT_WRAPPERS candidate is never itself unwrapped.
//
// The boundary-outcome half of this battery lives beside each checker
// (git-write.test.mjs for H-01, path-boundary.test.mjs for H-02/H-03/H-04), per
// T-08. What belongs here is the decomposition property those outcomes rest on:
// a suffix offered by a direct wrapper must be unwrapped exactly as the same argv
// would be at the top of a segment.
// -----------------------------------------------------------------------------

test('commandContexts: a flag wrapper reached through a direct wrapper is unwrapped', () => {
  const found = commandContexts('env sh -c "git commit -m x"');
  const inner = found.find((c) => c.argv[0] === 'git' && c.argv[1] === 'commit');
  assert.ok(inner, 'the payload of sh -c must be found, not left sealed in one quoted argument');
  assert.deepEqual(inner.via, ['env', 'sh']);
});

test('commandContexts: the unwrapping is argv-level — re-joining the suffix would lose the quoting', () => {
  // The measured reason the helper takes an argv rather than a re-joined string:
  // ['env','sh','-c','git commit -m x'].slice(1).join(' ') is 'sh -c git commit -m x',
  // where -c's argument is now just 'git' and `commit` has become a separate word.
  // Recursing on that string finds a bare ['git'] and no write subcommand at all.
  const viaJoin = commandContexts('sh -c git commit -m x');
  assert.equal(viaJoin.some((c) => c.argv[0] === 'git' && c.argv[1] === 'commit'), false,
    'the joined form genuinely does NOT carry the write — which is why the fix must not join');

  const viaArgv = commandContexts('env sh -c "git commit -m x"');
  assert.ok(viaArgv.some((c) => c.argv[0] === 'git' && c.argv[1] === 'commit'));
});

test('commandContexts: eval reached through a direct wrapper is unwrapped too', () => {
  const found = commandContexts('env eval "git commit -m x"');
  const inner = found.find((c) => c.argv[0] === 'git' && c.argv[1] === 'commit');
  assert.ok(inner);
  assert.deepEqual(inner.via, ['env', 'eval']);
});

test('commandContexts: chained direct wrappers reach a flag wrapper through the OUTER suffix list', () => {
  // env offers every suffix of its own argv, and a nested direct wrapper's suffixes
  // are argv.slice(i).slice(j) === argv.slice(i+j) — already among them. So this is
  // caught without the direct branch ever being re-entered.
  const found = commandContexts('env timeout 5 sh -c "git push"');
  const inner = found.find((c) => c.argv[0] === 'git' && c.argv[1] === 'push');
  assert.ok(inner);
  assert.deepEqual(inner.via, ['env', 'sh'], 'reached as a suffix of env, not by recursing into timeout');
});

test('commandContexts: the direct-wrapper hop increments depth, so a two-wrapper chain costs two levels', () => {
  // Exactly the assertion shape TASK 93 used for eval. A missing increment is the
  // easy-to-miss bug class here, and it is only observable at the cap.
  const inside = commandContexts('env sh -c "git push"', [], 4).some((c) => c.argv[0] === 'git');
  assert.equal(inside, true, 'depth 4 -> 5 -> 6 is inside the cap');
  const outside = commandContexts('env sh -c "git push"', [], 5).some((c) => c.argv[0] === 'git');
  assert.equal(outside, false, 'depth 5 -> 6 -> 7 exceeds the cap; both hops must count');
});

test('commandContexts: a long chain of direct wrappers does not blow up combinatorially', () => {
  // P-16: re-entering the direct branch on every offered suffix would be exponential
  // under a depth cap of 6. Staying linear is a property of the fix, not a hope.
  const cmd = 'env '.repeat(8) + 'sh -c "git push"';
  const found = commandContexts(cmd);
  assert.ok(found.some((c) => c.argv[0] === 'git' && c.argv[1] === 'push'),
    'the payload is still found at the end of a long wrapper chain');
  assert.ok(found.length < 100, `context count must stay linear, got ${found.length}`);
});

test('commandContexts: an innocent command under a direct wrapper gains no spurious context', () => {
  const found = commandContexts('env sh -c "echo hello"');
  assert.ok(found.some((c) => c.argv[0] === 'echo'));
  assert.equal(found.some((c) => c.argv[0] === 'git'), false);
});

// -----------------------------------------------------------------------------
// TASK 96 — env -S / --split-string. The decomposition half; the boundary
// outcomes live beside their checkers (T-08).
// -----------------------------------------------------------------------------

test('commandContexts: env -S re-tokenizes the packed string into a real command', () => {
  const found = commandContexts('env -S "git commit -m x"');
  const inner = found.find((c) => c.argv[0] === 'git' && c.argv[1] === 'commit');
  assert.ok(inner, 'the packed argument must be split, not left as one opaque token');
  assert.deepEqual(inner.via, ['env']);
});

test('commandContexts: every spelling of the split-string option is decomposed', () => {
  const hasGit = (cmd) => commandContexts(cmd).some((c) => c.argv[0] === 'git' && c.argv[1] === 'push');
  for (const cmd of ['env -S "git push"', 'env -S"git push"', 'env --split-string="git push"',
                     'env --split-string "git push"', 'env -vS "git push"', 'env -iS "git push"']) {
    assert.equal(hasGit(cmd), true, `must decompose: ${cmd}`);
  }
});

test('commandContexts: -u swallows a following S, exactly as coreutils does', () => {
  // `env -uS "git commit -m x"` unsets a variable named S and execs a program
  // literally named "git commit -m x". There is no split, so there is no command
  // to find — asserting the guard tracks the real grammar rather than guessing.
  const found = commandContexts('env -uS "git commit -m x"');
  assert.equal(found.some((c) => c.argv[0] === 'git'), false);
});

test('commandContexts: the split-string payload is itself unwrapped recursively', () => {
  const found = commandContexts('env -S "sh -c \'git push\'"');
  assert.ok(found.some((c) => c.argv[0] === 'git' && c.argv[1] === 'push'));
});

test('commandContexts: every unambiguous abbreviation of --split-string is decomposed', () => {
  const hasGit = (cmd) => commandContexts(cmd).some((c) => c.argv[0] === 'git' && c.argv[1] === 'push');
  for (const flag of ['--s', '--sp', '--spl', '--split', '--split-str', '--split-string']) {
    assert.equal(hasGit(`env ${flag} "git push"`), true, `separate value: ${flag}`);
    assert.equal(hasGit(`env ${flag}="git push"`), true, `inline value: ${flag}`);
  }
});

test('commandContexts: a long option that is not a prefix of --split-string is not one', () => {
  // --unset, --ignore-environment and a bare -- must not be read as split-string.
  for (const cmd of ['env --unset=S "git push"', 'env --ignore-environment "git push"',
                     'env --u "git push"', 'env -- "git push"']) {
    assert.equal(commandContexts(cmd).some((c) => c.argv[0] === 'git' && c.argv[1] === 'push'), false, cmd);
  }
});

test('commandContexts: an env command with no split-string option invents no context', () => {
  // Guards the split-string collector against pushing a value it does not have:
  // an absent option value, or a token that is not an option at all. Anything
  // invented shows up as a context head that does not appear in the command.
  for (const cmd of ['env git push', 'env --unset=FOO git status', 'env -u FOO git status',
                     'env --s', 'env -S', 'env aS git status']) {
    const heads = commandContexts(cmd).map((c) => c.argv[0]);
    for (const h of heads) {
      assert.ok(cmd.includes(h), `invented context head "${h}" in: ${cmd}`);
    }
  }
});
