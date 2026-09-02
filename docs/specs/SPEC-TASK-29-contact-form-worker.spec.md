# SPEC-TASK-29: Contact form Worker — a submission becomes an email

```yaml
spec_id: SPEC-TASK-29
title: Contact form Worker, Resend over the site's own Worker
status: active
version: 1.0
date: 2026-09-02
approved_version: 1.0
approved_by: "the author, 2026-09-02, in session, having opened this file — transcribed here by the orchestrator because the delegation gate reads the file and not the conversation (P-02)"
work_item: TASK-29
intent: "Replace the mailto: action with a real submission path, so a visitor can reach the author without a mail client opening, and so the form's designed sending, sent and error states describe something that actually happened."

tdd: required
tdd_rationale:
reproduces:

governed_by:
  - ADR-001
  - ADR-004
  - ADR-006
  - ADR-008
related_docs:
  - site/wrangler.jsonc
  - site/src/components/home/ContactSection.astro
  - site/tests/e2e/home.smoke.spec.ts
  - scripts/guards/lib/deploy-verify.mjs
  - resources/site/ui.en.md
  - resources/site/ui.es.md

behaviors:
  - id: CONTACT-001
    given: "the site's Worker is deployed with a Resend API key held as a Cloudflare Worker secret, and a visitor has filled the contact form with an address, a subject line and a message"
    when: "the form is submitted"
    then: "an email reaches the author's mailbox whose from is the site's verified sender and whose reply_to is the address the visitor typed, and the page shows the sent state echoing that same address back"
    priority: critical
    status: planned
    edge_cases:
      - "the visitor's address is never placed in from - SPF, DKIM and DMARC treat that as forgery and Resend accepts only a verified domain, so reply_to is the field that carries it"
      - "the subject line the visitor typed is untrusted input and must not be able to inject a header; it is carried as a value, never concatenated into one"
      - "an address that is syntactically valid but undeliverable is Resend's problem, not the Worker's - the Worker reports what Resend answered and does not promise delivery it cannot observe"
      - "the echoed address in the sent state is the parsed address, never the raw field, so what the page claims is what the email will actually reply to"
      - "a message long enough to be abusive is bounded before it reaches Resend rather than after"
    tests:
      - "submission.test::a complete submission parses to a submission carrying the visitor address"
      - "submission.test::the built payload carries reply_to as the visitor address and from as the configured sender"
      - "contact-form.component.test::a successful response renders the sent state echoing the address"
      - "manual::wrangler dev, a valid payload, and the email arriving with Reply addressed to the visitor"

  - id: CONTACT-002
    given: "a submission missing its message, or carrying an address that is not one"
    when: "it is submitted"
    then: "the Worker answers 400 naming what was wrong, the page shows the error state, and every character the visitor typed is still in the form"
    priority: critical
    status: planned
    edge_cases:
      - "the error state must not clear, disable or re-render the fields - losing a paragraph someone wrote is worse than the failure that caused it"
      - "an empty body, a body that is not JSON, and a body that is JSON but not an object are all findings rather than crashes"
      - "a field present but whitespace-only is absent, not present"
      - "the same error state covers a 502 from Resend and a network failure from the browser: the visitor cannot act differently on the difference, and inventing two messages would need strings that say nothing"
      - "a rejection happens before any Resend call, so an invalid payload costs no quota"
    tests:
      - "submission.test::RED: a missing message is a finding"
      - "submission.test::RED: an address without an at sign is a finding"
      - "submission.test::RED: a whitespace-only field counts as absent"
      - "submission.test::RED: a non-object payload is a finding rather than a throw"
      - "contact-form.component.test::the error state leaves every field value untouched"
      - "deploy-verify.test::RED: the live contact endpoint answering anything but 400 to an invalid payload is a finding"

  - id: CONTACT-003
    given: "a public endpoint that sends mail on request"
    when: "a bot fills the hidden honeypot field, or a client exceeds the configured rate"
    then: "no email is sent - the honeypot answers as though it succeeded, and the rate limit answers 429"
    priority: critical
    status: planned
    edge_cases:
      - "the honeypot answers 200 rather than an error on purpose: telling a bot it was detected teaches it to avoid the trap next time"
      - "the honeypot field is hidden from assistive technology as well as from sight, or it becomes a required-looking field a screen reader user is asked to fill"
      - "a browser autofill putting a value in the honeypot would reject a real person - the field is named so autofill has nothing to match and carries autocomplete off"
      - "the rate limit is keyed on the client address, and its absence must not key every visitor to one bucket"
      - "the Workers rate limit is per-colo and best effort; it is a cost multiplier on abuse, not a guarantee, and is described as such rather than as protection"
    tests:
      - "submission.test::RED: a filled honeypot is rejected before any payload is built"
      - "submission.test::the honeypot rejection is distinguishable from a validation finding, so the handler can answer 200 to one and 400 to the other"
      - "manual::wrangler dev, four submissions inside a minute, the fourth answering 429"

  - id: CONTACT-004
    given: "the repository is public and every byte under site/dist reaches the browser"
    when: "the Worker is built and deployed"
    then: "the Resend API key appears in no committed file, in no built asset and in no HTTP response - it exists only as a Cloudflare Worker secret read from env at runtime"
    priority: critical
    status: planned
    edge_cases:
      - "wrangler.jsonc vars is public by construction; the sender and recipient addresses live there and the key does not"
      - "the key is not a GitHub Actions secret either - that would work and would put it through the CI runner on every push for no gain"
      - "an error response must not echo Resend's response body verbatim, which can quote the request that carried the Authorization header"
      - "a local .dev.vars for wrangler dev is gitignored, and its absence must fail loudly rather than sending unauthenticated"
    tests:
      - "gate::confidentiality"
      - "gate::site structure"
      - "manual::grep for the key prefix across site/dist after a build"

  - id: CONTACT-005
    given: "a visitor whose browser did not run the page's JavaScript"
    when: "they submit the form"
    then: "the submission falls through to the mailto action already in the markup, which is exactly today's behaviour"
    priority: normal
    status: planned
    edge_cases:
      - "the action attribute stays mailto in the rendered HTML and is never rewritten - the enhancement is the submit listener, so a failed script leaves a working form rather than a dead one"
      - "this is the reason no new fallback copy is needed, and therefore no seventh and eighth interface string"
    tests:
      - "home.smoke::the rendered form still carries the mailto action"

constraints:
  - "No second Worker and no second wrangler config. The site's own Worker gains a main entrypoint; a separate service would mean a second deploy, cross-origin CORS, a second secret store and a new top-level directory matching the paths frontmatter of neither the testing nor the implementation rule surface."
  - "The contact route is declared in assets.run_worker_first rather than inferred. Cloudflare documents both that an unmatched request reaches the Worker and that not_found_handling answers unmatched requests with the 404 page; naming the route removes the question at the cost of one line."
  - "No new dependency and no new test runner. Resend is one fetch call, and a third runner would need the explicit pricing ADR-006 gave the second Stryker config."
  - "The payload logic is pure and lives in site/lib/contact/, framework-free under S-06, so node:test and Stryker reach it. The Worker handler is a thin wrapper - the same category as the gate CLIs, deliberately outside the mutation glob."
  - "Interface strings are written by the author. H-02 makes resources/** read-only at rung 1, and locale parity is not optional (C-09): three keys arrive in both locales or in neither."
  - "The API key never enters the session environment (G-08). An agent writes the config; the author creates the secret."
  - "H-01 holds throughout: nothing here commits, and the work is left uncommitted for the author."

out_of_scope:
  - "Turnstile. The item's own constraint reads a Turnstile challenge OR a rate limit, and the rate limit satisfies it. Turnstile returns if real spam arrives - a dashboard widget, two more keys, a third-party script and a bilingual label are not paid for by a form with zero traffic."
  - "Storing submissions. No KV, no D1, no queue. The email is the record; a database would be a second copy of it with a retention question attached."
  - "File attachments. Nobody has asked, and an upload endpoint is a materially larger abuse surface."
  - "An autoresponder to the visitor. It doubles the send volume and the first thing it would need is copy nobody has written."
  - "Moving the contact form off the home page. TASK 50 already decided contact is a section and carries no route."
```

