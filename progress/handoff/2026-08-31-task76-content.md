# TASK 76 · author packet: the English half of the Spanish rewrite

**Written 2026-08-31 by the orchestrator.** `H-02` puts `resources/**` outside every agent's reach at rung 1, by a `deny` rule in `.claude/settings.json` and by the `resources-readonly` guard. Both were read this session. So every change below is the author's to apply, and none of it has been applied.

Nothing here is invented. Every English change tracks a change the author already made in the Spanish, in commit `c335cb2` (2026-08-28, `about` / `experience` / `ui`) or `7c5014c` (2026-08-31, the five case studies). Where the Spanish states something the English cannot safely infer, it is an **open question** below rather than a guess (`C-01`).

## How to apply

Two staging folders. Filenames match `resources/` exactly.

```text
progress/handoff/task76-en/   →  10 files, the English
progress/handoff/task76-es/   →   9 files, the Spanish (typography + 4 proposals)
```

| Staged file | Copy over |
|---|---|
| `about.en.md`, `about.es.md`, `experience.*`, `home.*`, `ui.*` | `resources/site/` |
| the five case studies, both locales | `resources/case-studies/` |
| `profile-README.md` | `resources/github/` |

Then:

```bash
git diff --stat resources/            # 18 files: mobile-banking-platform.es.md is staged unchanged
git diff -- "resources/*/*.es.md"     # must be only the lines enumerated below
node scripts/gate.mjs
```

**The Spanish is optional and separable.** Copy `task76-en/` and skip `task76-es/` if you want to review the Spanish later; nothing in the English depends on it.

## The decisions this packet is built on

1. **Scale figures**, settled by the author before a word of English was written. Total users of the bank app reads as **millions of people**; active users reads as **more than a million active users**, which is what `mobile-banking-platform.{en,es}` already carried. The QR module keeps **100,000 users in the first three months**. NICE keeps **millions of users** and is a different system that must not be conflated with the bank's.
2. **`profile-README.md` is in scope** although it is not a `*.en.md`, because it repeated the stale figure and `C-03` requires a correction to reach every derived page in the same change.
3. **The em-dash `—` leaves both locales.** This is the author's own decision, not an imported preference: the two subtitles it was removed from in `7c5014c` are the evidence, and the Spanish rewrite had already dropped most of the rest. At session start English carried it on 81 lines and Spanish on 24. Both are now zero. The replacement is chosen per context (`·` in a `title:`, parentheses for an aside, a comma or colon for an appositive), never mechanically. **The en-dash `–` in ranges stays** (`2023–2025`, `672–683`): that is a range, not the dash being removed.
4. **`resources/site/intake.md` is out of scope**, stated rather than silently skipped. It carries 53 em-dashes, has no frontmatter, is exempt in `check-content`, and is never published. Say the word and it takes five minutes.

---

# Part 1 · the English

## `about.en.md`

| What | Why |
|---|---|
| `h1` replaced | The Spanish `h1` is now a different statement, not a translation of the old one. The English now says the same thing: *"Understand the essence of a person and you can love them. Understand the essence of a system and you can improve it."* |
| `bolivia-landscape` caption filled | The Spanish gained *Laguna Corani, Cochabamba*; the English caption was empty |
| `me-profile` caption filled | The Spanish gained the joke. English: *"I picked the photo where I supposedly look sharp."* The localism (*dizque*, *pintudo*) is dropped, the joke is not |
| Huayna Potosí `alt` | Em-dash to colon. The Spanish `(yala)` is a local interjection with no English equivalent that is not worse than silence, so it is not rendered |
| The whole opening section rewritten | The Spanish went from a career summary to a first-person account with a different claim structure: trainee at an industrial company, legacy integration, data integrity in long messy processes, 24/7, the caffeine line, then *"to actually solve a problem you have to understand it"*, then the translation conversations with a plant worker, an HR assistant and management, then trainee to owning architectures **millions of people** depend on |
| The judgment paragraph rewritten | The Spanish version is now about courage and about fixing your own mistakes, which the old English did not say |
| The university paragraph | The Spanish adds *auxiliar en varias materias*: English now opens with the teaching-assistant work |
| `title:` | `—` to `·` |

`since`, `reads_as`, the sport paragraph, the quote and the 16Personalities paragraph are unchanged in substance.

## `experience.en.md`

