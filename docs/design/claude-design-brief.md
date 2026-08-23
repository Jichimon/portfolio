# Claude Design brief — portfolio site

**Status:** input artifact for `TASK 8`'s design/UX work item. Paste the section below the horizontal rule into Claude Design. Everything above the rule is repo context for the human, not part of the prompt.

**Origin:** `TASK 8` constraint — *"A design/UX task, generating the actual per-page designs the implementation items build against. Raised by the author while reviewing `ADR-006`: nothing in the backlog yet owns 'what each screen looks like' as its own deliverable."*

**Decisions already taken by the author (2026-08-19), encoded below:** editorial-technical direction · all four optional screen groups in scope · personality confined to About and expressed typographically · desktop **and** mobile artboards for every screen.

**Constraint sources:** `ADR-001` (Astro, static, zero-JS default) · `ADR-002` (diagrams are pre-rendered SVG, never rendered at build) · `ADR-003` (unprefixed `en`, `/es/` Spanish) · `ADR-004` (Cloudflare Workers static assets, locale-aware 404) · `CLAUDE.md` (the thesis) · `.claude/rules/20-content.md` (`C-10` evidence over adjectives, `C-15` thesis).

**Downstream:** whatever this design decides about diagram visual language becomes the specification `TASK 6` (hand-authored diagram assets) builds against. `TASK 6` is blocked by `TASK 8` for exactly this reason.

## How to run this

The prompt is **everything from the `# Portfolio site — design brief` heading to the end of the file** — below the horizontal rule. Everything above it is repo context for the human. The prompt is written as a prompt already (first person, "I need per-screen designs", "Use this verbatim") and needs nothing wrapped around it.

Extract it by the heading rather than by line number, so editing this header never breaks the command:

```sh
awk '/^# Portfolio site/{f=1} f' docs/design/claude-design-brief.md
```

Deliberately not duplicated into a second paste-ready file — two copies of the same text drift.

**Run it in two passes, not one.** Seventeen artboards in one shot risks seventeen mediocre screens instead of four good ones.

1. **Pass one — screens 1–4 only** (home, case-study detail, case-studies index, platform anchor page), desktop and mobile. Append to the paste: *"For this first pass, design only screens 1–4."* These four establish type pairing, palette, the metadata treatment and the diagram figure; everything else is a variation on them.
2. **Pass two — screens 5–9** (about, experience, contact, system states, component sheet), once pass one's direction is settled.

**Start a fresh session for the design pass.** The brief is self-sufficient by construction (`P-08`) and the artboards are large — `otp-provider-decoupling` alone is 1,300 words plus three 17–36 KB SVGs.

---

# Portfolio site — design brief

I need per-screen designs for a personal portfolio site. The content is already written, frozen, and bilingual. I am not looking for copywriting — I am looking for what each screen looks like. Use the real text given here verbatim; never substitute placeholder or lorem text.

## The subject

Luis Octavio Antelo Mansilla. Backend engineer and solution architect, five years, based in Cochabamba, Bolivia (GMT-4, full overlap with US business hours). Most recently Senior Software Engineer at NICE. Targeting Senior Software Engineer, Senior Backend Engineer, and Solution Architect roles — remote, international, English-speaking.

**The thesis every screen must reinforce:**

> Connecting legacy critical systems to modern services in regulated environments.

Oracle EBS and satellite integrations, on-premise core banking and cloud microservices, legacy PHP alongside .NET on AWS. Four employers, one recurring problem. That specificity is the entire differentiator. A design that makes this read as generic "backend developer / distributed systems" positioning has failed, regardless of how good it looks.

## The audience

Hiring managers, staff engineers and architects at international companies, reading on a laptop, probably for under three minutes, probably with six other tabs open. They are looking for evidence of judgment. They are allergic to portfolio theatre.

## The voice, and what it demands of the design

The content operates on one rule, and the homepage states it as a section heading: **"Evidence, not adjectives."** There are no "passionate about technology" claims anywhere. Every assertion is a decision, a trade-off, a constraint, or a measured outcome.

Four properties the design has to serve:

**Numbers lead.** Every homepage bullet opens with a bolded metric before the sentence explaining it: `~70% projected reduction in monthly run cost.` · `100,000 users in three months.` · `Millions of records, zero production incidents.` · `Millions of users, one platform.` The metric should be a typographic event, not a badge or a pill.