## Intent

The contact form on the published home page cannot receive anything. Its `mailto:` action hands the visitor's own mail client the job, which means the submission never happens if that client is not configured — and it means the three states the design drew for this form describe events the page has no way to observe. `TASK 24` shipped it that way deliberately and said so; the deferral trigger was the author wanting submissions without a mail client opening.

The whole of this item is a request handler on a Worker that already exists. `site/wrangler.jsonc` declares a Worker with static assets and no script; adding a script to it costs no new deployment, no new configuration file, no cross-origin negotiation and no second secret store. What arrives with it is a real failure mode — a public endpoint that sends mail — which is why the honeypot and the rate limit are in the critical behaviors rather than in a follow-up.

## Behaviors

### CONTACT-001 — a submission becomes an email · `critical` · `planned`

- **Given** a deployed Worker holding the Resend key as a secret **When** a visitor submits a filled form **Then** the author receives an email whose `reply_to` is the visitor, and the page echoes that address back.
- **Edge cases:** the visitor's address never occupies `from`; the subject is carried as a value and never concatenated into a header; the echoed address is the parsed one, not the raw field.
- **Governed by:** ADR-004
- **Tests:** `submission.test`, `contact-form.component.test`, and one manual send that is opened and replied to.

### CONTACT-002 — a failure keeps the visitor's words · `critical` · `planned`

- **Given** an incomplete or malformed submission **When** it is submitted **Then** the Worker answers 400, the error state appears, and the fields are untouched.
- **Edge cases:** the error state must not clear, disable or re-render the fields; a whitespace-only field is absent; validation runs before any Resend call.
- **Tests:** four red unit cases, one component case, one live probe.

### CONTACT-003 — the endpoint is not a free mailer · `critical` · `planned`