| What | Why |
|---|---|
| `h1`, `intro` | Both rewritten in Spanish. English now matches: *"I had to solve the same problem in every place I worked"* and *"A system built for a reality that had stopped existing, and a business that moved on faster than it did."* |
| **All four `stack:` lists** | Mirrored from the Spanish, item for item |
| NICE body | Unchanged in substance; em-dashes replaced by parentheses and a colon |
| Bank body: two paragraphs become one | Matching the Spanish, which now names the QR Business module with its 100,000-in-three-months figure, TOTP-signed transfers, RabbitMQ, and states the total as millions of people |
| Mamaya body | Rewritten per the Spanish, which generalised *Oracle EBS core* to *an ERP core* (the stack still names Oracle EBS) and added low-code platforms |
| Avícola body | Rewritten per the Spanish: the HRMS integration modules it replaced, a nationwide distributed operation, plus the production-system to Oracle EBS integrations |
| Avícola `title` | `Systems Analyst` becomes `Trainee → Systems Analyst`, mirroring `Trainee → Analista de Sistemas` |
| The thesis anchor | **Kept in English**, and proposed for restoration in Spanish (Part 2) |

## `ui.en.md`

| Key | From | To |
|---|---|---|
| `home.work_heading` | "What I've built" | "What I've done" (Spanish broadened *built* to *did*) |
| `home.stack_heading` | "Technologies I've worked with" | "Technologies I work with" (*Tecnologías que manejo*) |
| `home.contact_invite` | one question | four questions, matching the Spanish |
| `home.contact_note` | "Open to remote or hybrid/relocation." | "…relocation opportunities." |
| `home.standalone_label` | em-dash | colon |
| `footer.metrics_slot`, `not_found.body` | em-dash | colon / full stop |

**And the provenance body was reconciled** (`P-07`). It claimed *"Every value above is lifted from an artboard"* and carried a `home` row citing `Main.dc.html` 531, 542, 655, 667, 668, 687. Four of those strings are no longer artboard values. The row is now split, and a paragraph names the four that are not.

## The five case studies

### `mobile-banking-platform.en.md`

- `subtitle` gains *third-party*, *in-house* and *applying BIAN*.
- `stack` mirrors the Spanish: gains Flutter, Android, iOS, Postgres, RabbitMq, Firebase; **drops MassTransit and Polly**. `skills` gains micro-services, clean-architecture, DDD.
- *backend engineer* becomes *backend and frontend engineer*.
- **A published grammar error is fixed**: the body read *"more than a million **of** active users"*.
- Asynchronous confirmation now describes what the Spanish describes: confirmations published to SNS topics and queued per channel, the client notified straight away, and the figure framed as **perceived** end-to-end time.
- The on-premise paragraph gains *"The bank's whole legacy estate sits on-premise as well."*
- The six service bullets expand to match the Spanish (BFF owns every flow in the app; credentials delivered through the correspondence service; payment instruction serves every digital channel).
- **New *What I would do differently* item**, from the Spanish: the state pattern as over-engineering, and the duplicated transaction logic in the BFF.
- The deep-dive link text follows the QR case study's new title.

### `otp-provider-decoupling.en.md`

- `subtitle` drops *compute*. `outcome`'s em-dash becomes a full stop. `stack` gains **AWS EKS**.
- *catch-all* becomes **bottleneck**; *five unrelated flows* becomes *five barely related flows, most of that thanks to the vendor*.
- Cost: the line item is now measured against the **correspondence-service stack** and *the volume we were already handling across several digital channels*.
- Control: TOTP for transaction signing was coming *from another vendor again*, replacing the old *had no path forward inside a vendor product*.
- **A constraint was swapped.** The Spanish removed *small team, limited operational capacity* and added *a security hole here meant a user could defraud the bank directly*. The English follows. See open question 5, because the *two functions or one service* argument still leans on operability.
- Lambda and Fargate are named where the English said *serverless* and *containers*, matching the Spanish.
- The compute choice is now framed as an argument defended to management. The cold-start example changes to a user opening their account or recovering a token. *"Optimising it would have been optimising the wrong number"* is dropped, as in the Spanish.
- The break-even paragraph is reframed: below the threshold Lambda is cheaper; above it, serverless stops being conceivable.
- Result: execution began, and the in-house OTP flow and the dedicated push service *never reached production* before handover. The plan was **approved at three levels: engineering, management, executives.**
- The latency note is simplified to the Spanish version.
- *"the architecture argument is the second argument"* becomes *"the one that matters least"*, per the Spanish.

