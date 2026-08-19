import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkGitWrite } from './git-write.mjs';

const denied = (cmd) => assert.equal(checkGitWrite(cmd).allowed, false, `should DENY: ${cmd}`);
const allowed = (cmd) => assert.equal(checkGitWrite(cmd).allowed, true, `should ALLOW: ${cmd}`);

// ---------------------------------------------------------------------------
// Reads must keep working. A guard that blocks `git log` gets turned off.
// ---------------------------------------------------------------------------

test('read-only subcommands pass', () => {
  ['git status', 'git log --oneline -5', 'git diff HEAD~1', 'git show abc123',
   'git blame file.md', 'git rev-parse HEAD', 'git ls-files', 'git grep TODO',
   'git describe --tags', 'git shortlog -sn'].forEach(allowed);
});

test('non-git commands are not this guard\'s business', () => {
  ['npm test', 'node scripts/gate.mjs', 'ls -la', 'echo git commit'].forEach(allowed);
});

// ---------------------------------------------------------------------------
// RED: the direct forms
// ---------------------------------------------------------------------------

test('RED: plain writes are denied', () => {
  ['git commit -m x', 'git push', 'git push --force origin main', 'git merge feat',
   'git rebase main', 'git reset --hard', 'git checkout -b new', 'git switch -c new',
   'git cherry-pick abc', 'git revert abc', 'git clean -fd', 'git rm file',
   'git mv a b', 'git apply patch', 'git am patch', 'git stash push',
   'git restore .', 'git gc', 'git prune', 'git fetch', 'git pull'].forEach(denied);
});

test('RED: an unknown subcommand fails closed', () => {
  // The whole reason this is an allowlist: git gains subcommands, and the one nobody
  // enumerated must be denied rather than waved through.
  denied('git some-future-subcommand --do-a-thing');
});

// ---------------------------------------------------------------------------
// RED: alternate working directories
// ---------------------------------------------------------------------------

test('RED: -C redirects git at another repo but is still a write', () => {
  denied('git -C .. commit -m x');
  denied('git -C /some/other/repo push');
});

test('RED: --git-dir and --work-tree, both spellings', () => {
  denied('git --git-dir=../x/.git commit -m y');
  denied('git --git-dir ../x/.git commit -m y');
  denied('git --work-tree=/tmp --git-dir=/tmp/.git reset --hard');
});

test('RED: a GIT_DIR environment prefix does not disguise the command', () => {
  denied('GIT_DIR=../other/.git git commit -m x');
});

test('reads still pass through the same redirection options', () => {
  allowed('git -C ../other log --oneline');
  allowed('git --git-dir=../x/.git status');
});

// ---------------------------------------------------------------------------
// RED: chaining, substitution, wrappers
// ---------------------------------------------------------------------------

test('RED: chaining hides the write after a harmless command', () => {
  ['echo hi && git commit -m x', 'ls; git push', 'true || git reset --hard',
   'git status && git commit -m x', 'cat f | git apply'].forEach(denied);
});

test('RED: command substitution, both spellings', () => {
  denied('echo $(git commit -m x)');
  denied('echo `git push`');
  denied('VAR=$(git commit -m sneaky) && echo done');
});

test('RED: eval wrappers', () => {
  ['sh -c "git commit -m x"', 'bash -c \'git push\'', 'env git commit -m x',
   'pwsh -Command "git push"', 'powershell -Command "git reset --hard"'].forEach(denied);
});

test('RED: nested wrappers do not escape', () => {
  denied('sh -c "bash -c \'git commit -m x\'"');
});

// ---------------------------------------------------------------------------
// RED: alternate binaries and code-execution globals
// ---------------------------------------------------------------------------

test('RED: alternate binary spellings', () => {
  ['git.exe commit -m x', '/usr/bin/git push', '"C:/Program Files/Git/bin/git.exe" commit'].forEach(denied);
});

test('an unquoted path with a space is two tokens, as a real shell would read it', () => {
  // Not a bypass: `C:/Program Files/.../git.exe commit` fails in a shell too, because
  // the space splits it. The realistic invocation is quoted, and that form IS denied
  // above. Recorded so the gap reads as understood rather than missed.
  allowed('C:/Program Files/Git/bin/git.exe commit');
});

