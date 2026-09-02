import { describe, it, expect } from 'vitest';
import { HONEYPOT_FIELD_NAME } from '../../lib/contact/submission.mjs';
import {
  CONTACT_ENDPOINT,
  readSubmittedValues,
  runContactSubmission,
} from './contact-form.mjs';

const STRINGS = {
  sending: 'Sending…',
  sent: "Sent. I'll reply to",
  error: "Couldn't send. Your message is still here. Write to",
};

const CONTACT_ADDRESS = 'listed@example.invalid';

const VISITOR_ADDRESS = 'visitor@example.invalid';
const VISITOR_SUBJECT = 'A question about a migration';
const VISITOR_MESSAGE = 'Two paragraphs about a system that is hard to explain.';

function buildContactForm() {
  document.body.innerHTML = `
    <form class="contact-section__form">
      <input name="email" value="${VISITOR_ADDRESS}" />
      <input name="about" value="${VISITOR_SUBJECT}" />
      <textarea name="message">${VISITOR_MESSAGE}</textarea>
      <input name="${HONEYPOT_FIELD_NAME}" value="" />
      <button type="submit">Send</button>
      <p class="contact-section__status"></p>
    </form>
  `;

  const form = document.querySelector('form') as HTMLFormElement;
  return {
    form,
    statusElement: form.querySelector('.contact-section__status') as HTMLElement,
    submitButton: form.querySelector('button') as HTMLButtonElement,
    fieldValues: () =>
      Object.fromEntries(
        [...form.querySelectorAll('input, textarea')].map((field) => [
          (field as HTMLInputElement).name,
          (field as HTMLInputElement).value,
        ]),
      ),
  };
}

const respondWith = (status: number, body: unknown) => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const submissionOptions = (form: HTMLFormElement, statusElement: HTMLElement, fetchImpl: typeof fetch) => ({
  form,
  statusElement,
  strings: STRINGS,
  contactAddress: CONTACT_ADDRESS,
  fetchImpl,
});

describe('reading the form', () => {
  it('reads every named field, including the honeypot the server needs to see', () => {
    const { form } = buildContactForm();

    const values = readSubmittedValues(form);

    expect(values.email).toBe(VISITOR_ADDRESS);
    expect(values.about).toBe(VISITOR_SUBJECT);
    expect(values.message).toBe(VISITOR_MESSAGE);
    expect(values[HONEYPOT_FIELD_NAME]).toBe('');
  });

  it('carries the honeypot value when a bot has filled it, so the trap can spring on the server', () => {
    const { form } = buildContactForm();
    (form.querySelector(`[name="${HONEYPOT_FIELD_NAME}"]`) as HTMLInputElement).value = 'a bot was here';

    expect(readSubmittedValues(form)[HONEYPOT_FIELD_NAME]).toBe('a bot was here');
  });
});

describe('the request', () => {
  it('posts JSON to the endpoint the Worker answers', async () => {
    const { form, statusElement } = buildContactForm();
    let seenUrl: string | undefined;
    let seenInit: RequestInit | undefined;

    const recordingFetch = ((url: string, init: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      return respondWith(200, { replyTo: VISITOR_ADDRESS })();
    }) as unknown as typeof fetch;

    await runContactSubmission(submissionOptions(form, statusElement, recordingFetch));

    expect(seenUrl).toBe(CONTACT_ENDPOINT);
    expect(seenInit?.method).toBe('POST');
    expect(JSON.parse(seenInit?.body as string).message).toBe(VISITOR_MESSAGE);
  });
});