**Untouched on purpose:** the ~70% figure stays labelled a **target**, in the `outcome`, in the results bullet and in the closing paragraph. That is `INC-09`'s rule made visible, and nothing here weakens it.

### `qr-collections-for-merchants.en.md`

- `title`: *merchants delegate payment collection to people* becomes **business owners delegate collection to people**.
- `stack` becomes Flutter, .NET, SQL Server, AWS, BIAN.
- **The Context opening is new**, from the Spanish: in Bolivia a real collection product from a bank means at least 30 days of process and often a direct agreement; so owners generate a QR and send it to employees over WhatsApp; the employee cannot confirm a sale except by asking the owner; the customer waits and the business looks bad. Then the credential-sharing workaround, then *accessible, easy to use, without much paperwork*.
- The merchant-domain paragraph follows the Spanish, including *working under BIAN made the split simpler than it sounds*.
- **A change of fact.** *No transaction history* becomes *the transaction history of that QR and nothing else*, and *generate a single-use collection QR* becomes *hold a generic collection QR*. See open question 4.
- The design principle is restated in the Spanish's UX terms, and *non-reading capability* becomes *a read surface limited to what it produced*, because the delegate now reads something.
- The trade-off paragraph is rewritten to the Spanish's shape.

### `legacy-payment-data-migration.en.md`

- Context: *in record time*, *my team and I*, and water bills and taxes added to the bill types.
- *One shot* becomes *One single opportunity*.
- Phase zero: *I worked the legacy application as a user* becomes *I started using it and documenting everything it did, checking the database after every action*, and *the only part that determined whether the migration would be correct* becomes *the part that gave me the confidence that it was going to be correct*. That second change is a real weakening of a claim, and it is the Spanish's, not mine.
- *The new model was not a renamed version of the old one* gains *it was a different thing altogether*, and the three phases become **my call** rather than a fact of the world.
- The verification lesson now names the first phase as the one done backwards and the other two as the ones done right, which is what the Spanish now says.

### `multi-tenant-biometric-attendance.en.md`

- `stack` gains Android, Java, Kotlin.
- Context: *any HR query meant a trip to an office* becomes *checking whether a punch had actually registered meant waiting for HR's monthly report*.
- Constraints: the terminals *only shipped an integration for .NET Framework 4.7.2*; *small team* becomes **a team of four**; *we had to run* becomes *we had to maintain*.
- Modular monolith: *a tenant count in the tens rather than the thousands* becomes **fewer than 15 tenants for the first launch**, and *microservices would have bought independent scaling we did not need* becomes *would have caused us more problems than benefits*, with the scaling point as the example.
- The trade-off paragraph is rewritten: the clients were the holding's own companies, and the escape hatch was a high price for optionality that was never used.

**One Spanish sentence is deliberately not rendered.** See open question 3.

### `profile-README.md`

- The users figure: *hundreds of thousands* becomes **millions of people**.
- The QR bullet is reframed to the new title and its em-dash removed.
- Four em-dashes removed, including the `h1` separator.

---

# Part 2 · the Spanish

Nine staged files. **Four substantive proposals and 24 typographic lines. Nothing else moved**, and `git diff resources/ -- "*.es.md"` after copying is the check.

## The four substantive proposals

| File | Change | Why |
|---|---|---|
| `about.es.md` | *dependen cientos de miles de personas* → *dependen millones de personas* | Your decision this session: `about` speaks of the total, so it reads *millones*. It was also the last page still stating the total as *cientos de miles*, disagreeing with `experience.es.md` |
| `experience.es.md` | The Avícola entry gains *"Esa brecha entre lo que el sistema sabía hacer y lo que el negocio necesitaba es en la que vengo trabajando desde entonces."* | The rewrite dropped the thesis anchor (`C-15`). English still has it. Restoring it in Spanish is the fix; changing English to match the loss is not |
| `ui.es.md` | `rail.timezone`: `"GMT-4"` → `"GMT-4 · solapamiento completo con el horario laboral de EE. UU."` | It is a selling point for exactly the roles being targeted, English keeps it, and **this is the wording the file itself carried until commit `a45bbec`**, not something new. It also repairs the orphan below |
| `ui.es.md` | Two false traceability records reconciled (`P-07`) | The table claimed `home`'s four headings, `contact_invite` and `contact_note` came from `HomeES.dc.html` *sin tocar una coma*; five of them were rewritten. And the body quoted `home.stack_heading` as *Tecnologías con las que trabajé* while its own frontmatter says *Tecnologías que manejo* |

