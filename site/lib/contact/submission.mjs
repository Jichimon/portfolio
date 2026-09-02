/**
 * Parsing and validating what a visitor typed into the contact form, and shaping it into
 * the body the mail API takes.
 *
 * Pure by construction: nothing here reads an environment, opens a socket or knows which
 * address it is writing to. The sender and recipient arrive as arguments, so this module
 * can be run anywhere and says the same thing.
 */

/**
 * The hidden field a bot fills and a person never sees.
 *
 * The name matters more than the hiding does: `autocomplete="off"` is advisory and browsers
 * ignore it in places, so a field called anything a form-filler recognises would be
 * completed for a real person and trap them. This name resembles no autofill token, which
 * is asserted rather than assumed.
 */
export const HONEYPOT_FIELD_NAME = 'form-token';

/**
 * Upper bounds, in characters, on what is accepted.
 *
 * The address bound is the maximum length of an email address, so it rejects only what
 * could never be deliverable. The other two are chosen, not derived: they are large enough
 * that no real message meets them and small enough that a request costs little to reject.
 */
export const FIELD_BOUNDS = {
  address: 254,
  subject: 200,
  message: 5000,
};

const WIRE_FIELD_NAMES = {
  address: 'email',
  subject: 'about',
  message: 'message',
};

/**
 * Reasons a field is refused. These are identifiers the caller maps to a response, never
 * text a visitor reads — the page renders its own copy for the one state it shows.
 */
const FINDING_REASONS = {
  notAForm: 'not_a_form',
  missing: 'missing',
  notText: 'not_text',
  tooLong: 'too_long',
  malformedAddress: 'malformed_address',
  lineBreak: 'line_break',
};

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const carriesLineBreak = (value) => value.includes('\n') || value.includes('\r');

const carriesWhitespace = (value) => /\s/.test(value);

/**
 * Deliverability is the mail provider's answer, not this module's. What is checked here is
 * only what makes an address unusable or dangerous: a shape that cannot route, and any
 * whitespace at all, which is the form a header injection takes.
 */
function findAddressFault(address) {
  if (carriesWhitespace(address)) return FINDING_REASONS.malformedAddress;
  if (address.length > FIELD_BOUNDS.address) return FINDING_REASONS.tooLong;

  const parts = address.split('@');
  if (parts.length !== 2) return FINDING_REASONS.malformedAddress;

  const [localPart, domain] = parts;
  if (localPart.length === 0) return FINDING_REASONS.malformedAddress;
  if (domain.length === 0) return FINDING_REASONS.malformedAddress;

  // A domain with no dot cannot be reached from outside the machine that holds it.
  const dotIndex = domain.indexOf('.');
  if (dotIndex <= 0) return FINDING_REASONS.malformedAddress;
  if (dotIndex === domain.length - 1) return FINDING_REASONS.malformedAddress;

  return null;
}

function findTextFault(value, bound, { rejectLineBreaks }) {
  if (value.length > bound) return FINDING_REASONS.tooLong;
  if (rejectLineBreaks && carriesLineBreak(value)) return FINDING_REASONS.lineBreak;
  return null;
}

/**
 * Reads one field and reports the first thing wrong with it, or hands back the trimmed
 * value. A field that is present but blank is absent: whitespace is not an answer.
 */
function readField(rawFields, wireName) {
  const rawValue = rawFields[wireName];

  if (rawValue === undefined || rawValue === null) {
    return { fault: FINDING_REASONS.missing };
  }
  if (typeof rawValue !== 'string') {
    return { fault: FINDING_REASONS.notText };
  }

  const value = rawValue.trim();
  if (value.length === 0) {
    return { fault: FINDING_REASONS.missing };
  }

  return { value };
}

/**
 * The three outcomes are deliberately distinct rather than a boolean.
 *
 * `trapped` answers as though it succeeded, because telling a bot it was detected teaches
 * it to avoid the trap; `rejected` is a person who can fix something and needs to be told;
 * `accepted` is the only one that costs an API call. Collapsing the first two would mean
 * either lying to a person or teaching a bot.
 */
export function parseSubmission(rawFields) {
  if (!isPlainObject(rawFields)) {
    return { outcome: 'rejected', findings: [{ field: null, reason: FINDING_REASONS.notAForm }] };
  }

  // Checked before anything else: a filled honeypot ends the request whatever else is
  // wrong with it, so a bot sending garbage is trapped rather than handed a correction.
  const honeypotValue = rawFields[HONEYPOT_FIELD_NAME];
  if (typeof honeypotValue === 'string' && honeypotValue.trim().length > 0) {
    return { outcome: 'trapped' };
  }

  const address = readField(rawFields, WIRE_FIELD_NAMES.address);
  const subject = readField(rawFields, WIRE_FIELD_NAMES.subject);
  const message = readField(rawFields, WIRE_FIELD_NAMES.message);

  const findings = [];

  const addressFault = address.fault ?? findAddressFault(address.value);
  if (addressFault) findings.push({ field: WIRE_FIELD_NAMES.address, reason: addressFault });

  const subjectFault =
    subject.fault ?? findTextFault(subject.value, FIELD_BOUNDS.subject, { rejectLineBreaks: true });
  if (subjectFault) findings.push({ field: WIRE_FIELD_NAMES.subject, reason: subjectFault });

  // Line breaks are what a message is made of, so only the two header-bearing fields
  // refuse them.
  const messageFault =
    message.fault ?? findTextFault(message.value, FIELD_BOUNDS.message, { rejectLineBreaks: false });
  if (messageFault) findings.push({ field: WIRE_FIELD_NAMES.message, reason: messageFault });

  if (findings.length > 0) {
    return { outcome: 'rejected', findings };
  }

  return {
    outcome: 'accepted',
    submission: {
      visitorAddress: address.value,
      subject: subject.value,
      message: message.value,
    },
  };
}

/**
 * The visitor's address goes in `reply_to` and never in `from`.
 *
 * Sending as the visitor is what the anti-forgery checks on mail exist to stop, and the
 * mail provider only signs a domain it has verified. `reply_to` produces the behaviour
 * actually wanted — answering the mail answers the visitor — without claiming to be them.
 *
 * `reply_to`, not `replyTo`: the API takes snake_case, and the other spelling is accepted
 * as an unknown field, which sends a message nobody can reply to.
 */
export function buildResendPayload(submission, { senderAddress, recipientAddress }) {
  return {
    from: senderAddress,
    to: recipientAddress,
    subject: submission.subject,
    // No label in either language: the visitor may have written in either, and the address
    // needs no word in front of it to be recognised as one.
    text: `${submission.message}\n\n— ${submission.visitorAddress}`,
    reply_to: submission.visitorAddress,
  };
}