describe('the three states', () => {
  it('shows the sending state before the response arrives', async () => {
    const { form, statusElement } = buildContactForm();
    let releaseResponse: (value: Response) => void = () => {};
    const pendingFetch = (() =>
      new Promise<Response>((resolve) => {
        releaseResponse = resolve;
      })) as unknown as typeof fetch;

    const submission = runContactSubmission(submissionOptions(form, statusElement, pendingFetch));

    // Asserted while the request is still in flight: this is the state the page could never
    // show while the form was a mailto link, because nothing was ever in flight.
    expect(statusElement.textContent).toBe(STRINGS.sending);
    expect(statusElement.dataset.state).toBe('sending');

    releaseResponse(new Response(JSON.stringify({ replyTo: VISITOR_ADDRESS }), { status: 200 }));
    await submission;
  });

  it('renders the sent state echoing the address the reply will go to', async () => {
    const { form, statusElement } = buildContactForm();

    const result = await runContactSubmission(
      submissionOptions(form, statusElement, respondWith(200, { replyTo: VISITOR_ADDRESS }) as unknown as typeof fetch),
    );

    expect(result.state).toBe('sent');
    expect(statusElement.dataset.state).toBe('sent');
    expect(statusElement.textContent).toContain(STRINGS.sent);
    expect(statusElement.textContent).toContain(VISITOR_ADDRESS);
  });

  it('echoes the address the SERVER parsed, not the one still sitting in the field', async () => {
    const { form, statusElement } = buildContactForm();
    const trimmedByTheServer = 'trimmed@example.invalid';
    (form.querySelector('[name="email"]') as HTMLInputElement).value = `  ${trimmedByTheServer}  `;

    await runContactSubmission(
      submissionOptions(
        form,
        statusElement,
        respondWith(200, { replyTo: trimmedByTheServer }) as unknown as typeof fetch,
      ),
    );

    expect(statusElement.textContent).toContain(trimmedByTheServer);
    expect(statusElement.textContent).not.toContain(`  ${trimmedByTheServer}  `);
  });

  it('renders the error state on a rejected submission, and leaves every field value untouched', async () => {
    const { form, statusElement, fieldValues } = buildContactForm();
    const before = fieldValues();

    const result = await runContactSubmission(
      submissionOptions(
        form,
        statusElement,
        respondWith(400, { error: 'invalid_submission', findings: [] }) as unknown as typeof fetch,
      ),
    );

    expect(result.state).toBe('error');
    expect(statusElement.dataset.state).toBe('error');
    // Losing a paragraph somebody wrote is worse than the failure that caused it.
    expect(fieldValues()).toEqual(before);
  });

  it('renders the error state when the mail provider fails, with the words still there', async () => {
    const { form, statusElement, fieldValues } = buildContactForm();
    const before = fieldValues();

    const result = await runContactSubmission(
      submissionOptions(form, statusElement, respondWith(502, { error: 'send_failed' }) as unknown as typeof fetch),
    );

    expect(result.state).toBe('error');
    expect(fieldValues()).toEqual(before);
  });

  it('renders the error state when the network fails outright, rather than rejecting', async () => {
    const { form, statusElement, fieldValues } = buildContactForm();
    const before = fieldValues();
    const failingFetch = (() => Promise.reject(new Error('the network is gone'))) as unknown as typeof fetch;

    const result = await runContactSubmission(submissionOptions(form, statusElement, failingFetch));

    expect(result.state).toBe('error');
    expect(fieldValues()).toEqual(before);
  });

  it('offers the listed address in the error state, so a failed send is not a dead end', async () => {
    const { form, statusElement } = buildContactForm();

    await runContactSubmission(
      submissionOptions(form, statusElement, respondWith(502, { error: 'send_failed' }) as unknown as typeof fetch),
    );

    expect(statusElement.textContent).toContain(CONTACT_ADDRESS);
  });

  it('treats a rate-limited answer as the same error state, because a visitor cannot act on the difference', async () => {
    const { form, statusElement } = buildContactForm();

    const result = await runContactSubmission(
      submissionOptions(form, statusElement, respondWith(429, { error: 'rate_limited' }) as unknown as typeof fetch),
    );

    expect(result.state).toBe('error');
  });
});

describe('the submit button', () => {
  it('is disabled while the request is in flight and enabled again afterwards', async () => {
    const { form, statusElement, submitButton } = buildContactForm();
    let releaseResponse: (value: Response) => void = () => {};
    const pendingFetch = (() =>
      new Promise<Response>((resolve) => {
        releaseResponse = resolve;
      })) as unknown as typeof fetch;

    const submission = runContactSubmission(submissionOptions(form, statusElement, pendingFetch));

    expect(submitButton.disabled).toBe(true);

    releaseResponse(new Response(JSON.stringify({ replyTo: VISITOR_ADDRESS }), { status: 200 }));
    await submission;

    expect(submitButton.disabled).toBe(false);
  });

  it('is enabled again after a failure too, so a visitor can retry', async () => {
    const { form, statusElement, submitButton } = buildContactForm();
    const failingFetch = (() => Promise.reject(new Error('the network is gone'))) as unknown as typeof fetch;

    await runContactSubmission(submissionOptions(form, statusElement, failingFetch));

    expect(submitButton.disabled).toBe(false);
  });
});
