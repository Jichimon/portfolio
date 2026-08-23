#!/usr/bin/env node
// Derives the artboards that must never drift from another artboard.
//
// Three of the screens in src/ are NOT independently authored, and treating them as if
// they were would be the defect: the Spanish home has to be structurally identical to the
// English one or it stops being a length stress test, and the two phone frames have to be
// identical to their desktop sources or they stop being the same screen. Hand-maintaining
// a copy guarantees it diverges — silently, and in the direction nobody is looking.
//
// So they are generated, every substitution is asserted, and verify.mjs re-runs this in
// memory and fails if a checked-in file differs from what this produces. Drift is not
// discouraged here; it is impossible.
//
//   node docs/design/canvas/derive.mjs          write the derived files
//   node docs/design/canvas/derive.mjs --check  report differences, write nothing
//
// This module also exports derive() so verify.mjs can call it without shelling out.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "src");

// ---------------------------------------------------------------------------
// HomeES — copy substitution ONLY. Nothing about the layout, the CSS or the markup
// structure may differ: that is what makes it evidence rather than a second design.
// The copy is the real content from resources/site/home.es.md and the Spanish
// case-study frontmatter, never translation written for the mockup (C-09).
// ---------------------------------------------------------------------------
const ES = [
  // --- rail chrome -------------------------------------------------------------
  // The wordmark is the way back to the home page — on the Spanish site that is the
  // SPANISH home. Missed on the first pass, and the verifier missed it too because it
  // excused every href="/" as "probably the switcher".
  [`<div class="wordmark"><a href="/">Luis Antelo</a></div>`,
   `<div class="wordmark"><a href="/es/">Luis Antelo</a></div>`],
  [`<span class="cur" lang="en" aria-current="true">EN</span>`,
   `<span class="cur" lang="es" aria-current="true">ES</span>`],
  [`<a href="/es/" hreflang="es" lang="es">ES</a>`,
   `<a href="/" hreflang="en" lang="en">EN</a>`],
  [`Cochabamba, Bolivia<span class="tz">GMT-4 &middot; full overlap with US business hours</span>`,
   `Cochabamba, Bolivia<span class="tz">GMT-4 &middot; solapamiento completo con el horario laboral de EE.&nbsp;UU.</span>`],

  // --- nav ---------------------------------------------------------------------
  [`<a href="#work"><span class="ind"></span>Work</a>`,
   `<a href="#work"><span class="ind"></span>Trabajo</a>`],
  [`<a href="/about"><span class="ind"></span>About</a>`,
   `<a href="/es/about"><span class="ind"></span>Sobre m&iacute;</a>`],
  [`<a href="/experience"><span class="ind"></span>Experience</a>`,
   `<a href="/es/experience"><span class="ind"></span>Experiencia</a>`],
  [`Writing<span class="tag">soon</span>`, `Escritos<span class="tag">pronto</span>`],
  [`Architectures<span class="tag">soon</span>`, `Arquitecturas<span class="tag">pronto</span>`],
  [`Search<span class="tag">soon</span>`, `B&uacute;squeda<span class="tag">pronto</span>`],
  [`<a href="#contact"><span class="ind"></span>Contact</a>`,
   `<a href="#contact"><span class="ind"></span>Contacto</a>`],

  // --- hero --------------------------------------------------------------------
  [`When a system is too critical to touch and too old to ignore, that's my problem to solve.`,
   `Cuando un sistema es demasiado cr&iacute;tico para tocar y demasiado viejo para ignorar, ese es mi problema.`],

  // --- employers ---------------------------------------------------------------
  [`<h2>Where I've worked</h2>`, `<h2>D&oacute;nde he trabajado</h2>`],
  [`href="/experience"><span class="logo-slot">logo</span><span class="employer-name">NICE`, `href="/es/experience"><span class="logo-slot">logo</span><span class="employer-name">NICE`],
  [`href="/experience"><span class="logo-slot">logo</span><span class="employer-name">Banco`, `href="/es/experience"><span class="logo-slot">logo</span><span class="employer-name">Banco`],
  [`href="/experience"><span class="logo-slot">logo</span><span class="employer-name">Mamaya`, `href="/es/experience"><span class="logo-slot">logo</span><span class="employer-name">Mamaya`],
  [`href="/experience"><span class="logo-slot">logo</span><span class="employer-name">Av&iacute;cola`, `href="/es/experience"><span class="logo-slot">logo</span><span class="employer-name">Av&iacute;cola`],

  // --- work --------------------------------------------------------------------
  [`<h2>What I&rsquo;ve built</h2>`, `<h2>Lo que he construido</h2>`],
  [`href="/case-studies/mobile-banking-platform"`, `href="/es/case-studies/mobile-banking-platform"`],
  [`href="/case-studies/qr-collections-for-merchants"`, `href="/es/case-studies/qr-collections-for-merchants"`],
  [`href="/case-studies/otp-provider-decoupling"`, `href="/es/case-studies/otp-provider-decoupling"`],
  [`href="/case-studies/legacy-payment-data-migration"`, `href="/es/case-studies/legacy-payment-data-migration"`],
  [`href="/case-studies/multi-tenant-biometric-attendance"`, `href="/es/case-studies/multi-tenant-biometric-attendance"`],

  [`<span class="tag">Platform &middot; parent of the deep dives</span>`,
   `<span class="tag">Plataforma &middot; los dem&aacute;s casos salen de ac&aacute;</span>`],
  [`<h3>Rebuilding a bank's mobile platform in-house</h3>`,
   `<h3>Reconstruir la plataforma m&oacute;vil de un banco in-house</h3>`],
  [`<p>Replacing a vendor banking app with a cloud-native platform bridging a legacy on-premise core.</p>`,
   `<p>Reemplazar la app bancaria de un proveedor por una plataforma cloud-native conectada a un core legacy on-premise.</p>`],
  [`<span class="scale">100,000s<small>active users</small></span>`,
   `<span class="scale">100.000s<small>usuarios activos</small></span>`],

  [`<h3>Letting merchants delegate payment collection to people without bank accounts</h3>`,
   `<h3>Permitir que comercios deleguen el cobro en personas sin cuenta bancaria</h3>`],
  [`<p>A delegated-authority model built on a core banking system that has no concept of a business.</p>`,
   `<p>Un modelo de autoridad delegada sobre un core bancario que no tiene concepto de empresa.</p>`],
  [`<div class="foot">Solution Architect &amp; Backend Developer<span class="hi">100,000 users in three months &middot; 2025</span></div>`,
   `<div class="foot">Solution Architect &amp; Backend Developer<span class="hi">100.000 usuarios en tres meses &middot; 2025</span></div>`],

  [`<h3>Taking second-factor authentication back from a vendor</h3>`,
   `<h3>Recuperar el segundo factor de autenticaci&oacute;n de manos de un proveedor</h3>`],
  [`<p>Decomposing an overloaded notification service and choosing the more expensive compute option on purpose.</p>`,
   `<p>Descomponer un servicio de notificaciones sobrecargado y elegir a prop&oacute;sito la opci&oacute;n de c&oacute;mputo m&aacute;s cara.</p>`],
  [`<div class="foot">Solution Architect<span class="hi">~70% projected cost reduction &mdash; plan approved, cutover pending &middot; 2025</span></div>`,
   `<div class="foot">Solution Architect<span class="hi">~70% de reducci&oacute;n de costo proyectada &mdash; plan aprobado, corte pendiente &middot; 2025</span></div>`],

  [`<h3>Migrating payment data out of a system nobody understood</h3>`,
   `<h3>Migrar datos de pagos desde un sistema que nadie entend&iacute;a</h3>`],
  [`<p>Reverse-engineering an undocumented legacy feature, then writing a migration someone else had to execute.</p>`,
   `<p>Hacer ingenier&iacute;a inversa de una feature legacy sin documentaci&oacute;n, y escribir una migraci&oacute;n que deb&iacute;a ejecutar otro equipo.</p>`],
  [`<div class="foot">Backend Engineer<span class="hi">Millions of records, zero incidents &middot; 2024</span></div>`,
   `<div class="foot">Backend Engineer<span class="hi">Millones de registros, cero incidentes &middot; 2024</span></div>`],

  [`<p class="standalone-label">Not part of the platform &mdash; a different employer, a different system</p>`,
   `<p class="standalone-label">Fuera de la plataforma &mdash; otro empleador, otro sistema</p>`],
  [`<span class="tag">Case study</span>`, `<span class="tag">Caso de estudio</span>`],
  [`<h3>A multi-tenant attendance platform across industrial plants</h3>`,
   `<h3>Una plataforma de asistencia multi-tenant sobre plantas industriales</h3>`],
  [`<p>Bridging biometric hardware, a third-party HR system and a mobile app &mdash; as a modular monolith, on purpose.</p>`,
   `<p>Conectar hardware biom&eacute;trico, un sistema de RRHH de terceros y una app m&oacute;vil &mdash; como monolito modular, a prop&oacute;sito.</p>`],
  [`<div class="foot">Systems Analyst &amp; Lead Developer<span class="hi">Production across multiple companies, thousands of employees &middot; 2022&ndash;2023</span></div>`,
   `<div class="foot">Analista de Sistemas &amp; Lead Developer<span class="hi">En producci&oacute;n en varias empresas, miles de empleados &middot; 2022&ndash;2023</span></div>`],

  // --- marquee -----------------------------------------------------------------
  [`<h2>Technologies I&rsquo;ve worked with</h2>`, `<h2>Tecnolog&iacute;as con las que trabaj&eacute;</h2>`],

  // --- contact -----------------------------------------------------------------
  [`<h2>Get in touch</h2>`, `<h2>Hablemos</h2>`],
  [`<p class="invite">Got a system that's hard to explain &mdash; or an idea you don't yet know how to build? Let's work it out together.</p>`,
   `<p class="invite">&iquest;Ten&eacute;s un sistema que cuesta hasta explicar? &iquest;O una idea que todav&iacute;a no sab&eacute;s c&oacute;mo bajar a tierra? Ve&aacute;moslo juntos.</p>`],
  [`<label for="cf-email">Your email</label>`, `<label for="cf-email">Tu email</label>`],
  [`placeholder="you@company.com"`, `placeholder="vos@empresa.com"`],
  [`<label for="cf-about">About</label>`, `<label for="cf-about">Asunto</label>`],
  [`placeholder="One line"`, `placeholder="Una l&iacute;nea"`],
  [`<label for="cf-message">Description</label>`, `<label for="cf-message">Descripci&oacute;n</label>`],
  [`placeholder="What's the problem?"`, `placeholder="&iquest;Cu&aacute;l es el problema?"`],
  [`type="submit">Send</button>`, `type="submit">Enviar</button>`],
  [`<p class="contact-note">Open to remote or hybrid/relocation.</p>`,
   `<p class="contact-note">Abierto a remoto o h&iacute;brido/relocation.</p>`],

  [`<p>[NEEDS INPUT] Paste the real LinkedIn recommendation text here &mdash; not invented.</p>`,
   `<p>[NEEDS INPUT] Pegar ac&aacute; el texto real de la recomendaci&oacute;n de LinkedIn &mdash; no inventado.</p>`],
  [`<div class="t-name">[NEEDS INPUT] Name</div>`, `<div class="t-name">[NEEDS INPUT] Nombre</div>`, "all"],
  [`<div class="t-title">[NEEDS INPUT] Title &middot; Company</div>`,
   `<div class="t-title">[NEEDS INPUT] Cargo &middot; Empresa</div>`, "all"],
  [`<p>[NEEDS INPUT] Paste the real LinkedIn recommendation text here.</p>`,
   `<p>[NEEDS INPUT] Pegar ac&aacute; el texto real de la recomendaci&oacute;n de LinkedIn.</p>`, "all"],

  // --- footer + theme label ------------------------------------------------------
  [`<div class="footer-links">Visitor metrics &mdash; reserved slot, not built yet</div>`,
   `<div class="footer-links">M&eacute;tricas de visitas &mdash; lugar reservado, todav&iacute;a sin construir</div>`],
  [`theme === "light" ? "Dark mode" : "Light mode"`, `theme === "light" ? "Modo oscuro" : "Modo claro"`],
];
// No English copy may survive. A property over prose-only phrases — never a proper noun,
// a CSS token or a job title, all of which stay English in the Spanish content too.
const LEFTOVERS = [
  "Where I've worked", "What I&rsquo;ve built", "Get in touch", "Technologies I&rsquo;ve",
  "too critical to touch", "Case study<", "Your email", "Send</button>", "Dark mode",
];