**Honesty is a feature, and it must not be buried.** Every case study ends with a section titled **"What I would do differently"** containing real self-criticism. One case study states outright that its headline number is a target that was never measured, because the rollout did not complete. That section needs deliberate visual weight — it is a seniority signal, not an appendix. Design it as something a reader arrives at, not something they scroll past.

**Aphoristic closers.** The prose lands on short, quotable sentences: *"That threshold is reusable. A recommendation is not."* · *"In a bank, the architecture argument is the second argument."* · *"Judgment isn't a title."* · *"That absence is the point of the diagram."* These are pull-quote candidates. Give the design a pull-quote treatment, but one that is typographic rather than decorative — no oversized quotation marks, no tinted callout boxes.

**Two registers, deliberately.** Case studies are clinical and technical. Home and About carry measured warmth — climbing and hiking around Bolivia, amateur boxing, an INTJ-A result offered as a second data point. The design keeps the same sober system throughout; About is the only screen that gets a different *treatment* (a more generous reading measure, more air at the close), never a different visual identity. No photographs. No sport iconography. No personality graphics.

## Visual direction: editorial rigor, product craft

**Corrected 2026-08-20, after pass 0 v1 was rejected.** The first framing of this section asked for "a serious long-form technical publication rather than a developer portfolio" — and got exactly that: three well-typeset documents with no chrome, no hero, no nav, no motion. The author's own words: *"un Word que se lee desde el navegador."* The failure wasn't the typography — it's that a reading-screen register was applied to the whole site, including the screens that have to sell it as a site before anyone reads a word.

**The correction:** editorial rigor governs the *content* — the case studies, About, the metadata blocks, the pull quotes. It does not govern the *chrome* — the nav, the home page, the hero. Those need to read as a crafted product, with real presence and real motion, the way the author's own references do (`brittanychiang.com`'s fixed nav rail, `dunks1980.com`'s work presentation, `tamalsen.dev`'s scale — cited by the author, not to be copied verbatim, but the register they share: a site, not a manuscript).

What that means concretely:

