# TASK 26 — author hand-off packet

**Written 2026-08-26 by the orchestrator. `H-02` puts `resources/**` outside every agent's reach, so every change below is the author's to apply.**

Six items. Tell the session "ya hice el punto N" as each lands.

Nothing here is invented. Every value is either lifted from an artboard in `docs/design/canvas/src/` (cited per item) or restructured from prose that already exists in that same file, in that same locale. The places where something genuinely new is needed are marked **[AUTHOR]** and are left empty rather than approximated (`C-01`).

---

## 1.1 — `resources/site/ui.en.md`

Replace the `about:` and `experience:` groups with these.

```yaml
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
```

`key` matches the nav's own item keys, so the template resolves each href through `resolveNavItemHref` and no path literal ever appears in content. `full_history.social` names which entry of `ui.socials` carries the URL, so the LinkedIn address stays declared once.

Also update two rows of the provenance table further down that file:

| Group | Source |
|---|---|
| `about` | `About.dc.html` 266, 270–272, **329–336** |
| `experience` | `Experience.dc.html` 242, **254, 312–324** |

---

## 1.2 — `resources/site/ui.es.md`

```yaml
about:
  label: "Sobre mí"
  based_in: "Radicado en"
  since: "Desde"
  reads_as: "Se lee como"
  next_up:
    - key: experience
      label: "Dónde trabajé, y qué pasó ahí"
    - key: work
      label: "El trabajo en detalle"
    - key: contact
      label: "Hablemos"

experience:
  label: "Experiencia"
  most_recent: "más reciente"
  cv_note: "Cochabamba, Bolivia · GMT-4 · abierto a remoto, o híbrido/relocation según el rol"
  full_history:
    label: "Historial completo en LinkedIn →"
    social: "LinkedIn"
  next_up:
    - key: work
      label: "El trabajo en detalle"
    - key: about
      label: "Cómo fue en realidad"
    - key: contact
      label: "Hablemos"
```

---

## 1.3 — `resources/site/about.en.md` · full replacement

The whole file, frontmatter and body:

