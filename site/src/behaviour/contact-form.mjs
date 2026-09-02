/**
 * The contact form's three result states, and the request that produces them.
 *
 * This tier exists because the states need a DOM and nothing else: no framework, no island,
 * no hydration. The form works before any of this runs — its markup carries a mail action
 * that submits without JavaScript — so everything here is an improvement on a page that is
 * already functional, never the thing that makes it work.
 */

/** The path the site's own Worker answers. Same origin, so no cross-origin negotiation. */
export const CONTACT_ENDPOINT = '/api/contact';

const SUBMIT_BUTTON_SELECTOR = 'button[type="submit"]';

/**
 * Every named control, including the honeypot.
 *
 * The honeypot is submitted rather than stripped: the trap springs on the server, which is
 * the only side a bot cannot skip.
 */
export function readSubmittedValues(formElement) {
  return Object.fromEntries(new FormData(formElement));
}

/**
 * Writes one state into the announcement region.
 *
 * `textContent`, never `innerHTML`: the address echoed back came from a request body and
 * would otherwise be markup someone else chose. The state also lands on a data attribute so
 * the stylesheet can distinguish the three without reading the copy, which differs per
 * locale and would tie a colour to a language.
 */
function showState(statusElement, state, text) {
  statusElement.dataset.state = state;
  statusElement.textContent = text;
}

/**
 * Runs one submission from start to finish and reports where it ended.
 *
 * `fetchImpl` is an argument so the states can be exercised against a response that has not
 * arrived yet — the sending state is invisible to any test that can only see the end.
 */
export async function runContactSubmission({ form, statusElement, strings, contactAddress, fetchImpl }) {
  const submitButton = form.querySelector(SUBMIT_BUTTON_SELECTOR);

  showState(statusElement, 'sending', strings.sending);
  if (submitButton) submitButton.disabled = true;

  try {
    const response = await fetchImpl(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(readSubmittedValues(form)),
    });

    if (!response.ok) {
      // One state for every failure. A refused field, an exhausted rate and a provider
      // outage are different to the server and identical to the visitor, who can do exactly
      // one thing about all three — and inventing three messages would mean writing copy
      // that tells them nothing they can act on.
      showState(statusElement, 'error', `${strings.error} ${contactAddress}`);
      return { state: 'error' };
    }

    const { replyTo } = await response.json();

    // The address comes from the response, not from the field it was typed into. What the
    // page claims is then the address the reply will actually reach, whitespace and all
    // having been resolved by the side that will use it.
    showState(statusElement, 'sent', `${strings.sent} ${replyTo}`);
    return { state: 'sent', replyTo };
  } catch {
    // A network that never answered. Nothing about the form changes — the words stay where
    // the visitor left them, which is the whole difference between a failure and a loss.
    showState(statusElement, 'error', `${strings.error} ${contactAddress}`);
    return { state: 'error' };
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}
