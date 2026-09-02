import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  verifyDeployment,
  probeContactEndpoint,
  CONTACT_ENDPOINT_PATH,
  CONTACT_PROBE_PAYLOAD,
} from './deploy-verify.mjs';

const HTML = { status: 200, headers: new Map([['content-type', 'text/html; charset=utf-8']]) };

/** A fetch stand-in driven by a path -> response map. Anything unmapped is a 404. */
function fetcherFor(responses) {
  const seen = [];
  const impl = async (url) => {
    const { pathname } = new URL(url);
    seen.push(pathname);
    const r = responses[pathname] ?? { status: 404, headers: new Map() };
    if (r instanceof Error) throw r;
    return { status: r.status, headers: { get: (k) => r.headers.get(k) ?? null } };
  };
  impl.seen = seen;
  return impl;
}

const ROUTES = [
  { slug: 'home', lang: 'en', path: '/' },
  { slug: 'about', lang: 'en', path: '/about' },
  { slug: 'about', lang: 'es', path: '/es/about' },
];

const ALL_HTML = { '/': HTML, '/about': HTML, '/es/about': HTML };
const noWait = async () => {};

const run = (opts) =>
  verifyDeployment({ baseUrl: 'https://example.workers.dev', routes: ROUTES, sleep: noWait, ...opts });

// --- the green path ---------------------------------------------------------

test('green path: every route answering 200 text/html yields no findings', async () => {
  assert.deepEqual(await run({ fetchImpl: fetcherFor(ALL_HTML) }), []);
});

test('every derived route is actually requested, not a sample of them', async () => {
  // A verifier that checks the first route and returns proves nothing about the other
  // sixteen. The set requested is asserted rather than the loop being trusted.
  //
  // DISTINCT paths, because `/` is legitimately requested twice: once by the readiness
  // probe, which only asks for a 200, and once by the walk, which also asks whether the
  // answer was HTML. Asserting the raw sequence here would couple this test to the
  // readiness mechanism and fail the day its attempt count changes.
  const f = fetcherFor(ALL_HTML);
  await run({ fetchImpl: f });
  assert.deepEqual([...new Set(f.seen)].sort(), ['/', '/about', '/es/about']);
});

test('a base URL carrying a trailing slash resolves the same paths', async () => {
  // `new URL('/about', base)` is anchored at the origin, so a trailing slash on the base
  // must not produce `/es//about` or drop a segment.
  const f = fetcherFor(ALL_HTML);
  const findings = await verifyDeployment({
    baseUrl: 'https://example.workers.dev/',
    routes: ROUTES,
    sleep: noWait,
    fetchImpl: f,
  });
  assert.deepEqual(findings, []);
  assert.deepEqual([...new Set(f.seen)].sort(), ['/', '/about', '/es/about']);
});

// --- RED: the failures this exists to catch ---------------------------------

test('RED: a route answering 404 is reported by name', async () => {
  const findings = await run({ fetchImpl: fetcherFor({ '/': HTML, '/about': HTML }) });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /\/es\/about/);
  assert.match(findings[0].message, /404/);
});

test('RED: every missing route is reported, not just the first', async () => {
  // Reporting one and exiting means a second push to fix it discovers the next one. The
  // whole set is walked before the verdict.
  const findings = await run({ fetchImpl: fetcherFor({ '/': HTML }) });
  assert.equal(findings.length, 2);
});

test('RED: a 200 with a non-HTML content type is a finding', async () => {
  // Cloudflare answering with SOMETHING is not the same as the page being there. A 200
  // carrying application/json or text/plain is a deploy that landed wrong, and a status-only
  // check would call it green.
  const findings = await run({
    fetchImpl: fetcherFor({
      ...ALL_HTML,
      '/about': { status: 200, headers: new Map([['content-type', 'application/json']]) },
    }),
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /\/about/);
  assert.match(findings[0].message, /application\/json/);
});

test('RED: a 200 with no content-type header at all is a finding', async () => {
  // The message says WHICH of the two it was. A missing header and a wrong header are
  // different deploys gone wrong, and a reader of a failed CI log should not have to guess
  // — asserting only the route name left the "(none)" fallback unkilled by mutation.
  const findings = await run({
    fetchImpl: fetcherFor({ ...ALL_HTML, '/about': { status: 200, headers: new Map() } }),
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /\/about/);
  assert.match(findings[0].message, /\(none\)/);
});

test('RED: an unreachable host is a finding rather than a pass', async () => {
  // fetch REJECTS on DNS failure and connection refusal; it does not return a status. An
  // unhandled rejection here would crash the CLI, and a swallowed one would report success
  // for a site nobody can reach.
  const boom = new Error('getaddrinfo ENOTFOUND example.workers.dev');
  const findings = await run({ fetchImpl: fetcherFor({ ...ALL_HTML, '/about': boom }) });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /ENOTFOUND/);
});

test('RED: an empty route set is a finding, not all-green', async () => {
  // TASK 39's shape, one level out: a check that ran nothing must not report success. A
  // broken derivation returning zero routes would otherwise pass every deploy forever.
  const findings = await run({ routes: [], fetchImpl: fetcherFor(ALL_HTML) });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /no routes/i);
});