<!-- BEGIN about.en.md -->

    ---
    slug: about
    lang: en
    type: page
    title: "Luis Antelo — About"
    confidentiality: sanitized
    h1: "I'd rather design the system than run the room it lives in."
    lead: ""
    since: "2021 in software"
    reads_as: "INTJ-A"
    photos:
      - file: "Huayna-Potosi-landscape.jpg"
        slot: break
        alt: "Huayna Potosí seen from the altiplano — its snow face under storm cloud, a small red-roofed refuge at the foot of the slope for scale."
        caption: "Huayna Potosí, 6,088 m."
      - file: "me-profile.jpeg"
        slot: pair
        alt: "Luis Antelo, looking at the camera."
        caption: "Cochabamba."
      - file: "bolivia-landscape.jpeg"
        slot: pair
        alt: "Walking out along a spit of land toward a lake in the Bolivian highlands, a small boat moored at the end of it."
        caption: ""
    ---

    Five years is not a long career by some measures, and I don't pretend otherwise. What moved faster than the calendar was scope: from proof-of-concept work as a trainee to owning architecture decisions that hundreds of thousands of people now depend on, made under real constraints — a live system that can't go down while you rebuild it, a security review that has to sign off before anything ships, a bank that needs the business case before it needs the technical one.

    **Judgment isn't a title.** It's having made enough of those calls, in public, with real consequences, to know which questions to ask before the ones that come back to bite you.

    ***

    I'm still finishing a degree in Ingeniería Informática at Universidad Autónoma Gabriel René Moreno (UAGRM), started in 2017 — paused for now, but I plan on finishing it. **Teaching is where I'd like to take it, eventually.**

    Outside of work, the same instinct shows up in sport: climbing and hiking around Bolivia (Huayna Potosí included), and amateur boxing.

    > I just like being bad at something new until I'm not.

    For a second data point on the same thing: I tested as an INTJ-A — "Architect" — on 16Personalities. Independent, rational, and more at ease designing a system than running the room it lives in, which lines up with how most of the decisions above actually got made. [Full profile →](https://www.16personalities.com/profiles/21180e3e5b55c)

<!-- END about.en.md -->

**Four things to know about that file:**

- **The four employer paragraphs are gone.** They move to Experience. That is the split `TASK 20` decided with the author, and it is what makes `About.dc.html` renderable — the artboard carries no chronology at all.
- **`***` is the split marker, and it is load-bearing.** The two paired photographs go exactly there. Exactly one is expected. Zero is valid — the pair then lands after the whole body. Two fails the build naming the file.
- **`lead: ""` and the third `caption: ""` are [AUTHOR] and may stay empty.** Empty means the block is absent, which is a supported state rather than a defect. The lead is two or three sentences opening the page **as a person, not a résumé** — the one thing this page cannot borrow from Experience. The caption is *where, and when* the lake photograph was taken.
- **The 16Personalities link is now a real Markdown link.** It landed as plain text in `TASK 16` and has never rendered as clickable.

**[AUTHOR], optional:** the "working from Cochabamba for teams abroad" paragraph, two or three sentences, between the UAGRM paragraph and "Outside of work". The site says nothing about it today beyond a timezone.

---

## 1.4 — `resources/site/about.es.md` · full replacement

<!-- BEGIN about.es.md -->

    ---
    slug: about
    lang: es
    type: page
    title: "Luis Antelo — Sobre mí"
    confidentiality: sanitized
    h1: "Prefiero diseñar el sistema antes que dirigir la sala donde vive."
    lead: ""
    since: "2021 en software"
    reads_as: "INTJ-A"
    photos:
      - file: "Huayna-Potosi-landscape.jpg"
        slot: break
        alt: "El Huayna Potosí visto desde el altiplano — su cara nevada bajo nubes de tormenta, y un refugio de techo rojo al pie de la ladera que da la escala."
        caption: "Huayna Potosí, 6.088 m."
      - file: "me-profile.jpeg"
        slot: pair
        alt: "Luis Antelo, mirando a cámara."
        caption: "Cochabamba."
      - file: "bolivia-landscape.jpeg"
        slot: pair
        alt: "Caminando por una lengua de tierra hacia una laguna del altiplano boliviano, con un bote amarrado al final."
        caption: ""
    ---

    Cinco años no son una carrera larga bajo ciertos parámetros, y no pretendo lo contrario. Lo que creció más rápido que el calendario fue el scope: de hacer pruebas de concepto como trainee, a ser dueño de decisiones de arquitectura de las que hoy dependen cientos de miles de personas, tomadas bajo restricciones reales — un sistema en producción que no puede caerse mientras lo reconstruís, una revisión de seguridad que tiene que dar el visto bueno antes de que algo salga, un banco que necesita el caso de negocio antes que el técnico.

    **El criterio no lo da un título.** Lo da haber tomado suficientes de esas decisiones, en público, con consecuencias reales, como para saber qué preguntar antes de las preguntas que después te muerden.

    ***

    Todavía estoy terminando la carrera de Ingeniería Informática en la Universidad Autónoma Gabriel René Moreno (UAGRM), empezada en 2017 — congelada por ahora, pero con la idea de retomarla. **Más adelante me gustaría dedicarme a la docencia.**

    Fuera del trabajo, el mismo instinto aparece en el deporte: escalada y hiking por toda Bolivia (con el Huayna Potosí ya subido), y boxeo amateur.

    > Me gusta ser malo en algo nuevo hasta dejar de serlo.

    Como segundo dato sobre lo mismo: en 16Personalities salí INTJ-A — "Arquitecto". Independiente, racional, y más cómodo diseñando un sistema que dirigiendo la sala donde vive, algo que coincide con cómo se tomó la mayoría de las decisiones de arriba. [Perfil completo →](https://www.16personalities.com/profiles/21180e3e5b55c)

<!-- END about.es.md -->

**Two Spanish wordings need the author's sign-off.** Both are derived from Spanish prose already in the file; neither is invented, and a derivation is not an approval (`C-01`, `C-04`):

- **The `h1`.** The Spanish already reads *"más cómodo diseñando un sistema que dirigiendo la sala donde vive"*; the `h1` turns that into a first-person claim. The artboard only ever carried an English one.
- **The pull quote.** Inline it reads *"me gusta simplemente ser malo en algo nuevo hasta dejar de serlo"*; standing alone as a quote it has to start on its own, hence *"Me gusta ser malo en algo nuevo hasta dejar de serlo."*

---

## 1.5 — `resources/site/experience.en.md` · full replacement

<!-- BEGIN experience.en.md -->

    ---
    slug: experience
    lang: en
    type: page
    title: "Luis Antelo — Experience"
    confidentiality: sanitized
    h1: "Every employer was different. The problem never was."
    intro: "A system too important to touch, and a business that needed it to do something it was never built for. Different industry, different stack, same shape — every time."
    roles:
      - company: "NICE"
        period: "2025–2026"
        title: "Senior Software Engineer"
        body:
          - "I joined a platform serving millions of users and spent six months on two different kinds of ownership: the technical kind — multitenant features and a performance fix I pushed through as a proper ADR instead of shipping it quietly — and the people kind, mentoring the junior half of the backend team and building the agentic AI tooling that's now part of how we review code."
          - "The platform is a globally distributed enterprise CX product — legacy PHP and vanilla JavaScript running next to a modern .NET stack, the same “make the old and the new talk to each other” problem at a different scale. Working for customers across US and EU jurisdictions meant designing around how their data-protection regimes actually differ, not just checking a compliance box."
        stack: [".NET", "legacy PHP", "vanilla JavaScript", "multi-jurisdiction data protection"]

      - company: "Banco Solidario S.A."
        period: "2023–2025"
        title: "Backend Developer → Solution Architect in practice"
        body:
          - "My title never moved past backend developer, but two years in I was making the calls a solution architect makes — the bank just hadn't updated the paperwork. I joined a team bringing mobile banking in-house, off a vendor product the bank never owned, and ended up responsible for the identity and payments architecture underneath the app hundreds of thousands of people use."
          - "The source of truth was a legacy on-premise core the bank could not move, so every feature crossed a trust boundary, a latency boundary and a compliance boundary at once."
        case_studies:
          - otp-provider-decoupling
          - qr-collections-for-merchants
          - legacy-payment-data-migration
        stack: [".NET", "AWS", "SNS/SQS", "MassTransit", "Polly", "SQL Server", "BIAN"]

      - company: "Mamaya Tech"
        period: "2022–2023"
        title: "Systems Analyst"
        body:
          - "The internal systems team from my previous role spun out into this company, and I went with it. Same problem, different company: integrating satellite ERP systems into an Oracle EBS core, and evaluating the vendors on the other side of those integrations."
          - "The work was the same shape as before the spin-out and the core system was literally the same one — I was integrating satellite systems into it from the other side of a corporate boundary instead of from the inside."
        stack: ["Oracle EBS", "ERP integration", "vendor evaluation"]

      - company: "Avícola Sofía"
        period: "2021–2022"
        title: "Systems Analyst"
        body:
          - "My first real system, end to end: a multitenant attendance platform tying biometric terminals across multiple industrial plants back into the company's Oracle EBS core and HR system, built and shipped while I was still learning what “production” actually meant."
          - "An agro-industrial holding running production, cash and warehouse operations on Oracle EBS — instrumented for paperwork, not for the biometric terminals the business needed next. That gap is the one I have been working in ever since."
        case_studies:
          - multi-tenant-biometric-attendance
        stack: ["Oracle EBS", "biometric hardware", "modular monolith"]
    ---

    **Nothing renders this body.** Every element of this page is drawn from the frontmatter above, and this note is the traceability record — the same shape `home.{en,es}.md` took when its prose stopped being rendered.

    | Page element | Where it comes from |
    |---|---|
    | the headline and intro | `h1` and `intro` above |
    | each entry's company, years and role | `roles[].company`, `.period`, `.title` |
    | each entry's prose | `roles[].body` |
    | the case-study rows | `roles[].case_studies` — slugs, joined against the route set, so each row's title and href come from that case study's own file in this page's locale |
    | the technology line | `roles[].stack` |
    | the "most recent" badge | derived from the record's own order, not written anywhere |
    | the logo squares | a logo file where one exists; absent is a supported value |
    | the availability note and the LinkedIn link | `ui.experience.cv_note` and `.full_history` |

<!-- END experience.en.md -->

**`case_studies` carries slugs, never link text and never paths.** Each row's title is read from that case study's own frontmatter in this page's locale, so the Spanish page links to Spanish articles with Spanish titles and this file cannot drift from them. All five titles were checked against the artboard's link text — they match exactly today, which is why no per-row label is needed.

**Two editorial notes, flagged rather than slipped in:**

- The artboard gives Banco Solidario a second paragraph that restates the first almost verbatim and then lists the same three things the case-study rows list immediately below it. It is replaced above by the one sentence that is *not* a restatement — the trust/latency/compliance boundary line. Say the word and the artboard's version goes back.
- **`mobile-banking-platform` appears on neither page now.** About linked it; About loses its chronology. Experience lists that employer's three deep dives, as the artboard draws it, and the platform is their parent rather than a fourth row. It is still featured on the home bento, so it is not orphaned — but it is the flagship case study and it is now reachable from home and from its three children only.

---

## 1.6 — `resources/site/experience.es.md` · full replacement

<!-- BEGIN experience.es.md -->

    ---
    slug: experience
    lang: es
    type: page
    title: "Luis Antelo — Experiencia"
    confidentiality: sanitized
    h1: "Cada empleador fue distinto. El problema nunca lo fue."
    intro: "Un sistema demasiado importante para tocar, y un negocio que necesitaba que hiciera algo para lo que nunca fue pensado. Otra industria, otro stack, la misma forma — siempre."
    roles:
      - company: "NICE"
        period: "2025–2026"
        title: "Senior Software Engineer"
        body:
          - "Entré a una plataforma que atiende a millones de usuarios y pasé seis meses en dos tipos de responsabilidad distintos: la técnica —funcionalidades multitenant y una mejora de performance que empujé como ADR en vez de mandarla en silencio— y la de personas, haciendo mentoría a la mitad junior del equipo de backend y construyendo el tooling de IA agéntica que hoy es parte de cómo revisamos código."
          - "La plataforma es un producto CX empresarial distribuido globalmente — PHP legacy y JavaScript vanilla conviviendo con un stack moderno en .NET, el mismo problema de “hacer que lo viejo y lo nuevo se hablen”, a otra escala. Trabajar para clientes en jurisdicciones de US y EU significó diseñar teniendo en cuenta cómo difieren realmente sus regímenes de protección de datos, no solo tildar un casillero de cumplimiento."
        stack: [".NET", "PHP legacy", "JavaScript vanilla", "protección de datos multi-jurisdicción"]

      - company: "Banco Solidario S.A."
        period: "2023–2025"
        title: "Backend Developer → Solution Architect en la práctica"
        body:
          - "Mi cargo nunca pasó de backend developer, pero a los dos años ya estaba tomando las decisiones que toma un solution architect — al banco simplemente no le actualizaron el papeleo. Entré a un equipo que traía la banca móvil in-house, sacándola de un producto de proveedor del que el banco nunca fue dueño, y terminé a cargo de la arquitectura de identidad y pagos detrás de la app que usan cientos de miles de personas."
          - "La fuente de verdad era un core legacy on-premise que el banco no podía mover, así que cada funcionalidad cruzaba a la vez una frontera de confianza, una de latencia y una de cumplimiento."
        case_studies:
          - otp-provider-decoupling
          - qr-collections-for-merchants
          - legacy-payment-data-migration
        stack: [".NET", "AWS", "SNS/SQS", "MassTransit", "Polly", "SQL Server", "BIAN"]

      - company: "Mamaya Tech"
        period: "2022–2023"
        title: "Analista de Sistemas"
        body:
          - "El equipo de Sistemas de mi rol anterior se independizó como esta empresa, y me fui con ellos. Mismo problema, otra empresa: integrando sistemas ERP satélite a un core de Oracle EBS, y evaluando a los proveedores del otro lado de esas integraciones."
          - "El trabajo tenía la misma forma que antes de la separación y el core era literalmente el mismo — solo que ahora integraba sistemas satélite desde el otro lado de una frontera corporativa en vez de desde adentro."
        stack: ["Oracle EBS", "integración ERP", "evaluación de proveedores"]

      - company: "Avícola Sofía"
        period: "2021–2022"
        title: "Analista de Sistemas"
        body:
          - "Mi primer sistema real, de punta a punta: una plataforma de asistencia multitenant que conectaba terminales biométricas en varias plantas industriales con el core de Oracle EBS y el sistema de RRHH de la empresa, diseñada y llevada a producción mientras todavía estaba aprendiendo qué significaba “producción” en serio."
          - "Un holding agroindustrial que llevaba producción, caja y almacenes sobre Oracle EBS — pensado para papeleo, no para las terminales biométricas que el negocio necesitaba después. Ese hueco es en el que vengo trabajando desde entonces."
        case_studies:
          - multi-tenant-biometric-attendance
        stack: ["Oracle EBS", "hardware biométrico", "monolito modular"]
    ---

    **Nada renderiza este cuerpo.** Todos los elementos de esta página salen del frontmatter de arriba, y esta nota es el registro de trazabilidad — la misma forma que tomó `home.{en,es}.md` cuando su prosa dejó de renderizarse.

    | Elemento de la página | De dónde sale |
    |---|---|
    | el titular y la bajada | `h1` e `intro` |
    | empresa, años y rol de cada entrada | `roles[].company`, `.period`, `.title` |
    | la prosa de cada entrada | `roles[].body` |
    | las filas de casos de estudio | `roles[].case_studies` — slugs, unidos contra el set de rutas, así el título y el href salen del archivo de ese caso en el idioma de esta página |
    | la línea de tecnologías | `roles[].stack` |
    | la insignia "más reciente" | derivada del orden del propio registro, no escrita en ningún lado |
    | los cuadrados de logo | un archivo de logo donde exista; ausente es un valor soportado |
    | la nota de disponibilidad y el link de LinkedIn | `ui.experience.cv_note` y `.full_history` |

<!-- END experience.es.md -->

The Spanish `h1` and `intro` are derived from the English pair and from the author's own Spanish opening line in `about.es.md` (*"un sistema demasiado importante para tocar, y un negocio que necesitaba que hiciera algo para lo que nunca fue pensado"*). Same sign-off as 1.4.

---

## The photographs — decided, no action needed

Five files sit in `resources/photos/`. None carries EXIF, so the location-metadata risk is already closed, and `check-terms` passes with them in place (binaries are skipped).

| file | pixels | ratio | slot |
|---|---|---|---|
| `Huayna-Potosi-landscape.jpg` | 1080×717 | 3:2 | **the full-width break** |
| `me-profile.jpeg` | 959×1280 | 3:4 | **the portrait**, cropped to 4:5 |
| `bolivia-landscape.jpeg` | 1024×1280 | 4:5 exactly | **the paired landscape**, no crop |
| `bolivia-landscape-2.jpeg` | 960×1280 | 3:4 | held — an alternative to the one above |
| `huayna-summit.jpeg` | 960×1280 | 3:4 | held — six or more identifiable third parties, `C-06` |

**The full-width slot is 3:2, not the artboard's 21:9 — decided by the author 2026-08-26.** The source is 1080px wide against a slot specified at 2000px, and cropping to 21:9 would give 1080×463 on an element that runs to 1176 CSS pixels, cutting away the sky and foreground road that give the mountain its scale. Keeping the photograph and moving the slot is recorded as a declared design-fidelity deviation.

**`huayna-summit.jpeg` does not ship without the consent of the people in it** (`C-06`, `TASK 20`). Cropping to keep only the author destroys what makes it a summit photograph. It stays out unless the author says otherwise.

---

## 1.7 — [AUTHOR] move the two held-back photographs OUT of `resources/photos/`

**This one is not cosmetic and it is the reason this section grew an item.** Spiked against a real build 2026-08-26: **every file the build's glob matches is published, whether anything references it or not.** Both a lazy and an eager glob emitted all five photographs into `dist/_astro/` at hashed but guessable URLs — including the two excluded above.

So `huayna-summit.jpeg`, held back precisely because six or more identifiable third parties are in it and `C-06` requires their consent, would have gone on the internet with every check green and nothing rendering it.

**`resources/photos/` is the publication boundary. Anything in it ships.**

Move these two somewhere outside it — `private/`, or off the repository entirely — until they are wanted:

- `resources/photos/huayna-summit.jpeg`
- `resources/photos/bolivia-landscape-2.jpeg`

The second is held only because it is an unused alternative, not for any confidentiality reason; it comes back the day it is chosen.

**The durable half is mine, not yours.** The build will fail, naming the file, when `resources/photos/` holds an asset that no `photos` entry in either locale references — derived from the directory listing rather than from a list somebody has to maintain (`P-13`). After that lands, a stray file is a loud build error instead of a silent publication. The move above is still worth doing now, so nothing leaks before the check exists.

**One honest note on the portrait.** `me-profile.jpeg` crops cleanly and is shippable, but it reads as a phone selfie against an indoor wall rather than as a portrait — and it is the one image on the site whose only job is to be him. Not worth blocking today; worth twenty minutes some other day.
