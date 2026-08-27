import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FINGERPRINT_LENGTH = 8;

/**
 * A stable token derived from a set of files and their contents.
 *
 * Sorted by path before hashing, because readdir order is not a contract and a key
 * that moved with it would invalidate the cache at random and stop meaning anything.
 * Path and length are folded in alongside the content so that moving bytes between
 * two files changes the token: without a delimiter, "a" + "bc" and "ab" + "c" are the
 * same stream.
 */
export function fingerprintOf(inputs) {
  if (inputs.length === 0) {
    // A fingerprint over nothing is a constant, and a constant key means every build
    // lands on the same cache forever — the defect this module exists to close.
    throw new Error('fingerprintOf received no inputs');
  }
  const digest = createHash('sha256');
  for (const { path, content } of [...inputs].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    digest.update(`${path}\u0000${Buffer.byteLength(content)}\u0000${content}\u0000`);
  }
  return digest.digest('hex').slice(0, FINGERPRINT_LENGTH);
}

/** Every file under `dir`, recursively, with paths relative to `dir` and forward slashes. */
export function collectInputs(dir, prefix = '') {
  const inputs = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) inputs.push(...collectInputs(join(dir, item.name), relative));
    else inputs.push({ path: relative, content: readFileSync(join(dir, item.name), 'utf8') });
  }
  return inputs;
}

/**
 * Cache directories this module created for a fingerprint that is no longer current.
 *
 * Garbage collection, never invalidation: correctness does not depend on this running.
 * A build keyed to a fingerprint whose directory was removed is slow once, never wrong,
 * which is the whole difference between keying the cache and clearing it.
 *
 * Scoped by the prefixes this module itself mints, so an unsuffixed default directory —
 * or any of the thousand directories a package manager puts beside them — is never a
 * candidate. That is a property of the name, not a judgement about what looks like a cache.
 */
export function staleCacheDirs(names, { prefixes, keep }) {
  return names.filter((name) =>
    prefixes.some((prefix) => name.startsWith(prefix) && name.slice(prefix.length) !== keep),
  );
}
