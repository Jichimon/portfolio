import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fingerprintOf, collectInputs, staleCacheDirs, sweepStaleCacheDirs } from './pipeline-fingerprint.mjs';

const entry = (path, content) => ({ path, content });

// ── the fingerprint is a function of the inputs, and only of the inputs ──────

test('the same inputs produce the same fingerprint', () => {
  const inputs = [entry('a.mjs', 'one'), entry('b.mjs', 'two')];
  assert.equal(fingerprintOf(inputs), fingerprintOf(inputs.map((e) => ({ ...e }))));
});

test('RED: one changed byte produces a different fingerprint', () => {
  const before = [entry('a.mjs', 'one'), entry('b.mjs', 'two')];
  const after = [entry('a.mjs', 'one'), entry('b.mjs', 'twp')];
  assert.notEqual(fingerprintOf(before), fingerprintOf(after));
});

test('RED: an added file produces a different fingerprint', () => {
  const before = [entry('a.mjs', 'one')];
  const after = [entry('a.mjs', 'one'), entry('b.mjs', '')];
  assert.notEqual(fingerprintOf(before), fingerprintOf(after));
});

test('RED: a removed file produces a different fingerprint', () => {
  const before = [entry('a.mjs', 'one'), entry('b.mjs', 'two')];
  const after = [entry('a.mjs', 'one')];
  assert.notEqual(fingerprintOf(before), fingerprintOf(after));
});

test('RED: input order does not change the fingerprint', () => {
  // readdir order is not a contract, and a fingerprint that depended on it would
  // invalidate the cache at random and stop meaning anything.
  const a = [entry('a.mjs', 'one'), entry('b.mjs', 'two'), entry('c.mjs', 'three')];
  const b = [a[2], a[0], a[1]];
  assert.equal(fingerprintOf(a), fingerprintOf(b));
});

test('RED: the same content at a different path is a different fingerprint', () => {
  assert.notEqual(fingerprintOf([entry('a.mjs', 'x')]), fingerprintOf([entry('b.mjs', 'x')]));
});

test('RED: moving content between two files changes the fingerprint', () => {
  // The delimiter case: without one, "a"+"bc" and "ab"+"c" hash identically.
  const before = [entry('a.mjs', 'a'), entry('b.mjs', 'bc')];
  const after = [entry('a.mjs', 'ab'), entry('b.mjs', 'c')];
  assert.notEqual(fingerprintOf(before), fingerprintOf(after));
});

test('the fingerprint is a short, path-safe, fixed-length token', () => {
  const fp = fingerprintOf([entry('a.mjs', 'one')]);
  assert.match(fp, /^[0-9a-f]{8}$/);
});

test('RED: an empty input set denies rather than returning a fingerprint', () => {
  // A fingerprint over nothing is a constant, and a constant key restores exactly the
  // defect this module exists to close: every build lands on the same cache forever.
  assert.throws(() => fingerprintOf([]), /no inputs/i);
});

// ── reading the inputs off disk ──────────────────────────────────────────────

