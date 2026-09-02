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
  wordmark: "Luis Octavio Antelo"

socials:
  - name: "GitHub"
    url: "https://github.com/Jichimon"
  - name: "LinkedIn"
    url: "https://www.linkedin.com/in/luis-octavio-antelo-mansilla-92b8ba150/"

home:
  standalone_label: "Not part of the platform: a different employer, a different system"
  employers_heading: "Where I've worked"
  work_heading: "What I've done"
  stack_heading: "Technologies I've worked with"
  contact_heading: "Get in touch"
  contact_invite: "Got a system that's hard to explain? Need something built and don't know how? An idea you can't quite land yet? Or just a technical question? Let's work it out together."
  contact_note: "Open to remote or hybrid/relocation opportunities."
  contact_email: "luis.antm@hotmail.com"
  seam_legacy: "Legacy, dense"
  seam_modern: "Modern, open"
  testimonial_translated_from_en: "Translated from English"   # ES: "Traducido del inglés"
  testimonial_translated_from_es: "Translated from Spanish"   # ES: "Traducido del español"
  testimonial_link: "LinkedIn"


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
  part_of: "part of"
  figure_prefix: "Fig."

about:
  label: "About"
  based_in: "Based in"
  since: "Since"
  reads_as: "Reads as"
  next_up:
    - key: experience
      label: "Where I've worked, and what happened there"
    - key: work
      label: "The work in depth"
    - key: contact
      label: "Get in touch"

experience:
  label: "Experience"
  most_recent: "most recent"
  cv_note: "Cochabamba, Bolivia · GMT-4 · open to remote, or hybrid/relocation depending on the role"
  full_history:
    label: "Full history on LinkedIn →"
    social: "LinkedIn"
  next_up:
    - key: work
      label: "The work in depth"
    - key: about
      label: "How it actually went"
    - key: contact
      label: "Get in touch"

contact_form:
  email_label: "Your email"
  email_placeholder: "you@company.com"
  subject_label: "About"
  subject_placeholder: "One line"
  message_label: "Description"
  message_placeholder: "What's the problem?"
  submit: "Send"
  sending: "Sending…"
  sent: "Sent. I'll reply to"
  error: "Couldn't send. Your message is still here. Write to"

footer:
  metrics_slot: "Visitor metrics: reserved slot, not built yet"

not_found:
  status_code: "HTTP 404"
  status_word: "not found"
  heading: "This link doesn't connect to anything."
  body: "Which is roughly the problem I get paid to solve. The address is either out of date or mistyped. Here is everything that does exist."
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

**Nothing renders this body.** It is the traceability record (where each string came from) and it is the reason this file can be reviewed rather than trusted.

## Where each string came from

Every value above was lifted from an artboard in `docs/design/canvas/src/`, except the four `home` strings named under the table. Nothing is invented.

| Group | Source |
|---|---|
| `nav` | `Main.dc.html` 430–436, the seven rail items and the `soon` tag |
| `rail` | `Main.dc.html` 425–427, 439, 446 · `MobileSeam.dc.html` 99 for `menu`, which only appears in the narrow top bar |
| `socials` | `Main.dc.html` 448 · the same two links the footer carries (`CaseStudiesIndex.dc.html` 343). Values are identical in both locales: a name and a URL, nothing to translate |
| `home.employers_heading`, `home.contact_heading`, `home.contact_email` | `Main.dc.html` 531, 667, 687 |
| the two seam labels | `MobileSeam.dc.html` 142 |
| `article` | `CaseStudyDetail.dc.html` 288 · `PlatformPage.dc.html` 286 · `CaseStudiesIndex.dc.html` 334 |
| `about` | `About.dc.html` 266, 270–272, 329–336 |
| `experience` | `Experience.dc.html` 242, 254, 312–324 |
| `contact_form` | `Main.dc.html` 672–683 |
| `footer` | `Main.dc.html` 716 |
| `not_found` | `NotFound.dc.html` 228, 264–286 |

**`home.work_heading`, `home.stack_heading`, `home.contact_invite` and `home.contact_note` no longer come from the artboard.** They were lifted from `Main.dc.html` 542, 655, 668, then rewritten in `ui.es.md` and matched here. The source of those four strings is now the pair of content files, not the design.

**And one substitution runs across the whole file.** Where an artboard value used an em-dash, this file uses a colon, a full stop or parentheses instead. So `home.standalone_label`, `home.contact_note`, `footer.metrics_slot` and `not_found.body` differ from their artboard source by that punctuation and by nothing else.

## Three things worth knowing before editing this file

**The 404 loads both locales of this file at once.** Its design shows English and Spanish side by side, so its template reads `ui.en.md` **and** `ui.es.md`. That is the reason the chrome is a joinable collection rather than one module per locale.

**`not_found.status_code` and `status_word` are split on purpose.** The artboard prints one line, `HTTP 404 · not found · no encontrado`, which the template composes from both locales. Carrying the whole line in both files would be one datum declared twice.

**`contact_form` renders at launch with `action="mailto:"`** The designed `sending` / `sent` / `error` states stay unused until the contact Worker exists. A form that cannot know whether the message left must not claim it did.

## What is deliberately absent

- **`skills`**: the case studies carry the field, and no artboard shows a label for it. Inventing one would be inventing design.
- **Nav structure**: which items exist, their order, their target and their `soon` flag are structure, not copy, and live in one data module in the site's own core. Only the labels are here.
- **The About headline and the home page's own prose**: page copy, which belongs in `about.{en,es}.md` and `home.{en,es}.md`.
