// Shell command decomposition, shared by every Bash policy function.
//
// The hard part of guarding a shell is not the rule — it is finding every place a
// command can hide. INC-07's lesson applies directly: a guard that inspects only the
// literal string protects exactly the spelling its author imagined.
//
// Pure and dependency-free so it can be tested without invoking a shell.

/** Split on top-level separators, ignoring anything inside quotes. */
function splitSegments(cmd) {
  const out = [];
  let cur = '';
  let quote = null;
  let depth = 0;

  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    const next = cmd[i + 1];

    if (quote) {
      cur += c;
      if (c === quote && cmd[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    if (c === '(' && cmd[i - 1] === '$') { depth++; cur += c; continue; }
    if (c === ')' && depth > 0) { depth--; cur += c; continue; }

    if (depth === 0) {
      if ((c === '&' && next === '&') || (c === '|' && next === '|')) {
        out.push(cur); cur = ''; i++; continue;
      }
      if (c === ';' || c === '|' || c === '\n') { out.push(cur); cur = ''; continue; }
    }
    cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

/** Command substitutions: $( ... ) and backticks. Their contents are commands too. */
function substitutions(cmd) {
  const out = [];
  const dollar = /\$\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
  for (const m of cmd.matchAll(dollar)) out.push(m[1]);
  const backtick = /`([^`]*)`/g;
  for (const m of cmd.matchAll(backtick)) out.push(m[1]);
  return out;
}

/**
 * Heredoc bodies, with whether the shell expands them.
 *
 * `<<'EOF'` and `<<"EOF"` are literal; `<<EOF` still expands `$( )` and backticks before
 * handing the body over. The body is DATA in both cases — it is never a sequence of
 * commands — but in the second case the expansion runs, so that half stays a command.
 */
function heredocSpans(lines) {
  const spans = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/);
    if (!m) continue;
    const delim = m[2];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === delim) {
        spans.push({ from: i + 1, to: j, expands: m[1] === '' });
        i = j;
        break;
      }
    }
  }
  return spans;
}

/** Blank the CONTENTS of single-quoted spans, preserving the quotes and the length. */
function blankSingleQuoted(cmd) {
  let out = '';
  let quote = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      const closes = c === quote && cmd[i - 1] !== String.fromCharCode(92);
      out += closes ? c : (quote === "'" ? ' ' : c);
      if (closes) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; out += c; continue; }
    out += c;
  }
  return out;
}

/**
 * Remove the regions of a command that are DATA rather than code, before scanning it.
 *
 * TASK 10, and the reason it was approved: without this, writing a document that quotes a
 * git command trips the git guard. That happened eight times in two days, once aborting a
 * patch mid-run. A guard people route around protects nothing.
 *
 * The fix is quoting semantics, not a softer rule, and the direction matters in both ways:
 *
 *   for SEGMENTS       every heredoc body is dropped — a body is never a command list.
 *   for SUBSTITUTIONS  single-quoted spans and literal-delimiter heredocs are dropped,
 *                      because the shell does not expand them. Double quotes and `<<EOF`
 *                      are KEPT, because it does — and treating those as data would trade
 *                      a false positive for a real bypass.
 *
 * @param {'segments'|'substitutions'} mode
 */
export function stripDataRegions(cmd, mode) {
  const lines = String(cmd).split(String.fromCharCode(10));
  const drop = new Set();
  for (const span of heredocSpans(lines)) {
    if (mode === 'substitutions' && span.expands) continue;
    for (let k = span.from; k < span.to; k++) drop.add(k);
  }
  const kept = lines.filter((_, i) => !drop.has(i)).join(String.fromCharCode(10));
  return mode === 'substitutions' ? blankSingleQuoted(kept) : kept;
}

/** Tokenize one segment, respecting quotes and stripping them from the result. */
export function tokenize(segment) {
  const tokens = [];
  let cur = '';
  let quote = null;
  let had = false;

  for (let i = 0; i < segment.length; i++) {
    const c = segment[i];
    if (quote) {
      if (c === quote && segment[i - 1] !== '\\') { quote = null; continue; }
      cur += c; had = true; continue;
    }
    if (c === '"' || c === "'") { quote = c; had = true; continue; }
    if (/\s/.test(c)) {
      if (cur || had) { tokens.push(cur); cur = ''; had = false; }
      continue;
    }
    cur += c;
  }
  if (cur || had) tokens.push(cur);
  return tokens;
}

/**
 * Redirect targets in one segment, found with the quote state tracked.
 *
 * A regex over the raw string cannot tell these two apart, and they are opposites:
 *
 *   echo 'x > evidence/t'     the operator is INSIDE quotes — this is text about a redirect
 *   echo x > 'evidence/t'     the operator is outside, the TARGET is quoted — a real redirect
 *
 * Blanking every quoted span would fix the first and break the second, trading a false
 * positive for a real bypass. So the operator decides, and the target keeps its content.
 */
export function redirectTargets(segment) {
  const out = [];
  const text = String(segment);
  let quote = null;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote && text[i - 1] !== String.fromCharCode(92)) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c !== '>') continue;

    let j = i + 1;
    if (text[j] === '>') j++;              // append form
    if (text[j] === '&') { i = j; continue; }  // fd duplication: >&2 names no file
    while (j < text.length && /\s/.test(text[j])) j++;

    let target = '';
    let inner = null;
    for (; j < text.length; j++) {
      const d = text[j];
      if (inner) { if (d === inner) { inner = null; continue; } target += d; continue; }
      if (d === '"' || d === "'") { inner = d; continue; }
      if (/[\s;&|)]/.test(d)) break;
      target += d;
    }
    if (target) out.push(target);
    i = j - 1;
  }
  return out;
}

/** Wrappers that take a command STRING in a flag argument: sh -c "...". */
const FLAG_WRAPPERS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh',
  'powershell', 'pwsh', 'cmd']);
const EVAL_FLAGS = new Set(['-c', '-command', '/c', '-e']);

/**
 * Wrappers that take a command DIRECTLY as their remaining arguments: `env git push`,
 * `timeout 5 git push`. Their own options vary too much to parse reliably, so every
 * suffix is treated as a candidate command. That over-reports rather than under-reports,
 * which is the correct direction for a guard (INC-07).
 */
const DIRECT_WRAPPERS = new Set(['env', 'nohup', 'xargs', 'time', 'timeout',
  'sudo', 'doas', 'stdbuf', 'nice', 'ionice']);

/** Strip a path and any extension: /usr/bin/git.exe -> git */
export function basename(token) {
  const noPath = token.split(/[/\\]/).pop() ?? '';
  return noPath.replace(/\.(exe|cmd|bat|ps1)$/i, '').toLowerCase();
}

/**
 * Every command context in a shell string: top-level segments, substitutions, and the
 * bodies of eval wrappers — recursively.
 *
 * @returns {{argv:string[], raw:string, via:string[]}[]} one entry per command found
 */
export function commandContexts(cmd, via = [], depth = 0) {
  if (depth > 6) return []; // pathological nesting is not a legitimate command
  const found = [];

  for (const sub of substitutions(stripDataRegions(cmd, 'substitutions'))) {
    found.push(...commandContexts(sub, [...via, 'substitution'], depth + 1));
  }

  for (const seg of splitSegments(stripDataRegions(cmd, 'segments'))) {
    let argv = tokenize(seg);
    if (argv.length === 0) continue;

    // VAR=value prefixes bind the environment, they are not the command.
    const env = [];
    while (argv.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[0])) env.push(argv.shift());
    if (argv.length === 0) continue;

    found.push({ argv, raw: seg, via, env });

    const head = basename(argv[0]);

    // sh -c "..." hides a whole command in a flag's argument.
    if (FLAG_WRAPPERS.has(head)) {
      for (let i = 1; i < argv.length; i++) {
        if (EVAL_FLAGS.has(argv[i].toLowerCase()) && argv[i + 1] !== undefined) {
          found.push(...commandContexts(argv[i + 1], [...via, head], depth + 1));
          i++;
        }
      }
    }

    // `env git push` puts the command in the argument list itself. Their own option
    // grammars differ (`timeout 5 git push` has a positional), so every suffix is
    // offered as a candidate rather than guessing where the command starts.
    if (DIRECT_WRAPPERS.has(head)) {
      for (let i = 1; i < argv.length; i++) {
        found.push({ argv: argv.slice(i), raw: seg, via: [...via, head], env: [] });
      }
    }
  }

  return found;
}