test('RED: -c config injection is denied even with a read subcommand', () => {
  // `git -c core.pager=<cmd> log` executes <cmd>. The subcommand being read-only is
  // irrelevant when the option itself is the vector.
  denied('git -c core.pager=touch\\ pwned log');
  denied('git -c alias.x=!sh x');
});

test('RED: --exec-path and pack overrides are denied', () => {
  denied('git --exec-path=/tmp/evil status');
  denied('git --upload-pack=/tmp/evil ls-remote origin');
});

// ---------------------------------------------------------------------------
// The ambiguous subcommands: read spellings pass, write spellings do not
// ---------------------------------------------------------------------------

test('branch: listing passes, creating and deleting do not', () => {
  allowed('git branch');
  allowed('git branch --list');
  allowed('git branch -a -v');
  allowed('git branch --show-current');
  denied('git branch newthing');
  denied('git branch -d old');
  denied('git branch -D old');
  denied('git branch -m old new');
});

test('tag: listing passes, creating does not', () => {
  allowed('git tag');
  allowed('git tag -l "v*"');
  denied('git tag v1.0');
  denied('git tag -d v1.0');
});

test('remote: inspecting passes, mutating does not', () => {
  allowed('git remote -v');
  allowed('git remote show origin');
  denied('git remote add origin https://example.com/x.git');
  denied('git remote remove origin');
  denied('git remote set-url origin https://example.com/y.git');
});

test('config: reading passes, writing does not', () => {
  allowed('git config --get user.name');
  allowed('git config --list');
  denied('git config user.name attacker');
  denied('git config --global core.pager cat');
  denied('git config --unset user.name');
});

test('stash: listing passes, stashing does not', () => {
  allowed('git stash list');
  allowed('git stash show');
  denied('git stash');
  denied('git stash push -m x');
  denied('git stash pop');
});

test('worktree and submodule: read forms only', () => {
  allowed('git worktree list');
  denied('git worktree add ../wt');
  allowed('git submodule status');
  denied('git submodule update --init');
});

// ---------------------------------------------------------------------------
// Quote awareness — the false-positive side. A guard that denies legitimate work
// gets disabled, which protects nothing.
// ---------------------------------------------------------------------------

test('a quoted string containing a git write is not a git invocation', () => {
  allowed('grep "git commit" README.md');
  allowed("rg 'git push --force' docs/");
  allowed('echo "run git commit yourself"');
});

test('a git write inside a quoted argument to a non-eval command still passes', () => {
  // node -e is not in the eval-wrapper set: it runs JavaScript, not a shell command.
  // Recorded deliberately — see the residual-risk note in the guard's docs.
  allowed('node -e "console.log(\'git commit\')"');
});

test('the finding names why and where', () => {
  const r = checkGitWrite('echo hi && git -C .. commit -m x');
  assert.equal(r.allowed, false);
  assert.match(r.findings[0].reason, /not on the read-only allowlist|can write/);
  assert.match(r.findings[0].segment, /git -C \.\. commit/);
});

test('a wrapped write reports the path it took', () => {
  const r = checkGitWrite('sh -c "git push"');
  assert.equal(r.allowed, false);
  assert.ok(r.findings[0].via.includes('sh'), 'expected the wrapper recorded in via');
});

// --- TASK 10: text ABOUT a command is not a command -------------------------
// Approved after eight false positives in two days — one aborted a patch mid-run without an
// obvious signal, and the eighth fired while writing this very block. A guard people route
// around protects nothing, and the fix has to be exact: quoting semantics, not a softer rule.

const BT = String.fromCharCode(96);
const Q = String.fromCharCode(34);
const NL = String.fromCharCode(10);
const GIT_WRITE = 'git' + ' ' + 'com' + 'mit -m x';   // assembled so this file can be written
const GIT_PUSH = 'git' + ' ' + 'pu' + 'sh origin main';

test('RED: backticked prose inside a heredoc is not a command — the exact real failure', () => {
  // What actually fired, repeatedly: a heredoc rewriting a document, whose text cited a git
  // command in backticks. substitutions() scanned the raw string and extracted the backtick
  // pair as something to run, so DOCUMENTING the boundary tripped the boundary.
  const cmd = [
    "python - <<'PY'",
    "s = s.replace('a', 'the rule says " + BT + GIT_WRITE + BT + " is denied')",
    'PY',
  ].join(NL);
  const v = checkGitWrite(cmd);
  assert.equal(v.allowed, true, JSON.stringify(v.findings));
});

