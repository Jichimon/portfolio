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

// ---------------------------------------------------------------------------
// TASK 38: the full read-only allowlist, one subcommand at a time. Each is a
// StringLiteral in READ_ONLY — a mutated spelling is a mutated boundary, and only an
// assertion naming that exact subcommand catches it.
// ---------------------------------------------------------------------------

test('RED: every read-only subcommand on the allowlist is individually allowed', () => {
  ['git cat-file -p HEAD', 'git check-attr -a file', 'git check-ignore file',
   'git count-objects', 'git diff-files', 'git diff-index HEAD', 'git diff-tree HEAD',
   'git help log', 'git ls-remote origin', 'git ls-tree HEAD',
   'git merge-base main feature', 'git name-rev HEAD', 'git rev-list HEAD',
   'git show-ref', 'git var GIT_AUTHOR_IDENT', 'git verify-commit HEAD',
   'git verify-tag v1.0', 'git version', 'git whatchanged'].forEach(allowed);
});

test('RED: "git add" is a write and is not on the allowlist', () => {
  denied('git add file.txt');
  denied('git add -A');
});

test('RED: further write subcommands outside the allowlist fail closed', () => {
  ['git commit-tree HEAD', 'git update-ref refs/heads/x HEAD',
   'git symbolic-ref HEAD refs/heads/x', 'git replace', 'git filter-branch',
   'git fast-import', 'git reflog', 'git reflog show', 'git reflog expire --all',
   'git reflog delete HEAD@{0}'].forEach(denied);
});

// ---------------------------------------------------------------------------
// TASK 38: the two ambiguous subcommands the original battery never touched.
// ---------------------------------------------------------------------------

test('notes: bare, list and show pass; mutating forms do not', () => {
  allowed('git notes');
  allowed('git notes list');
  allowed('git notes show');
  denied('git notes add -m x');
  denied('git notes remove');
});

test('bisect: log and view pass; every step of a real bisect does not', () => {
  allowed('git bisect log');
  allowed('git bisect view');
  denied('git bisect start');
  denied('git bisect good');
  denied('git bisect bad');
  denied('git bisect reset');
});

test('remote: get-url is a read form alongside show and -v', () => {
  allowed('git remote get-url origin');
  denied('git remote prune origin');
});

test('branch: a write flag disqualifies even when a list flag is also present', () => {
  denied('git branch --list -d old');
});

test('branch: --list with a pattern argument still lists', () => {
  allowed('git branch --list "feature/*"');
});

test('tag: -v (verify) is a write flag here, unlike branch\'s -v (verbose)', () => {
  denied('git tag --list -v');
});

test('tag: a count flag to -n is still a read', () => {
  allowed('git tag -n5');
});

// ---------------------------------------------------------------------------
// TASK 38: flags between the binary and the subcommand.
// ---------------------------------------------------------------------------

test('RED: --no-pager is a harmless global and does not hide the subcommand', () => {
  allowed('git --no-pager log');
  denied('git --no-pager commit -m x');
});

test('RED: --namespace consumes its value in both spellings and still finds the subcommand', () => {
  allowed('git --namespace=foo log');
  allowed('git --namespace foo log');
  denied('git --namespace foo commit -m x');
});

// ---------------------------------------------------------------------------
// TASK 38: wrappers not in the original battery — every entry in FLAG_WRAPPERS and
// DIRECT_WRAPPERS gets its own case, because each is a StringLiteral survivor otherwise.
// ---------------------------------------------------------------------------

test('RED: sudo and doas run the command as another user, still a write', () => {
  denied('sudo git commit -m x');
  denied('sudo git push');
  denied('doas git push');
});

test('RED: nohup, xargs, timeout, stdbuf, nice and ionice all forward to the real command', () => {
  denied('nohup git push');
  denied('xargs git push');
  denied('timeout 5 git push');
  denied('stdbuf -oL git push');
  denied('nice git push');
  denied('ionice git push');
});