test('RED: a missing base URL is a finding, not a skip', async () => {
  // This variable is set by the job that just deployed, from the deploy step's own output.
  // Its absence is a defect in the workflow, and a skip would hide exactly that.
  //
  // The message is asserted SPECIFICALLY, not just as /base URL/i. Both this branch and the
  // not-a-URL branch below mention the base URL, so a loose match passed whichever one ran —
  // and mutation found it: removing `.trim()` and removing the `typeof` half BOTH survived,
  // because the value fell through to `new URL()` and produced the other message. A test that
  // cannot tell two branches apart is not testing either of them.
  for (const baseUrl of [undefined, '', '   ', 0, null, {}]) {
    const findings = await run({ baseUrl, fetchImpl: fetcherFor(ALL_HTML) });
    assert.equal(findings.length, 1, `baseUrl ${JSON.stringify(baseUrl)} should be one finding`);
    assert.match(
      findings[0].message,
      /unset or empty/,
      `baseUrl ${JSON.stringify(baseUrl)} must take the unset branch, not the not-a-URL branch`,
    );
  }
});

test('RED: a routes value that is not an array at all is a finding', async () => {
  // The empty-array case and the not-an-array case are two halves of one guard, and only the
  // first was tested — so `!Array.isArray(routes)` survived mutation with the other half
  // covering for it. A derivation returning undefined is the likelier real failure.
  for (const routes of [undefined, null, 'nope', {}]) {
    const findings = await run({ routes, fetchImpl: fetcherFor(ALL_HTML) });
    assert.equal(findings.length, 1, `routes ${JSON.stringify(routes)} should be one finding`);
    assert.match(findings[0].message, /no routes/i);
  }
});

test('RED: a content type that merely CONTAINS text/html is a finding', async () => {
  // The matcher is anchored at the start. Unanchored, `application/xml+text/html` would read
  // as a page — a narrow case, but the anchor is the whole difference between "this response
  // IS html" and "this response mentions html", and an unanchored matcher survived mutation.
  const findings = await run({
    fetchImpl: fetcherFor({
      ...ALL_HTML,
      '/about': { status: 200, headers: new Map([['content-type', 'application/xml+text/html']]) },
    }),
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /\/about/);
});

test('RED: a base URL that is not a URL is a finding rather than a crash', async () => {
  const findings = await run({ baseUrl: 'not a url', fetchImpl: fetcherFor(ALL_HTML) });
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /base URL/i);
});

// --- readiness ---------------------------------------------------------------

test('the readiness wait retries the index route and then proceeds', async () => {
  // A freshly-deployed Worker can take a moment to answer everywhere. ONE bounded wait, on
  // the index only, before the set is walked.
  let indexCalls = 0;
  const fetchImpl = async (url) => {
    const { pathname } = new URL(url);
    if (pathname === '/') {
      indexCalls += 1;
      if (indexCalls < 3) return { status: 503, headers: { get: () => null } };
    }
    return { status: 200, headers: { get: () => 'text/html' } };
  };
  assert.deepEqual(await run({ fetchImpl, readinessAttempts: 5 }), []);
  assert.ok(indexCalls >= 3, 'the index should have been retried');
});

test('RED: the readiness wait is bounded and reports when it runs out', async () => {
  // Never an unbounded loop: a site that never comes up must fail the run, not hang it
  // until the job timeout kills it with no diagnosis (INC-18's lesson).
  //
  // EXACTLY n attempts, not "at most n". `<=` vs `<` in the loop bound is a one-attempt
  // difference that no inequality assertion can see, and both mutants survived until this
  // said the number out loud. The count is also the reason the routes are never reached:
  // an origin that never answers short-circuits before the walk.
  for (const attempts of [1, 3]) {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return { status: 503, headers: { get: () => null } };
    };
    const findings = await run({ fetchImpl, readinessAttempts: attempts });
    assert.equal(findings.length, 1);
    assert.match(findings[0].message, new RegExp(`after ${attempts} attempt`));
    assert.equal(calls, attempts, `exactly ${attempts} attempt(s), never one more or fewer`);
  }
});

test('the readiness wait sleeps BETWEEN attempts and not after the last one', async () => {
  // `if (attempt < attempts) await sleep(...)` — without that guard the loop sleeps once more
  // than it needs to, delaying the verdict by a full interval for no benefit. Off by one, and
  // invisible to every assertion that only counts fetches.
  const slept = [];
  const fetchImpl = async () => ({ status: 503, headers: { get: () => null } });
  await verifyDeployment({
    baseUrl: 'https://example.workers.dev',
    routes: ROUTES,
    fetchImpl,
    sleep: async (ms) => { slept.push(ms); },
    readinessAttempts: 4,
    readinessDelayMs: 250,
  });
  assert.deepEqual(slept, [250, 250, 250], 'three gaps between four attempts, none after the last');
});