- **The home page is a sitio, not a reading screen.** It needs a nav (a fixed rail is the author's stated preference — see "The nav" below), a hero that does more than state the thesis in prose, a way to browse work that isn't a text list, and real motion. The case studies and About stay in the reading register; the home page does not.
- **Typography carries the reading screens.** A headline face with real character paired with a highly legible body face, comfortable measure. The case studies run 1,000–1,300 words each; About is six unbroken prose paragraphs. These stay reading screens — the correction is about the home page and chrome, not about them.
- **Metrics as typographic events**, inside the reading screens and on work cards alike. Large, set in the display face, explanatory line subordinate beneath. Not tiles, not icons.
- **Diagrams as full-bleed figures**, escaping the text measure, with a caption beneath in a smaller, distinct treatment.
- **Structural metadata in a quieter register** — masthead or specification-block treatment, visually distinct from prose, plausibly monospaced or small-caps. Applies inside case studies; does not have to apply to the home page's work cards, which can carry the same information more visually.
- **Light and dark are both first-class**, with a real toggle in the chrome — not a `prefers-color-scheme`-only position. See "Dark mode" below; this was an open decision in the first draft and is now closed.
- **Motion is load-bearing, not optional.** A moving marquee, a hero with real animation, hover and scroll-driven CSS transitions — all in scope, built with modern CSS (scroll-driven animations, `:has()`, View Transitions) plus a small number of vanilla-JS islands for genuinely stateful pieces (a nav that tracks scroll position, a filterable index), no framework. What stays out: **scroll-jacking** — hijacking the velocity or direction of the user's scroll. Nothing in the author's references does that, and it is the one motion anti-pattern that actually costs usability rather than just risking looking dated.

Explore the actual palette, type pairing, hero concept and scale as part of this work; the above is the register, not the specification. Give me more than one option on the hero concept, the type pairing and the accent where you think it is a genuine fork.

### The nav

A fixed rail on desktop (name, role, section list with an active/hover indicator, socials, the theme toggle) — modeled on the register of `brittanychiang.com`'s nav, not copied verbatim. **Size it for seven items from the start**, not four: `Work · About · Experience · Writing · Architectures · Search · Contact`. Only the first, second, third and last exist today — the middle three (`writing` = a future blog, `architectures` = a future interactive diagram explorer, `search` = a future RAG search) are marked visually as not-yet-live (muted, a small "soon" tag) rather than omitted, so the nav doesn't get redesigned the day one of them ships. On mobile the rail collapses to a top bar with a menu control.

### The hero: the seam, without logos

The thesis — legacy systems that can't move, talking to modern services — has an obvious visual translation: a hero built around **the seam itself**, one side dense/rigid/legacy, the other side open/light/modern, with the boundary between them as the actual subject. **It must never use real system logos or vendor marks** (`C-06`, and it would date badly regardless) — the two sides are told through geometry and behavior (density, spacing, rigidity vs. openness), not iconography. This is also the constraint that makes the hero's visual language reusable: the 11 diagrams downstream (`TASK 6`) need to hold up in light and dark alike, and a geometry-only treatment survives a theme change without redesigning; a glow- or gradient-based one does not.

### Technology and employers

Two strips the author asked for explicitly, both real data, no invented logos:

- **A horizontal marquee of technologies**, sourced from the actual `stack` arrays across the five case studies/platform page — not a hunted-down set of third-party logo SVGs. Typographic, in loop.
- **An employer strip** — the four real, already-public employers (`NICE`, `Banco Solidario S.A.`, `Mamaya Tech`, `Avícola Sofía`, all named in `experience.{en,es}.md` and `about.{en,es}.md`) with their years. Wordmarks in the site's own type, with a slot for real logos later if wanted.

## Hard constraints from the stack

These are already decided and are not open questions:

1. **Static Astro build, zero JavaScript by default.** Interactive components are possible but must be justified per-component. Do not design anything that requires a client-side framework unless it genuinely cannot be done otherwise. There is no backend and no database.
2. **No contact form.** The contact page is deliberately three links (email, GitHub, LinkedIn) with no submission handler. Do not design a form.
3. **Bilingual, English default.** English lives at `/`, `/about`, `/case-studies/{slug}`. Spanish lives at `/es/`, `/es/about`, `/es/case-studies/{slug}`. Same slugs. A language switcher is needed in the chrome. Spanish text runs roughly 15–20% longer than English — the layout has to hold at that length without reflowing badly.
4. **Diagrams are pre-rendered SVG files**, resolved as `/diagrams/{id}.svg`. There are 11 of them. They are currently placeholder Mermaid renderings and will be replaced by hand-authored assets — **so this design gets to specify their visual language, and should.** Constraints they carry: they are wide left-to-right flowcharts with long multi-line node labels, they must stay legible on mobile, and one pair (`otp-c4-before` / `otp-c4-after`) is a deliberate before/after comparison that must read side by side. The current placeholders hardcode light fills.
5. **Dark mode: decided 2026-08-20, not open.** Light and dark are both first-class, with a real, visible toggle in the chrome — not an automatic-only `prefers-color-scheme` position. The named cost stands and is accepted: the diagram assets need a treatment that works in both (`TASK 6`'s scope), and the hero's visual language is chosen specifically so it survives the theme switch without a separate dark redraw (see "The hero" above).
6. **The block vocabulary is genuinely narrow.** Across all nine content pages there are zero tables, zero code blocks, zero blockquotes, and zero images other than the diagrams. The only primitives are: h2 and h3 headings, unordered bullets, one numbered list, `**bold**` paragraph lead-ins standing in for h4s, single-word italic emphasis, inline links, and diagram figures. Design those well and the whole site is covered. Do not design components that no content needs.

## Typographic tells in the source, worth honoring

- The middot `·` as an inline separator: `Senior Software Engineer · Cochabamba, Bolivia (GMT-4...) · Open to remote`
- The arrow `→` as a pointer to a linked case study, and inside a role string: `Backend Engineer → Solution Architect`
- Em dashes, used heavily and mid-sentence
- Bold paragraph lead-ins acting as micro-headings: `**Cost.**` `**Control.**` `**Coupling.**` — these appear inside sections and need a treatment that reads as structure without becoming a heading level
- En-dashed year ranges: `2023–2025`

## Content inventory

Nine content pages exist, in two locales each. Plus one index screen that does not exist yet and must be designed from scratch.

**Four site pages** (`type: page`, no diagrams, pure typography):

| slug | shape |
|---|---|
| `home` | dateline · thesis statement · framing paragraph · `## Evidence, not adjectives` with 4 metric-led bullets, 3 of them linking to case studies · `## What I'm looking for` · `## Get in touch` |
| `about` | **no headings at all** — six long prose paragraphs, chronological, four inline case-study links, closing on the personal material |
| `experience` | **no headings** — four bold-lead paragraphs, one per employer, reverse-chronological, each `**Role at Company, years.**` plus one narrative paragraph; two are followed by a bullet list of case-study links |
| `contact` | 43 words. One invitation sentence, three bold-labelled links. Nothing else. Its shortness is the design problem |

**One platform anchor page** (`type: platform`, slug `mobile-banking-platform`, 2 diagrams, ~930 words). Structurally distinct from the case studies, and the parent of three of them: `## Context` → `## The central constraint` → *diagram* → `## Architecture` → `## Services I designed and owned` (6 bullets) → `## One decision worth explaining: two services, not one` → *diagram* → `## Results` → `## What I would do differently` → `## Deep dives` (links to its three children). Its frontmatter is the only one carrying `scale` and the only one without `outcome`.

**Four case studies** (`type: case-study`, 1,000–1,300 words each), all sharing exactly one structure: `## Context` → `## Problem` → `## Constraints` → `## Approach` (2–5 h3 subsections, diagrams interleaved) → `## Result` → `## What I would do differently`. One template fits all four.

Their frontmatter, which the design must present:

| slug | role | period | outcome | diagrams |
|---|---|---|---|---|
| `otp-provider-decoupling` | Solution Architect | 2025 | Approved decomposition plan, execution begun; OTP cutover not completed before handover — ~70% reduction in monthly run cost was the target | 3 |
| `qr-collections-for-merchants` | Solution Architect & Backend Developer | 2025 | 100,000 users in the first three months | 2 |
| `legacy-payment-data-migration` | Backend Engineer | 2024 | Millions of records migrated, zero production incidents | 1 |
| `multi-tenant-biometric-attendance` | Systems Analyst & Lead Developer | 2022–2023 | Production across multiple companies, thousands of employees | 3 |

Note the first outcome. It is long, qualified, and honest about a target that was never reached. The design must accommodate an outcome field that is a paragraph, not a number — that case is the rule, not the exception, and truncating it would defeat the point of the content.

Each also carries `context` (e.g. `Regulated bank · Latin America`), a `stack` array of 3–7 short strings (`.NET`, `AWS Fargate`, `SNS/SQS`, `BIAN`, `SQL Server 2012 → 2022`), and a `skills` array of 4–5 kebab-case tags (`service-decomposition`, `cost-engineering`, `legacy-integration`).

## Screens to design

Every screen in **desktop and mobile**. Listed in priority order — if the set is too large for one pass, the first four carry the direction.

1. **Home.** The screen that has to land the thesis in eight seconds and the evidence in thirty. Full copy below.
2. **Case study detail — use `otp-provider-decoupling`.** The richest instance: three diagrams including the before/after pair, a numbered list, bold lead-ins under `## Problem`, and the honest-outcome frontmatter. If this template holds, all four hold.
3. **Case studies index — `/case-studies`.** *This screen has no content yet and you are designing it from scratch.* It lists five items. The platform page is the parent of three of the case studies, not a peer — the layout should express that hierarchy rather than showing five identical cards. Author's stated priority order: `mobile-banking-platform` (anchor) · `qr-collections-for-merchants` (strongest adoption metric) · `otp-provider-decoupling` (strongest engineering judgment) · `legacy-payment-data-migration` (strongest rigor and ownership) · `multi-tenant-biometric-attendance` (strongest diagrams, and the only one flagged `featured: false`). Each item has a title, a subtitle, a role, a period, an outcome and a stack to work with.
4. **Platform anchor page — `mobile-banking-platform`.** Needs a treatment distinct from the standard case study, and its `## Deep dives` section is where its three children are handed off.
5. **About.** Six headingless prose paragraphs. The reading screen, and the only one carrying warmth. Solve it typographically.
6. **Experience.** Four bold-lead paragraphs with two embedded link lists. Reverse-chronological. Resist turning this into a timeline graphic unless the graphic earns it.
7. **Contact.** 43 words on a page. Make the shortness deliberate rather than empty.
8. **System states.** A bilingual 404 (the host serves locale-aware 404s natively), and the language switcher in its open state.
9. **Component sheet** (desktop only is fine). One artboard collecting the system: nav (in its full seven-item size, with the three not-yet-live items visibly marked), footer, diagram figure with caption, metric block, case-study card, the `What I would do differently` block, the frontmatter metadata block, the bold-lead-in paragraph, the pull quote, the technology marquee, and the employer strip.

**Future destinations the nav already sizes for, not designed here:** `/writing` (a blog), `/architectures` (an interactive explorer for the 11 diagrams — replacing the static SVGs with something navigable, zoomable, with before/after states), and site-search. None are in this pass's scope; the nav item count and the "soon" treatment (see "The nav" above) are what pass 0 owes them.

## Real copy for the home screen

Use this verbatim.

> Senior Software Engineer · Cochabamba, Bolivia (GMT-4, full overlap with US business hours) · Open to remote or hybrid/relocation
>
> **When a system is too critical to touch and too old to ignore, that's my problem to solve.**
>
> Five years, four employers, one version of that problem each time: an on-premise banking core, an Oracle EBS system, a legacy PHP platform — none of them able to move, all of them needing to talk to something new. I keep ending up owning the seam: the architecture on both sides of it, not just the code on one.
>
> ## Evidence, not adjectives
>
> - **~70% projected reduction in monthly run cost.** An OTP service had become a single point of failure for every outbound channel in a bank's mobile app. I designed the decoupling and got execution started before I moved on. → Taking second-factor authentication back from a vendor
> - **100,000 users in three months.** Let merchants without a business bank account collect payments through the bank's own QR rails. → Letting merchants delegate payment collection to people without bank accounts
> - **Millions of records, zero production incidents.** Migrated a bank's core payment data onto a new platform, under a governance model where "roll back and retry" wasn't an option. → Migrating payment data out of a system nobody understood
> - **Millions of users, one platform.** Most recently Senior Software Engineer at NICE, shipping multitenant features and performance work for a globally distributed enterprise CX platform.
>
> ## What I'm looking for
>
> Senior Software Engineer, Senior Backend Engineer, or Solution Architect — remote-first, internationally.
>
> ## Get in touch
>
> Got a problem like the ones above? Email me.
>
> GitHub · LinkedIn

Note that the fourth bullet has no case study behind it and no link. The design must not assume every metric bullet is clickable.

## Anti-goals

- No hero image, no stock illustration, no abstract 3D shapes, no animated gradient meshes
- No skill bars, no percentage-proficiency graphics
- **Technology logo walls are back in scope, typographically.** The original anti-goal assumed a wall of hunted-down third-party SVG logos, which is still out. A moving marquee of the real `stack` values, set as type, is what the author asked for after pass 0 — see "Technology and employers" above.
- No testimonials section, no "services I offer", no pricing, no blog stub that claims a blog exists before `writing` is real (the nav can show `writing` as a marked "soon" destination — see "The nav" above — that's different from a stub page pretending it's live)
- No emoji as interface elements
- **No scroll-jacking, no parallax.** Reveal-on-scroll is back in scope, subtly — the original blanket "no elements that fade in as you scroll past" was part of the over-correction toward stillness; the surviving anti-pattern is hijacking scroll velocity/direction, not any scroll-triggered CSS transition
- No dark-terminal-with-green-text aesthetic — this was explicitly considered and rejected as the most common look in developer portfolios
- Nothing that implies a metric was measured when the copy says it was projected
- **No real system/vendor logos anywhere**, including in the hero's legacy/modern metaphor (`C-06`, and see "The hero" above) — geometry and behavior carry it instead

## What I want back

Artboards on one canvas: each screen at desktop and mobile width, plus the component sheet. Where a decision is a genuine fork — the type pairing, the accent color, whether the case-study metadata sits above the prose or beside it, whether dark mode is worth its cost — show me the alternatives rather than picking silently.
