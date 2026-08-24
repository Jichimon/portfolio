---
slug: ui
lang: en
type: ui
title: "Interface strings"
confidentiality: sanitized

nav:
  work: "Work"
  about: "About"
  experience: "Experience"
  contact: "Contact"
  writing: "Writing"
  architectures: "Architectures"
  search: "Search"
  soon_tag: "soon"

rail:
  role: "Senior Software Engineer"
  location: "Cochabamba, Bolivia"
  timezone: "GMT-4 · full overlap with US business hours"
  language_group: "Language"
  theme_to_dark: "Dark mode"
  theme_to_light: "Light mode"
  menu: "Menu"

home:
  employers_heading: "Where I've worked"
  work_heading: "What I've built"
  stack_heading: "Technologies I've worked with"
  contact_heading: "Get in touch"
  contact_invite: "Got a system that's hard to explain — or an idea you don't yet know how to build? Let's work it out together."
  contact_note: "Open to remote or hybrid/relocation."
  seam_legacy: "Legacy, dense"
  seam_modern: "Modern, open"

article:
  toc_heading: "On this page"
  back_to_work: "← Work"
  role: "Role"
  context: "Context"
  period: "Period"
  outcome: "Outcome"
  stack: "Stack"
  platform_tag: "Platform · parent of the deep dives"
  case_study_tag: "Case study"
  deep_dives: "Deep dives"

about:
  label: "About"
  based_in: "Based in"
  since: "Since"
  reads_as: "Reads as"

experience:
  label: "Experience"

contact_form:
  email_label: "Your email"
  email_placeholder: "you@company.com"
  subject_label: "About"
  subject_placeholder: "One line"
  message_label: "Description"
  message_placeholder: "What's the problem?"
  submit: "Send"

footer:
  metrics_slot: "Visitor metrics — reserved slot, not built yet"

not_found:
  status_code: "HTTP 404"
  status_word: "not found"
  heading: "This link doesn't connect to anything."
  body: "Which is roughly the problem I get paid to solve. The address is either out of date or mistyped — here is everything that does exist."
  destinations:
    - name: "Work"
      what: "What I built, and what it cost"
    - name: "About"
      what: "The person, not the résumé"
    - name: "Experience"
      what: "Where each problem came from"
    - name: "Get in touch"
      what: "Email, GitHub, LinkedIn"
---

Every string the site's chrome prints, in English. Nothing here is page copy: a string belongs in this file when a template prints it regardless of which content file is loaded, and in the page's own `.md` otherwise.

**Nothing renders this body.** It is the traceability record — where each string came from — and it is the reason this file can be reviewed rather than trusted.

## Where each string came from

Every value above is lifted from an artboard in `docs/design/canvas/src/`. Nothing is invented.

| Group | Source |
|---|---|
| `nav` | `Main.dc.html` 430–436 — the seven rail items and the `soon` tag |
| `rail` | `Main.dc.html` 426–427, 439, 446 · `MobileSeam.dc.html` 99 for `menu`, which only appears in the narrow top bar |
| `home` | `Main.dc.html` 531, 542, 655, 667, 668, 687 · `MobileSeam.dc.html` 142 for the two seam labels |
| `article` | `CaseStudyDetail.dc.html` 262, 287, 293–297 · `PlatformPage.dc.html` 264, 286 · `CaseStudiesIndex.dc.html` 334 |
| `about` | `About.dc.html` 266, 270–272 |
| `experience` | `Experience.dc.html` 242 |
| `contact_form` | `Main.dc.html` 672–683 |
| `footer` | `Main.dc.html` 716 |
| `not_found` | `NotFound.dc.html` 228, 264–286 |

## Three things worth knowing before editing this file

**The 404 loads both locales of this file at once.** Its design shows English and Spanish side by side, so its template reads `ui.en.md` **and** `ui.es.md`. That is the reason the chrome is a joinable collection rather than one module per locale.

**`not_found.status_code` and `status_word` are split on purpose.** The artboard prints one line — `HTTP 404 · not found · no encontrado` — which the template composes from both locales. Carrying the whole line in both files would be one datum declared twice.

**`contact_form` is not rendered yet.** Contact is a `mailto:` link at launch; the designed form arrives with the contact Worker. The strings are here because they exist on the artboard and are traceable today, so no second review round is needed later.

## What is deliberately absent

- **`skills`** — the case studies carry the field, and no artboard shows a label for it. Inventing one would be inventing design.
- **Nav structure** — which items exist, their order, their target and their `soon` flag are structure, not copy, and live in one data module in the site's own core. Only the labels are here.
- **The About headline and the home page's own prose** — page copy, which belongs in `about.{en,es}.md` and `home.{en,es}.md`.