test('the default sleep is a real delay, and the module works without one injected', async () => {
  // Every other test injects `sleep`, which left the default parameter with NO coverage at
  // all — a mutant replacing it with a no-op survived because nothing ever called it. This is
  // the one test that omits it, with a 1ms delay so it costs nothing.
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return calls === 1
      ? { status: 503, headers: { get: () => null } }
      : { status: 200, headers: { get: () => 'text/html' } };
  };
  const findings = await verifyDeployment({
    baseUrl: 'https://example.workers.dev',
    routes: ROUTES,
    fetchImpl,
    readinessAttempts: 3,
    readinessDelayMs: 1,
  });
  assert.deepEqual(findings, []);
  assert.ok(calls > 1, 'the origin was retried, so the default sleep ran');
});

test('RED: a per-route 404 is NOT retried away', async () => {
  // The readiness wait is deliberately not a per-route retry loop: that would turn a real
  // missing page into a slow one and report success (T-06 - a flake is a finding).
  let aboutCalls = 0;
  const fetchImpl = async (url) => {
    const { pathname } = new URL(url);
    if (pathname === '/about') {
      aboutCalls += 1;
      return { status: 404, headers: { get: () => null } };
    }
    return { status: 200, headers: { get: () => 'text/html' } };
  };
  const findings = await run({ fetchImpl, readinessAttempts: 5 });
  assert.equal(findings.length, 1);
  assert.equal(aboutCalls, 1, 'a 404 route is requested once, never retried');
});

// --- the contact endpoint probe ---------------------------------------------
//
// The forced failure the contact work item's Done asks for, run against the real
// deployment rather than a stand-in. It proves three things at once that nothing else in
// this suite can: that the route reaches a request handler at all, that the handler's
// validation runs, and that the asset router was configured to hand the path over. A
// deploy where the last of those is wrong answers the 404 page and looks fine everywhere
// else.

/** A fetch stand-in that records how it was called, which the route walk never needs. */
function recordingFetcher(response) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    if (response instanceof Error) throw response;
    return { status: response.status, headers: { get: () => null } };
  };
  impl.calls = calls;
  return impl;
}

const probe = (opts) =>
  probeContactEndpoint({ baseUrl: 'https://example.workers.dev', ...opts });

test('green path: the endpoint answering 400 to an invalid payload yields no finding', async () => {
  assert.equal(await probe({ fetchImpl: recordingFetcher({ status: 400 }) }), null);
});

test('RED: the endpoint answering 200 to an invalid payload is a finding', async () => {
  // The worst outcome of the three: a handler that accepts anything is one that will send
  // whatever a bot posts to it.
  const result = await probe({ fetchImpl: recordingFetcher({ status: 200 }) });
  assert.notEqual(result, null);
  assert.match(result.message, /200/);
});

test('RED: the endpoint answering 404 is a finding, which is the asset router keeping the route', async () => {
  const result = await probe({ fetchImpl: recordingFetcher({ status: 404 }) });
  assert.notEqual(result, null);
  assert.match(result.message, /404/);
});

test('RED: the endpoint answering 500 is a finding rather than "not a 200, so fine"', async () => {
  const result = await probe({ fetchImpl: recordingFetcher({ status: 500 }) });
  assert.notEqual(result, null);
});

test('RED: an unreachable endpoint is a finding, never a vacuous pass', async () => {
  const result = await probe({ fetchImpl: recordingFetcher(new Error('connection refused')) });
  assert.notEqual(result, null);
  assert.match(result.message, /connection refused/);
});

test('the probe POSTs JSON to the contact path, so it exercises the handler and not the asset router', async () => {
  const fetchImpl = recordingFetcher({ status: 400 });
  await probe({ fetchImpl });

  assert.equal(fetchImpl.calls.length, 1);
  assert.equal(new URL(fetchImpl.calls[0].url).pathname, CONTACT_ENDPOINT_PATH);
  assert.equal(fetchImpl.calls[0].init.method, 'POST');
});

test('the probe payload is one the real parser refuses, so this can never send an email', async () => {
  // Asserted against the SITE's own validator rather than against a copy of its rules. If
  // the payload ever became acceptable, this fails here instead of in somebody's inbox.
  const { parseSubmission } = await import('../../../site/lib/contact/submission.mjs');

  assert.equal(parseSubmission(CONTACT_PROBE_PAYLOAD).outcome, 'rejected');
});

test('LIVENESS: the deploy verifier actually calls the probe, so it cannot run zero times', async () => {
  // A check nobody wired reports nothing forever, and the local suite stays green while it
  // does. Read from the real CLI source rather than assumed.
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const cliPath = fileURLToPath(new URL('../../verify-deploy.mjs', import.meta.url));
  const cliSource = readFileSync(cliPath, 'utf8');

  assert.match(cliSource, /probeContactEndpoint/);
});