// ---------------------------------------------------------------------------
// The phone frames. A byte-identical copy of a desktop screen, rendered into a 390px
// artboard frame so the narrow state is a FROZEN picture rather than something you have
// to resize a window to see. Identical on purpose: a phone frame that has drifted from
// its desktop source is documenting a screen that does not exist.
//
// Two archetypes, not all of them: home (the bento, the hero, the marquee) and the
// article (the disappearing table of contents, the stacked masthead, the overflowing
// diagrams). Every other screen is one of those two shapes.
// ---------------------------------------------------------------------------
const BANNER = (from) => `<!-- GENERATED from ${from} by derive.mjs — do not edit.
     Byte-identical to its source; only the artboard frame width differs (390px, set in
     canvas.json). Edit ${from} and re-run: node docs/design/canvas/derive.mjs -->
`;
const MIRRORS = [
  ["Main.dc.html", "HomeMobile.dc.html"],
  ["CaseStudyDetail.dc.html", "CaseStudyMobile.dc.html"],
];

export function derive() {
  const out = {};

  let s = readFileSync(join(dir, "Main.dc.html"), "utf8");
  const missing = [];
  for (const [from, to, mode] of ES) {
    if (!s.includes(from)) { missing.push(from.slice(0, 72)); continue; }
    s = mode === "all" ? s.split(from).join(to) : s.replace(from, to);
  }
  if (missing.length) throw new Error("derive: source strings not found:\n  " + missing.join("\n  "));
  const left = LEFTOVERS.filter((w) => s.includes(w));
  if (left.length) throw new Error("derive: untranslated copy left: " + left.join(" | "));
  out["HomeES.dc.html"] = s;

  for (const [from, to] of MIRRORS) {
    const src = readFileSync(join(dir, from), "utf8");
    out[to] = src.replace(/^<!doctype html>\r?\n/i, `<!doctype html>\n${BANNER(from)}`);
  }
  return out;
}

// Windows argv carries backslashes and import.meta.url does not, so compare basenames
// rather than paths — this file is the only derive.mjs in the tree.
if (process.argv[1] && /derive\.mjs$/.test(process.argv[1].split(/[\\/]/).pop())) {
  const check = process.argv.includes("--check");
  const out = derive();
  const stale = [];
  for (const [name, content] of Object.entries(out)) {
    const path = join(dir, name);
    let current = null;
    try { current = readFileSync(path, "utf8"); } catch { /* not written yet */ }
    if (current === content) continue;
    stale.push(name);
    if (!check) writeFileSync(path, content, "utf8");
  }
  if (check && stale.length) {
    console.error(`derive.mjs --check: STALE — ${stale.join(", ")}. Run: node docs/design/canvas/derive.mjs`);
    process.exit(1);
  }
  console.log(check
    ? `derive.mjs --check: ok — ${Object.keys(out).length} derived file(s) match their sources`
    : `derive.mjs: ${stale.length ? stale.join(", ") + " rewritten" : "already current"} (${ES.length} substitutions, 0 leftovers)`);
}
