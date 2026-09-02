# Author packet — TASK 19: the three LinkedIn recommendations

**Written by the 2026-09-02 session, for the author.** `resources/**` is read-only to every agent (`H-02`), so these four files can only come from you. Everything downstream of them — the collection, the component, the tests — is `TASK 113` and is mine.

**Two new files, two edits.** Nothing here is a draft to review: it is a template with the machine-readable parts already correct, and blanks where only you have the words.

---

## 1 · `resources/site/testimonials.en.md` — new file

Paste this whole thing, then replace everything between `<>` (including the angle brackets).

```markdown
---
slug: testimonials
lang: en
type: testimonials
title: "Recommendations"
confidentiality: sanitized

testimonials:
  - id: nice-manager-a
    quote: |
      <the recommendation, VERBATIM, exactly as it reads on LinkedIn>
    original_language: en
    name: "<First Last>"
    title: "<their title when they wrote it>"
    company: "NICE"
    url: "<the LinkedIn permalink to this recommendation>"

  - id: solidario-product-owner
    quote: |
      <YOUR English translation of the Spanish original>
    original_language: es
    original_quote: |
      <the Spanish original, VERBATIM>
    name: "<First Last>"
    title: "<their title when they wrote it>"
    company: "Banco Solidario S.A."
    url: "<the LinkedIn permalink to this recommendation>"

  - id: nice-manager-b
    quote: |
      <the recommendation, VERBATIM>
    original_language: en
    name: "<First Last>"
    title: "<their title when they wrote it>"
    company: "NICE"
    url: "<the LinkedIn permalink to this recommendation>"
---

This file is read for its frontmatter. The home page renders the `testimonials` list; nothing renders this body, and that is the decision rather than an oversight.
```

**On the `|` blocks.** The `|` keeps the text verbatim across line breaks, which is what a quote needs. Indent every line of the quote by six spaces, under the `|`. Blank lines inside a quote are fine. Nothing needs escaping — quotation marks, apostrophes, colons, all of it is safe inside a `|` block.

---

## 2 · `resources/site/testimonials.es.md` — new file

**The same three entries, the same three `id` values, in the same order.** What flips is which language is the quote and which is the original:

```markdown
---
slug: testimonials
lang: es
type: testimonials
title: "Recomendaciones"
confidentiality: sanitized

testimonials:
  - id: nice-manager-a
    quote: |
      <TU traducción al español del original en inglés>
    original_language: en
    original_quote: |
      <el original en inglés, VERBATIM>
    name: "<First Last>"
    title: "<su cargo cuando la escribió, en español>"
    company: "NICE"
    url: "<el mismo permalink que en el archivo .en.md>"

  - id: solidario-product-owner
    quote: |
      <la recomendación en español, VERBATIM — acá el español ES el original>
    original_language: es
    name: "<First Last>"
    title: "<su cargo cuando la escribió, en español>"
    company: "Banco Solidario S.A."
    url: "<el mismo permalink>"

  - id: nice-manager-b
    quote: |
      <TU traducción al español>
    original_language: en
    original_quote: |
      <el original en inglés, VERBATIM>
    name: "<First Last>"
    title: "<su cargo cuando la escribió, en español>"
    company: "NICE"
    url: "<el mismo permalink>"
---

Este archivo se lee por su frontmatter. La home renderiza la lista `testimonials`; nada renderiza este cuerpo.
```

**`original_quote` is present exactly when `original_language` is not this file's `lang`.** In the English file, only the Banco Solidario entry has one. In the Spanish file, only the two NICE entries do. Getting this backwards fails the build with the `id` named — it will not ship a half-truth quietly.

---

## 3 and 4 · `resources/site/ui.en.md` and `ui.es.md` — three lines each

The card's translation note and its link label are strings a reader sees, so `S-01` puts them in `resources/**` with every other one. They go in the `home:` group that already exists, right after `contact_email:`.

**`ui.en.md`:**

```yaml
  testimonial_translated_from_en: "Translated from English"
  testimonial_translated_from_es: "Translated from Spanish"
  testimonial_link: "LinkedIn"
```

**`ui.es.md`:**

```yaml
  testimonial_translated_from_en: "Traducido del inglés"
  testimonial_translated_from_es: "Traducido del español"
  testimonial_link: "LinkedIn"
```

Two spaces of indent, matching the keys around them. Both files carry both language keys, because each file renders cards translated from the other language.

---

## What the machine will check, and what only you can

**The guards catch these**, so you do not need to be careful about them — just fix what they name:

| It checks | It fails with |
|---|---|
| `slug: testimonials` matches the filename | *slug disagrees with the filename* |
| `lang` matches the `.en.` / `.es.` suffix | *filename says .en.md but frontmatter says lang: es* |
| The five universal keys are all present | *missing required key(s)* |
| Both locale files exist | *has no es counterpart* |
| Same ids, same order, no duplicates, across both files | a build error naming the id |
| `original_quote` present exactly when translated | a build error naming the id |
| No banned term reaches a published file | `check-terms`, naming the term |

**Only you can decide these four:**

- **Nothing is invented or paraphrased.** If a quote is not to hand and you cannot copy it exactly, put `[NEEDS INPUT] <what you need>` as the whole `quote` value. That card is skipped, the other two render, and the marker never reaches a page. A plausible reconstruction of what someone said about you is the one failure mode this whole file exists to prevent (`C-01`).
- **If a quote names something confidential** — an internal service, a security vendor, an internal product name — do not edit it silently. Cut it and mark the cut: `[…]`. `check-terms` runs over the whole repository and will name the term if there is one, but it only knows the terms someone wrote down; the categories in `C-06` are wider than the list.
- **Name, title and company only.** These are three other people. No contact details, nothing they said to you privately, no photo (`C-06`).
- **The Spanish is first-class content, not a translation artifact** (`C-09`). Two of the three cards in each language are your translation, and a translation that reads like one undoes the effect the section is there to create. Read the Spanish column out loud before you call it done.

---

## After you paste

Run `node scripts/gate.mjs` and fix whatever it names. Then tell me, and I close `TASK 113`: the collection, the core module, the component, the inverted `HOME-006`, and the canvas placeholders.

`TASK 113` does not wait on you for most of that — only the visual diff and the canvas replacement need the real words.