- **Given** a public send-on-request endpoint **When** a bot fills the honeypot or a client exceeds the rate **Then** nothing is sent; the honeypot answers 200 and the rate limit answers 429.
- **Edge cases:** the honeypot lies on purpose; it is hidden from assistive technology and from autofill; the rate limit is best-effort per-colo and is described as such.
- **Tests:** two red unit cases and one manual burst.

### CONTACT-004 — the key stays on the server · `critical` · `planned`

- **Given** a public repository and a browser-readable asset directory **When** the Worker is deployed **Then** the key exists only in `env`.
- **Edge cases:** `vars` is public and holds the addresses, not the key; an error response never echoes Resend's body verbatim.
- **Tests:** two gate steps and one grep over the build.

### CONTACT-005 — no JavaScript, no regression · `normal` · `planned`

- **Given** a browser that did not run the page script **When** the form is submitted **Then** the `mailto:` action still handles it.
- **Governed by:** ADR-008
- **Tests:** `home.smoke`.

## Constraints and invariants

See the `constraints` block above. The one worth restating in prose is the split: **the risk is in parsing an untrusted payload, and that is where the tests are.** The handler around it reads `env`, calls `fetch` and maps a result to a status code — testing that through a third runner would buy coverage of the part least likely to be wrong.

## Out of scope

See the `out_of_scope` block. Turnstile is the only entry with a live trigger: real spam arriving.

## Test plan

| Test (file::name) | Type | Scenario covered | Behavior(s) | Status |
|---|---|---|---|---|
| `submission.test::a complete submission parses` | unit | happy path, fields survive parsing | CONTACT-001 | planned |
| `submission.test::the payload carries reply_to and from` | unit | the Resend body is built correctly | CONTACT-001 | planned |
| `submission.test::RED: a missing message is a finding` | unit | required field absent | CONTACT-002 | planned |
| `submission.test::RED: an address without an at sign is a finding` | unit | malformed address | CONTACT-002 | planned |
| `submission.test::RED: a whitespace-only field counts as absent` | unit | the blank-but-present case | CONTACT-002 | planned |
| `submission.test::RED: a non-object payload is a finding rather than a throw` | unit | garbage body | CONTACT-002 | planned |
| `submission.test::RED: a filled honeypot is rejected before a payload is built` | unit | bot submission | CONTACT-003 | planned |
| `submission.test::the honeypot rejection is distinguishable from a validation finding` | unit | 200 versus 400 at the handler | CONTACT-003 | planned |
| `submission.test::a message beyond the bound is a finding` | unit | abusive length | CONTACT-001 | planned |
| `contact-form.component.test::the sending state appears on submit` | component | the state the page could never show before | CONTACT-001 | planned |
| `contact-form.component.test::a successful response renders the sent state echoing the address` | component | success echo | CONTACT-001 | planned |
| `contact-form.component.test::the error state leaves every field value untouched` | component | the words survive | CONTACT-002 | planned |
| `deploy-verify.test::RED: a live endpoint answering other than 400 to an invalid payload is a finding` | unit | the probe's own red path | CONTACT-002 | planned |
| `home.smoke::the contact form renders a status region` | e2e | the announcement channel exists | CONTACT-002 | planned |
| `home.smoke::the rendered form still carries the mailto action` | e2e | the no-JS fallback | CONTACT-005 | planned |
| `gate::confidentiality` · `gate::site structure` | gate | no key, no stray literal | CONTACT-004 | planned |
| `provider::verify-deploy reports the contact probe at the deployed URL` | e2e | the endpoint is live, proven against the deployment | CONTACT-002 | planned |
| `manual::a real send, opened and replied to` | manual | the only test of actual delivery | CONTACT-001 | planned |

**Coverage gaps, declared rather than left silent:**

- **The Worker handler has no automated test of its own.** Its branches are exercised through the pure core it calls and through the live probe against the real deployment; the wiring between them is covered by neither. Owner: this item, as a stated residual — closing it means the third runner, which is a work item with its own pricing.
- **Actual email delivery is verified manually, once.** No automated test sends a real email; one that did would either mock Resend, which proves nothing (`T-02`), or send real mail on every gate run.
- **The rate limit is not tested automatically.** `wrangler dev` simulates the binding, but asserting a per-colo best-effort limiter in CI would be the flake `T-06` forbids.

## Traceability

| Behavior | Priority | Status | Test(s) | Test written first? | ADR |
|---|---|---|---|---|---|
| CONTACT-001 | critical | planned | `submission.test`, `contact-form.component.test`, manual | pending | ADR-004 |
| CONTACT-002 | critical | planned | `submission.test` ×4, `contact-form.component.test`, `deploy-verify.test` | pending | ADR-006 |
| CONTACT-003 | critical | planned | `submission.test` ×2, manual | pending | — |
| CONTACT-004 | critical | planned | `gate::confidentiality`, `gate::site structure` | pending | — |
| CONTACT-005 | normal | planned | `home.smoke` | pending | ADR-008 |

## Drift log

| Date | What diverged | Spec or code corrected | Note |
|---|---|---|---|
