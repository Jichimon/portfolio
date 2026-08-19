// H-01: agents never invoke a git write.
//
// ALLOWLIST, not denylist. A denylist protects exactly the subcommands its author
// enumerated; git has ~150 and gains more. Anything not proven read-only is denied, so
// the spelling nobody thought of fails closed (INC-07).
//
// Reads must keep working — an agent needs history, diff and blame to do its job at all.

import { commandContexts, basename } from './shell.mjs';

/** Subcommands that cannot alter the repository, the index, or the working tree. */
const READ_ONLY = new Set([
  'blame', 'cat-file', 'check-attr', 'check-ignore', 'count-objects', 'describe',
  'diff', 'diff-files', 'diff-index', 'diff-tree', 'grep', 'help', 'log', 'ls-files',
  'ls-remote', 'ls-tree', 'merge-base', 'name-rev', 'rev-list', 'rev-parse',
  'shortlog', 'show', 'show-ref', 'status', 'var', 'verify-commit', 'verify-tag',
  'version', 'whatchanged',
]);

/**
 * Subcommands with both a read and a write form. Only the listed spellings pass; every
 * other form of the same subcommand is denied, because "git branch foo" creates a branch
 * while "git branch --list" does not.
 */
/**
 * Listing forms take a pattern argument (`git tag -l "v*"`), so "every argument is a
 * known read flag" is too strict — it denied legitimate reads. The working rule is:
 * an explicit list flag must be present, and no write flag may be.
 */
const listing = (listFlags, writeFlags) => (a) => {
  if (a.length === 0) return true;                       // bare form lists
  if (a.some((x) => writeFlags.test(x))) return false;   // any write flag disqualifies
  return a.some((x) => listFlags.test(x));               // otherwise a list flag is required
};

const AMBIGUOUS = {
  branch: listing(
    /^(-l|--list|-a|--all|-r|--remotes|-v{1,2}|--verbose|--show-current|--contains|--no-contains|--merged|--no-merged|--points-at|--format(=.*)?|--sort(=.*)?)$/,
    /^(-d|-D|--delete|-m|-M|--move|-c|-C|--copy|-f|--force|-u|--set-upstream-to(=.*)?|--unset-upstream|--edit-description)$/,
  ),
  tag: listing(
    /^(-l|--list|-n\d*|--contains|--no-contains|--merged|--no-merged|--points-at|--sort(=.*)?|--format(=.*)?)$/,
    /^(-d|--delete|-a|--annotate|-s|--sign|-f|--force|-m|--message(=.*)?|-F|--file(=.*)?|-v|--verify)$/,
  ),
  remote: (a) => a.length === 0 || a[0] === 'show' || a[0] === 'get-url'
    || a.every((x) => /^(-v|--verbose)$/.test(x)),
  config: (a) => a.some((x) => /^(--get|--get-all|--get-regexp|--get-urlmatch|-l|--list)$/.test(x)),
  stash: (a) => a[0] === 'list' || a[0] === 'show',
  notes: (a) => a.length === 0 || a[0] === 'list' || a[0] === 'show',
  worktree: (a) => a[0] === 'list',
  submodule: (a) => a[0] === 'status' || a[0] === 'summary',
  bisect: (a) => a[0] === 'log' || a[0] === 'view',
};

/**
 * Global options that redirect git at another repository or execute something. They do
 * not make a command a write, but they must not be mistaken for the subcommand.
 * `-c` and `--exec-path` are denied outright: both are code-execution vectors.
 */
const VALUE_OPTS = new Set(['-C', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
const DANGEROUS_GLOBALS = new Set(['-c', '--exec-path', '--upload-pack', '--receive-pack']);

/** @returns {{allowed:boolean, reason?:string, subcommand?:string, via?:string[]}} */
function inspectGitInvocation(argv, via) {
  const args = argv.slice(1);
  let i = 0;

  while (i < args.length && args[i].startsWith('-')) {
    const opt = args[i];
    const bare = opt.split('=')[0];

    if (DANGEROUS_GLOBALS.has(bare)) {
      return { allowed: false, reason: `global option ${bare} can execute arbitrary code`, via };
    }
    if (VALUE_OPTS.has(bare)) {
      i += opt.includes('=') ? 1 : 2; // --git-dir=x consumes one token, --git-dir x two
      continue;
    }
    i++;
  }

  const sub = args[i];
  if (!sub) return { allowed: true, subcommand: '(none)', via };

  const rest = args.slice(i + 1);

  if (READ_ONLY.has(sub)) return { allowed: true, subcommand: sub, via };
  if (Object.hasOwn(AMBIGUOUS, sub)) {
    return AMBIGUOUS[sub](rest)
      ? { allowed: true, subcommand: sub, via }
      : { allowed: false, reason: `"git ${sub}" in this form can write`, subcommand: sub, via };
  }
  return { allowed: false, reason: `"git ${sub}" is not on the read-only allowlist`, subcommand: sub, via };
}

/**
 * @param {string} command  the raw Bash command string
 * @returns {{allowed:boolean, findings:{reason:string,segment:string,via:string[]}[]}}
 */
export function checkGitWrite(command) {
  const findings = [];

  for (const ctx of commandContexts(command)) {
    if (basename(ctx.argv[0]) !== 'git') {
      // GIT_DIR=... git ... is caught because git is still argv[0]; but an env
      // assignment naming a git binary is not a git invocation on its own.
      continue;
    }
    const verdict = inspectGitInvocation(ctx.argv, ctx.via);
    if (!verdict.allowed) {
      findings.push({ reason: verdict.reason, segment: ctx.raw, via: ctx.via });
    }
  }

  return { allowed: findings.length === 0, findings };
}
