import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSubmission,
  buildResendPayload,
  HONEYPOT_FIELD_NAME,
  FIELD_BOUNDS,
} from './submission.mjs';

// Every fixture here is invented. Nothing in this file is a real address, and the
// configured sender and recipient are passed in rather than read from anywhere — the
// module never learns who it is writing to, which is what keeps a real address out of
// the mutation sandbox and out of the test output when an assertion fails.

const completeFields = () => ({
  email: 'visitor@example.invalid',
  about: 'A question about a migration',
  message: 'Two paragraphs about a system that is hard to explain.',
});

const senderConfig = {
  senderAddress: 'Sample Sender <sender@example.invalid>',
  recipientAddress: 'recipient@example.invalid',
};

// --- The accepted path ---

test('a complete submission parses to a submission carrying the visitor address', () => {
  const result = parseSubmission(completeFields());

  assert.equal(result.outcome, 'accepted');
  assert.equal(result.submission.visitorAddress, 'visitor@example.invalid');
  assert.equal(result.submission.subject, 'A question about a migration');
  assert.equal(result.submission.message, 'Two paragraphs about a system that is hard to explain.');
});

test('the accepted submission trims each field, so the echoed address is the parsed one', () => {
  const result = parseSubmission({
    email: '  visitor@example.invalid  ',
    about: '  A question  ',
    message: '  A message.  ',
  });

  assert.equal(result.outcome, 'accepted');
  assert.equal(result.submission.visitorAddress, 'visitor@example.invalid');
  assert.equal(result.submission.subject, 'A question');
  assert.equal(result.submission.message, 'A message.');
});

// --- The Resend payload ---

test('the built payload carries reply_to as the visitor address and from as the configured sender', () => {
  const { submission } = parseSubmission(completeFields());
  const payload = buildResendPayload(submission, senderConfig);

  assert.equal(payload.from, 'Sample Sender <sender@example.invalid>');
  assert.equal(payload.to, 'recipient@example.invalid');
  assert.equal(payload.reply_to, 'visitor@example.invalid');
  assert.equal(payload.subject, 'A question about a migration');
});

test('the visitor address never occupies from, which is what SPF and DMARC would read as forgery', () => {
  const { submission } = parseSubmission(completeFields());
  const payload = buildResendPayload(submission, senderConfig);

  assert.ok(
    !payload.from.includes('visitor@example.invalid'),
    'the visitor address leaked into from, where it would be treated as a forged sender',
  );
});

test('the payload body carries the message and the address, and no word in either language', () => {
  const { submission } = parseSubmission(completeFields());
  const payload = buildResendPayload(submission, senderConfig);

  assert.ok(payload.text.includes('Two paragraphs about a system that is hard to explain.'));
  assert.ok(payload.text.includes('visitor@example.invalid'));
});

test('the payload names exactly the fields the API takes, so a typo in a key is a failure here', () => {
  const { submission } = parseSubmission(completeFields());
  const payload = buildResendPayload(submission, senderConfig);

  // reply_to, not replyTo: the API is snake_case, and the wrong spelling is accepted
  // silently as an unknown field, which sends a mail nobody can reply to.
  assert.deepEqual(Object.keys(payload).sort(), ['from', 'reply_to', 'subject', 'text', 'to']);
});

// --- The rejected path: every finding keeps the visitor's words recoverable ---

test('RED: a missing message is a finding', () => {
  const fields = completeFields();
  delete fields.message;

  const result = parseSubmission(fields);

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'message'));
});

test('RED: a missing address is a finding', () => {
  const fields = completeFields();
  delete fields.email;

  const result = parseSubmission(fields);

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'email'));
});

test('RED: a missing subject is a finding', () => {
  const fields = completeFields();
  delete fields.about;

  const result = parseSubmission(fields);

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'about'));
});

test('RED: an address without an at sign is a finding', () => {
  const result = parseSubmission({ ...completeFields(), email: 'not-an-address' });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'email'));
});

test('RED: an address whose domain carries no dot is a finding', () => {
  const result = parseSubmission({ ...completeFields(), email: 'visitor@localhost' });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'email'));
});

test('RED: an address carrying whitespace is a finding, which is the header-injection shape', () => {
  const result = parseSubmission({ ...completeFields(), email: 'visitor@example.invalid other@example.invalid' });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'email'));
});

test('RED: an address carrying a newline is a finding', () => {
  const result = parseSubmission({ ...completeFields(), email: 'visitor@example.invalid\nbcc: other@example.invalid' });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'email'));
});