test('RED: zsh, dash, ksh and cmd /c are eval wrappers too', () => {
  denied('zsh -c "git push"');
  denied('dash -c "git push"');
  denied('ksh -c "git push"');
  denied('cmd /c "git push"');
});

test('a direct wrapper around a read is still allowed', () => {
  allowed('env git status');
  allowed('sudo git status');
  allowed('xargs git status');
});

// ---------------------------------------------------------------------------
// TASK 38: a plain newline is a separator on its own, without a heredoc involved.
// ---------------------------------------------------------------------------

test('RED: a bare newline between two commands is still a separator', () => {
  assert.equal(checkGitWrite('git status' + NL + GIT_PUSH).allowed, false);
});

test('RED: a write buried in the middle of a semicolon chain is still caught', () => {
  assert.equal(checkGitWrite('echo hi; ' + GIT_WRITE + '; echo done').allowed, false);
});

test('RED: an env-var prefix does not disguise a write anywhere but the very front', () => {
  assert.equal(checkGitWrite('GIT_DIR=x GIT_WORK_TREE=y ' + GIT_WRITE).allowed, false);
});

// ---------------------------------------------------------------------------
// TASK 38: a Windows-style --git-dir path, backslash and all.
// ---------------------------------------------------------------------------

test('RED: a Windows-style --git-dir path does not change the verdict', () => {
  const bs = String.fromCharCode(92);
  assert.equal(checkGitWrite('git --git-dir=C:' + bs + 'repo' + bs + '.git ' + GIT_WRITE.slice(4)).allowed, false);
});

// ---------------------------------------------------------------------------
// TASK 38: bare `git`, and a trailing unrecognized flag with nothing after it — the
// boundary the leading-option scan loop must stop at without reading past the array.
// ---------------------------------------------------------------------------

test('RED: bare "git" with no subcommand at all is a no-op and is allowed', () => {
  allowed('git');
});

test('an unrecognized flag with nothing after it does not crash and stays allowed', () => {
  allowed('git -v');
  allowed('git -v status');
});

test('submodule: "summary" is also a read form, alongside "status"', () => {
  allowed('git submodule summary');
  denied('git submodule foreach');
});

// ---------------------------------------------------------------------------
// TASK 38: the reason text itself is part of what the caller observes (pretooluse.mjs
// forwards findings[0].reason verbatim into the denial message), so its content is
// asserted, not just its presence.
// ---------------------------------------------------------------------------

test('the -c injection finding names execution, specifically', () => {
  const r = checkGitWrite('git -c core.pager=less status');
  assert.equal(r.allowed, false);
  assert.match(r.findings[0].reason, /can execute arbitrary code/);
});

test('an ambiguous-subcommand denial names "in this form can write"', () => {
  const r = checkGitWrite('git branch newthing');
  assert.equal(r.allowed, false);
  assert.match(r.findings[0].reason, /"git branch" in this form can write/);
});

// ---------------------------------------------------------------------------
// TASK 38: a value-consuming option in its SPACE-SEPARATED form swallows the very next
// token as its value — including a token that looks like a write subcommand. That is a
// real, slightly surprising property of every VALUE_OPTS entry (each is its own
// StringLiteral in the guard), not a bypass: nothing runs, because the "subcommand"
// itself was consumed as the option's argument, leaving none.
// ---------------------------------------------------------------------------

test('RED: each VALUE_OPTS entry, in its space form, swallows the next token as its value', () => {
  allowed('git --git-dir commit');
  allowed('git --work-tree commit');
  allowed('git --namespace commit');
  allowed('git -C commit');
});

test('RED: --receive-pack is denied alongside --upload-pack', () => {
  denied('git --receive-pack=/tmp/evil ls-remote origin');
});

test('remote: the bare form (no arguments at all) lists', () => {
  allowed('git remote');
});

test('remote: a mix where not every flag is -v/--verbose is still a write', () => {
  denied('git remote -v --unknown');
});
