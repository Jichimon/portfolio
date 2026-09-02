#!/usr/bin/env node
// Post-deploy verification: every route the content collection derives, requested against
// the URL that was just deployed.
//
// A thin CLI over a pure module, the same split as scripts/status-history.mjs over
// scripts/guards/lib/status-history.mjs — this file resolves paths, reads the tree and
// prints; scripts/guards/lib/deploy-verify.mjs decides, and is where the red battery lives.
//
// Run by the deploy job in .github/workflows/ci.yml, never by gate.mjs: a gate that needs a
// network and a live deployment is a gate that fails on an aeroplane (T-09).
//
// The base URL arrives in PROD_BASE_URL, which the deploy step sets from its own
// deployment-url output. That is the single declaration site, and it is why the account's
// workers.dev subdomain appears in no file in this repository (C-06).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  deriveRouteSetFromEntries,
  ROUTED_PAGE_SLUGS,
  INDEX_PAGE_SLUG,
} from '../site/lib/content/routes/route-set.mjs';
import { readLocalizedMarkdownEntries } from '../site/lib/content/routes/route-source.mjs';
import { verifyDeployment } from './guards/lib/deploy-verify.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// The same two content roots and the same derivation the e2e suite uses, through the same
// module — one derivation, two consumers. A verifier enumerating routes differently from the
// suite would be verifying something else (criterion 4).
const INTERFACE_STRINGS_STEM = 'ui';

function deriveRoutes() {
  const pageEntries = readLocalizedMarkdownEntries(join(ROOT, 'resources', 'site'), INTERFACE_STRINGS_STEM);
  const caseStudyEntries = readLocalizedMarkdownEntries(join(ROOT, 'resources', 'case-studies'));
  return deriveRouteSetFromEntries(
    [...pageEntries, ...caseStudyEntries],
    ROUTED_PAGE_SLUGS,
    INDEX_PAGE_SLUG,
  );
}

/**
 * Slugs the register knows are derived but not yet routed. Read from the same list the smoke
 * tier reads, so a page still being built does not fail a deploy — and a reasonless entry
 * fails here exactly as it does there, because an unexplained exemption is how a permanent
 * one starts.
 */
function readPendingSlugs() {
  const config = JSON.parse(readFileSync(join(ROOT, 'scripts', 'guards', 'guards.config.json'), 'utf8'));
  const pending = config?.site?.pendingRoutes;
  if (!Array.isArray(pending)) {
    throw new Error('guards.config.json has no site.pendingRoutes list to read');
  }
  for (const entry of pending) {
    if (!entry.reason) throw new Error(`pendingRoutes entry for slug "${entry.slug}" has no reason`);
  }
  return new Set(pending.map((entry) => entry.slug));
}

const baseUrl = process.env.PROD_BASE_URL;
const pendingSlugs = readPendingSlugs();
const routes = deriveRoutes().filter((route) => !pendingSlugs.has(route.slug));

const findings = await verifyDeployment({ baseUrl, routes, fetchImpl: fetch });

const target = baseUrl ? baseUrl.replace(/\/$/, '') : '(unset)';
console.log(
  `      ${routes.length} derived route(s) checked at ${target}` +
    (pendingSlugs.size ? ` · ${pendingSlugs.size} pending slug(s) skipped` : ''),
);

if (findings.length > 0) {
  console.error(`FAIL  verify-deploy  ${findings.length} finding(s)`);
  for (const f of findings) console.error(`  ${f.message}`);
  process.exit(1);
}

console.log('PASS  verify-deploy');
