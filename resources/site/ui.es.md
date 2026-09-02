---
slug: ui
lang: es
type: ui
title: "Cadenas de interfaz"
confidentiality: sanitized

nav:
  work: "Trabajo"
  about: "Sobre mí"
  experience: "Experiencia"
  contact: "Contacto"
  writing: "Escritos"
  architectures: "Arquitecturas"
  search: "Búsqueda"
  soon_tag: "pronto"

rail:
  role: "Senior Software Engineer"
  location: "Cochabamba, Bolivia"
  timezone: "GMT-4 · solapamiento completo con horario laboral en US"
  language_group: "Idioma"
  theme_to_dark: "Modo oscuro"
  theme_to_light: "Modo claro"
  menu: "Menú"
  wordmark: "Luis Octavio Antelo"

socials:
  - name: "GitHub"
    url: "https://github.com/Jichimon"
  - name: "LinkedIn"
    url: "https://www.linkedin.com/in/luis-octavio-antelo-mansilla-92b8ba150/"

home:
  standalone_label: "Fuera de la plataforma: otro empleador, otro sistema"
  employers_heading: "Acá ya trabajé"
  work_heading: "Lo que hice"
  stack_heading: "Tecnologías que he usado"
  contact_heading: "Hablemos"
  contact_invite: "¿Tenés un sistema complicado? ¿Necesitás que haga algo pero no sabés cómo? ¿Capaz tenés una idea que todavía no sabés aterrizarla? ¿O tal vez tuvieras alguna duda técnica? Veámoslo juntos."
  contact_note: "Abierto a oportunidades en remoto o híbrido/relocation."
  contact_email: "luis.antm@hotmail.com"
  seam_legacy: "Legacy, denso"
  seam_modern: "Moderno, abierto"

article:
  toc_heading: "En esta página"
  back_to_work: "← Trabajo"
  role: "Rol"
  context: "Contexto"
  period: "Período"
  outcome: "Resultado"
  stack: "Stack"
  platform_tag: "Plataforma · raíz de los deep dives"
  case_study_tag: "Caso de estudio"
  deep_dives: "Deep dives"
  part_of: "parte de"
  figure_prefix: "Fig."

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

contact_form:
  email_label: "Tu email"
  email_placeholder: "vos@empresa.com"
  subject_label: "Asunto"
  subject_placeholder: "Una línea"
  message_label: "Descripción"
  message_placeholder: "¿Cuál es el problema?"
  submit: "Enviar"
  sending: "Enviando…"
  sent: "Enviado. Te respondo a"
  error: "No se pudo enviar. Tu mensaje sigue acá. Escribime directo a"

footer:
  metrics_slot: "Métricas de visitas: lugar reservado, todavía sin construir"

not_found:
  status_code: "HTTP 404"
  status_word: "no encontrado"
  heading: "Este enlace no conecta con nada."
  body: "Que es, más o menos, para lo que me contratan. La dirección quedó vieja o tiene un error de tipeo. Acá abajo está todo lo que sí existe."
  destinations:
    - name: "Trabajo"
      what: "Qué construí, y qué costó"
    - name: "Sobre mí"
      what: "La persona, no el CV"
    - name: "Experiencia"
      what: "De dónde salió cada problema"
    - name: "Contacto"
      what: "Email, GitHub, LinkedIn"
---

Todo string que el chrome del sitio imprime, en español. Nada de acá es copy de página: un string vive en este archivo cuando un template lo imprime sin importar qué contenido cargue, y en el `.md` de su propia página cuando no.

**Nada renderiza este cuerpo.** Es el registro de trazabilidad (de dónde salió cada string) y es lo que permite revisar este archivo en vez de confiar en él.

## Lo que ya existía en el diseño

Se levanta tal cual del artboard, sin tocar una coma.

| Grupo | Origen |
|---|---|
| `nav` completo, incluido `pronto` | `HomeES.dc.html` 430–436 |
| `rail.location`, `rail.timezone`, `rail.theme_to_dark`, `rail.theme_to_light` | `HomeES.dc.html` 427, 783 |
| `rail.wordmark` | `HomeES.dc.html` 425 |
| `socials`, los dos: nombre y URL | `HomeES.dc.html` 448 · idénticos al artboard inglés: un nombre propio y una URL, nada que traducir |
| `home.contact_heading`, `home.contact_email` | `HomeES.dc.html` 667, 687 |
| `contact_form`: los siete | `HomeES.dc.html` 672–683 |
| `footer.metrics_slot` | `HomeES.dc.html` 716 |
| `not_found`: `status_word`, `heading`, `body` y las cuatro destinaciones | `NotFound.dc.html` 228, 275–286 |

**`home.employers_heading`, `home.work_heading`, `home.stack_heading`, `home.contact_invite` y `home.contact_note` ya no salen del artboard.** Se levantaron de `HomeES.dc.html` 532, 542, 655, 668 y después se reescribieron con voz propia. Hoy la fuente de esos cinco strings es este archivo, y el inglés se alinea contra él, no al revés.

**Y hay una sustitución que corre sobre todo el archivo.** Donde el artboard usaba raya, acá van dos puntos, un punto o paréntesis. Así que `footer.metrics_slot` y `not_found.body` difieren de su origen en el artboard por esa puntuación y por nada más.

`rail.role` queda en inglés a propósito: *Senior Software Engineer* es el título del puesto, y así aparece en el artboard español.

## Lo que se escribió acá y no existe en ningún artboard, **revisar uno por uno**

Ningún artboard tiene la mitad española de las páginas de artículo, About ni Experience, así que estos dieciséis se escribieron para este archivo. No los apruebes en bloque (`C-01`, `C-04`).

| Clave | Propuesto | Inglés de referencia |
|---|---|---|
| `rail.language_group` | Idioma | Language (etiqueta de accesibilidad, no visible) |
| `rail.menu` | Menú | Menu (etiqueta de accesibilidad, estado narrow) |
| `home.seam_legacy` | Legacy, denso | Legacy, dense |
| `home.seam_modern` | Moderno, abierto | Modern, open |
| `article.toc_heading` | En esta página | On this page |
| `article.back_to_work` | ← Trabajo | ← Work |
| `article.role` | Rol | Role |
| `article.context` | Contexto | Context |
| `article.period` | Período | Period |
| `article.outcome` | Resultado | Outcome |
| `article.case_study_tag` | Caso de estudio | Case study |
| `about.label` | Sobre mí | About |
| `about.based_in` | Radicado en | Based in |
| `about.since` | Desde | Since |
| `about.reads_as` | Se lee como | Reads as |
| `experience.label` | Experiencia | Experience |

**Dos que necesitan una decisión tuya, no solo una revisión:**

- **`article.deep_dives`, se dejó en inglés.** *Deep dives* es término de oficio y la traducción literal (*En profundidad*, *A fondo*) pierde el sentido de "los hijos de esta plataforma". Si preferís traducirlo, el candidato es **En profundidad**.
- **`article.platform_tag`, se dejó mezclado:** *Plataforma · raíz de los deep dives*. Arrastra el mismo término dentro de una frase en español. La alternativa consistente es *Plataforma · de la que cuelgan los casos en profundidad*, más larga y sin el término de oficio.

`article.stack` se dejó como **Stack**: es la palabra que la industria usa en español y traducirla a *Tecnologías* chocaría con `home.stack_heading`, que ya dice *Tecnologías que manejo*.

## Un detalle tipográfico

`rail.timezone` deja **US** sin traducir, no `EE. UU.` — más corto, y evita
la duda entre espacio duro y espacio normal que tenía el artboard. La misma
razón por la que `rail.role` se queda en inglés.