test('RED: a subject carrying a newline is a finding, for the same reason', () => {
  const result = parseSubmission({ ...completeFields(), about: 'A question\nbcc: other@example.invalid' });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'about'));
});

test('RED: a whitespace-only field counts as absent', () => {
  const result = parseSubmission({ ...completeFields(), message: '   \n\t  ' });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'message'));
});

test('RED: every finding is reported at once, so a visitor fixes one thing and does not discover a second', () => {
  const result = parseSubmission({ email: '', about: '', message: '' });

  assert.equal(result.outcome, 'rejected');
  assert.equal(result.findings.length, 3);
});

// --- The rejected path: shapes that are not a form at all ---

test('RED: a non-object payload is a finding rather than a throw', () => {
  for (const notAnObject of [null, undefined, 'a string', 42, [], true]) {
    const result = parseSubmission(notAnObject);
    assert.equal(result.outcome, 'rejected', `${JSON.stringify(notAnObject)} should be rejected, not accepted`);
    assert.ok(result.findings.length > 0);
  }
});

test('RED: a field whose value is not a string is a finding rather than a coercion', () => {
  const result = parseSubmission({ ...completeFields(), message: { nested: 'object' } });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'message'));
});

// --- The bounds ---

test('a message beyond the bound is a finding', () => {
  const result = parseSubmission({
    ...completeFields(),
    message: 'x'.repeat(FIELD_BOUNDS.message + 1),
  });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'message'));
});

test('a message exactly at the bound is accepted, so the boundary is the bound and not one less', () => {
  const result = parseSubmission({
    ...completeFields(),
    message: 'x'.repeat(FIELD_BOUNDS.message),
  });

  assert.equal(result.outcome, 'accepted');
});

test('a subject beyond the bound is a finding', () => {
  const result = parseSubmission({
    ...completeFields(),
    about: 'x'.repeat(FIELD_BOUNDS.subject + 1),
  });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'about'));
});

test('an address beyond the bound is a finding', () => {
  const localPart = 'x'.repeat(FIELD_BOUNDS.address);

  const result = parseSubmission({ ...completeFields(), email: `${localPart}@example.invalid` });

  assert.equal(result.outcome, 'rejected');
  assert.ok(result.findings.some((finding) => finding.field === 'email'));
});

// --- The honeypot ---

test('RED: a filled honeypot is rejected before any payload is built', () => {
  const result = parseSubmission({ ...completeFields(), [HONEYPOT_FIELD_NAME]: 'a bot filled this' });

  assert.equal(result.outcome, 'trapped');
  assert.equal(result.submission, undefined);
});

test('the honeypot rejection is distinguishable from a validation finding', () => {
  const trapped = parseSubmission({ ...completeFields(), [HONEYPOT_FIELD_NAME]: 'anything' });
  const rejected = parseSubmission({ ...completeFields(), email: 'not-an-address' });

  // The handler answers 200 to one and 400 to the other. Collapsing them into a single
  // outcome would mean either telling a bot it was detected or telling a person their
  // valid submission failed.
  assert.notEqual(trapped.outcome, rejected.outcome);
});

test('the honeypot beats validation, so a bot sending garbage is still trapped rather than corrected', () => {
  const result = parseSubmission({ email: '', about: '', message: '', [HONEYPOT_FIELD_NAME]: 'a bot' });

  assert.equal(result.outcome, 'trapped');
});

test('an empty honeypot is the ordinary case and does not trap a real person', () => {
  const result = parseSubmission({ ...completeFields(), [HONEYPOT_FIELD_NAME]: '' });

  assert.equal(result.outcome, 'accepted');
});

test('a whitespace-only honeypot does not trap, because a stray space is not a bot', () => {
  const result = parseSubmission({ ...completeFields(), [HONEYPOT_FIELD_NAME]: '   ' });

  assert.equal(result.outcome, 'accepted');
});

test('the honeypot field name carries no token a browser autofill would match', () => {
  const autofillTokens = [
    'name',
    'email',
    'tel',
    'phone',
    'address',
    'country',
    'postal',
    'organization',
    'company',
    'url',
    'website',
    'username',
    'nickname',
  ];

  for (const token of autofillTokens) {
    assert.ok(
      !HONEYPOT_FIELD_NAME.toLowerCase().includes(token),
      `the honeypot name contains "${token}", which autofill matches — a real person would be trapped`,
    );
  }
});
