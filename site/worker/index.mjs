import { parseSubmission, buildResendPayload } from '../lib/contact/submission.mjs';

/**
 * The one path this Worker answers. Everything else on the origin is a static file, and the
 * asset router is configured to hand only this route over — the fallthrough below exists so
 * that widening that configuration cannot silently turn the rest of the site into 404s.
 */
const CONTACT_ROUTE = '/api/contact';

const MAIL_API_ENDPOINT = 'https://api.resend.com/emails';

/** The header the edge sets to the real client address, and which a client cannot forge. */
const CLIENT_ADDRESS_HEADER = 'CF-Connecting-IP';

const jsonResponse = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/**
 * Reads the submitted fields, or reports that there were none.
 *
 * A body that is absent, truncated or not JSON at all is an ordinary thing for a public
 * endpoint to receive and must not throw — the parser downstream already treats a shape
 * that is not a form as a finding, so handing it the parse failure keeps one decision in
 * one place.
 */
async function readSubmittedFields(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Best effort, and named as such. The limiter counts per location rather than globally, so
 * this raises the cost of abuse and does not cap it.
 *
 * When the client-address header is absent the request did not arrive through the edge,
 * which in practice means a local run. The check is skipped rather than keyed on a
 * constant: one shared bucket would rate-limit every visitor against every other.
 */
async function isWithinRate(request, env) {
  const clientAddress = request.headers.get(CLIENT_ADDRESS_HEADER);
  if (!env.CONTACT_RATE_LIMIT || !clientAddress) return true;

  const { success } = await env.CONTACT_RATE_LIMIT.limit({ key: clientAddress });
  return success;
}

/**
 * Sends through the mail API and reports only whether it worked.
 *
 * The provider's own response body is deliberately not returned to the caller and not
 * logged: it can quote the request that carried the Authorization header, and an error path
 * that echoes upstream output is how a credential reaches somewhere nobody looked.
 */
async function sendMail(payload, apiKey) {
  const response = await fetch(MAIL_API_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error(`contact: the mail API answered ${response.status}`);
    return false;
  }

  return true;
}

async function handleContactSubmission(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  if (!env.RESEND_API_KEY) {
    // Loud rather than a silent unauthenticated send. A missing key is a deployment fault,
    // never a visitor's, so it reads as a server error and the page shows its error state.
    console.error('contact: no API key is configured, so nothing can be sent');
    return jsonResponse({ error: 'not_configured' }, 500);
  }

  if (!(await isWithinRate(request, env))) {
    return jsonResponse({ error: 'rate_limited' }, 429);
  }

  const result = parseSubmission(await readSubmittedFields(request));

  // A trap answers exactly as a success does. Telling a bot it was detected teaches it to
  // avoid the trap on its next visit, and nothing is sent either way.
  if (result.outcome === 'trapped') {
    return jsonResponse({ replyTo: null }, 200);
  }

  if (result.outcome === 'rejected') {
    return jsonResponse({ error: 'invalid_submission', findings: result.findings }, 400);
  }

  const payload = buildResendPayload(result.submission, {
    senderAddress: env.CONTACT_FROM_ADDRESS,
    recipientAddress: env.CONTACT_TO_ADDRESS,
  });

  if (!(await sendMail(payload, env.RESEND_API_KEY))) {
    return jsonResponse({ error: 'send_failed' }, 502);
  }

  // The address is echoed from the parsed submission rather than from the raw field, so
  // what the page tells the visitor is the address the reply will actually go to.
  return jsonResponse({ replyTo: result.submission.visitorAddress }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === CONTACT_ROUTE) {
      return handleContactSubmission(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