**A bonus the timezone fix was meant to buy, and did not.** `ui.es.md`'s closing note about `EE.&nbsp;UU.` had become an orphan: the string it describes existed nowhere in the file. The proposed wording would have made the note true again. **The author applied their own, `EEUU` with no periods and no space, so the note is still orphaned, differently.** Recorded here rather than left as a claim this packet made and the tree did not honour. It is `TASK 104` question 6.

## The 24 typographic lines

| File | Lines | Replacement used |
|---|---|---|
| `ui.es.md` | 98, 104, 118, 129, 130, 131, 133, 137, 162, 163 | colon, full stop, parentheses, comma |
| `experience.es.md` | 5, 14, 15, 34, 48, 55 | `·` in the title, parentheses for the NICE aside, colon and comma elsewhere |
| `about.es.md` | 5, 14 | `·` in the title, colon in the `alt` |
| `multi-tenant-biometric-attendance.es.md` | 44, 84 | colon, comma |
| `home.es.md` | 5 | `·` in the title |
| `legacy-payment-data-migration.es.md` | 66 | colon |
| `otp-provider-decoupling.es.md` | 99 | comma |
| `qr-collections-for-merchants.es.md` | 73 | comma |

`mobile-banking-platform.es.md` carried none and is staged unchanged, so the folder is complete rather than a partial set you have to reason about.