test('collectInputs walks recursively and returns every file it found', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fp-'));
  try {
    mkdirSync(join(dir, 'nested'));
    writeFileSync(join(dir, 'top.mjs'), 'top');
    writeFileSync(join(dir, 'nested', 'deep.mjs'), 'deep');
    const found = collectInputs(dir).map((e) => e.path).sort();
    assert.deepEqual(found, ['nested/deep.mjs', 'top.mjs']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('RED: collectInputs reads content, so a changed file changes the fingerprint', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fp-'));
  try {
    writeFileSync(join(dir, 'top.mjs'), 'before');
    const before = fingerprintOf(collectInputs(dir));
    writeFileSync(join(dir, 'top.mjs'), 'after');
    assert.notEqual(fingerprintOf(collectInputs(dir)), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('RED: collectInputs denies a directory that does not exist', () => {
  // A missing directory read as "no inputs" would silently freeze the cache key.
  assert.throws(() => collectInputs(join(tmpdir(), 'fp-absent-' + Date.now())), /ENOENT|not found/i);
});

// ── which cache directories are no longer keyed to anything ──────────────────

test('RED: a cache directory keyed to another fingerprint is stale', () => {
  const stale = staleCacheDirs(['.astro-aaaaaaaa', '.astro-bbbbbbbb', '.vite-aaaaaaaa'], {
    prefixes: ['.astro-', '.vite-'],
    keep: 'aaaaaaaa',
  });
  assert.deepEqual(stale, ['.astro-bbbbbbbb']);
});

test('RED: the directory keyed to the current fingerprint is never stale', () => {
  const stale = staleCacheDirs(['.astro-aaaaaaaa', '.vite-aaaaaaaa'], {
    prefixes: ['.astro-', '.vite-'],
    keep: 'aaaaaaaa',
  });
  assert.deepEqual(stale, []);
});

test('RED: a directory outside the prefixes is never touched', () => {
  // node_modules holds a thousand directories that are not ours. Pruning is scoped by
  // the prefixes this module itself creates, never by "looks like a cache".
  const stale = staleCacheDirs(['astro', 'vite', '.bin', '.astro', '.vite', '.package-lock.json'], {
    prefixes: ['.astro-', '.vite-'],
    keep: 'aaaaaaaa',
  });
  assert.deepEqual(stale, []);
});

test('RED: Astro\'s own default cache directories are never pruned', () => {
  // .astro and .vite without a suffix belong to a build that is not keyed. Removing
  // them would be invalidation by deletion, which is the option this design rejected.
  const stale = staleCacheDirs(['.astro', '.vite'], { prefixes: ['.astro-', '.vite-'], keep: 'aaaaaaaa' });
  assert.deepEqual(stale, []);
});

// ── running the collection, as opposed to deciding it ────────────────────────

test('sweepStaleCacheDirs removes every stale directory and reports what it removed', () => {
  const removedPaths = [];
  const io = {
    readdir: () => ['.vite-old', '.vite-keep', '.astro-old', 'astro', 'other'],
    remove: (path) => removedPaths.push(path),
  };
  const removed = sweepStaleCacheDirs('/nm', { prefixes: ['.astro-', '.vite-'], keep: 'keep' }, io);
  assert.deepEqual(removed.sort(), ['.astro-old', '.vite-old']);
  assert.deepEqual(removedPaths.sort(), ['/nm/.astro-old', '/nm/.vite-old']);
});

test('RED: the directory belonging to the current fingerprint is never removed', () => {
  // The one directory the caller is about to write into. Removing it would turn
  // garbage collection into invalidation, which is the distinction this module exists on.
  const removedPaths = [];
  const io = { readdir: () => ['.vite-keep', '.astro-keep'], remove: (p) => removedPaths.push(p) };
  assert.deepEqual(sweepStaleCacheDirs('/nm', { prefixes: ['.astro-', '.vite-'], keep: 'keep' }, io), []);
  assert.deepEqual(removedPaths, []);
});

test('RED: an unreadable modules directory collects nothing rather than throwing', () => {
  // Collection is best-effort by contract: a failure here must never fail a build,
  // because a key whose directory is missing builds slow once and never wrong.
  const io = {
    readdir: () => { throw new Error('EACCES'); },
    remove: () => { throw new Error('should not be reached'); },
  };
  assert.deepEqual(sweepStaleCacheDirs('/nm', { prefixes: ['.vite-'], keep: 'keep' }, io), []);
});

test('RED: one directory held open by another process does not stop the rest', () => {
  const removedPaths = [];
  const io = {
    readdir: () => ['.vite-locked', '.vite-free'],
    remove: (path) => {
      if (path.endsWith('.vite-locked')) throw new Error('EBUSY');
      removedPaths.push(path);
    },
  };
  const removed = sweepStaleCacheDirs('/nm', { prefixes: ['.vite-'], keep: 'keep' }, io);
  assert.deepEqual(removed, ['.vite-free']);
  assert.deepEqual(removedPaths, ['/nm/.vite-free']);
});

test('RED: a directory that failed to be removed is not reported as removed', () => {
  const io = { readdir: () => ['.vite-locked'], remove: () => { throw new Error('EBUSY'); } };
  assert.deepEqual(sweepStaleCacheDirs('/nm', { prefixes: ['.vite-'], keep: 'keep' }, io), []);
});

test('the default io really reads and really removes — the injected one proves nothing about production', () => {
  // Every test above hands sweepStaleCacheDirs its own io, so none of them touches the
  // default the build actually runs with. A collector whose only proven path is the test
  // double is a collector nobody has run.
  const dir = mkdtempSync(join(tmpdir(), 'sweep-'));
  try {
    mkdirSync(join(dir, '.vite-stale', 'nested'), { recursive: true });
    writeFileSync(join(dir, '.vite-stale', 'nested', 'deep.js'), 'x');
    mkdirSync(join(dir, '.vite-keep'));
    mkdirSync(join(dir, 'node-something'));
    const removed = sweepStaleCacheDirs(dir, { prefixes: ['.vite-'], keep: 'keep' });
    assert.deepEqual(removed, ['.vite-stale']);
    assert.deepEqual(readdirSync(dir).sort(), ['.vite-keep', 'node-something']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('RED: the default io survives a modules directory that is not there', () => {
  assert.deepEqual(sweepStaleCacheDirs(join(tmpdir(), 'sweep-absent-'.concat(String(Date.now()))), { prefixes: ['.vite-'], keep: 'k' }), []);
});