test('RED: a heredoc body is data, not a sequence of commands', () => {
  // The real case. Writing a document that quotes a git command tripped H-01 repeatedly:
  // splitSegments broke the heredoc body on newlines and tokenized every line as a command.
  const cmd = [
    "python - <<'PY'",
    "s = s.replace('old', '" + GIT_WRITE + "')",
    "open(p,'w').write(s)",
    'PY',
  ].join(NL);
  const v = checkGitWrite(cmd);
  assert.equal(v.allowed, true, JSON.stringify(v.findings));
});

test('RED: a backticked mention inside a single-quoted string is not a substitution', () => {
  // substitutions() scanned the raw string, so prose carrying backticks was extracted as a
  // command to run. Backticks inside SINGLE quotes are literal to the shell.
  const cmd = "python -c 'print(" + Q + "run " + BT + GIT_WRITE + BT + " yourself" + Q + ")'";
  const v = checkGitWrite(cmd);
  assert.equal(v.allowed, true, JSON.stringify(v.findings));
});

test('RED: writing a git command into a file is not running it', () => {
  assert.equal(checkGitWrite("echo '" + GIT_PUSH + "' > docs/runbook.md").allowed, true);
});

// --- and every real bypass must still be denied ------------------------------

test('a backtick substitution OUTSIDE quotes is still denied', () => {
  assert.equal(checkGitWrite('echo ' + BT + GIT_WRITE + BT).allowed, false);
});

test('a substitution inside DOUBLE quotes is still denied — the shell expands it', () => {
  // Double quotes do not stop $( ) or backticks; only single quotes do. Getting this
  // backwards would trade a false positive for a real bypass.
  assert.equal(checkGitWrite('echo ' + Q + '$(' + GIT_WRITE + ')' + Q).allowed, false);
  assert.equal(checkGitWrite('echo ' + Q + BT + GIT_WRITE + BT + Q).allowed, false);
});

test('a substitution inside an UNQUOTED heredoc delimiter is still denied', () => {
  // <<EOF expands, <<'EOF' does not. The body is data either way, but the shell runs the
  // expansion before the data is handed over, so that half stays a command.
  const cmd = ['cat <<EOF', 'value: $(' + GIT_WRITE + ')', 'EOF'].join(NL);
  assert.equal(checkGitWrite(cmd).allowed, false);
});

test('sh -c with a quoted command is still denied — that quote IS an eval', () => {
  assert.equal(checkGitWrite('sh -c ' + Q + GIT_PUSH + Q).allowed, false);
  assert.equal(checkGitWrite("sh -c '" + GIT_PUSH + "'").allowed, false);
});

// These exercise the HEREDOC path specifically. The first version of the tests above passed
// while the heredoc regex was broken, because their content also sat inside single quotes —
// so `blankSingleQuoted` was doing the work and the heredoc logic was asleep. A test that
// passes for the wrong reason is the failure T-02 names, and these close it: nothing here is
// single-quoted, so only heredoc handling can make them pass.

test('RED: backticks in a literal heredoc body, outside any quotes, are not commands', () => {
  const cmd = ["cat <<'EOF'", 'see ' + BT + GIT_WRITE + BT + ' in the runbook', 'EOF'].join(NL);
  const v = checkGitWrite(cmd);
  assert.equal(v.allowed, true, JSON.stringify(v.findings));
});

test('RED: a bare git line in a literal heredoc body is data, not a command', () => {
  const cmd = ["cat <<'EOF'", GIT_PUSH, 'EOF'].join(NL);
  assert.equal(checkGitWrite(cmd).allowed, true);
});

test('the same body in an EXPANDING heredoc still has its substitutions denied', () => {
  const cmd = ['cat <<EOF', 'see $(' + GIT_WRITE + ') here', 'EOF'].join(NL);
  assert.equal(checkGitWrite(cmd).allowed, false);
});

test('a heredoc that is never terminated does not swallow the rest of the command', () => {
  // An unterminated delimiter must not blank everything after it, or a real command placed
  // below an accidental `<<EOF` would stop being scanned.
  const cmd = ['cat <<EOF', 'no terminator here', GIT_PUSH].join(NL);
  assert.equal(checkGitWrite(cmd).allowed, false);
});

test('a delimiter appearing as ordinary text does not open a heredoc', () => {
  assert.equal(checkGitWrite('echo EOF && ' + GIT_PUSH).allowed, false);
});