**The arithmetic, so you can check the diff against it.** 29 replacements across the nine files: the 24 lines above, plus five that are not typographic (the `about.es.md` figure, the `experience.es.md` thesis anchor, `ui.es.md`'s `rail.timezone`, `ui.es.md`'s two new provenance paragraphs, and `ui.es.md`'s `stack_heading` quote). One line, `ui.es.md`'s `home` provenance row, is counted in the 24 because it carried a dash and is also one of the four proposals.

**How these were produced, because it matters for trust.** Not retyped. A script read each original and applied the exact string replacements listed here, refusing to run unless every pattern matched **exactly once** and asserting zero em-dashes left in the result. A transcription slip is not a failure mode this could have. The same method produced every English file except `about.en.md`, which is genuinely new prose.

---

# Open questions

Five, in the order they would bite.

**1 · MassTransit or RabbitMq?** `experience.es.md`'s bank `stack` keeps `MassTransit`, while `mobile-banking-platform.es.md` dropped it (and Polly) and added `RabbitMq`, and the Spanish prose in `experience.es.md` names RabbitMQ. The English mirrors each file as it stands, so it inherits the disagreement. `profile-README.md`'s career-wide Stack section still lists MassTransit and Polly and was **left alone**, because removing a claim you have not retracted is as much a guess as adding one.

**2 · `about.es.md`'s figure.** Applied per your decision, listed here so it is visible in the diff rather than discovered.

**3 · One Spanish sentence I did not translate.** `multi-tenant-biometric-attendance.es.md` gained, at the end of the modules paragraph: *"un enfoque vertical ambicioso en una tecnología que te seduce con slices horizontales"*. It reads as unfinished, and I could not render it without inventing the half that is missing (`C-01`). The English paragraph ends at the module list. Tell me what it means and it goes in.

**4 · What can a delegate see?** The Spanish now says *"Solo viendo el historial de transacciones del QR generado"*, where both locales previously said *No transaction history*. And *"Tener un QR genérico de cobro"* replaces *generate a single-use collection QR*, while the design principle two paragraphs later still says *de un solo uso*. The English follows the new Spanish, but the security argument in that section rests on exactly this, so it needs your confirmation. If the delegate really does read the QR's history, the sentence *"The same identity with read access to anything would not be"* is doing more work than before and may want rewording.

**5 · The OTP constraint that was swapped.** The Spanish removed *"Equipo chico. La cantidad de cosas que podíamos permitirnos operar era un límite real del diseño"* and added the fraud-exposure constraint. But the *two functions or one service* argument further down still argues from operability (two things to observe, two log streams). Either the constraint comes back or that argument needs a different footing. The English currently has the Spanish's constraint list and the old argument, same as the Spanish does.

**A tone flag, not a question.** The OTP compute section now reads *"for reasons I then had to defend to management, who care about cost before anything else"*, matching the Spanish. It is candid and it is yours, so it stands. But the reader of this page may well be a hiring manager, and the same point survives a softer framing: *"for reasons I had to argue in a room where cost is the argument that lands first."* Your call; the packet keeps your version.

**One more, minor.** `profile-README.md`'s `h1` says *Luis Antelo* while every site page says *Luis Octavio Antelo*. Left as it is, because a GitHub profile using the short name is a reasonable choice rather than an error. Change it if it was not deliberate. Same category: `ui.es.md`'s `home.standalone_label` uses a plain hyphen (`Fuera de la plataforma - otro empleador`) where a colon would read better; not touched, because you did not ask for it.

---

# Verification already run

Not claims. Each of these was executed this session and its output read (`P-11`).

| Check | Result |
|---|---|
| `checkParity`, `checkFrontmatter`, `validateExemptions` from `scripts/guards/lib/content.mjs`, run over the **post-apply view** (originals overlaid with both staging folders) | PASS, PASS, PASS |
| Em-dashes in the post-apply view, `intake.md` excluded | **0** |
| Every staged file has a real `resources/` destination | PASS |
| `./scripts/check-terms.sh` | PASS, 33 terms × 470 files, whole repo minus 13 exclusions |
| Every replacement pattern matched exactly once | enforced by the generators; any miss threw instead of writing |
| Scale figures across the post-apply view | one claim per subject, printed in full in the work log |

**What could not be verified here, and why.** The site build and the e2e suite read `resources/`, which this packet does not change. They can only be run after you copy. Nothing in the site hardcodes the strings that change shape (checked: no match for the page-title patterns under `site/src` or `site/tests`), so no failure is expected, but *expected* is not *verified* and this row says so.

**The known flake.** `component tests` fails roughly one gate run in seven (`TASK 89`). If it goes red after you apply, re-run that step alone before believing it.

---

# Applied, and checked against this packet

**2026-08-31, same session.** The author applied it. `P-11` says a report is a claim and the artifact is the evidence, so the 19 staged files were compared line by line against what is now in `resources/`.

**Two deviations, both benign, both recorded rather than smoothed over:**

1. `mobile-banking-platform.en.md` differs by **line wrapping only**. The author joined the *central constraint* paragraph into a single line. Normalising paragraph wrapping makes the two files identical, so nothing was added or lost.
2. `ui.es.md`'s `rail.timezone` carries the author's own wording, `"GMT-4 · solapamiento completo con horario laboral en EEUU"`, rather than the proposed `"…de EE. UU."`. Shorter, and fine. **But it re-orphans that file's closing typographic note**, which still describes `EE.&nbsp;UU.` with a hard space and points at `home.es.md`, where no such string exists. That is `TASK 104` question 6.

**Two corrections to this packet, made out loud rather than quietly.** The file count is **18**, not 19: `mobile-banking-platform.es.md` was staged unchanged, so applying it changes nothing. And the verification command above was **wrong**: `git diff resources/ -- "*.es.md"` mixes a path with a pathspec and silently matches nothing, which reads exactly like *no Spanish changed*. The corrected form is `git diff -- "resources/*/*.es.md"`. A verification command that returns empty on success and empty on failure verifies nothing, which is the failure `P-13` is made of.

**Verified on the applied tree**, each command run and its output read:

| Check | Result |
|---|---|
| `node scripts/gate.mjs` | **20/21**, twice. `e2e smoke` is the only failing step, and it is `TASK 69`: **0 of 2 inside the gate, 2 of 2 standalone** (309 passed each) on this exact content. The failing run lost 19 Firefox tests over 49.3 minutes, several timing out at `browserContext.newPage` before any navigation, which no markdown change can cause. Every other step PASS both times, `mutation` and `content` included |
| `./scripts/check-terms.sh` | PASS, 33 terms × 472 files |
| em-dashes in every published file | **0**, with `intake.md`'s 50 declared out of scope |
| the scale figures | one claim per subject, each qualified; the surviving *hundreds of thousands* is monthly OTP operations, a different subject |
| 19 staged files against the applied tree | one wrapping difference, one wording change, both above |
