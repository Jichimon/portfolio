// The post-deploy check. A deploy step's exit code says a command succeeded; it does not
// say the site is there. This walks every route the content collection derives, against the
// URL that was just deployed, and reports each one that is not a served HTML page.
//
// Pure by construction: `fetch` and `sleep` arrive as arguments, so the whole of it runs in
// milliseconds against a stand-in and every failure mode below is provable rather than
// argued (T-04, and P-14 - a check only ever seen to pass has not been tested).
//
// NOT a gate step. gate.mjs stays offline: a gate needing a network and a live deployment is
// a gate that fails on an aeroplane, and T-09 makes the gate the one command CI also runs.

const HTML_CONTENT_TYPE = /^text\/html\b/i;

/** A readiness bound, CHOSEN not measured (C-01): the first real deploys correct it. */
const DEFAULT_READINESS_ATTEMPTS = 10;
const DEFAULT_READINESS_DELAY_MS = 3_000;

const finding = (message) => ({ message });

/**
 * Resolve a route path against the deployed origin.
 *
 * `new URL(path, base)` anchors an absolute path at the origin, so a base carrying a
 * trailing slash cannot produce a doubled separator or swallow a segment.
 */
const urlFor = (baseUrl, path) => new URL(path, baseUrl).toString();

/**
 * One request, reduced to the only two questions that matter: did it answer 200, and did it
 * answer with HTML. A 200 carrying JSON is a deploy that landed wrong, and a status-only
 * check would call it green.
 *
 * Returns null when the route is fine, a finding otherwise. Never throws: `fetch` REJECTS on
 * DNS failure and connection refusal rather than returning a status, and an unhandled
 * rejection here would crash the caller instead of reporting an unreachable site.
 */
async function checkRoute(fetchImpl, baseUrl, route) {
  const label = `${route.path} (slug "${route.slug}", lang "${route.lang}")`;
  let response;
  try {
    response = await fetchImpl(urlFor(baseUrl, route.path));
  } catch (error) {
    return finding(`${label} could not be reached: ${error.message}`);
  }
  if (response.status !== 200) {
    return finding(`${label} answered ${response.status}, not 200 — the deploy did not land whole`);
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !HTML_CONTENT_TYPE.test(contentType)) {
    return finding(
      `${label} answered 200 with content-type "${contentType ?? '(none)'}" — the host replied, but not with a page`,
    );
  }
  return null;
}

/**
 * ONE bounded wait, on the index route only, before the set is walked. A freshly-deployed
 * Worker can take a moment to answer everywhere.
 *
 * Bounded, never a loop that ends when the site comes up: a site that never comes up must
 * fail the run rather than hang it until the job timeout kills it with no diagnosis, which
 * is INC-18 exactly.
 *
 * Deliberately NOT a per-route retry. Retrying each route would turn a genuinely missing
 * page into a slow one and report success — a flake is a finding (T-06).
 */
async function awaitOrigin(fetchImpl, sleep, baseUrl, attempts, delayMs) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      // Stryker disable next-line StringLiteral: '' and '/' resolve identically through
      // new URL(path, base) — both yield the origin — so the mutant is equivalent.
      const response = await fetchImpl(urlFor(baseUrl, '/'));
      if (response.status === 200) return null;
    } catch {
      // Swallowed HERE and only here: during readiness an unreachable origin is the
      // expected state, not a result. It becomes a finding below if it never resolves,
      // and checkRoute reports it per-route once the walk starts.
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  return finding(
    `the deployed origin did not answer 200 at / after ${attempts} attempt(s) — every route below is unverified`,
  );
}

/**
 * @param {object} options
 * @param {string} options.baseUrl        the deployed origin, from the deploy step's output
 * @param {Array<{slug:string,lang:string,path:string}>} options.routes  derived, never listed
 * @param {Function} options.fetchImpl
 * @param {Function} [options.sleep]
 * @param {number} [options.readinessAttempts]
 * @param {number} [options.readinessDelayMs]
 * @returns {Promise<Array<{message:string}>>} every failure, never only the first
 */
