#!/usr/bin/env node
// Everything the PreToolUse guard does not already record: run headers and footers, tool
// results, permission-engine denials, and which instruction files actually loaded.
//
// One registration per event family would mean one process spawn per event; this file is
// registered for several events and dispatches through `eventsFor`, which is pure and tested
// because its field names are a coupling to the runtime that nothing else would catch drifting.
//
// It exits 0 unconditionally. Recording is a measurement, and a measurement must never be
// able to stop the thing it measures.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eventsFor } from '../lib/evidence.mjs';
import { record, loadTerms } from './trace-writer.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* nothing to record */ }

let cfg = {};
try { cfg = JSON.parse(readFileSync(join(ROOT, 'scripts/guards/guards.config.json'), 'utf8')).evidence ?? {}; } catch { /* defaults */ }

record(ROOT, input, eventsFor(input, loadTerms(ROOT), cfg), { prune: cfg.retainRuns });
process.exit(0);