export async function verifyDeployment({
  baseUrl,
  routes,
  fetchImpl,
  // Stryker disable next-line ArrowFunction: the default is covered (one test omits `sleep`
  // and retries a real 1ms delay), but its DURATION is unobservable without asserting elapsed
  // wall time — which is a flake, and T-06 says a flake is a finding. Killed for coverage,
  // suppressed for behaviour.
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  readinessAttempts = DEFAULT_READINESS_ATTEMPTS,
  readinessDelayMs = DEFAULT_READINESS_DELAY_MS,
}) {
  // The variable is set by the job that just deployed, from that step's own output. Its
  // absence is a defect in the workflow, so it is a finding and never a skip — a skip is
  // how this check would come to run zero times without anyone noticing (INC-08).
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    return [finding('no base URL was given — PROD_BASE_URL is unset or empty, so nothing was verified')];
  }
  try {
    new URL(baseUrl);
  } catch {
    return [finding(`the base URL "${baseUrl}" is not a URL, so nothing was verified`)];
  }

  // A broken derivation returning zero routes would otherwise pass every deploy forever,
  // reporting success having checked nothing. TASK 39's shape, one level out.
  if (!Array.isArray(routes) || routes.length === 0) {
    return [finding('the derivation produced no routes to check — a verifier that checked nothing has verified nothing')];
  }

  const notReady = await awaitOrigin(fetchImpl, sleep, baseUrl, readinessAttempts, readinessDelayMs);
  if (notReady) return [notReady];

  // Every route is walked before the verdict. Reporting the first and returning means the
  // push that fixes it discovers the next one.
  const findings = [];
  for (const route of routes) {
    const result = await checkRoute(fetchImpl, baseUrl, route);
    if (result) findings.push(result);
  }
  return findings;
}

/** The path the site's Worker answers, and the only one on the origin that is not a file. */
export const CONTACT_ENDPOINT_PATH = '/api/contact';

/**
 * A submission the handler must refuse.
 *
 * Every field present and empty, rather than a body with fields missing: this exercises the
 * validator's own path rather than the "not a form at all" shortcut, so the probe fails if
 * validation is skipped as well as if it is absent. The honeypot is deliberately NOT set —
 * a sprung trap answers 200 by design, which the probe would have to read as a failure.
 *
 * A colocated test asserts this payload is rejected by the site's real parser, so the probe
 * is provably incapable of sending an email however often it runs.
 */
export const CONTACT_PROBE_PAYLOAD = { email: '', about: '', message: '' };

const CONTACT_EXPECTED_STATUS = 400;

/**
 * The forced failure, run against the deployment rather than a stand-in.
 *
 * One request proves three things nothing else here can: the route reaches a request
 * handler, the handler's validation runs, and the asset router was configured to hand this
 * path over rather than answering it with the 404 page. That last one is the failure mode
 * with no other symptom — every page still works, and the form silently stops working.
 *
 * Returns null when the endpoint behaves, a finding otherwise. Never throws, for the same
 * reason checkRoute does not: fetch rejects on connection failure, and an unhandled
 * rejection would crash the run instead of reporting an unreachable endpoint.
 */
export async function probeContactEndpoint({ baseUrl, fetchImpl, endpointPath = CONTACT_ENDPOINT_PATH }) {
  const label = `the contact endpoint ${endpointPath}`;
  let response;
  try {
    response = await fetchImpl(urlFor(baseUrl, endpointPath), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(CONTACT_PROBE_PAYLOAD),
    });
  } catch (error) {
    return finding(`${label} could not be reached: ${error.message}`);
  }

  if (response.status !== CONTACT_EXPECTED_STATUS) {
    return finding(
      `${label} answered ${response.status} to a deliberately invalid submission, not ` +
        `${CONTACT_EXPECTED_STATUS} — either the route never reached the handler, or the handler accepts anything`,
    );
  }

  return null;
}
